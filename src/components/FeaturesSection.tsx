import React from "react";
import {
  BadgeCheck,
  Clock3,
  Film,
  HardDriveDownload,
  Music2,
  ShieldCheck,
} from "lucide-react";

export const FeaturesSection: React.FC = () => {
  const features = [
    {
      icon: Clock3,
      title: "Отдельные моменты",
      desc: "Укажите начало и конец, чтобы получить только нужный фрагмент.",
    },
    {
      icon: Film,
      title: "Видео до 4K",
      desc: "Выбор качества и контейнера: MP4, MKV или WebM.",
    },
    {
      icon: BadgeCheck,
      title: "TikTok без водяного знака",
      desc: "Видео сохраняется в MP4, KOISU выбирает чистый поток, когда он доступен.",
    },
    {
      icon: Music2,
      title: "Чистое аудио",
      desc: "MP3 до 320 kbps, M4A, FLAC, WAV и AAC.",
    },
    {
      icon: HardDriveDownload,
      title: "Прямое сохранение",
      desc: "Готовый файл отдаётся через локальный сервер сразу после обработки.",
    },
  ];

  return (
    <section className="mx-auto mb-12 mt-16 w-full max-w-5xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-[var(--text-soft)]">
            <ShieldCheck className="h-4 w-4 text-[var(--success)]" />
            Надёжный рабочий поток
          </div>
          <h3 className="text-2xl font-semibold text-white md:text-3xl">
            Всё нужное для скачивания без шума
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div key={feature.title} className="panel-solid rounded-xl p-5">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/6 text-[var(--accent)]">
                <Icon className="h-5 w-5" />
              </div>
              <h4 className="mb-1.5 text-base font-semibold text-white">
                {feature.title}
              </h4>
              <p className="text-xs leading-relaxed text-[var(--text-muted)]">
                {feature.desc}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
