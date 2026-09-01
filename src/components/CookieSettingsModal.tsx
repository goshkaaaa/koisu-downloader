"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  Key,
  Save,
  Trash2,
  X,
} from "lucide-react";

interface CookieSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const BROWSER_OPTIONS = [
  { id: "chrome", label: "Chrome" },
  { id: "edge", label: "Edge" },
  { id: "firefox", label: "Firefox" },
  { id: "brave", label: "Brave" },
];

export const CookieSettingsModal: React.FC<CookieSettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [hasCookies, setHasCookies] = useState(false);
  const [cookieSize, setCookieSize] = useState<number | null>(null);
  const [cookieSource, setCookieSource] = useState<"file" | "browser" | "none">(
    "file",
  );
  const [browserName, setBrowserName] = useState("chrome");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const checkStatus = async () => {
    try {
      const res = await fetch("/api/cookies");
      const data = await res.json();
      setHasCookies(Boolean(data.hasCookies || data.source === "browser"));
      setCookieSize(data.hasCookies ? data.size : null);
      setCookieSource(data.source || "file");
      setBrowserName(data.browser || "chrome");
    } catch (e) {
      console.warn("Failed to check cookies status", e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkStatus();
      setStatusMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!content.trim()) {
      setStatusMsg({ type: "error", text: "Вставьте содержимое cookies.txt" });
      return;
    }

    setIsLoading(true);
    setStatusMsg(null);

    try {
      const res = await fetch("/api/cookies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setStatusMsg({
          type: "success",
          text: "Cookies сохранены. Видео теперь можно пробовать снова.",
        });
        setContent("");
        checkStatus();
        onSaved?.();
      } else {
        setStatusMsg({
          type: "error",
          text: data.error || "Ошибка при сохранении",
        });
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Сетевая ошибка" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseBrowser = async (browser: string) => {
    setIsLoading(true);
    setStatusMsg(null);

    try {
      const res = await fetch("/api/cookies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "browser", browser }),
      });
      const data = await res.json();

      if (data.success) {
        setCookieSource("browser");
        setBrowserName(browser);
        setHasCookies(true);
        setStatusMsg({
          type: "success",
          text: `KOISU будет брать cookies из ${data.browser}.`,
        });
        onSaved?.();
      } else {
        setStatusMsg({
          type: "error",
          text: data.error || "Не удалось включить cookies из браузера",
        });
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Сетевая ошибка" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/cookies", { method: "DELETE" });
      setStatusMsg({ type: "success", text: "Cookies удалены" });
      setHasCookies(false);
      setCookieSize(null);
      setCookieSource("none");
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Ошибка удаления" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/72 p-4 backdrop-blur-md">
      <div className="panel relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl">
        <div className="flex items-center justify-between border-b border-white/10 bg-[#171a20] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[var(--warning)]">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h3 className="flex flex-wrap items-center gap-2 text-lg font-semibold text-white">
                <span>Cookies для YouTube и TikTok</span>
                {hasCookies ? (
                  <span className="rounded-full border border-[rgba(64,201,128,0.3)] bg-[rgba(64,201,128,0.1)] px-2 py-0.5 text-[10px] font-semibold text-[var(--success)]">
                    активны
                  </span>
                ) : (
                  <span className="rounded-full border border-[rgba(245,184,75,0.32)] bg-[rgba(245,184,75,0.1)] px-2 py-0.5 text-[10px] font-semibold text-[var(--warning)]">
                    не установлены
                  </span>
                )}
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Нужны для роликов с ограничениями, приватностью или login-проверкой.
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

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {statusMsg && (
            <div
              className={`flex items-center gap-2.5 rounded-lg border p-3.5 text-xs ${
                statusMsg.type === "success"
                  ? "border-[rgba(64,201,128,0.32)] bg-[rgba(64,201,128,0.09)] text-emerald-100"
                  : "border-[rgba(255,102,122,0.35)] bg-[rgba(255,102,122,0.1)] text-rose-100"
              }`}
            >
              {statusMsg.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[var(--success)]" />
              ) : (
                <AlertCircle className="h-4 w-4 flex-shrink-0 text-[var(--danger)]" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/[0.07] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">
                  Взять cookies из браузера
                </div>
                <div className="mt-1 text-xs text-[var(--text-muted)]">
                  Войдите в YouTube или TikTok в браузере и выберите его здесь.
                </div>
              </div>
              {cookieSource === "browser" && (
                <span className="rounded-full border border-cyan-300/25 bg-cyan-300/[0.1] px-2 py-1 text-[10px] font-bold uppercase text-cyan-100">
                  {browserName}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {BROWSER_OPTIONS.map((browser) => {
                const active =
                  cookieSource === "browser" && browserName === browser.id;
                return (
                  <button
                    key={browser.id}
                    type="button"
                    onClick={() => handleUseBrowser(browser.id)}
                    disabled={isLoading}
                    className={`min-h-11 rounded-lg px-3 py-2 text-xs font-bold ${
                      active ? "control control-active" : "control"
                    }`}
                  >
                    {browser.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-xs leading-relaxed text-[var(--text-muted)]">
            <div className="mb-2 flex items-center gap-1.5 font-semibold text-white">
              <Info className="h-4 w-4 text-[var(--accent)]" />
              Зачем это нужно
            </div>
            <p>
              YouTube и TikTok иногда требуют авторизацию для видео 18+,
              приватного доступа или проверки входа. Лучше выбрать браузер
              сверху; если это не сработало, можно вставить `cookies.txt`
              вручную.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase text-[var(--text-muted)]">
              Запасной вариант
            </label>
            <div className="grid grid-cols-1 gap-2.5 text-xs text-[var(--text-muted)] md:grid-cols-3">
              {[
                "Установите расширение вроде Get cookies.txt LOCALLY.",
                "Откройте youtube.com или tiktok.com и скопируйте cookies.",
                "Вставьте текст ниже и нажмите сохранить.",
              ].map((step, index) => (
                <div
                  key={step}
                  className="rounded-lg border border-white/10 bg-white/5 p-3"
                >
                  <span className="mb-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold text-white">
                    {index + 1}
                  </span>
                  <p>{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold text-[var(--text-muted)]">
              <span>Содержимое cookies.txt</span>
              {hasCookies && (
                <span className="font-mono text-[11px] text-[var(--success)]">
                  сохранено: {cookieSize} байт
                </span>
              )}
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="# Netscape HTTP Cookie File&#10;.youtube.com	TRUE	/	TRUE	...	SID	...&#10;.tiktok.com	TRUE	/	TRUE	...	sessionid	..."
              rows={6}
              className="w-full resize-none rounded-lg border border-white/10 bg-black/25 p-3.5 font-mono text-xs text-white outline-none placeholder:text-[var(--text-soft)] focus:border-[var(--accent)]"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-[#171a20] p-4">
          {hasCookies ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-lg border border-[rgba(255,102,122,0.22)] bg-[rgba(255,102,122,0.08)] px-3 py-2 text-xs font-medium text-[var(--danger)] transition hover:bg-[rgba(255,102,122,0.14)] disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Удалить</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="control rounded-lg px-4 py-2 text-xs font-medium"
            >
              Закрыть
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isLoading || !content.trim()}
              className="primary-button flex items-center gap-2 rounded-lg px-5 py-2 text-xs font-bold"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isLoading ? "Сохранение..." : "Сохранить"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
