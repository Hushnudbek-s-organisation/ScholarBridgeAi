"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { ProgressFill } from "@/components/ui/ProgressBar";

interface LevelProgressBarProps {
  levelName: string;
  levelIcon: string;
  totalPoints: number;
  pointsIntoLevel: number;
  pointsForLevel: number;
  nextLevelName?: string | null;
}

export function LevelProgressBar({
  levelName,
  levelIcon,
  totalPoints,
  pointsIntoLevel,
  pointsForLevel,
  nextLevelName,
}: LevelProgressBarProps) {
  const t = useTranslations("rewards");
  const pct = pointsForLevel > 0 ? Math.min(100, Math.round((pointsIntoLevel / pointsForLevel) * 100)) : 100;
  const remaining = Math.max(0, pointsForLevel - pointsIntoLevel);

  return (
    <div className="bg-white rounded-overlay border border-slate-200 shadow-xs p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{levelIcon}</span>
          <div>
            <p className="text-sm text-slate-500 font-semibold uppercase tracking-wide">{t("currentLevel")}</p>
            <p className="text-sm font-extrabold text-slate-900">{levelName}</p>
          </div>
        </div>
        <span className="text-lg font-extrabold text-indigo-700">{totalPoints.toLocaleString()}</span>
      </div>

      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
        <ProgressFill value={pct} className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full transition-all" />
      </div>

      {nextLevelName && pointsForLevel > 0 ? (
        <p className="text-sm text-slate-500 mt-2">
          {remaining.toLocaleString()} {t("pointsToNextLevel")} · {nextLevelName}
        </p>
      ) : (
        <p className="text-sm text-slate-500 mt-2">★ Max level</p>
      )}
    </div>
  );
}
