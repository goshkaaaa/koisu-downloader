"use client";

import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, Key } from "lucide-react";
import { CookieSettingsModal } from "@/components/CookieSettingsModal";
import { DownloadProgressView } from "@/components/DownloadProgressView";
import { FeaturesSection } from "@/components/FeaturesSection";
import { Header } from "@/components/Header";
import { HistoryModal } from "@/components/HistoryModal";
import { MediaPreview } from "@/components/MediaPreview";
import { UrlInput } from "@/components/UrlInput";
import {
  DownloadOptions,
  DownloadProgress,
  HistoryItem,
  MediaPlatform,
  VideoInfo,
} from "@/types";

export default function HomePage() {
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [isAgeRestricted, setIsAgeRestricted] = useState(false);
  const [lastSearchedUrl, setLastSearchedUrl] = useState("");
  const [platform, setPlatform] = useState<MediaPlatform>("youtube");

  const [downloadProgress, setDownloadProgress] =
    useState<DownloadProgress | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isCookiesOpen, setIsCookiesOpen] = useState(false);

  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("koisu_history");
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Failed to load history from localStorage", e);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
    };
  }, []);

  const saveToHistory = (item: HistoryItem) => {
    setHistory((prev) => {
      const updated = [item, ...prev.filter((i) => i.id !== item.id)].slice(
        0,
        30,
      );
      try {
        localStorage.setItem("koisu_history", JSON.stringify(updated));
      } catch (e) {
        console.warn("Failed to save history to localStorage", e);
      }
      return updated;
    });
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem("koisu_history");
    } catch (e) {
      console.warn("Failed to clear history", e);
    }
  };

  const detectPlatform = (url: string): MediaPlatform => {
    const lowered = url.toLowerCase();
    if (lowered.includes("tiktok.com")) return "tiktok";
    return "youtube";
  };

  const handleSearch = async (url: string, requestedPlatform?: MediaPlatform) => {
    const activePlatform = requestedPlatform || detectPlatform(url);
    setPlatform(activePlatform);
    setIsLoadingInfo(true);
    setInfoError(null);
    setIsAgeRestricted(false);
    setDownloadProgress(null);
    setLastSearchedUrl(url);

    try {
      const res = await fetch("/api/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, platform: activePlatform }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const errMsg =
          data.error || "Не удалось получить информацию о видео";
        if (
          errMsg.includes("AGE_RESTRICTED") ||
          errMsg.includes("18+") ||
          errMsg.includes("Sign in to confirm your age")
        ) {
          setIsAgeRestricted(true);
        }
        throw new Error(errMsg.replace("AGE_RESTRICTED: ", ""));
      }

      setVideoInfo({ ...data.data, platform: data.data.platform || activePlatform });
    } catch (err: any) {
      console.error("Search error:", err);
      setInfoError(err.message || "Ошибка подключения к серверу");
      setVideoInfo(null);
    } finally {
      setIsLoadingInfo(false);
    }
  };

  const handleStartDownload = async (options: DownloadOptions) => {
    setIsDownloading(true);
    setInfoError(null);

    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
    }

    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Ошибка запуска скачивания");
      }

      const jobId = data.jobId;

      setDownloadProgress({
        jobId,
        status: "starting",
        percent: 0,
        message: "Подготовка загрузки...",
        createdAt: Date.now(),
        mode: options.mode,
        format: options.format,
        platform: options.platform,
      });

      pollingTimerRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/progress/${jobId}`);
          if (!pollRes.ok) return;

          const pollData = await pollRes.json();
          if (pollData.success && pollData.data) {
            const current: DownloadProgress = pollData.data;
            setDownloadProgress(current);

            if (current.status === "ready") {
              if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
              setIsDownloading(false);

              if (current.fileId && videoInfo) {
                saveToHistory({
                  id: jobId,
                  jobId,
                  title: current.title || videoInfo.title,
                  thumbnail: videoInfo.thumbnail,
                  channel: videoInfo.channel,
                  fileId: current.fileId,
                  fileName: current.fileName || "download",
                  fileSize: current.fileSize || 0,
                  format: current.format || "mp4",
                  mode: options.mode,
                  quality: options.quality,
                  platform: options.platform,
                  timestamp: Date.now(),
                });
              }
            } else if (current.status === "error") {
              if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
              setIsDownloading(false);
            }
          }
        } catch (pollErr) {
          console.warn("Progress poll error:", pollErr);
        }
      }, 500);
    } catch (err: any) {
      console.error("Download start error:", err);
      setIsDownloading(false);
      setInfoError(err.message || "Не удалось начать скачивание");
    }
  };

  const handleReset = () => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
    }
    setDownloadProgress(null);
    setIsDownloading(false);
  };

  const handleCookiesSaved = () => {
    if (lastSearchedUrl) {
      handleSearch(lastSearchedUrl);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        onOpenHistory={() => setIsHistoryOpen(true)}
        historyCount={history.length}
      />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-4 py-8 md:py-12">
        <section className="mb-8 max-w-3xl text-center md:mb-10">
          <div className="hero-badge mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-1.5 text-xs font-semibold text-[var(--text-muted)]">
            <span className="status-dot" />
            Без рекламы, локально, через FFmpeg
          </div>

          <h1 className="mb-4 text-4xl font-semibold tracking-normal text-white sm:text-5xl md:text-6xl">
            Скачивай видео и <span className="aurora-word">нужные моменты</span>
          </h1>

          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-[var(--text-muted)] md:text-base">
            Вставьте ссылку на YouTube или TikTok, выберите видео или аудио,
            качество и при необходимости укажите отрезок по времени.
          </p>
        </section>

        <UrlInput
          onSearch={handleSearch}
          isLoading={isLoadingInfo}
          platform={platform}
          onPlatformChange={setPlatform}
        />

        {infoError && (
          <div
            className={`mt-6 w-full max-w-4xl rounded-xl border p-5 text-sm shadow-lg ${
              isAgeRestricted
                ? "border-[rgba(245,184,75,0.35)] bg-[rgba(245,184,75,0.1)] text-amber-100"
                : "border-[rgba(255,102,122,0.35)] bg-[rgba(255,102,122,0.1)] text-rose-100"
            }`}
          >
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                {isAgeRestricted ? (
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-amber-400/25 bg-amber-400/10 text-amber-300">
                    <Key className="h-5 w-5" />
                  </div>
                ) : (
                  <AlertCircle className="mt-0.5 h-6 w-6 flex-shrink-0 text-[var(--danger)]" />
                )}
                <div>
                  <h4 className="text-base font-semibold text-white">
                    {isAgeRestricted
                      ? "Нужны cookies для видео 18+"
                      : "Не удалось обработать запрос"}
                  </h4>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                    {infoError}
                  </p>
                </div>
              </div>

              {isAgeRestricted && (
                <button
                  type="button"
                  onClick={() => setIsCookiesOpen(true)}
                  className="primary-button flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3 text-xs font-bold sm:w-auto"
                >
                  <Key className="h-4 w-4" />
                  <span>Настроить cookies</span>
                </button>
              )}
            </div>
          </div>
        )}

        {downloadProgress && (
          <DownloadProgressView progress={downloadProgress} onReset={handleReset} />
        )}

        {videoInfo && !downloadProgress && (
          <MediaPreview
            info={videoInfo}
            onStartDownload={handleStartDownload}
            isDownloading={isDownloading}
          />
        )}

        <FeaturesSection />
      </main>

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        items={history}
        onClear={handleClearHistory}
      />

      <CookieSettingsModal
        isOpen={isCookiesOpen}
        onClose={() => setIsCookiesOpen(false)}
        onSaved={handleCookiesSaved}
      />

      <footer className="w-full border-t border-white/10 bg-[#0b0c0f]/90 py-4 text-center text-xs text-[var(--text-soft)]">
        <div className="mx-auto flex max-w-6xl items-center justify-center px-4">
          <span className="font-medium text-[var(--text-muted)]">KOISU 2026</span>
        </div>
      </footer>
    </div>
  );
}
