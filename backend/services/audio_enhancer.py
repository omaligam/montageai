"""
Audio Enhancer
──────────────
Mejora el audio de un clip usando filtros FFmpeg:
  - Reducción de ruido (afftdn)
  - Normalización de volumen (loudnorm a estándar -14 LUFS)
  - Ecualizador básico (énfasis en frecuencias de voz)
  - Gate de ruido (silenceremove ligero)
"""

import asyncio


async def enhance_audio(
    input_path: str,
    output_path: str,
    denoise: bool = True,
    normalize: bool = True,
    loudness_lufs: float = -14.0,
) -> None:
    filters = []

    # 1. Reducción de ruido con FFmpeg afftdn (noise gate espectral)
    if denoise:
        filters.append("afftdn=nf=-25")

    # 2. Ecualizador de voz: boost 1-4 kHz (claridad), cut <80 Hz (ruido bajo)
    filters.append("equalizer=f=80:t=h:width=100:g=-6")
    filters.append("equalizer=f=2500:t=o:width=1500:g=3")

    # 3. Compresor dinámico suave (hace la voz más consistente)
    filters.append("acompressor=threshold=0.1:ratio=3:attack=5:release=50:gain=2")

    # 4. Normalización loudnorm (estándar streaming/podcast)
    if normalize:
        filters.append(f"loudnorm=I={loudness_lufs}:LRA=11:TP=-1.5")

    af = ",".join(filters)

    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-af", af,
        "-c:v", "copy",
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
        raise Exception(f"Audio enhance failed: {err.decode(errors='ignore')[-500:]}")
