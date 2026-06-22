import asyncio
from pathlib import Path


async def download_video(url: str, output_dir: Path):
    video_path = output_dir / "source_video.mp4"
    audio_path = output_dir / "audio.wav"

    print("DOWNLOAD YOUTUBE WITH COOKIES + tv_embedded")

    cmd = [
        "yt-dlp",
        "--cookies", "/app/cookies.txt",
        "--extractor-args", "youtube:player_client=tv_embedded,android_creator",
        "--no-playlist",
        "-f", "bv*[height<=720]+ba/b[height<=720]",
        "--merge-output-format", "mp4",
        "-N", "4",
        "--concurrent-fragments", "4",
        "--buffer-size", "16K",
        "--force-overwrites",
        "--no-check-certificates",
        "--retries", "3",
        "--no-warnings",
        "-o", str(video_path),
        url
    ]

    print("YT COMMAND:", cmd)

    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )

    out, err = await process.communicate()

    if process.returncode != 0:
        print(err.decode(errors="ignore"))
        error_msg = err.decode(errors="ignore")[-800:]
        raise Exception(f"YOUTUBE DOWNLOAD FAILED: {error_msg}")

    print("CREATE ANALYSIS AUDIO")

    audio_cmd = [
        "ffmpeg", "-y",
        "-i", str(video_path),
        "-vn", "-ac", "1", "-ar", "16000",
        str(audio_path)
    ]

    audio_process = await asyncio.create_subprocess_exec(
        *audio_cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )

    await audio_process.communicate()

    return (video_path, audio_path)
