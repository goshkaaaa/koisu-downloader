import { NextRequest, NextResponse } from "next/server";
import { fetchVideoInfo } from "@/lib/downloader";
import { MediaPlatform } from "@/types";

const detectPlatform = (url: string): MediaPlatform | null => {
  const lowered = url.toLowerCase();
  if (lowered.includes("tiktok.com")) return "tiktok";
  if (lowered.includes("youtube.com") || lowered.includes("youtu.be")) {
    return "youtube";
  }
  return null;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== "string" || !url.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Вставьте корректную ссылку на YouTube или TikTok.",
        },
        { status: 400 },
      );
    }

    const cleanUrl = url.trim();
    const platform = detectPlatform(cleanUrl) || body.platform || "youtube";

    if (!detectPlatform(cleanUrl)) {
      return NextResponse.json(
        {
          success: false,
          error: "Поддерживаются ссылки YouTube и TikTok.",
        },
        { status: 400 },
      );
    }

    const info = await fetchVideoInfo(cleanUrl, platform);

    return NextResponse.json({
      success: true,
      data: { ...info, platform },
    });
  } catch (err: any) {
    console.error("API /info error:", err);
    return NextResponse.json(
      {
        success: false,
        error:
          err.message ||
          "Не удалось получить информацию о видео. Проверьте ссылку или доступность ролика.",
      },
      { status: 500 },
    );
  }
}
