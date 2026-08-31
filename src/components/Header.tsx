"use client";

import React from "react";
import { History } from "lucide-react";

interface HeaderProps {
  onOpenHistory: () => void;
  historyCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenHistory,
  historyCount,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0b0c0f]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="soft-ring flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(77,163,255,0.28),rgba(168,117,255,0.24),rgba(255,94,157,0.2))] text-lg font-bold text-white">
            K
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="aurora-word text-xl font-semibold tracking-normal">
                KOISU
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenHistory}
            className="control relative flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold sm:text-sm"
            title="История скачиваний"
          >
            <History className="h-4 w-4 text-[var(--accent)]" />
            <span className="hidden sm:inline">История</span>
            {historyCount > 0 && (
              <span className="rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[11px] font-bold text-[#07111f]">
                {historyCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
