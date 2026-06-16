import os
import time
import shutil
import uuid
import traceback
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from database import create_tables
from routers import projects, ai_tools, templates
from services.youtube_engine import download_video
from services.transcription import transcribe_audio
from services.hook_detector import find_hooks
from services.video_processor import process_clips

BASE_URL    = os.getenv("BASE_URL", "http://localhost:8000")
OUTPUTS_DIR = Path("/tmp/montageai_outputs")
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

# ──────────────────────────────────────────────────────────────
# App
# ──────────────────────────────────────────────────────────────
app = FastAPI(title="MontageAI", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/clips", StaticFiles(directory=str(OUTPUTS_DIR)), name="clips")

# ──────────────────────────────────────────────────────────────
# Routers
# ──────────────────────────────────────────────────────────────
app.include_router(projects.router)
app.include_router(ai_tools.router)
app.include_router(templates.router)

# ──────────────────────────────────────────────────────────────
# Startup
# ──────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    create_tables()
    # Limpiar jobs que quedaron en "running" de sesiones anteriores
    from database import get_db, Job, Project
    db = next(get_db())
    stuck = db.query(Job).filter(Job.status.in_(["running", "pending"])).all()
    for job in stuck:
        job.status = "error"
        job.error  = "El servidor se reinició mientras procesaba. Intenta de nuevo."
        project = db.query(Project).filter(Project.id == job.project_id).first()
        if project and project.status == "processing":
            project.status = "error"
    db.commit()
    if stuck:
        print(f"⚠ Limpiados {len(stuck)} jobs huérfanos")
    print("MontageAI v2.0 ✓")


# ──────────────────────────────────────────────────────────────
# Health
# ──────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "version": "2.0"}


# ──────────────────────────────────────────────────────────────
# Legacy endpoint (sin auth — backward compat)
# ──────────────────────────────────────────────────────────────
class LegacyRequest(BaseModel):
    url: str


@app.post("/generate-clips")
async def generate_clips_legacy(req: LegacyRequest):
    if not req.url:
        raise HTTPException(400, "Missing URL")

    job_id  = str(uuid.uuid4())[:8]
    job_dir = OUTPUTS_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    _cleanup_old_jobs()

    try:
        video_path, audio_path = await download_video(req.url, job_dir)
        transcript = await transcribe_audio(audio_path)
        hooks      = await find_hooks(transcript)
        clips_data = await process_clips(video_path, hooks, transcript, job_dir)

        results = []
        for i, clip in enumerate(clips_data, start=1):
            results.append({
                "title":         clip.get("title", f"Short {i}"),
                "hook":          clip.get("hook", ""),
                "score":         clip.get("score", 9.0),
                "duration":      clip.get("duration", 0),
                "download_url":  f"{BASE_URL}/clips/{job_id}/short_{i}.mp4",
                "thumbnail_url": f"{BASE_URL}/clips/{job_id}/thumb_{i}.jpg",
            })

        return {"job_id": job_id, "clips": results}

    except Exception as e:
        traceback.print_exc()
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(500, str(e))


def _cleanup_old_jobs():
    now = time.time()
    for folder in OUTPUTS_DIR.iterdir():
        try:
            if folder.is_dir() and (now - folder.stat().st_mtime) > 86400:
                shutil.rmtree(folder, ignore_errors=True)
        except Exception:
            pass
