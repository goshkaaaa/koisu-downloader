import json
import os
import re
import subprocess
import sys
import time
import uuid
from pathlib import Path

import imageio_ffmpeg
import yt_dlp

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

LOCAL_BIN = Path(__file__).parent / "bin"
if (LOCAL_BIN / "ffmpeg.exe").exists():
    FFMPEG_DIR = str(LOCAL_BIN.resolve())
    FFMPEG_EXE = str((LOCAL_BIN / "ffmpeg.exe").resolve())
else:
    FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()
    FFMPEG_DIR = os.path.dirname(FFMPEG_EXE)

os.environ["PATH"] = FFMPEG_DIR + os.pathsep + os.environ.get("PATH", "")

DOWNLOAD_DIR = Path("downloads")
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

TIKTOK_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) "
        "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 "
        "Mobile/15E148 Safari/604.1"
    ),
    "Referer": "https://www.tiktok.com/",
    "Accept-Language": "en-US,en;q=0.9,ru;q=0.8",
}

def sanitize_filename(name: str) -> str:
    cleaned = re.sub(r'[\\/*?:"<>|]', "", name)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return (cleaned or "koisu_download")[:160]

def emit(data: dict):
    print("JSON_MSG:" + json.dumps(data, ensure_ascii=False), flush=True)

def get_cookie_opts():
    for cookie_path in [Path("cookies.txt"), Path("downloads/cookies.txt")]:
        if cookie_path.exists() and cookie_path.stat().st_size > 0:
            return {"cookiefile": str(cookie_path.resolve())}
    return {}

def detect_platform(url: str, requested: str | None = None) -> str:
    requested = (requested or "").lower().strip()
    if requested in {"youtube", "tiktok"}:
        return requested

    lowered = url.lower()
    if "tiktok.com" in lowered:
        return "tiktok"
    return "youtube"

def format_error_message(err_str: str, platform: str = "youtube") -> str:
    if not err_str.strip():
        if platform == "tiktok":
            return (
                "TikTok не отдал данные ролика. Попробуйте публичную ссылку "
                "или добавьте cookies TikTok в cookies.txt."
            )
        return "Не удалось получить данные о видео. Проверьте ссылку и доступность ролика."

    lowered = err_str.lower()

    if (
        "sign in to confirm your age" in lowered
        or "inappropriate for some users" in lowered
        or "age-restricted" in lowered
    ):
        return (
            "AGE_RESTRICTED: У этого видео есть возрастное ограничение 18+. "
            "Добавьте YouTube cookies в настройках KOISU и попробуйте снова."
        )
    if "private video" in lowered:
        return "Это приватное видео. Доступ есть только у владельца или выбранных аккаунтов."
    if "video unavailable" in lowered:
        service = "TikTok" if platform == "tiktok" else "YouTube"
        return f"Видео недоступно или удалено с {service}."
    if "requested format is not available" in lowered:
        return "Выбранный формат или качество недоступны для этого ролика. Попробуйте другое качество."
    if platform == "tiktok" and ("requiring login" in lowered or "login" in lowered):
        return (
            "TikTok требует вход для этого ролика. Попробуйте публичное видео "
            "или добавьте cookies TikTok в cookies.txt."
        )
    if "http error 403" in lowered or "forbidden" in lowered:
        if platform == "tiktok":
            return (
                "TikTok запретил скачивание выбранного потока (HTTP 403). "
                "Попробуйте открыть ссылку позже, обновить yt-dlp или скачать другой ролик."
            )
        return (
            "YouTube запретил скачивание выбранного потока (HTTP 403). "
            "Попробуйте другое качество, обновите cookies или удалите cookies для публичного ролика."
        )
    if "ffmpeg" in lowered and ("not found" in lowered or "no such file" in lowered):
        return "FFmpeg не найден. Проверьте папку bin или установку FFmpeg."

    return err_str

def get_base_ydl_opts(platform: str = "youtube"):
    opts = {
        "quiet": True,
        "no_warnings": True,
        "ffmpeg_location": FFMPEG_DIR,
        "socket_timeout": 30,
        "retries": 3,
        "fragment_retries": 3,
    }
    if platform == "tiktok":
        opts.update(
            {
                "http_headers": TIKTOK_HEADERS,
                "impersonate": "chrome",
                "extractor_retries": 3,
                "concurrent_fragment_downloads": 1,
            }
        )
    opts.update(get_cookie_opts())
    return opts

def parse_time(value: str | None):
    if not value:
        return None

    text = value.strip()
    if not re.match(r"^(\d{1,2}:)?[0-5]?\d:[0-5]\d$", text):
        raise ValueError("Время отрезка должно быть в формате 1:23 или 00:01:23.")

    parts = [int(part) for part in text.split(":")]
    if len(parts) == 2:
        return parts[0] * 60 + parts[1]
    return parts[0] * 3600 + parts[1] * 60 + parts[2]

def seconds_to_time(seconds: float | int):
    total = max(0, int(seconds))
    hours = total // 3600
    minutes = (total % 3600) // 60
    secs = total % 60
    if hours:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"

def seconds_to_filename_label(seconds: float | int):
    total = max(0, int(seconds))
    hours = total // 3600
    minutes = (total % 3600) // 60
    secs = total % 60
    if hours:
        return f"{hours:02d}h{minutes:02d}m{secs:02d}s"
    return f"{minutes:02d}m{secs:02d}s"

def build_cut_args(source: Path, target: Path, mode: str, start, end, copy: bool):
    args = [FFMPEG_EXE, "-y"]
    if start is not None:
      args.extend(["-ss", str(start)])

    args.extend(["-i", str(source)])

    if start is not None and end is not None:
        args.extend(["-t", str(max(0.01, end - start))])
    elif end is not None:
        args.extend(["-to", str(end)])

    if mode == "audio":
        args.append("-vn")
        if copy:
            args.extend(["-c:a", "copy"])
        else:
            suffix = target.suffix.lower()
            codec = {
                ".mp3": "libmp3lame",
                ".m4a": "aac",
                ".aac": "aac",
                ".flac": "flac",
                ".wav": "pcm_s16le",
            }.get(suffix, "aac")
            args.extend(["-c:a", codec])
    else:
        args.extend(["-map", "0:v:0?", "-map", "0:a:0?"])
        if copy:
            args.extend(["-c", "copy"])
        else:
            if target.suffix.lower() == ".webm":
                args.extend(["-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "31", "-c:a", "libopus"])
            else:
                args.extend(["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-c:a", "aac", "-b:a", "192k"])

    if target.suffix.lower() == ".mp4":
        args.extend(["-movflags", "+faststart"])

    args.append(str(target))
    return args

def cut_media_file(source: Path, mode: str, start, end):
    if start is None and end is None:
        return source

    if start is not None and end is not None and end <= start:
        raise ValueError("Конец отрезка должен быть позже начала.")

    suffix = source.suffix
    target = source.with_name(f"{source.stem}_clip{suffix}")
    emit({"status": "converting", "percent": 96.0, "message": "Обрезка нужного момента..."})

    first = build_cut_args(source, target, mode, start, end, copy=True)
    result = subprocess.run(first, capture_output=True, text=True, encoding="utf-8", errors="replace")

    if result.returncode != 0 or not target.exists() or target.stat().st_size == 0:
        if target.exists():
            target.unlink()
        fallback = build_cut_args(source, target, mode, start, end, copy=False)
        result = subprocess.run(
            fallback,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )

    if result.returncode != 0 or not target.exists() or target.stat().st_size == 0:
        raise RuntimeError(result.stderr or "Не удалось обрезать файл через FFmpeg.")

    try:
        if source.exists() and source.resolve() != target.resolve():
            source.unlink()
    except OSError:
        pass

    return target

def get_info(url: str, platform: str = "youtube", browser_cookie: str | None = None):
    platform = detect_platform(url, platform)
    ydl_opts = get_base_ydl_opts(platform)
    ydl_opts["extract_flat"] = False

    if browser_cookie:
        ydl_opts["cookiesfrombrowser"] = (browser_cookie, None, None, None)

    info = None
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
    except Exception as e:
        err_msg = str(e)
        if platform == "youtube":
            fallback_clients = [
                ["android", "web"],
                ["web_embedded", "ios"],
                ["tv", "web"],
            ]
            for client_group in fallback_clients:
                try:
                    alt_opts = dict(ydl_opts)
                    alt_opts["extractor_args"] = {"youtube": {"player_client": client_group}}
                    with yt_dlp.YoutubeDL(alt_opts) as alt_ydl:
                        info = alt_ydl.extract_info(url, download=False)
                        if info:
                            break
                except Exception:
                    continue

        if not info:
            emit({"error": format_error_message(err_msg, platform)})
            sys.exit(1)

    if not info:
        emit({"error": "Видео не найдено или недоступно."})
        sys.exit(1)

    formats = info.get("formats", [])
    video_resolutions = set()
    has_audio = False

    for fmt in formats:
        height = fmt.get("height")
        vcodec = fmt.get("vcodec")
        acodec = fmt.get("acodec")
        if vcodec and vcodec != "none" and height:
            video_resolutions.add(int(height))
        if acodec and acodec != "none":
            has_audio = True

    if not video_resolutions and info.get("height"):
        video_resolutions.add(int(info["height"]))

    sorted_res = sorted(list(video_resolutions), reverse=True) or [1080, 720, 480, 360]

    thumbnails = info.get("thumbnails") or []
    best_thumbnail = info.get("thumbnail") or ""
    if thumbnails:
        best_thumbnail = thumbnails[-1].get("url", best_thumbnail)

    duration = info.get("duration", 0) or 0
    minutes = int(duration // 60)
    seconds = int(duration % 60)
    duration_str = f"{minutes:02d}:{seconds:02d}"
    if duration >= 3600:
        hours = int(duration // 3600)
        minutes = int((duration % 3600) // 60)
        duration_str = f"{hours:02d}:{minutes:02d}:{seconds:02d}"

    result = {
        "id": info.get("id"),
        "title": info.get("title", "Без названия"),
        "channel": info.get("uploader") or info.get("channel") or "Неизвестный канал",
        "channel_url": info.get("uploader_url") or "",
        "thumbnail": best_thumbnail,
        "duration": duration,
        "duration_str": duration_str,
        "views": info.get("view_count", 0) or 0,
        "likes": info.get("like_count", 0) or 0,
        "description": (info.get("description") or "")[:250],
        "resolutions": sorted_res,
        "has_audio": has_audio or True,
        "webpage_url": info.get("webpage_url", url),
        "platform": platform,
    }

    emit({"status": "info_success", "data": result})

def find_final_file(job_id: str):
    ignored = {".webp", ".jpg", ".jpeg", ".png", ".part", ".temp", ".ytdl"}
    matches = [
        item
        for item in DOWNLOAD_DIR.glob(f"{job_id}_*")
        if item.is_file() and item.suffix.lower() not in ignored
    ]
    if not matches:
        return None
    return sorted(matches, key=lambda item: item.stat().st_mtime, reverse=True)[0]

def cleanup_job_files(job_id: str):
    for item in DOWNLOAD_DIR.glob(f"{job_id}_*"):
        if item.is_file():
            try:
                item.unlink()
            except OSError:
                pass

def video_format_selector(quality: str, output_format: str):
    limit = f"[height<={quality}]" if quality and quality != "best" and quality.isdigit() else ""

    if output_format == "mp4":
        if quality and quality.isdigit() and int(quality) <= 1080:
            return (
                f"bestvideo{limit}[ext=mp4][vcodec^=avc1]+bestaudio[ext=m4a]/"
                f"bestvideo{limit}[ext=mp4]+bestaudio[ext=m4a]/"
                f"bestvideo{limit}+bestaudio/best{limit}/18/best"
            )
        return (
            f"bestvideo{limit}[ext=mp4]+bestaudio[ext=m4a]/"
            f"bestvideo{limit}+bestaudio/best{limit}/best"
        )
    if output_format == "webm":
        return (
            f"bestvideo{limit}[ext=webm]+bestaudio[ext=webm]/"
            f"bestvideo{limit}+bestaudio/best{limit}/best"
        )
    return f"bestvideo{limit}+bestaudio/best{limit}/best"

def compatible_video_format_selector(quality: str, output_format: str):
    limit = f"[height<={quality}]" if quality and quality != "best" and quality.isdigit() else ""

    if output_format == "webm":
        return (
            f"bestvideo{limit}[ext=webm][vcodec^=vp9]+bestaudio[ext=webm]/"
            f"bestvideo{limit}[ext=webm]+bestaudio[ext=webm]/"
            f"bestvideo{limit}+bestaudio/best{limit}/18/best"
        )

    return (
        f"bestvideo{limit}[vcodec^=avc1]+bestaudio[ext=m4a]/"
        f"bestvideo{limit}[ext=mp4]+bestaudio[ext=m4a]/"
        f"bestvideo{limit}+bestaudio/best{limit}/18/best"
    )

def tiktok_video_format_selector(quality: str, no_watermark: bool = True):
    limit = f"[height<={quality}]" if quality and quality != "best" and quality.isdigit() else ""

    if no_watermark:
        return f"bestvideo*{limit}+bestaudio/best{limit}/best"
    return f"bestvideo*{limit}+bestaudio/best{limit}/best"

def without_cookies(opts: dict):
    retry_opts = dict(opts)
    retry_opts.pop("cookiefile", None)
    retry_opts.pop("cookiesfrombrowser", None)
    return retry_opts

def download_media(
    url: str,
    mode: str,
    quality: str,
    fmt: str,
    trim_start: str | None = None,
    trim_end: str | None = None,
    embed_thumbnail: bool = True,
    platform: str = "youtube",
    no_watermark: bool = True,
    browser_cookie: str | None = None,
):
    active_platform = detect_platform(url, platform)
    job_id = str(uuid.uuid4())[:8]
    out_template = str(DOWNLOAD_DIR / f"{job_id}_%(title)s.%(ext)s")
    try:
        start_seconds = parse_time(trim_start)
        end_seconds = parse_time(trim_end)
        if start_seconds is not None and end_seconds is not None and end_seconds <= start_seconds:
            raise ValueError("Конец отрезка должен быть позже начала.")
    except Exception as e:
        emit({"status": "error", "error": format_error_message(str(e), active_platform)})
        sys.exit(1)

    last_progress_emit = 0

    def progress_hook(data):
        nonlocal last_progress_emit
        status = data.get("status")
        now = time.time()

        if status == "downloading":
            if now - last_progress_emit < 0.15:
                return
            last_progress_emit = now

            downloaded = data.get("downloaded_bytes", 0)
            total = data.get("total_bytes") or data.get("total_bytes_estimate", 0)
            percent = 0.0
            if total and total > 0:
                percent = round((downloaded / total) * 100, 1)
            else:
                percent_str = data.get("_percent_str", "0%").replace("%", "").strip()
                try:
                    percent = float(percent_str)
                except ValueError:
                    percent = 0.0

            emit(
                {
                    "status": "downloading",
                    "percent": percent,
                    "speed": data.get("_speed_str", "0 KiB/s"),
                    "eta": data.get("_eta_str", "--:--"),
                    "downloaded_bytes": downloaded,
                    "total_bytes": total,
                }
            )

        elif status == "finished":
            emit(
                {
                    "status": "converting",
                    "percent": 92.0,
                    "message": "Финальная обработка файла...",
                }
            )

    def postprocessor_hook(data):
        if data.get("status") == "started":
            emit(
                {
                    "status": "converting",
                    "percent": 94.0,
                    "message": "Конвертация формата...",
                }
            )

    ydl_opts = get_base_ydl_opts(active_platform)
    ydl_opts.update(
        {
            "outtmpl": out_template,
            "progress_hooks": [progress_hook],
            "postprocessor_hooks": [postprocessor_hook],
            "writethumbnail": False,
        }
    )

    if browser_cookie:
        ydl_opts["cookiesfrombrowser"] = (browser_cookie, None, None, None)

    mode = "audio" if mode == "audio" else "video"

    if mode == "audio":
        audio_format = (fmt or "mp3").lower()
        audio_quality = quality if quality in ["320", "256", "192", "128", "0"] else "0"

        ydl_opts["format"] = "bestaudio/best"
        ydl_opts["postprocessors"] = [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": audio_format,
                "preferredquality": audio_quality,
            },
            {"key": "FFmpegMetadata", "add_metadata": True},
        ]

        if embed_thumbnail and audio_format in ["mp3", "m4a"]:
            ydl_opts["writethumbnail"] = True
            ydl_opts["postprocessors"].append({"key": "EmbedThumbnail"})
    else:
        video_format = (fmt or "mp4").lower()
        if video_format not in ["mp4", "mkv", "webm"]:
            video_format = "mp4"

        if active_platform == "tiktok":
            video_format = "mp4"
            ydl_opts["format"] = tiktok_video_format_selector(
                quality,
                no_watermark,
            )
            ydl_opts["format_sort"] = ["res", "vcodec:h264", "size", "br"]
        else:
            ydl_opts["format"] = video_format_selector(quality, video_format)
        ydl_opts["merge_output_format"] = video_format
        ydl_opts["postprocessors"] = [{"key": "FFmpegMetadata", "add_metadata": True}]

    def run_download(active_opts: dict):
        with yt_dlp.YoutubeDL(active_opts) as ydl:
            emit(
                {
                    "status": "starting",
                    "percent": 0.0,
                    "message": "Подготовка потоков...",
                }
            )
            info = ydl.extract_info(url, download=True)
            return info

    try:
        try:
            info = run_download(ydl_opts)
        except Exception as first_error:
            if "403" not in str(first_error) and "Forbidden" not in str(first_error):
                raise

            cleanup_job_files(job_id)
            emit(
                {
                    "status": "starting",
                    "percent": 0.0,
                    "message": (
                        "TikTok отклонил поток. Пробую запасной вариант..."
                        if active_platform == "tiktok"
                        else "YouTube отклонил поток. Пробую совместимый вариант..."
                    ),
                }
            )

            retry_opts = without_cookies(ydl_opts)
            if mode == "audio":
                retry_opts["format"] = "bestaudio[ext=m4a]/bestaudio/best"
            elif active_platform == "tiktok":
                retry_opts["format"] = "bestvideo*+bestaudio/best"
            else:
                retry_opts["format"] = compatible_video_format_selector(
                    quality,
                    video_format if "video_format" in locals() else "mp4",
                )

            info = run_download(retry_opts)

        final_file = find_final_file(job_id)
        if not final_file:
            raise RuntimeError("Файл не был сохранён на сервере.")

        final_file = cut_media_file(final_file, mode, start_seconds, end_seconds)
        file_size = final_file.stat().st_size
        clean_title = sanitize_filename(info.get("title", "KOISU_Media"))
        target_ext = final_file.suffix.replace(".", "")

        if start_seconds is not None or end_seconds is not None:
            start_label = seconds_to_filename_label(start_seconds or 0)
            end_label = seconds_to_filename_label(end_seconds) if end_seconds is not None else "end"
            clean_title = sanitize_filename(f"{clean_title} [{start_label}-{end_label}]")

        emit(
            {
                "status": "ready",
                "percent": 100.0,
                "job_id": job_id,
                "file_id": final_file.name,
                "file_name": f"{clean_title}.{target_ext}",
                "file_size": file_size,
                "title": info.get("title", clean_title),
                "duration": info.get("duration", 0),
                "format": target_ext,
                "mode": mode,
            }
        )

    except Exception as e:
        emit({"status": "error", "error": format_error_message(str(e), active_platform)})
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(
            "Usage: engine.py info <url> [platform] OR engine.py download <url> <mode> <quality> <format> [trim_start] [trim_end] [embed_thumbnail] [platform] [no_watermark]"
        )
        sys.exit(1)

    command = sys.argv[1]
    url_arg = sys.argv[2]

    if command == "info":
        platform_arg = sys.argv[3] if len(sys.argv) > 3 else "youtube"
        get_info(url_arg, platform_arg)
    elif command == "download":
        mode_arg = sys.argv[3] if len(sys.argv) > 3 else "video"
        quality_arg = sys.argv[4] if len(sys.argv) > 4 else "best"
        fmt_arg = sys.argv[5] if len(sys.argv) > 5 else "mp4"
        trim_start_arg = sys.argv[6] if len(sys.argv) > 6 and sys.argv[6] else None
        trim_end_arg = sys.argv[7] if len(sys.argv) > 7 and sys.argv[7] else None
        embed_thumbnail_arg = sys.argv[8].lower() != "false" if len(sys.argv) > 8 else True
        platform_arg = sys.argv[9] if len(sys.argv) > 9 else "youtube"
        no_watermark_arg = sys.argv[10].lower() != "false" if len(sys.argv) > 10 else True
        download_media(
            url_arg,
            mode_arg,
            quality_arg,
            fmt_arg,
            trim_start_arg,
            trim_end_arg,
            embed_thumbnail_arg,
            platform_arg,
            no_watermark_arg,
        )
