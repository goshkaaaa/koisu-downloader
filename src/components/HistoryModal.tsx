"use client";

import React from "react";
import { Download, History, Trash2, X } from "lucide-react";
import { HistoryItem } from "@/types";

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: HistoryItem[];
  onClear: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  items,
  onClear,
}) => {
  if (!isOpen) return null;

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "0 MB";
    if (bytes >= 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
    }
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return (
      date.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      }) +
      " " +
      date.toLocaleDateString("ru-RU")
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/72 p-4 backdrop-blur-md">
      <div className="panel relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl">
        <div className="flex items-center justify-between border-b border-white/10 bg-[#171a20] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[var(--accent)]">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                История скачиваний
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Готовые файлы текущих запусков
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="control flex h-10 w-10 items-center justify-center rounded-lg"
            title="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {items.length === 0 ? (
            <div className="py-12 text-center text-[var(--text-muted)]">
              <History className="mx-auto mb-3 h-12 w-12 opacity-30" />
              <p className="text-base font-semibold text-white">
                История пока пустая
              </p>
              <p className="mt-1 text-xs text-[var(--text-soft)]">
                После скачивания файлы появятся здесь.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/5 p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative h-12 w-16 flex-shrink-0 overflow-hidden rounded-md bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-semibold text-white">
                      {item.title}
                    </h4>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase">
                        {item.format}
                      </span>
                      <span>{formatFileSize(item.fileSize)}</span>
                      <span>{formatDate(item.timestamp)}</span>
                    </div>
                  </div>
                </div>

                <a
                  href={`/api/file/${encodeURIComponent(item.fileId)}?name=${encodeURIComponent(item.fileName)}`}
                  download={item.fileName}
                  className="primary-button flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Скачать</span>
                </a>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="flex items-center justify-between border-t border-white/10 bg-[#171a20] p-4">
            <span className="text-xs text-[var(--text-muted)]">
              Всего файлов: {items.length}
            </span>
            <button
              onClick={onClear}
              className="flex items-center gap-1.5 rounded-lg border border-[rgba(255,102,122,0.22)] bg-[rgba(255,102,122,0.08)] px-3 py-2 text-xs font-medium text-[var(--danger)] transition hover:bg-[rgba(255,102,122,0.14)]"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Очистить</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
