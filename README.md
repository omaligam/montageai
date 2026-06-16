# MontageAI

Convert any YouTube video into 10 viral Shorts automatically.

## Stack

- **Frontend**: Next.js 14 + Tailwind CSS
- **Backend**: Python FastAPI + yt-dlp + FFmpeg
- **AI**: Local Whisper via faster-whisper (transcription) + local Ollama `qwen3.6` (hook detection)

## How It Works

1. Paste a YouTube URL
2. Backend downloads the video via yt-dlp (using `cookies.txt`)
3. Extracts audio → transcribes locally with faster-whisper
4. Ollama (`qwen3.6`) analyzes transcript → picks the 10 best viral moments
5. FFmpeg cuts each clip and converts it to 9:16 (1080×1920)
6. Downloads available as MP4

---

## Local Setup

### Prerequisites

- Docker + Docker Compose
- [Ollama](https://ollama.com) running on the host with the `qwen3.6` model pulled (`ollama pull qwen3.6`)
- A valid `cookies.txt` (Netscape format) exported from a logged-in YouTube session, placed at the project root

### Run

```bash
# 1. Clone & enter
git clone <repo>
cd montageai

# 2. Configure environment
cp .env.example .env

# 3. Start both services
docker-compose up --build
```

Frontend: http://localhost:3000  
Backend API: http://localhost:8000  
API docs: http://localhost:8000/docs

---

## Manual Setup (no Docker)

### Backend

```bash
cd backend

# Install system deps (Ubuntu/Debian)
sudo apt install ffmpeg

# Python env
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configure
cp .env.example .env

# Run
python main.py
```

> Make sure Ollama is running locally with `qwen3.6` pulled, and that `cookies.txt` is present in `backend/`.

### Frontend

```bash
cd frontend
npm install

# Configure
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000

npm run dev
```

---

## Deploy to Railway

### Backend Service

1. New project → Deploy from GitHub
2. Set root directory: `backend`
3. Railway auto-detects Dockerfile
4. Add environment variables:
   - `BASE_URL` = https://your-backend.railway.app
5. Ollama must be reachable from the backend — either run it on a separate
   reachable host and update `OLLAMA_URL` in `services/hook_detector.py`,
   or deploy an Ollama service alongside the backend

### Frontend Service

1. Add new service to same project
2. Set root directory: `frontend`
3. Add environment variable:
   - `NEXT_PUBLIC_API_URL` = https://your-backend.railway.app
   - Set as build arg too in Railway settings

---

## API Reference

### POST /generate-clips

**Request:**
```json
{
  "url": "https://youtube.com/watch?v=VIDEO_ID"
}
```

**Response:**
```json
{
  "job_id": "abc12345",
  "clips": [
    {
      "title": "This will blow your mind",
      "hook": "The moment where he reveals the secret...",
      "download_url": "http://localhost:8000/clips/abc12345/short_1.mp4",
      "thumbnail_url": "http://localhost:8000/clips/abc12345/thumb_1.jpg",
      "duration": 58.4,
      "score": 9.2
    }
  ]
}
```

---

## Notes

- Videos up to ~2 hours are supported
- Processing time: ~2-5 minutes per video
- Clips are stored in `/tmp/montageai_outputs/<job_id>/` and served via `/clips/` static endpoint
- Clips are not persisted across container restarts — download them after generation
- For production, mount a persistent volume at `/tmp/montageai_outputs`
