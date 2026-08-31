"use client";

import React from "react";
import { DownloadProgress } from "@/types";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Download,
  FileAudio,
  FileVideo,
  HardDrive,
  Loader2,
  RefreshCw,
  Timer,
  Zap,
} from "lucide-react";

interface DownloadProgressViewProps {
  progress: DownloadProgress;
  onReset: () => void;
}

export const DownloadProgressView: React.FC<DownloadProgressViewProps> = ({
  progress,
  onReset,
}) => {
  const isReady = progress.status === "ready";
  const isError = progress.status === "error";

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "0 MB";
    if (bytes >= 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
    }
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getDownloadUrl = () => {
    if (!progress.fileId) return "#";
    const query = progress.fileName
      ? `?name=${encodeURIComponent(progress.fileName)}`
      : "";
    return `/api/file/${encodeURIComponent(progress.fileId)}${query}`;
  };

  return (
    <div className="panel mx-auto mt-8 w-full max-w-4xl rounded-xl p-5 md:p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
            {isReady ? (
              <CheckCircle className="h-6 w-6 text-[var(--success)]" />
            ) : isError ? (
              <AlertTriangle className="h-6 w-6 text-[var(--danger)]" />
            ) : progress.status === "converting" ? (
              <Zap className="h-6 w-6 text-[var(--warning)]" />
            ) : progress.status === "starting" ? (
              <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
            ) : (
              <Activity className="h-6 w-6 text-[var(--accent)]" />
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white md:text-xl">
              {isReady
                ? "Файл готов"
                : isError
                  ? "Не удалось скачать"
                  : progress.status === "converting"
                    ? "Файл обрабатывается"
                    : "Идёт загрузка"}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
              {progress.message || "Пожалуйста, подождите"}
            </p>
          </div>
        </div>

        {!isError && (
          <span className="font-mono text-3xl font-bold text-white md:text-4xl">
            {Math.round(progress.percent)}%
          </span>
        )}
      </div>

      {!isError && (
        <div className="my-6 h-3 w-full overflow-hidden rounded-full border border-white/10 bg-black/35 p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isReady ? "success-fill" : "progress-fill"
            }`}
            style={{
              width: `${Math.min(100, Math.max(2, progress.percent))}%`,
            }}
          />
        </div>
      )}

      {!isReady && !isError && (
        <div className="mb-6 grid grid-cols-1 gap-3 text-center sm:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <div className="mb-1 flex items-center justify-center gap-1 text-xs text-[var(--text-muted)]">
              <Zap className="h-3.5 w-3.5 text-[var(--warning)]" />
              <span>Скорость</span>
            </div>
            <div className="font-mono text-sm font-bold text-white">
              {progress.speed || "..." }
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <div className="mb-1 flex items-center justify-center gap-1 text-xs text-[var(--text-muted)]">
              <HardDrive className="h-3.5 w-3.5 text-[var(--accent)]" />
              <span>Размер</span>
            </div>
            <div className="font-mono text-sm font-bold text-white">
              {progress.downloadedBytes
                ? `${formatFileSize(progress.downloadedBytes)} / ${formatFileSize(progress.totalBytes)}`
                : "подготовка"}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <div className="mb-1 flex items-center justify-center gap-1 text-xs text-[var(--text-muted)]">
              <Timer className="h-3.5 w-3.5 text-[var(--success)]" />
              <span>Осталось</span>
            </div>
            <div className="font-mono text-sm font-bold text-white">
              {progress.eta || "..."}
            </div>
          </div>
        </div>
      )}

      {isReady && (
        <div className="mb-6 rounded-xl border border-[rgba(64,201,128,0.32)] bg-[rgba(64,201,128,0.09)] p-4">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border border-[rgba(64,201,128,0.28)] bg-[rgba(64,201,128,0.12)] text-[var(--success)]">
                {progress.mode === "audio" ? (
                  <FileAudio className="h-6 w-6" />
                ) : (
                  <FileVideo className="h-6 w-6" />
                )}
              </div>
              <div className="min-w-0">
                <div className="truncate text-base font-semibold text-white">
                  {progress.fileName || "Готовый файл"}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                  <span>Размер: {formatFileSize(progress.fileSize)}</span>
                  <span className="uppercase">{progress.format || "mp4"}</span>
                </div>
              </div>
            </div>

            <a
              href={getDownloadUrl()}
              download={progress.fileName}
              className="primary-button flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-bold sm:w-auto"
            >
              <Download className="h-4 w-4" />
              <span>Сохранить</span>
            </a>
          </div>
        </div>
      )}

      {isError && (
        <div className="mb-6 rounded-xl border border-[rgba(255,102,122,0.35)] bg-[rgba(255,102,122,0.1)] p-4 text-sm text-rose-100">
          <p className="mb-1 font-semibold">Ошибка загрузки:</p>
          <p className="font-mono text-xs text-rose-100/85">
            {progress.error || "Неизвестная ошибка"}
          </p>
        </div>
      )}

      <div className="flex items-center justify-end border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={onReset}
          className="control flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Другое видео</span>
        </button>
      </div>
    </div>
  );
};
