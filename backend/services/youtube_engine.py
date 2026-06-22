import asyncio
import os
from pathlib import Path


async def _run_yt_dlp(cmd: list) -> tuple[int, str, str]:
    """Run yt-dlp and return (returncode, stdout, stderr)."""
    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    out, err = await process.communicate()
    return process.returncode, out.decode(errors="ignore"), err.decode(errors="ignore")


# Strategies to try in order — each is (description, extra_args)
_STRATEGIES = [
    # 1. web_creator: YouTube's creator client — works without cookies on cloud IPs
    ("web_creator (no cookies)", [
        "--extractor-args", "youtube:player_client=web_creator",
    ]),
    # 2. mweb: mobile web client — lighter bot detection
    ("mweb (no cookies)", [
        "--extractor-args", "youtube:player_client=mweb",
    ]),
    # 3. tv_embedded + cookies (original approach)
    ("tv_embedded + cookies", [
        "--cookies", "/app/cookies.txt",
        "--extractor-args", "youtube:player_client=tv_embedded",
    ]),
    # 4. android_creator without cookies
    ("android_creator (no cookies)", [
        "--extractor-args", "youtube:player_client=android_creator",
    ]),
    # 5. Default client with cookies (last resort)
    ("default + cookies", [
        "--cookies", "/app/cookies.txt",
    ]),
]

_BASE_ARGS = [
    "--no-playlist",
    "-f", "bv*[height<=720]+ba/b[height<=720]",
    "--merge-output-format", "mp4",
    "--force-overwrites",
    "--no-check-certificates",
    "--retries", "2",
    "--socket-timeout", "30",
    "--add-header", "User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0 Safari/537.36",
]


async def download_video(url: str, output_dir: Path):
    video_path = output_dir / "source_video.mp4"
    audio_path = output_dir / "audio.wav"

    last_error = "No strategies attempted"

    for description, strategy_args in _STRATEGIES:
        print(f"[youtube] Trying strategy: {description}")
        cmd = ["yt-dlp"] + strategy_args + _BASE_ARGS + ["-o", str(video_path), url]

        rc, out, err = await _run_yt_dlp(cmd)
        print(f"[youtube] {description} → rc={rc}")

        if rc == 0 and video_path.exists() and video_path.stat().st_size > 10_000:
            print(f"[youtube] SUCCESS with strategy: {description}")
            break

        # Log the error for debugging
        last_error = (err + out)[-600:]
        print(f"[youtube] FAILED ({description}): {last_error[-200:]}")
        # Clean up partial file
        if video_path.exists():
            video_path.unlink(missing_ok=True)
    else:
        raise Exception(f"YouTube download failed after all strategies. Last error: {last_error}")

    if not video_path.exists() or video_path.stat().st_size < 10_000:
        raise Exception(f"YouTube download failed after all strategies. Last error: {last_error}")

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
