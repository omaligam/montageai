import uuid
from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db, Clip, Job, Project
from services.subtitle_generator import generate_subtitles, burn_subtitles
from services.silence_remover import remove_silences
from services.face_tracker import autocrop_video
from services.audio_enhancer import enhance_audio

router = APIRouter(prefix="/ai", tags=["ai-tools"])

OUTPUTS_DIR = Path("/tmp/montageai_outputs")


# ──────────────────────────────────────────────────────────────
# Subtítulos
# ──────────────────────────────────────────────────────────────
class SubtitleBody(BaseModel):
    clip_id:    str
    project_id: str
    style:      Optional[str] = "default"


@router.post("/subtitles")
async def add_subtitles(
    body: SubtitleBody,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    clip = _get_clip(body.clip_id, body.project_id, db)
    job  = _create_job(db, body.project_id, "subtitles")
    background_tasks.add_task(_run_subtitles, clip.id, body.project_id, body.style, job.id)
    return {"job_id": job.id}


async def _run_subtitles(clip_id, project_id, style, job_id):
    db   = next(get_db())
    job  = db.query(Job).filter(Job.id == job_id).first()
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    try:
        job.status = "running"; job.progress = 20; db.commit()
        srt_path = await generate_subtitles(clip.file_path)
        job.progress = 60; db.commit()
        out_path = clip.file_path.replace(".mp4", "_subs.mp4")
        await burn_subtitles(clip.file_path, srt_path, out_path, style)
        clip.subtitles_path = srt_path
        clip.has_subtitles  = True
        clip.file_path      = out_path
        job.status = "done"; job.progress = 100; db.commit()
    except Exception as e:
        job.status = "error"; job.error = str(e); db.commit()


# ──────────────────────────────────────────────────────────────
# Silence Remover
# ──────────────────────────────────────────────────────────────
class SilenceBody(BaseModel):
    clip_id:        str
    project_id:     str
    min_silence_ms: Optional[int]   = 600
    silence_db:     Optional[float] = -35.0


@router.post("/remove-silence")
async def remove_silence(
    body: SilenceBody,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    clip = _get_clip(body.clip_id, body.project_id, db)
    job  = _create_job(db, body.project_id, "silence")
    background_tasks.add_task(_run_silence, clip.id, body.min_silence_ms, body.silence_db, job.id)
    return {"job_id": job.id}


async def _run_silence(clip_id, min_silence_ms, silence_db, job_id):
    db   = next(get_db())
    job  = db.query(Job).filter(Job.id == job_id).first()
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    try:
        job.status = "running"; job.progress = 20; db.commit()
        out_path = clip.file_path.replace(".mp4", "_nosil.mp4")
        result   = await remove_silences(clip.file_path, out_path, min_silence_ms, silence_db)
        clip.file_path = out_path
        clip.duration  = result.get("new_duration", clip.duration)
        job.status = "done"; job.progress = 100; job.result = result; db.commit()
    except Exception as e:
        job.status = "error"; job.error = str(e); db.commit()


# ──────────────────────────────────────────────────────────────
# Auto-crop (9:16)
# ──────────────────────────────────────────────────────────────
class AutocropBody(BaseModel):
    clip_id:    str
    project_id: str
    mode:       Optional[str] = "face"


@router.post("/autocrop")
async def autocrop(
    body: AutocropBody,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    clip = _get_clip(body.clip_id, body.project_id, db)
    job  = _create_job(db, body.project_id, "autocrop")
    background_tasks.add_task(_run_autocrop, clip.id, body.mode, job.id)
    return {"job_id": job.id}


async def _run_autocrop(clip_id, mode, job_id):
    db   = next(get_db())
    job  = db.query(Job).filter(Job.id == job_id).first()
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    try:
        job.status = "running"; job.progress = 20; db.commit()
        out_path = clip.file_path.replace(".mp4", "_cropped.mp4")
        await autocrop_video(clip.file_path, out_path, mode)
        clip.file_path = out_path
        job.status = "done"; job.progress = 100; db.commit()
    except Exception as e:
        job.status = "error"; job.error = str(e); db.commit()


# ──────────────────────────────────────────────────────────────
# Audio Enhance
# ──────────────────────────────────────────────────────────────
class EnhanceBody(BaseModel):
    clip_id:    str
    project_id: str
    denoise:    Optional[bool]  = True
    normalize:  Optional[bool]  = True
    loudness:   Optional[float] = -14.0


@router.post("/enhance-audio")
async def enhance_audio_endpoint(
    body: EnhanceBody,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    clip = _get_clip(body.clip_id, body.project_id, db)
    job  = _create_job(db, body.project_id, "enhance")
    background_tasks.add_task(_run_enhance, clip.id, body.denoise, body.normalize, body.loudness, job.id)
    return {"job_id": job.id}


async def _run_enhance(clip_id, denoise, normalize, loudness, job_id):
    db   = next(get_db())
    job  = db.query(Job).filter(Job.id == job_id).first()
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    try:
        job.status = "running"; job.progress = 20; db.commit()
        out_path = clip.file_path.replace(".mp4", "_enhanced.mp4")
        await enhance_audio(clip.file_path, out_path, denoise, normalize, loudness)
        clip.file_path = out_path
        job.status = "done"; job.progress = 100; db.commit()
    except Exception as e:
        job.status = "error"; job.error = str(e); db.commit()


# ──────────────────────────────────────────────────────────────
# Export
# ──────────────────────────────────────────────────────────────
class ExportBody(BaseModel):
    project_id: str
    format:     Optional[str]  = "mp4"
    quality:    Optional[str]  = "high"
    aspect:     Optional[str]  = "9:16"
    edit_data:  Optional[dict] = None


@router.post("/export")
async def export_clip(
    body: ExportBody,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    _get_project_or_404(body.project_id, db)
    job = _create_job(db, body.project_id, "export")
    background_tasks.add_task(_run_export, body, job.id)
    return {"job_id": job.id}


async def _run_export(body: ExportBody, job_id: str):
    from services.video_processor import export_final, export_from_edl
    import os
    db  = next(get_db())
    job = db.query(Job).filter(Job.id == job_id).first()
    try:
        job.status = "running"; job.progress = 10; db.commit()

        tracks      = (body.edit_data or {}).get("tracks", [])
        video_items = []
        for track in tracks:
            if track.get("type") == "video":
                video_items = track.get("items", [])
                break

        BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")

        if video_items:
            clip_paths = {}
            for item in video_items:
                clip_id = item.get("clipId")
                if clip_id and clip_id not in clip_paths:
                    clip = db.query(Clip).filter(Clip.id == clip_id).first()
                    if clip and clip.file_path:
                        clip_paths[clip_id] = clip.file_path

            text_items = []
            for track in tracks:
                if track.get("type") == "text":
                    text_items = track.get("items", [])
                    break

            job.progress = 20; db.commit()
            out_path = await export_from_edl(
                project_id=body.project_id,
                video_items=video_items,
                clip_paths=clip_paths,
                format=body.format,
                quality=body.quality,
                aspect=body.aspect,
                job_id=job_id,
                text_items=text_items,
            )
        else:
            out_path = await export_final(body.project_id, body.format, body.quality, body.aspect, job_id)

        out_name     = Path(out_path).name
        download_url = f"{BASE_URL}/clips/{body.project_id}/{out_name}"
        job.status   = "done"; job.progress = 100
        job.result   = {"download_url": download_url}
        db.commit()
    except Exception as e:
        import traceback; traceback.print_exc()
        job.status = "error"; job.error = str(e); db.commit()


# ──────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────
def _get_clip(clip_id, project_id, db):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    clip = db.query(Clip).filter(Clip.id == clip_id, Clip.project_id == project_id).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")
    return clip


def _get_project_or_404(project_id, db):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return p


def _create_job(db, project_id, job_type):
    job = Job(
        id=str(uuid.uuid4())[:8],
        project_id=project_id,
        type=job_type,
        status="pending",
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job
