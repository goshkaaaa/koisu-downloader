"use client";

import React, { useState } from "react";
import { Clipboard, Loader2, Music2, Search, X, Youtube } from "lucide-react";
import { MediaPlatform } from "@/types";

interface UrlInputProps {
  onSearch: (url: string, platform?: MediaPlatform) => void;
  isLoading: boolean;
  platform: MediaPlatform;
  onPlatformChange: (platform: MediaPlatform) => void;
  initialUrl?: string;
}

const DEMO_LINKS = [
  {
    title: "Музыка",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  },
  {
    title: "4K трейлер",
    url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
  },
  {
    title: "Live radio",
    url: "https://www.youtube.com/watch?v=4xDzrJKXOOY",
  },
];

export const UrlInput: React.FC<UrlInputProps> = ({
  onSearch,
  isLoading,
  platform,
  onPlatformChange,
  initialUrl = "",
}) => {
  const [url, setUrl] = useState(initialUrl);

  const detectPlatform = (value: string): MediaPlatform | null => {
    const lowered = value.toLowerCase();
    if (lowered.includes("tiktok.com")) return "tiktok";
    if (lowered.includes("youtube.com") || lowered.includes("youtu.be")) {
      return "youtube";
    }
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = url.trim();
    if (cleanUrl && !isLoading) {
      const detected = detectPlatform(cleanUrl) || platform;
      onPlatformChange(detected);
      onSearch(cleanUrl, detected);
    }
  };

  const handlePaste = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (!text) return;

      setUrl(text);
      const detected = detectPlatform(text);
      if (detected) {
        onPlatformChange(detected);
        onSearch(text, detected);
      }
    } catch (err) {
      console.warn("Clipboard access denied or unavailable", err);
    }
  };

  const handleDemoClick = (demoUrl: string) => {
    setUrl(demoUrl);
    onPlatformChange("youtube");
    onSearch(demoUrl, "youtube");
  };

  const platforms: Array<{
    id: MediaPlatform;
    label: string;
    Icon: typeof Youtube;
    accent: string;
  }> = [
    {
      id: "youtube",
      label: "YouTube",
      Icon: Youtube,
      accent: "text-red-400",
    },
    {
      id: "tiktok",
      label: "TikTok",
      Icon: Music2,
      accent: "text-cyan-300",
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col items-center">
      <div className="panel mb-3 flex w-full max-w-md rounded-xl p-1.5">
        {platforms.map(({ id, label, Icon, accent }) => {
          const isActive = platform === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onPlatformChange(id)}
              disabled={isLoading}
              className={`relative flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold transition ${
                isActive
                  ? "control-active text-white"
                  : "text-[var(--text-muted)] hover:text-white"
              }`}
              title={label}
            >
              <Icon className={`h-4 w-4 ${isActive ? accent : ""}`} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      <form
        onSubmit={handleSubmit}
        className="panel soft-ring flex w-full items-center gap-2 rounded-xl p-2"
      >
        <div
          className={`flex items-center pl-2 pr-1 ${
            platform === "tiktok"
              ? "text-cyan-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.45)]"
              : "text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.45)]"
          }`}
        >
          {platform === "tiktok" ? (
            <Music2 className="h-6 w-6" />
          ) : (
            <Youtube className="h-6 w-6" />
          )}
        </div>

        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={
            platform === "tiktok"
              ? "Вставьте ссылку TikTok, vm.tiktok.com или vt.tiktok.com"
              : "Вставьте ссылку YouTube, Shorts или плейлиста"
          }
          disabled={isLoading}
          className="min-w-0 flex-1 bg-transparent px-2 py-3 text-base font-medium text-white outline-none placeholder:text-[var(--text-soft)] disabled:opacity-50 md:text-lg"
        />

        {url && !isLoading && (
          <button
            type="button"
            onClick={() => setUrl("")}
            className="control flex h-11 w-11 items-center justify-center rounded-lg"
            title="Очистить"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        <button
          type="button"
          onClick={handlePaste}
          disabled={isLoading}
          className="control hidden min-h-11 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold sm:flex"
          title="Вставить из буфера"
        >
          <Clipboard className="h-3.5 w-3.5" />
          <span>Вставить</span>
        </button>

        <button
          type="submit"
          disabled={!url.trim() || isLoading}
          className="primary-button flex min-h-11 items-center gap-2 rounded-lg px-5 py-3 text-sm font-bold whitespace-nowrap"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Анализ</span>
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              <span>Получить</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
        {platform === "youtube" ? (
          <>
            <span className="text-[var(--text-soft)]">Примеры:</span>
            {DEMO_LINKS.map((demo) => (
              <button
                key={demo.url}
                type="button"
                onClick={() => handleDemoClick(demo.url)}
                disabled={isLoading}
                className="control rounded-full px-3 py-1.5 text-[11px]"
              >
                {demo.title}
              </button>
            ))}
          </>
        ) : (
          <span className="rounded-full border border-cyan-300/20 bg-cyan-300/[0.08] px-3 py-1.5 text-[11px] font-semibold text-cyan-100">
            TikTok: видео MP4, моменты и режим без водяного знака
          </span>
        )}
      </div>
    </div>
  );
};
