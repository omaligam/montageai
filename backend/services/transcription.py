import asyncio
import os
from pathlib import Path

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")


async def transcribe_audio(audio_path: Path) -> list:
    """
    Transcribe audio con Groq Whisper (gratis).
    Fallback: faster-whisper local si no hay API key.
    """
    if GROQ_API_KEY:
        return await _transcribe_groq(audio_path)
    else:
        return await _transcribe_local(audio_path)


# ── Groq Whisper (cloud, gratis) ──────────────────────────────
async def _transcribe_groq(audio_path: Path) -> list:
    """Usa Groq Whisper API — gratis, rápido (~10s para 30 min de audio)."""
    try:
        from groq import AsyncGroq
    except ImportError:
        print("[transcription] groq package not installed, falling back to local")
        return await _transcribe_local(audio_path)

    # Recortar a 25 min (límite de Groq: 25MB / ~25 min a 128kbps)
    trimmed = Path(str(audio_path).replace(".wav", "_trim.wav"))
    await _ffmpeg_trim(audio_path, trimmed, 1500)
    src = trimmed if trimmed.exists() else audio_path

    print(f"[transcription] Groq Whisper: {src.name}")
    client = AsyncGroq(api_key=GROQ_API_KEY)

    with open(src, "rb") as f:
        result = await client.audio.transcriptions.create(
            file=(src.name, f),
            model="whisper-large-v3-turbo",
            response_format="verbose_json",
            timestamp_granularities=["segment"],
        )

    segments = []
    for s in result.segments:
        segments.append({
            "start": float(s.start),
            "end":   float(s.end),
            "text":  s.text.strip(),
        })

    print(f"[transcription] Groq done: {len(segments)} segments")
    return segments


# ── Local Whisper (fallback sin API key) ─────────────────────
async def _transcribe_local(audio_path: Path) -> list:
    """faster-whisper local como fallback (requiere instalación)."""
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print("[transcription] faster-whisper not available — returning empty")
        return []

    trimmed = Path(str(audio_path).replace(".wav", "_trim.wav"))
    await _ffmpeg_trim(audio_path, trimmed, 1200)
    src = trimmed if trimmed.exists() else audio_path

    print(f"[transcription] Local Whisper tiny: {src.name}")
    model = WhisperModel("tiny", device="cpu", compute_type="int8", cpu_threads=4)

    loop = asyncio.get_event_loop()
    def _run():
        raw, _ = model.transcribe(str(src), beam_size=1, vad_filter=True)
        return [{"start": float(s.start), "end": float(s.end), "text": s.text.strip()} for s in raw]

    segments = await loop.run_in_executor(None, _run)
    print(f"[transcription] Local done: {len(segments)} segments")
    return segments


# ── Shared helpers ────────────────────────────────────────────
async def _ffmpeg_trim(src: Path, dst: Path, seconds: int):
    proc = await asyncio.create_subprocess_exec(
        "ffmpeg", "-y", "-i", str(src), "-t", str(seconds), "-c", "copy", str(dst),
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.DEVNULL,
    )
    await proc.communicate()


def segments_to_text(segments: list) -> str:
    return "\n".join(f"[{s['start']:.1f}-{s['end']:.1f}] {s['text']}" for s in segments)


def get_text_in_range(segments: list, start: float, end: float) -> list:
    return [s for s in segments if s["end"] >= start and s["start"] <= end]
