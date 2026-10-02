"use client";

import { useTranslations } from "next-intl";
import { formatDegreeLevel } from "@/lib/degreeLevels";

/** Paired, localised names; unknown never becomes a made-up degree or All. */
export function DegreeLevelLabel({
  value,
  showPrefix = false,
}: {
  value: string | null | undefined;
  showPrefix?: boolean;
}) {
  const t = useTranslations("degrees");
  const label = formatDegreeLevel(value, t);
  return <>{showPrefix ? t("level", { level: label }) : label}</>;
}
