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

    # Comprimir a MP3 mono 64kbps antes de enviar a Groq
    # WAV sin comprimir puede ser >200MB; MP3 64kbps = ~0.5MB/min
    # Límite Groq: 25MB → seguro hasta ~45 min de audio
    compressed = audio_path.with_suffix(".compressed.mp3")
    await _ffmpeg_compress(audio_path, compressed)
    src = compressed if compressed.exists() else audio_path

    # Si aún es demasiado grande (>24MB), recortar a 20 min
    if src.stat().st_size > 24 * 1024 * 1024:
        trimmed = audio_path.with_suffix(".trim.mp3")
        await _ffmpeg_trim_mp3(src, trimmed, 1200)
        src = trimmed if trimmed.exists() else src

    print(f"[transcription] Groq Whisper: {src.name} ({src.stat().st_size // 1024}KB)")
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
        # Groq puede devolver objetos o dicts según la versión de la librería
        if isinstance(s, dict):
            segments.append({
                "start": float(s["start"]),
                "end":   float(s["end"]),
                "text":  s["text"].strip(),
            })
        else:
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
async def _ffmpeg_compress(src: Path, dst: Path):
    """Convierte audio a MP3 mono 64kbps — ~0.5MB/min, bajo el límite de 25MB de Groq."""
    proc = await asyncio.create_subprocess_exec(
        "ffmpeg", "-y", "-i", str(src),
        "-ac", "1",          # mono
        "-ar", "16000",      # 16kHz — suficiente para voz
        "-b:a", "64k",       # 64kbps
        "-f", "mp3", str(dst),
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.DEVNULL,
    )
    await proc.communicate()


async def _ffmpeg_trim_mp3(src: Path, dst: Path, seconds: int):
    """Recorta un MP3 ya comprimido a N segundos."""
    proc = await asyncio.create_subprocess_exec(
        "ffmpeg", "-y", "-i", str(src), "-t", str(seconds),
        "-acodec", "copy", str(dst),
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.DEVNULL,
    )
    await proc.communicate()


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
