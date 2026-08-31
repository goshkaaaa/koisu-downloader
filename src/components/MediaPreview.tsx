"use client";

import React, { useMemo, useState } from "react";
import { DownloadMode, DownloadOptions, VideoInfo } from "@/types";
import {
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileAudio,
  FileVideo,
  Image as ImageIcon,
  Music,
  Scissors,
  Sparkles,
  ThumbsUp,
  Video,
} from "lucide-react";

interface MediaPreviewProps {
  info: VideoInfo;
  onStartDownload: (options: DownloadOptions) => void;
  isDownloading: boolean;
}

const AUDIO_FORMATS = [
  { id: "mp3", name: "MP3", desc: "Универсально для плееров и авто" },
  { id: "m4a", name: "M4A", desc: "Apple AAC для iPhone и Mac" },
  { id: "flac", name: "FLAC", desc: "Lossless без потерь" },
  { id: "wav", name: "WAV", desc: "Несжатый PCM" },
  { id: "aac", name: "AAC", desc: "Хорошее качество при малом весе" },
];

const AUDIO_QUALITIES = [
  { id: "320", label: "320 kbps", badge: "Max", note: "Максимальный битрейт" },
  { id: "256", label: "256 kbps", badge: "HQ", note: "Высокое качество" },
  { id: "192", label: "192 kbps", badge: "Std", note: "Стандарт" },
  { id: "128", label: "128 kbps", badge: "Lite", note: "Минимальный вес" },
];

const VIDEO_CONTAINERS = [
  { id: "mp4", label: "MP4", desc: "Лучше для ПК, ТВ и телефонов" },
  { id: "mkv", label: "MKV", desc: "Максимальная совместимость кодеков" },
  { id: "webm", label: "WebM", desc: "Современный веб-формат" },
];

const timePattern = /^(\d{1,2}:)?[0-5]?\d:[0-5]\d$/;

const parseTimeToSeconds = (value: string) => {
  if (!value.trim()) return null;
  if (!timePattern.test(value.trim())) return Number.NaN;

  const parts = value
    .trim()
    .split(":")
    .map((part) => Number(part));

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  return parts[0] * 3600 + parts[1] * 60 + parts[2];
};

export const MediaPreview: React.FC<MediaPreviewProps> = ({
  info,
  onStartDownload,
  isDownloading,
}) => {
  const [mode, setMode] = useState<DownloadMode>("video");
  const [videoQuality, setVideoQuality] = useState<string>("best");
  const [videoContainer, setVideoContainer] = useState<string>("mp4");
  const [audioFormat, setAudioFormat] = useState<string>("mp3");
  const [audioQuality, setAudioQuality] = useState<string>("320");
  const [embedThumbnail, setEmbedThumbnail] = useState<boolean>(true);
  const [noWatermark, setNoWatermark] = useState<boolean>(true);
  const [trimStart, setTrimStart] = useState("");
  const [trimEnd, setTrimEnd] = useState("");
  const isTikTok =
    info.platform === "tiktok" ||
    info.webpage_url.toLowerCase().includes("tiktok.com");

  const availableRes = useMemo(
    () =>
      info.resolutions && info.resolutions.length > 0
        ? info.resolutions
        : [2160, 1440, 1080, 720, 480, 360],
    [info.resolutions],
  );

  const trimError = useMemo(() => {
    const start = parseTimeToSeconds(trimStart);
    const end = parseTimeToSeconds(trimEnd);

    if (Number.isNaN(start) || Number.isNaN(end)) {
      return "Формат времени: 1:23 или 00:01:23";
    }

    if (start !== null && end !== null && end <= start) {
      return "Конец должен быть позже начала";
    }

    if (end !== null && info.duration && end > info.duration) {
      return "Конец выходит за длительность видео";
    }

    return null;
  }, [info.duration, trimEnd, trimStart]);

  const formatNumber = (num: number) => {
    if (!num) return "0";
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + " млрд";
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + " млн";
    if (num >= 1_000) return (num / 1_000).toFixed(1) + " тыс.";
    return num.toLocaleString("ru-RU");
  };

  const getResLabel = (height: number) => {
    if (height >= 2160) return { title: "4K", badge: "2160p" };
    if (height >= 1440) return { title: "2K", badge: "1440p" };
    if (height >= 1080) return { title: "Full HD", badge: "1080p" };
    if (height >= 720) return { title: "HD", badge: "720p" };
    if (height >= 480) return { title: "SD", badge: "480p" };
    return { title: `${height}p`, badge: `${height}p` };
  };

  const handleDownloadClick = () => {
    if (trimError) return;

    onStartDownload({
      url: info.webpage_url,
      platform: isTikTok ? "tiktok" : "youtube",
      mode,
      quality: mode === "video" ? videoQuality : audioQuality,
      format: mode === "video" ? (isTikTok ? "mp4" : videoContainer) : audioFormat,
      trimStart: trimStart.trim() || undefined,
      trimEnd: trimEnd.trim() || undefined,
      embedThumbnail,
      noWatermark: isTikTok ? noWatermark : undefined,
    });
  };

  const selectedFormat =
    mode === "video"
      ? (isTikTok ? "mp4" : videoContainer).toUpperCase()
      : audioFormat.toUpperCase();
  const selectedQuality =
    mode === "video"
      ? videoQuality === "best"
        ? "MAX"
        : `${videoQuality}p`
      : `${audioQuality} kbps`;

  return (
    <div className="panel mx-auto mt-8 w-full max-w-4xl rounded-xl p-5 md:p-6">
      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-12">
        <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black md:col-span-5">
          {}
          <img
            src={info.thumbnail}
            alt={info.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-md border border-white/15 bg-black/78 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-md">
            <Clock className="h-3.5 w-3.5 text-[var(--accent)]" />
            {info.duration_str}
          </div>
          <div className="absolute left-3 top-3 rounded-md border border-white/15 bg-black/72 px-2 py-1 text-[10px] font-bold uppercase text-white backdrop-blur-md">
            {info.resolutions && info.resolutions[0] >= 2160
              ? "4K"
              : info.resolutions && info.resolutions[0] >= 1080
                ? "1080p"
                : "HD"}
          </div>
        </div>

        <div className="flex h-full flex-col justify-between md:col-span-7">
          <div>
            <h2 className="line-clamp-2 text-xl font-semibold leading-tight text-white md:text-2xl">
              {info.title}
            </h2>

            <div className="mt-3 flex items-center gap-3">
              <a
                href={info.channel_url || "#"}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm font-semibold text-[var(--accent)] transition hover:text-white"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold text-white">
                  {info.channel ? info.channel[0].toUpperCase() : "Y"}
                </div>
                <span className="truncate">{info.channel}</span>
                <ExternalLink className="h-3.5 w-3.5 opacity-70" />
              </a>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
              <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
                <Eye className="h-4 w-4 text-[var(--accent)]" />
                <span>{formatNumber(info.views)} просмотров</span>
              </div>
              {info.likes > 0 && (
                <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
                  <ThumbsUp className="h-4 w-4 text-[var(--success)]" />
                  <span>{formatNumber(info.likes)} лайков</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-7 border-t border-white/10 pt-6">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-[var(--text-muted)]">
            Что скачать
          </span>
          {isTikTok && (
            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/[0.08] px-2.5 py-1 text-[11px] font-bold text-cyan-100">
              TikTok
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode("video")}
            className={`flex min-h-[76px] items-center gap-3 rounded-xl px-4 py-3 text-left ${
              mode === "video" ? "control control-active" : "control"
            }`}
          >
            <FileVideo className="h-6 w-6 text-[var(--accent)]" />
            <div>
              <div className="text-base font-bold text-white">Видео + звук</div>
              <div className="text-xs text-[var(--text-muted)]">
                {isTikTok
                  ? "MP4, чистый поток если доступен"
                  : "MP4, MKV, WebM до 4K"}
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMode("audio")}
            className={`flex min-h-[76px] items-center gap-3 rounded-xl px-4 py-3 text-left ${
              mode === "audio" ? "control control-active" : "control"
            }`}
          >
            <FileAudio className="h-6 w-6 text-[var(--success)]" />
            <div>
              <div className="text-base font-bold text-white">Только аудио</div>
              <div className="text-xs text-[var(--text-muted)]">
                MP3, M4A, FLAC, WAV, AAC
              </div>
            </div>
          </button>
        </div>
      </div>

      {mode === "video" ? (
        <div className="mt-6 space-y-6">
          {isTikTok && (
            <label className="control flex min-h-[68px] cursor-pointer select-none items-center justify-between gap-4 rounded-lg p-3">
              <span className="flex min-w-0 items-center gap-3">
                <Sparkles className="h-5 w-5 flex-shrink-0 text-cyan-300" />
                <span>
                  <span className="block text-sm font-bold text-white">
                    Без водяного знака
                  </span>
                  <span className="block text-[11px] text-[var(--text-muted)]">
                    KOISU попробует взять чистый TikTok-поток
                  </span>
                </span>
              </span>
              <input
                type="checkbox"
                checked={noWatermark}
                onChange={(e) => setNoWatermark(e.target.checked)}
                className="h-4 w-4 flex-shrink-0 rounded border-white/20 bg-white/10 text-cyan-300 focus:ring-cyan-300"
              />
            </label>
          )}

          <div>
            <label className="mb-2.5 block text-xs font-semibold uppercase text-[var(--text-muted)]">
              Разрешение видео
            </label>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <button
                type="button"
                onClick={() => setVideoQuality("best")}
                className={`flex min-h-[74px] flex-col items-start rounded-lg p-3 text-left ${
                  videoQuality === "best" ? "control control-active" : "control"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="text-sm font-bold text-white">Максимум</span>
                  <Sparkles className="h-3.5 w-3.5 text-[var(--warning)]" />
                </div>
                <span className="mt-1 text-[11px] text-[var(--text-muted)]">
                  Лучшее доступное
                </span>
              </button>

              {availableRes.slice(0, 7).map((res) => {
                const infoRes = getResLabel(res);
                return (
                  <button
                    key={res}
                    type="button"
                    onClick={() => setVideoQuality(res.toString())}
                    className={`flex min-h-[74px] flex-col items-start rounded-lg p-3 text-left ${
                      videoQuality === res.toString()
                        ? "control control-active"
                        : "control"
                    }`}
                  >
                    <span className="text-sm font-bold text-white">
                      {infoRes.title}
                    </span>
                    <span className="mt-1 text-[11px] text-[var(--accent)]">
                      {infoRes.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {!isTikTok && (
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase text-[var(--text-muted)]">
              Контейнер файла
            </label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {VIDEO_CONTAINERS.map((container) => (
                <button
                  key={container.id}
                  type="button"
                  onClick={() => setVideoContainer(container.id)}
                  className={`min-h-[72px] rounded-lg p-3 text-left ${
                    videoContainer === container.id
                      ? "control control-active"
                      : "control"
                  }`}
                >
                  <div className="text-sm font-bold text-white">
                    {container.label}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                    {container.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <div>
            <label className="mb-2.5 block text-xs font-semibold uppercase text-[var(--text-muted)]">
              Качество звука
            </label>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {AUDIO_QUALITIES.map((quality) => (
                <button
                  key={quality.id}
                  type="button"
                  onClick={() => setAudioQuality(quality.id)}
                  className={`flex min-h-[74px] flex-col items-start rounded-lg p-3 text-left ${
                    audioQuality === quality.id
                      ? "control control-active"
                      : "control"
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="text-sm font-bold text-white">
                      {quality.label}
                    </span>
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
                      {quality.badge}
                    </span>
                  </div>
                  <span className="mt-1 text-[11px] text-[var(--text-muted)]">
                    {quality.note}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase text-[var(--text-muted)]">
              Формат аудио
            </label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {AUDIO_FORMATS.map((format) => (
                <button
                  key={format.id}
                  type="button"
                  onClick={() => setAudioFormat(format.id)}
                  className={`min-h-[72px] rounded-lg p-3 text-left ${
                    audioFormat === format.id
                      ? "control control-active"
                      : "control"
                  }`}
                >
                  <div className="text-sm font-bold text-white">
                    {format.name}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                    {format.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 border-t border-white/10 pt-5">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase text-[var(--text-muted)]">
          <Scissors className="h-4 w-4 text-[var(--accent)]" />
          Скачать момент
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <label className="block">
            <span className="mb-1.5 block text-xs text-[var(--text-soft)]">
              Начало
            </span>
            <input
              value={trimStart}
              onChange={(e) => setTrimStart(e.target.value)}
              placeholder="0:35"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-[var(--text-soft)] focus:border-[var(--accent)]"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs text-[var(--text-soft)]">
              Конец
            </span>
            <input
              value={trimEnd}
              onChange={(e) => setTrimEnd(e.target.value)}
              placeholder="1:20"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-[var(--text-soft)] focus:border-[var(--accent)]"
            />
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setTrimStart("");
                setTrimEnd("");
              }}
              className="control min-h-11 w-full rounded-lg px-3 py-2 text-xs font-semibold sm:w-auto"
            >
              Целиком
            </button>
          </div>
        </div>

        <p
          className={`mt-2 text-xs ${
            trimError ? "text-[var(--danger)]" : "text-[var(--text-soft)]"
          }`}
        >
          {trimError ||
            "Оставьте поля пустыми, чтобы скачать полный ролик. Можно указать только начало или только конец."}
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
        <label className="flex cursor-pointer select-none items-center gap-2.5 text-sm text-[var(--text-muted)]">
          <input
            type="checkbox"
            checked={embedThumbnail}
            onChange={(e) => setEmbedThumbnail(e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-white/10 text-[var(--accent)] focus:ring-[var(--accent)]"
          />
          <span className="flex items-center gap-1.5">
            <ImageIcon className="h-4 w-4 text-[var(--accent)]" />
            Обложка в метаданные аудио
          </span>
        </label>
      </div>

      <div className="mt-7">
        <button
          type="button"
          onClick={handleDownloadClick}
          disabled={isDownloading || Boolean(trimError)}
          className="primary-button flex w-full items-center justify-center gap-3 rounded-xl px-6 py-4 text-base font-extrabold md:text-lg"
        >
          {mode === "video" ? (
            <Video className="h-5 w-5" />
          ) : (
            <Music className="h-5 w-5" />
          )}
          <Download className="h-5 w-5" />
          <span>
            Скачать {selectedFormat} - {selectedQuality}
          </span>
          <CheckCircle2 className="hidden h-5 w-5 sm:block" />
        </button>
      </div>
    </div>
  );
};
