import asyncio

from pathlib import Path



async def download_video(
    url: str,
    output_dir: Path
):


    video_path = output_dir / "source_video.mp4"

    audio_path = output_dir / "audio.wav"



    print("DOWNLOAD YOUTUBE WITH COOKIES + DENO")



    cmd = [

        "yt-dlp",

        # Usar cliente iOS para bypasear bot detection de YouTube en servidores
        "--extractor-args", "youtube:player_client=ios",

        # Cookies como fallback adicional
        "--cookies",
        "/app/cookies.txt",

        "--no-playlist",

        "-f",
        "bv*[height<=720]+ba/b[height<=720]",

        "--merge-output-format",
        "mp4",

        # User agent de iOS para consistencia con player_client
        "--user-agent",
        "com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X;)",

        "-N",
        "4",

        "--concurrent-fragments",
        "4",

        "--buffer-size",
        "16K",

        "--force-overwrites",

        # Reintentar si falla
        "--retries", "3",

        "-o",
        str(video_path),

        url

    ]




    print(
        "YT COMMAND:",
        cmd
    )



    process = await asyncio.create_subprocess_exec(

        *cmd,

        stdout=asyncio.subprocess.PIPE,

        stderr=asyncio.subprocess.PIPE

    )



    out, err = await process.communicate()



    if process.returncode != 0:


        print(
            err.decode(
                errors="ignore"
            )
        )


        error_msg = err.decode(errors="ignore")[-800:]
        raise Exception(
            f"YOUTUBE DOWNLOAD FAILED: {error_msg}"
        )





    print("CREATE ANALYSIS AUDIO")



    audio_cmd = [

        "ffmpeg",

        "-y",


        "-i",
        str(video_path),


        "-vn",


        "-ac",
        "1",


        "-ar",
        "16000",


        str(audio_path)

    ]



    audio_process = await asyncio.create_subprocess_exec(

        *audio_cmd,

        stdout=asyncio.subprocess.PIPE,

        stderr=asyncio.subprocess.PIPE

    )



    await audio_process.communicate()



    return (

        video_path,

        audio_path

    )