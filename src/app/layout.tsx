import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KOISU - YouTube & TikTok Video Converter",
  description:
    "Локальный конвертер YouTube и TikTok: скачивание видео, аудио и отдельных моментов через yt-dlp и FFmpeg.",
  keywords: [
    "KOISU",
    "youtube downloader",
    "tiktok downloader",
    "youtube converter",
    "mp3 converter",
    "ffmpeg",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="dark">
      <head>
        <meta name="theme-color" content="#0b0c0f" />
      </head>
      <body className="min-h-screen bg-[var(--background)] text-[var(--text)]">
        <div className="app-shell flex min-h-screen flex-col">{children}</div>
      </body>
    </html>
  );
}
