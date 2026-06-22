import uuid
import os
import shutil
import traceback
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db, Project, Clip, Job
from services.youtube_engine import download_video
from services.transcription import transcribe_audio
from services.hook_detector import find_hooks
from services.video_processor import process_clips

router = APIRouter(prefix="/projects", tags=["projects"])

BASE_URL    = os.getenv("BASE_URL", "http://localhost:8000")
OUTPUTS_DIR = Path("/tmp/montageai_outputs")
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)


# ──────────────────────────────────────────────────────────────
# Schemas
# ──────────────────────────────────────────────────────────────
class CreateProjectBody(BaseModel):
    title: str
    source_url: Optional[str] = None


class UpdateProjectBody(BaseModel):
    title:     Optional[str] = None
    edit_data: Optional[dict] = None


# ──────────────────────────────────────────────────────────────
# CRUD
# ──────────────────────────────────────────────────────────────
@router.get("")
def list_projects(db: Session = Depends(get_db)):
    projects = (
        db.query(Project)
        .order_by(Project.updated_at.desc())
        .all()
    )
    return [_project_dict(p, db) for p in projects]


@router.post("")
def create_project(
    body: CreateProjectBody,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    project = Project(
        id=str(uuid.uuid4())[:8],
        user_id="default",
        title=body.title,
        source_url=body.source_url,
        status="draft" if not body.source_url else "processing",
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    if body.source_url:
        job = Job(
            id=str(uuid.uuid4())[:8],
            project_id=project.id,
            type="generate",
            status="pending",
        )
        db.add(job)
        db.commit()
        background_tasks.add_task(_run_generate, project.id, job.id, body.source_url)

    return _project_dict(project, db)


@router.get("/{project_id}")
def get_project(project_id: str, db: Session = Depends(get_db)):
    project = _get_project_or_404(project_id, db)
    return _project_dict(project, db, include_clips=True)


@router.patch("/{project_id}")
def update_project(
    project_id: str,
    body: UpdateProjectBody,
    db: Session = Depends(get_db),
):
    project = _get_project_or_404(project_id, db)
    if body.title is not None:
        project.title = body.title
    if body.edit_data is not None:
        project.edit_data = body.edit_data
    project.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(project)
    return _project_dict(project, db)


@router.delete("/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    project = _get_project_or_404(project_id, db)
    db.delete(project)
    db.commit()
    return {"ok": True}


@router.get("/{project_id}/jobs")
def list_jobs(project_id: str, db: Session = Depends(get_db)):
    _get_project_or_404(project_id, db)
    jobs = (
        db.query(Job)
        .filter(Job.project_id == project_id)
        .order_by(Job.created_at.desc())
        .all()
    )
    return [_job_dict(j) for j in jobs]


@router.get("/{project_id}/jobs/{job_id}")
def get_job(project_id: str, job_id: str, db: Session = Depends(get_db)):
    _get_project_or_404(project_id, db)
    job = db.query(Job).filter(Job.id == job_id, Job.project_id == project_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return _job_dict(job)


# ──────────────────────────────────────────────────────────────
# Upload video file directamente
# ──────────────────────────────────────────────────────────────
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"}


@router.post("/upload")
async def upload_video(
    background_tasks: BackgroundTasks,
    file:  UploadFile = File(...),
    title: str        = Form(default=""),
    db:    Session    = Depends(get_db),
):
    ext = Path(file.filename or "video.mp4").suffix.lower()
    if ext not in ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(400, f"Formato no soportado: {ext}. Usa mp4, mov, mkv, webm.")

    project_title = title.strip() or Path(file.filename).stem or "Video subido"
    project = Project(
        id=str(uuid.uuid4())[:8],
        user_id="default",
        title=project_title,
        source_url=None,
        status="processing",
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    job_dir = OUTPUTS_DIR / project.id
    job_dir.mkdir(parents=True, exist_ok=True)
    video_path = job_dir / f"source{ext}"
    with open(video_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    job = Job(
        id=str(uuid.uuid4())[:8],
        project_id=project.id,
        type="generate",
        status="pending",
    )
    db.add(job)
    db.commit()

    background_tasks.add_task(_run_generate_from_file, project.id, job.id, video_path)
    return _project_dict(project, db)


# ──────────────────────────────────────────────────────────────
# Background tasks
# ──────────────────────────────────────────────────────────────
async def _run_generate(project_id: str, job_id: str, url: str):
    db = next(get_db())
    job     = db.query(Job).filter(Job.id == job_id).first()
    project = db.query(Project).filter(Project.id == project_id).first()

    def _update(status, step, progress):
        job.status = status; job.step = step; job.progress = progress; db.commit()

    try:
        job_dir = OUTPUTS_DIR / project_id
        job_dir.mkdir(parents=True, exist_ok=True)

        _update("running", "downloading", 10)
        video_path, audio_path = await download_video(url, job_dir)

        _update("running", "transcribing", 30)
        transcript = await transcribe_audio(audio_path)

        _update("running", "analyzing", 55)
        hooks = await find_hooks(transcript)

        _update("running", "cutting", 70)

        # Log video file info for debugging
        vsize = video_path.stat().st_size if video_path.exists() else -1
        print(f"[generate] video={video_path}, size={vsize}, hooks={len(hooks)}, segments={len(transcript)}")

        clips_data, first_clip_err = await process_clips(video_path, hooks, transcript, job_dir)
        print(f"[generate] clips_data={len(clips_data)} results, first_err={first_clip_err}")

        for i, clip_data in enumerate(clips_data, start=1):
            db_clip = Clip(
                id=str(uuid.uuid4())[:8],
                project_id=project_id,
                title=clip_data.get("title", f"Short {i}"),
                hook=clip_data.get("hook", ""),
                score=clip_data.get("score", 9.0),
                start_time=clip_data.get("start_time", 0),
                end_time=clip_data.get("end_time", 0),
                duration=clip_data.get("duration", 0),
                file_path=clip_data.get("clip_path", ""),
                thumbnail_path=str(job_dir / f"thumb_{i}.jpg"),
            )
            db.add(db_clip)

        if clips_data:
            project.thumbnail = f"{BASE_URL}/clips/{project_id}/thumb_1.jpg"
            project.status    = "ready"
        else:
            debug_info = f"video_size={vsize}B, hooks={len(hooks)}, segments={len(transcript)}"
            project.status = "error"
            job.error = f"0 clips generated. {debug_info}. FFmpeg: {first_clip_err}"

        job.status = "done"; job.progress = 100; job.step = "complete"
        job.result = {"clip_count": len(clips_data)}
        db.commit()

    except Exception as e:
        traceback.print_exc()
        job.status = "error"; job.error = str(e); project.status = "error"; db.commit()


async def _run_generate_from_file(project_id: str, job_id: str, video_path: Path):
    import asyncio
    from services.transcription import transcribe_audio as _transcribe
    from services.hook_detector  import find_hooks as _find_hooks
    from services.video_processor import process_clips as _process

    db = next(get_db())
    job     = db.query(Job).filter(Job.id == job_id).first()
    project = db.query(Project).filter(Project.id == project_id).first()

    def _update(status, step, progress):
        job.status = status; job.step = step; job.progress = progress; db.commit()

    try:
        job_dir = video_path.parent

        _update("running", "transcribing", 20)
        audio_path = job_dir / "audio.wav"
        proc = await asyncio.create_subprocess_exec(
            "ffmpeg", "-y", "-i", str(video_path),
            "-vn", "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", str(audio_path),
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
        )
        await proc.communicate()

        transcript = await _transcribe(audio_path)

        _update("running", "analyzing", 55)
        hooks = await _find_hooks(transcript)

        _update("running", "cutting", 70)
        clips_data = await _process(video_path, hooks, transcript, job_dir)

        for i, clip_data in enumerate(clips_data, start=1):
            db_clip = Clip(
                id=str(uuid.uuid4())[:8],
                project_id=project_id,
                title=clip_data.get("title", f"Short {i}"),
                hook=clip_data.get("hook", ""),
                score=clip_data.get("score", 9.0),
                start_time=clip_data.get("start_time", 0),
                end_time=clip_data.get("end_time", 0),
                duration=clip_data.get("duration", 0),
                file_path=clip_data.get("clip_path", ""),
                thumbnail_path=str(job_dir / f"thumb_{i}.jpg"),
            )
            db.add(db_clip)

        if clips_data:
            project.thumbnail = f"{BASE_URL}/clips/{project_id}/thumb_1.jpg"
            project.status    = "ready"
        else:
            project.status = "error"

        job.status = "done"; job.progress = 100; job.step = "complete"
        job.result = {"clip_count": len(clips_data)}
        db.commit()

    except Exception as e:
        traceback.print_exc()
        job.status = "error"; job.error = str(e); project.status = "error"; db.commit()


# ──────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────
def _get_project_or_404(project_id: str, db: Session) -> Project:
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return p


def _project_dict(project: Project, db: Session, include_clips=False) -> dict:
    data = {
        "id":         project.id,
        "title":      project.title,
        "source_url": project.source_url,
        "thumbnail":  project.thumbnail,
        "duration":   project.duration,
        "status":     project.status,
        "edit_data":  project.edit_data or {},
        "created_at": project.created_at.isoformat(),
        "updated_at": project.updated_at.isoformat() if project.updated_at else project.created_at.isoformat(),
    }
    if include_clips:
        clips = db.query(Clip).filter(Clip.project_id == project.id).all()
        data["clips"] = [_clip_dict(c, project.id) for c in clips]
    return data


def _clip_dict(clip: Clip, project_id: str) -> dict:
    return {
        "id":            clip.id,
        "title":         clip.title,
        "hook":          clip.hook,
        "score":         clip.score,
        "start_time":    clip.start_time,
        "end_time":      clip.end_time,
        "duration":      clip.duration,
        "has_subtitles": clip.has_subtitles,
        "download_url":  f"{BASE_URL}/clips/{project_id}/{Path(clip.file_path).name}" if clip.file_path else None,
        "thumbnail_url": f"{BASE_URL}/clips/{project_id}/{Path(clip.thumbnail_path).name}" if clip.thumbnail_path else None,
    }


def _job_dict(job: Job) -> dict:
    return {
        "id":         job.id,
        "type":       job.type,
        "status":     job.status,
        "progress":   job.progress,
        "step":       job.step,
        "result":     job.result,
        "error":      job.error,
        "created_at": job.created_at.isoformat(),
    }
