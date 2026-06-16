"""
Subtitle Generator
─────────────────
1. Transcribe el clip con Groq Whisper API (word-level timestamps)
2. Genera un archivo .srt
3. Quema los subtítulos en el video con FFmpeg usando el estilo elegido
"""

import asyncio
import os
from groq import Groq


# ──────────────────────────────────────────────────────────────
# Generar .srt desde un clip
# ──────────────────────────────────────────────────────────────
async def generate_subtitles(video_path: str) -> str:
    """Transcribe el video con Groq Whisper y devuelve el path del .srt generado."""
    srt_path = video_path.replace(".mp4", ".srt")
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _transcribe_to_srt, video_path, srt_path)
    return srt_path


def _transcribe_to_srt(video_path: str, srt_path: str):
    client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

    with open(video_path, "rb") as f:
        data = f.read()

    filename = os.path.basename(video_path)
    transcription = client.audio.transcriptions.create(
        file=(filename, data),
        model="whisper-large-v3",
        response_format="verbose_json",
        timestamp_granularities=["word"],
    )

    words = getattr(transcription, "words", None) or []
    segments = getattr(transcription, "segments", None) or []

    srt_lines = []
    idx = 1

    if words:
        # Agrupar en bloques de 5 palabras
        i = 0
        while i < len(words):
            chunk = words[i: i + 5]
            t_start = chunk[0].start if hasattr(chunk[0], "start") else chunk[0].get("start", 0)
            t_end   = chunk[-1].end  if hasattr(chunk[-1], "end")   else chunk[-1].get("end", 0)
            text    = " ".join(
                (w.word if hasattr(w, "word") else w.get("word", "")).strip()
                for w in chunk
            )
            srt_lines.append(f"{idx}")
            srt_lines.append(f"{_fmt_time(t_start)} --> {_fmt_time(t_end)}")
            srt_lines.append(text.upper())
            srt_lines.append("")
            idx += 1
            i += 5
    elif segments:
        for seg in segments:
            t_start = seg.start if hasattr(seg, "start") else seg.get("start", 0)
            t_end   = seg.end   if hasattr(seg, "end")   else seg.get("end", 0)
            text    = (seg.text if hasattr(seg, "text") else seg.get("text", "")).strip()
            srt_lines.append(f"{idx}")
            srt_lines.append(f"{_fmt_time(t_start)} --> {_fmt_time(t_end)}")
            srt_lines.append(text.upper())
            srt_lines.append("")
            idx += 1
    else:
        # Fallback: un solo bloque con el texto completo
        full_text = getattr(transcription, "text", "") or ""
        srt_lines = ["1", "00:00:00,000 --> 00:00:10,000", full_text.upper(), ""]

    with open(srt_path, "w", encoding="utf-8") as f:
        f.write("\n".join(srt_lines))


def _fmt_time(seconds: float) -> str:
    h  = int(seconds // 3600)
    m  = int((seconds % 3600) // 60)
    s  = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


# ──────────────────────────────────────────────────────────────
# Quemar subtítulos en el video
# ──────────────────────────────────────────────────────────────
STYLES = {
    "default": {
        "FontName":      "Arial",
        "FontSize":      "22",
        "PrimaryColour": "&H00FFFFFF",
        "OutlineColour": "&H00000000",
        "Outline":       "2",
        "Bold":          "0",
        "Alignment":     "2",
        "MarginV":       "40",
    },
    "bold": {
        "FontName":      "Impact",
        "FontSize":      "26",
        "PrimaryColour": "&H00FFFFFF",
        "OutlineColour": "&H00000000",
        "Outline":       "4",
        "Bold":          "1",
        "Alignment":     "2",
        "MarginV":       "50",
    },
    "neon": {
        "FontName":      "Montserrat",
        "FontSize":      "24",
        "PrimaryColour": "&H00CCFF00",
        "OutlineColour": "&H00FF00FF",
        "Outline":       "3",
        "Bold":          "1",
        "Alignment":     "2",
        "MarginV":       "45",
    },
    "minimal": {
        "FontName":      "Helvetica",
        "FontSize":      "20",
        "PrimaryColour": "&H00FFFFFF",
        "OutlineColour": "&H80000000",
        "Outline":       "1",
        "Bold":          "0",
        "Alignment":     "2",
        "MarginV":       "30",
    },
}


async def burn_subtitles(video_path: str, srt_path: str, out_path: str, style: str = "bold"):
    """Quema los subtítulos .srt en el video con el estilo dado."""
    s = STYLES.get(style, STYLES["bold"])

    force_style = (
        f"FontName={s['FontName']},"
        f"FontSize={s['FontSize']},"
        f"PrimaryColour={s['PrimaryColour']},"
        f"OutlineColour={s['OutlineColour']},"
        f"Outline={s['Outline']},"
        f"Bold={s['Bold']},"
        f"Alignment={s['Alignment']},"
        f"MarginV={s['MarginV']}"
    )

    safe_srt = srt_path.replace("\\", "/").replace(":", "\\:")

    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-vf", f"subtitles={safe_srt}:force_style='{force_style}'",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "22",
        "-c:a", "copy",
        out_path,
    ]

    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, err = await process.communicate()
    if process.returncode != 0:
        raise Exception(f"FFmpeg subtitle burn failed: {err.decode(errors='ignore')[-500:]}")
