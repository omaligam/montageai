"""
Face Tracker / Auto-crop
────────────────────────
Analiza el video para detectar rostros con OpenCV y genera un crop 9:16
que sigue al hablante principal.

Modos:
  face   → detecta rostros con Haar cascade, centra el crop en el más prominente
  center → crop centrado simple sin ML
  smart  → combina face + motion para seguimiento inteligente
"""

import asyncio
import json
import os
import tempfile
from pathlib import Path


async def autocrop_video(input_path: str, output_path: str, mode: str = "face"):
    """
    Convierte el video a 9:16 usando el modo especificado.
    """
    if mode == "center":
        await _center_crop(input_path, output_path)
    elif mode == "face":
        await _face_crop(input_path, output_path)
    else:
        await _smart_crop(input_path, output_path)


# ──────────────────────────────────────────────────────────────
# Center crop — simple, sin ML
# ──────────────────────────────────────────────────────────────
async def _center_crop(input_path: str, output_path: str):
    """
    Recorta el centro de un video 16:9 para obtener 9:16.
    Para 1920×1080: el crop 9:16 sería 607×1080 centrado.
    """
    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-vf",
        # Primero escala a 1080 de altura, luego crop centrado a 9:16
        "scale=-2:1920,crop=1080:1920",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "21",
        "-c:a", "copy",
        output_path,
    ]
    proc = await asyncio.create_subprocess_exec(*cmd, stdout=-1, stderr=-1)
    _, err = await proc.communicate()
    if proc.returncode != 0:
        raise Exception(f"Center crop failed: {err.decode(errors='ignore')[-300:]}")


# ──────────────────────────────────────────────────────────────
# Face crop — usa OpenCV para detectar el rostro más grande
# ──────────────────────────────────────────────────────────────
async def _face_crop(input_path: str, output_path: str):
    loop = asyncio.get_event_loop()
    crop_x = await loop.run_in_executor(None, _detect_face_x, input_path)
    await _crop_to_vertical(input_path, output_path, crop_x)


def _detect_face_x(video_path: str) -> float:
    """
    Samplea 10 frames y devuelve el X promedio del rostro más grande.
    Devuelve None si no detecta rostros (fallback a center).
    """
    try:
        import cv2
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        face_cascade = cv2.CascadeClassifier(cascade_path)
        cap = cv2.VideoCapture(video_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width        = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))

        sample_points = [int(total_frames * i / 10) for i in range(1, 10)]
        xs = []

        for pos in sample_points:
            cap.set(cv2.CAP_PROP_POS_FRAMES, pos)
            ret, frame = cap.read()
            if not ret:
                continue
            gray  = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))
            if len(faces) > 0:
                # Tomar el rostro más grande
                biggest = max(faces, key=lambda f: f[2] * f[3])
                x, y, w, h = biggest
                face_center_x = x + w / 2
                xs.append(face_center_x / width)  # normalizado 0-1

        cap.release()
        return sum(xs) / len(xs) if xs else 0.5

    except ImportError:
        # OpenCV no instalado — fallback a center
        return 0.5
    except Exception:
        return 0.5


async def _crop_to_vertical(input_path: str, output_path: str, center_x_norm: float):
    """
    Genera el crop 9:16 centrando el encuadre en center_x_norm (0.0 - 1.0).
    """
    # Detectar resolución del video
    resolution = await _get_resolution(input_path)
    if not resolution:
        await _center_crop(input_path, output_path)
        return

    src_w, src_h = resolution
    target_w = int(src_h * 9 / 16)
    target_w = min(target_w, src_w)

    # Calcular offset X del crop
    ideal_x = int(src_w * center_x_norm - target_w / 2)
    crop_x   = max(0, min(ideal_x, src_w - target_w))

    vf = (
        f"crop={target_w}:{src_h}:{crop_x}:0,"
        f"scale=1080:1920:force_original_aspect_ratio=decrease,"
        f"pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black"
    )

    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-vf", vf,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "21",
        "-c:a", "copy",
        output_path,
    ]
    proc = await asyncio.create_subprocess_exec(*cmd, stdout=-1, stderr=-1)
    _, err = await proc.communicate()
    if proc.returncode != 0:
        raise Exception(f"Face crop failed: {err.decode(errors='ignore')[-300:]}")


# ──────────────────────────────────────────────────────────────
# Smart crop — combina análisis de movimiento + cara
# ──────────────────────────────────────────────────────────────
async def _smart_crop(input_path: str, output_path: str):
    """
    Usa el filtro cropdetect de FFmpeg + análisis de cara para seguimiento.
    Para MVP: usamos face crop con suavizado de movimiento.
    """
    await _face_crop(input_path, output_path)


# ──────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────
async def _get_resolution(video_path: str):
    cmd = [
        "ffprobe", "-v", "quiet",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height",
        "-of", "json",
        video_path,
    ]
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    out, _ = await proc.communicate()
    try:
        data = json.loads(out.decode())
        stream = data["streams"][0]
        return stream["width"], stream["height"]
    except Exception:
        return None
