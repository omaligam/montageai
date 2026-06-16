"""
Silence Remover
───────────────
Usa FFmpeg `silencedetect` para detectar los silencios en el video
y luego los corta concatenando los segmentos hablados.
"""

import asyncio
import re
import tempfile
from pathlib import Path


async def remove_silences(
    input_path: str,
    output_path: str,
    min_silence_ms: int = 600,
    silence_db: float = -35.0,
) -> dict:
    """
    Detecta y elimina silencios en el video.

    Returns dict con:
      - removed_count: cantidad de silencios eliminados
      - original_duration: duración original
      - new_duration: duración tras corte
      - time_saved: segundos ahorrados
    """
    min_silence_sec = min_silence_ms / 1000.0

    # 1) Detectar silencios
    silence_ranges = await _detect_silences(input_path, min_silence_sec, silence_db)

    if not silence_ranges:
        # No hay silencios — copiar el archivo tal cual
        cmd = ["ffmpeg", "-y", "-i", input_path, "-c", "copy", output_path]
        proc = await asyncio.create_subprocess_exec(*cmd, stdout=-1, stderr=-1)
        await proc.communicate()
        duration = await _get_duration(input_path)
        return {
            "removed_count":      0,
            "original_duration":  duration,
            "new_duration":       duration,
            "time_saved":         0,
        }

    # 2) Calcular segmentos de audio (los intervalos entre silencios)
    duration   = await _get_duration(input_path)
    keep_segs  = _invert_silences(silence_ranges, duration)

    if not keep_segs:
        raise Exception("No speech segments found — video might be entirely silent")

    # 3) Construir filtro FFmpeg para concatenar segmentos
    await _concat_segments(input_path, keep_segs, output_path)

    new_duration = sum(end - start for start, end in keep_segs)
    time_saved   = duration - new_duration

    return {
        "removed_count":     len(silence_ranges),
        "original_duration": round(duration, 2),
        "new_duration":      round(new_duration, 2),
        "time_saved":        round(time_saved, 2),
    }


# ──────────────────────────────────────────────────────────────
# Detectar silencios con FFmpeg silencedetect
# ──────────────────────────────────────────────────────────────
async def _detect_silences(
    video_path: str, min_silence_sec: float, silence_db: float
) -> list:
    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-af", f"silencedetect=noise={silence_db}dB:duration={min_silence_sec}",
        "-f", "null", "-",
    ]
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()
    output = stderr.decode(errors="ignore")

    starts = [float(m) for m in re.findall(r"silence_start: (\S+)", output)]
    ends   = [float(m) for m in re.findall(r"silence_end: (\S+)", output)]

    return list(zip(starts, ends))


# ──────────────────────────────────────────────────────────────
# Invertir silencios → segmentos de habla
# ──────────────────────────────────────────────────────────────
def _invert_silences(silences: list, total_duration: float) -> list:
    segs   = []
    cursor = 0.0
    for sil_start, sil_end in silences:
        if sil_start > cursor + 0.05:
            segs.append((cursor, sil_start))
        cursor = sil_end
    if cursor < total_duration - 0.05:
        segs.append((cursor, total_duration))
    return segs


# ──────────────────────────────────────────────────────────────
# Concatenar segmentos con FFmpeg filter_complex
# ──────────────────────────────────────────────────────────────
async def _concat_segments(input_path: str, segs: list, output_path: str):
    # Construir filtro: trim cada segmento y luego concat
    filter_parts = []
    labels_v     = []
    labels_a     = []

    for i, (start, end) in enumerate(segs):
        duration = end - start
        filter_parts.append(
            f"[0:v]trim=start={start}:duration={duration},setpts=PTS-STARTPTS[v{i}];"
            f"[0:a]atrim=start={start}:duration={duration},asetpts=PTS-STARTPTS[a{i}]"
        )
        labels_v.append(f"[v{i}]")
        labels_a.append(f"[a{i}]")

    n = len(segs)
    concat_filter = (
        ";".join(filter_parts) + ";"
        + "".join(labels_v) + "".join(labels_a)
        + f"concat=n={n}:v=1:a=1[outv][outa]"
    )

    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-filter_complex", concat_filter,
        "-map", "[outv]",
        "-map", "[outa]",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "22",
        "-c:a", "aac",
        "-b:a", "192k",
        output_path,
    ]

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, err = await proc.communicate()
    if proc.returncode != 0:
        raise Exception(f"Silence concat failed: {err.decode(errors='ignore')[-500:]}")


# ──────────────────────────────────────────────────────────────
async def _get_duration(path: str) -> float:
    cmd = [
        "ffprobe", "-v", "quiet",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        path,
    ]
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    out, _ = await proc.communicate()
    try:
        return float(out.decode().strip())
    except Exception:
        return 0.0
