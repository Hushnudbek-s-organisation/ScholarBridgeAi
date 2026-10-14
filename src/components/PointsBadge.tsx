"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";

interface PointsBadgeProps {
  points: number;
  levelName?: string;
  levelIcon?: string;
}

export function PointsBadge({ points, levelName, levelIcon }: PointsBadgeProps) {
  const t = useTranslations("rewards");
  return (
    <div className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5">
      <Star className="h-4 w-4 text-amber-500 fill-amber-400" aria-hidden="true" />
      <span className="text-xs font-extrabold text-amber-700">{points.toLocaleString()} {t("points")}</span>
      {levelName && (
        <span className="text-[11px] font-semibold text-slate-500">
          {levelIcon} {levelName}
        </span>
      )}
    </div>
  );
}
