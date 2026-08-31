import { NextRequest, NextResponse } from "next/server";
import { startDownloadJob } from "@/lib/downloader";
import { DownloadOptions, MediaPlatform } from "@/types";

const timePattern = /^(\d{1,2}:)?[0-5]?\d:[0-5]\d$/;

const detectPlatform = (url: string): MediaPlatform | null => {
  const lowered = url.toLowerCase();
  if (lowered.includes("tiktok.com")) return "tiktok";
  if (lowered.includes("youtube.com") || lowered.includes("youtu.be")) {
    return "youtube";
  }
  return null;
};

function parseTimeToSeconds(value?: string) {
  if (!value) return null;
  if (!timePattern.test(value)) return Number.NaN;

  const parts = value.split(":").map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

export async function POST(req: NextRequest) {
  try {
    const body: DownloadOptions = await req.json();

    if (!body.url || !body.url.trim()) {
      return NextResponse.json(
        { success: false, error: "URL обязателен для скачивания." },
        { status: 400 },
      );
    }

    const cleanUrl = body.url.trim();
    const platform = detectPlatform(cleanUrl) || body.platform || "youtube";

    if (!detectPlatform(cleanUrl)) {
      return NextResponse.json(
        { success: false, error: "Поддерживаются ссылки YouTube и TikTok." },
        { status: 400 },
      );
    }

    const mode = body.mode === "audio" ? "audio" : "video";
    const quality = body.quality || "best";
    const format =
      platform === "tiktok" && mode === "video"
        ? "mp4"
        : body.format || (mode === "audio" ? "mp3" : "mp4");
    const trimStart = body.trimStart?.trim() || undefined;
    const trimEnd = body.trimEnd?.trim() || undefined;
    const startSeconds = parseTimeToSeconds(trimStart);
    const endSeconds = parseTimeToSeconds(trimEnd);

    if (Number.isNaN(startSeconds) || Number.isNaN(endSeconds)) {
      return NextResponse.json(
        { success: false, error: "Время отрезка должно быть в формате 1:23 или 00:01:23." },
        { status: 400 },
      );
    }

    if (
      startSeconds !== null &&
      endSeconds !== null &&
      endSeconds <= startSeconds
    ) {
      return NextResponse.json(
        { success: false, error: "Конец отрезка должен быть позже начала." },
        { status: 400 },
      );
    }

    const result = startDownloadJob({
      url: cleanUrl,
      platform,
      mode,
      quality,
      format,
      trimStart,
      trimEnd,
      embedThumbnail: body.embedThumbnail !== false,
      noWatermark: body.noWatermark !== false,
    });

    return NextResponse.json({
      success: true,
      jobId: result.jobId,
    });
  } catch (err: any) {
    console.error("API /download error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Ошибка запуска скачивания.",
      },
      { status: 500 },
    );
  }
}
