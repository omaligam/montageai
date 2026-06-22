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
# Ordered from least to most aggressive bot-bypass
_STRATEGIES = [
    # 1. web_creator: YouTube's creator client — often works on cloud IPs
    ("web_creator", [
        "--extractor-args", "youtube:player_client=web_creator",
    ]),
    # 2. ios: iOS native client — lighter detection than web
    ("ios", [
        "--extractor-args", "youtube:player_client=ios",
    ]),
    # 3. android: Android native client
    ("android", [
        "--extractor-args", "youtube:player_client=android",
    ]),
    # 4. mweb: mobile web — lighter bot detection
    ("mweb", [
        "--extractor-args", "youtube:player_client=mweb",
    ]),
    # 5. tv_embedded + cookies
    ("tv_embedded+cookies", [
        "--cookies", "/app/cookies.txt",
        "--extractor-args", "youtube:player_client=tv_embedded",
    ]),
    # 6. web_embedded: embedded player — bypasses some restrictions
    ("web_embedded", [
        "--extractor-args", "youtube:player_client=web_embedded_player",
    ]),
    # 7. android_creator
    ("android_creator", [
        "--extractor-args", "youtube:player_client=android_creator",
    ]),
    # 8. Default with cookies (last resort)
    ("default+cookies", [
        "--cookies", "/app/cookies.txt",
    ]),
]

_BASE_ARGS = [
    "--no-playlist",
    "-f", "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/bv*[height<=1080]+ba/b[height<=1080]/best",
    "--merge-output-format", "mp4",
    "--force-overwrites",
    "--no-check-certificates",
    "--retries", "2",
    "--socket-timeout", "30",
    "--add-header", "User-Agent:Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0 Mobile Safari/537.36",
]

# Strategies to retry if all fail (most likely to succeed on retry)
_RETRY_STRATEGIES = ["ios", "android", "tv_embedded+cookies"]


async def _try_strategies(strategies, video_path, url, label=""):
    """Try a list of strategy names. Returns last_error or None on success."""
    strat_map = {s[0]: s for s in _STRATEGIES}
    last_error = "No strategies attempted"

    for name in strategies:
        if name not in strat_map:
            continue
        description, strategy_args = strat_map[name]
        print(f"[youtube] {label}Trying strategy: {description}")
        cmd = ["yt-dlp"] + strategy_args + _BASE_ARGS + ["-o", str(video_path), url]

        rc, out, err = await _run_yt_dlp(cmd)
        print(f"[youtube] {description} → rc={rc}")

        if rc == 0 and video_path.exists() and video_path.stat().st_size > 10_000:
            print(f"[youtube] SUCCESS with strategy: {description}")
            return None  # success

        last_error = (err + out)[-600:]
        print(f"[youtube] FAILED ({description}): {last_error[-200:]}")
        if video_path.exists():
            video_path.unlink(missing_ok=True)

    return last_error  # all failed


async def download_video(url: str, output_dir: Path):
    video_path = output_dir / "source_video.mp4"
    audio_path = output_dir / "audio.wav"

    # Pass 1: try all strategies in order
    all_names = [s[0] for s in _STRATEGIES]
    last_error = await _try_strategies(all_names, video_path, url)

    if last_error is not None:
        # Pass 2: wait 10s and retry with the strategies most likely to work
        print(f"[youtube] All strategies failed. Waiting 10s before retry...")
        await asyncio.sleep(10)
        last_error = await _try_strategies(_RETRY_STRATEGIES, video_path, url, label="RETRY ")

    if last_error is not None:
        raise Exception(f"YouTube download failed after all strategies. Last error: {last_error}")

    if not video_path.exists() or video_path.stat().st_size < 10_000:
        raise Exception("YouTube download produced no file.")

    print("[youtube] Extracting audio for transcription...")

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
