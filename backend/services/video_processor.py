import asyncio
import os
from pathlib import Path
from typing import Optional

LIMIT = asyncio.Semaphore(1)      # 1 a la vez — Railway OOM con >1
MAX_SHORT_DURATION = 30.0
FFMPEG_TIMEOUT     = 180

# ── Filtro 9:16 basado en expresiones FFmpeg ──────────────────────────────
# Funciona con CUALQUIER resolución de entrada sin necesitar ffprobe.
# Lógica:
#   crop_w = min(iw, ih*9/16) redondeado a par
#   x      = (iw - crop_w) / 2  (centrado)
#   Luego escala a 1080×1920 para Shorts/TikTok/Reels calidad máxima
#
# Nota: las comas DENTRO de expresiones FFmpeg se escapan con \,
# cuando se pasa via subprocess (sin shell).
VF_9_16 = (
    r"crop='trunc(min(iw\,ih*9/16)/2)*2':ih"
    r":'(iw-trunc(min(iw\,ih*9/16)/2)*2)/2':0"
    ",scale=1080:1920:flags=bicubic"
)


async def process_clips(
    video_path: Path,
    hooks: list[dict],
    transcript: list[dict],
    output_dir: Path,
):
    print(f"[processor] vf={VF_9_16}")
    tasks = [
        create_clip(video_path, hook, output_dir, i)
        for i, hook in enumerate(hooks[:10], start=1)
    ]
    results = await asyncio.gather(*tasks)
    good = [r for r in results if r and "_error" not in r]
    bad  = [r for r in results if r and "_error" in r]
    first_err = bad[0]["_error"][:800] if bad else None
    if bad:
        print(f"[processor] {len(bad)} clips failed. First error: {first_err[:400]}")
    return good, first_err


async def create_clip(video_path, hook, output_dir, index):
    async with LIMIT:
        try:
            start    = max(float(hook["start_time"]), 0)
            end      = float(hook["end_time"])
            duration = min(end - start, MAX_SHORT_DURATION)

            clip  = output_dir / f"short_{index}.mp4"
            thumb = output_dir / f"thumb_{index}.jpg"

            print(f"[processor] clip {index}: {start:.1f}s → {start+duration:.1f}s ({duration:.1f}s)")

            # ── FFmpeg: crop 9:16 + escala a 1080p + calidad alta ──
            cmd = [
                "ffmpeg", "-y",
                "-ss",  str(start),
                "-i",   str(video_path),
                "-t",   str(duration),
                "-vf",  VF_9_16,
                "-c:v", "libx264",
                "-preset", "veryfast",
                "-crf",    "18",
                "-pix_fmt", "yuv420p",
                "-c:a", "aac",
                "-b:a", "192k",
                "-ar",  "48000",
                str(clip),
            ]

            print(f"[processor] cmd clip {index}: {' '.join(cmd)}")
            proc = await asyncio.create_subprocess_exec(
                *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            try:
                _, err = await asyncio.wait_for(proc.communicate(), timeout=FFMPEG_TIMEOUT)
            except asyncio.TimeoutError:
                proc.kill()
                return {"_error": f"FFmpeg timeout {FFMPEG_TIMEOUT}s", "index": index}

            fferr = err.decode(errors="ignore")
            if proc.returncode != 0:
                # Mostrar principio Y final del stderr para debug
                print(f"[processor] FFmpeg FAILED clip {index} rc={proc.returncode}")
                print(f"  START: {fferr[:500]}")
                print(f"  END:   {fferr[-500:]}")
                return {"_error": f"rc={proc.returncode} | {fferr[:400]}", "index": index}
            if not clip.exists() or clip.stat().st_size == 0:
                print(f"[processor] clip {index} empty. stderr: {fferr[:500]}")
                return {"_error": f"empty_output | {fferr[:400]}", "index": index}

            # ── Thumbnail (ultrafast, solo 1 frame) ───────────
            tproc = await asyncio.create_subprocess_exec(
                "ffmpeg", "-y",
                "-ss", str(start + 1),
                "-i",  str(video_path),
                "-frames:v", "1",
                "-vf", "scale=540:960",
                "-q:v", "3",
                str(thumb),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            await tproc.communicate()

            return {
                "title":      hook.get("title", f"Clip {index}"),
                "hook":       hook.get("hook", ""),
                "score":      hook.get("score", 9),
                "duration":   duration,
                "clip_path":  str(clip),
                "start_time": start,
                "end_time":   start + duration,
            }

        except Exception as e:
            print(f"[processor] Error clip {index}: {e}")
            return None


# ──────────────────────────────────────────────────────────────
# Export settings
# ──────────────────────────────────────────────────────────────
QUALITY_PRESETS = {
    "low":    {"crf": "28", "preset": "fast",   "bitrate": "4M"},
    "medium": {"crf": "23", "preset": "medium", "bitrate": "8M"},
    "high":   {"crf": "17", "preset": "slow",   "bitrate": "15M"},
}

ASPECT_FILTERS = {
    "9:16": "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
    "16:9": "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080",
    "1:1":  "scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080",
}


async def _ffmpeg(cmd: list) -> None:
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, err = await proc.communicate()
    if proc.returncode != 0:
        raise Exception(f"FFmpeg failed:\n{err.decode()[-800:]}")


# ──────────────────────────────────────────────────────────────
# Helpers para text overlay (drawtext)
# ──────────────────────────────────────────────────────────────

def _escape_drawtext(text: str) -> str:
    """Escapa caracteres especiales para el filtro drawtext de FFmpeg."""
    return (
        text
        .replace("\\", "\\\\")
        .replace("'",  "\\'")
        .replace(":",  "\\:")
        .replace("[",  "\\[")
        .replace("]",  "\\]")
    )


def _build_text_filters(text_items: list, track_start: float, track_end: float) -> list[str]:
    """
    Devuelve filtros drawtext para los overlays de texto que caen
    dentro del segmento [track_start, track_end].
    El tiempo de enable es relativo al inicio del segmento.
    """
    filters = []
    for item in text_items:
        t_start = float(item.get("trackStart", 0))
        t_end   = float(item.get("trackEnd",   0))
        # Sin solapamiento con este segmento
        if t_end <= track_start or t_start >= track_end:
            continue

        rel_start = max(t_start - track_start, 0.0)
        rel_end   = min(t_end   - track_start, track_end - track_start)
        text      = _escape_drawtext(item.get("text", ""))
        fontsize  = int(item.get("fontSize", 48))
        color     = item.get("color", "#ffffff").lstrip("#")
        if not text:
            continue

        # Posición: centrado horizontalmente, 120px del borde inferior
        filters.append(
            f"drawtext=text='{text}'"
            f":fontsize={fontsize}"
            f":fontcolor=0x{color}"
            f":x=(w-tw)/2"
            f":y=h-150"
            f":shadowx=2:shadowy=2:shadowcolor=black"
            f":enable='between(t\\,{rel_start:.3f}\\,{rel_end:.3f})'"
        )
    return filters


# ──────────────────────────────────────────────────────────────
# Export desde EDL del editor (ruta principal)
# ──────────────────────────────────────────────────────────────
async def export_from_edl(
    project_id: str,
    video_items: list,
    clip_paths: dict,       # { clipId: "/path/to/short_N.mp4" }
    format: str   = "mp4",
    quality: str  = "high",
    aspect: str   = "9:16",
    job_id: str   = "out",
    text_items: Optional[list] = None,  # overlays de texto del timeline
) -> str:
    output_dir = Path("/tmp/montageai_outputs") / project_id
    output_dir.mkdir(parents=True, exist_ok=True)
    tmp_dir = output_dir / f"_edl_{job_id}"
    tmp_dir.mkdir(parents=True, exist_ok=True)

    q          = QUALITY_PRESETS.get(quality, QUALITY_PRESETS["high"])
    aspect_vf  = ASPECT_FILTERS.get(aspect, ASPECT_FILTERS["9:16"])
    ext        = "webm" if format == "webm" else "mp4"
    text_items = text_items or []

    # Los clips de create_clip están en 720x1280 9:16.
    # Si el aspect pedido es 9:16 y no hay text overlays, podemos
    # copiar segmentos con -c copy (sin re-encode → ~20x más rápido).
    can_stream_copy = (aspect == "9:16" and not text_items)

    # ── 1. Extraer cada segmento del timeline ─────────────────
    seg_files = []
    for i, item in enumerate(video_items):
        clip_id     = item.get("clipId")
        src_path    = clip_paths.get(clip_id)
        if not src_path or not Path(src_path).exists():
            print(f"[edl] skipping item {i}: clip not found for {clip_id}")
            continue

        src_start   = float(item.get("srcStart",   0))
        track_start = float(item.get("trackStart", 0))
        track_end   = float(item.get("trackEnd",   0))
        duration    = track_end - track_start
        if duration <= 0:
            continue

        seg_path = str(tmp_dir / f"seg_{i:04d}.mp4")

        if can_stream_copy:
            # Stream copy: sin re-encode, instantáneo
            await _ffmpeg([
                "ffmpeg", "-y",
                "-ss", str(src_start),
                "-i",  src_path,
                "-t",  str(duration),
                "-c",  "copy",
                "-movflags", "+faststart",
                seg_path,
            ])
        else:
            # Re-encode necesario (aspect distinto o hay texto)
            text_filters = _build_text_filters(text_items, track_start, track_end)
            vf_parts     = [aspect_vf] + text_filters
            vf           = ",".join(vf_parts)
            await _ffmpeg([
                "ffmpeg", "-y",
                "-ss",  str(src_start),
                "-i",   src_path,
                "-t",   str(duration),
                "-vf",  vf,
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
                "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-b:a", "192k",
                "-ar",  "48000",
                "-movflags", "+faststart",
                seg_path,
            ])

        seg_files.append(seg_path)

    if not seg_files:
        raise Exception("No valid segments to export — add clips to the timeline first")

    # ── 2. Si solo hay un segmento, ya está listo ─────────────
    out = str(output_dir / f"export_{job_id}.{ext}")

    if len(seg_files) == 1:
        import shutil
        shutil.copy2(seg_files[0], out)
    else:
        # ── 3. Concatenar con concat demuxer ──────────────────
        list_path = str(tmp_dir / "concat.txt")
        with open(list_path, "w") as f:
            for seg in seg_files:
                f.write(f"file '{seg}'\n")

        if format == "webm":
            # Para webm re-encode al final
            await _ffmpeg([
                "ffmpeg", "-y",
                "-f", "concat", "-safe", "0", "-i", list_path,
                "-c:v", "libvpx-vp9", "-b:v", q["bitrate"],
                "-c:a", "libopus", "-b:a", "192k",
                out,
            ])
        else:
            await _ffmpeg([
                "ffmpeg", "-y",
                "-f", "concat", "-safe", "0", "-i", list_path,
                "-c", "copy",   # los segmentos ya tienen el mismo codec/resolución
                "-movflags", "+faststart",
                out,
            ])

    # Limpiar temporales
    import shutil as _shutil
    _shutil.rmtree(tmp_dir, ignore_errors=True)

    print(f"[edl] exported {len(seg_files)} segments → {out}")
    return out


# ──────────────────────────────────────────────────────────────
# Export fallback: primer clip disponible (sin edit_data)
# ──────────────────────────────────────────────────────────────
async def export_final(
    project_id: str,
    format: str  = "mp4",
    quality: str = "high",
    aspect: str  = "9:16",
    job_id: str  = "final",
) -> str:
    output_dir = Path("/tmp/montageai_outputs") / project_id
    output_dir.mkdir(parents=True, exist_ok=True)

    source = None
    for i in range(1, 20):
        candidate = output_dir / f"short_{i}.mp4"
        if candidate.exists():
            source = str(candidate)
            break

    if not source:
        raise Exception("No source clips found — process a video first")

    q   = QUALITY_PRESETS.get(quality, QUALITY_PRESETS["high"])
    vf  = ASPECT_FILTERS.get(aspect, ASPECT_FILTERS["9:16"])
    ext = "webm" if format == "webm" else "mp4"
    out = str(output_dir / f"export_{job_id}.{ext}")

    if format == "webm":
        cmd = [
            "ffmpeg", "-y", "-i", source,
            "-vf", vf,
            "-c:v", "libvpx-vp9", "-b:v", q["bitrate"],
            "-c:a", "libopus", "-b:a", "192k",
            out,
        ]
    else:
        buf = str(int(q["bitrate"][:-1]) * 2) + "M"
        cmd = [
            "ffmpeg", "-y", "-i", source,
            "-vf", vf,
            "-c:v", "libx264", "-preset", q["preset"], "-crf", q["crf"],
            "-maxrate", q["bitrate"], "-bufsize", buf,
            "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "320k",
            "-movflags", "+faststart", out,
        ]

    await _ffmpeg(cmd)
    return out
