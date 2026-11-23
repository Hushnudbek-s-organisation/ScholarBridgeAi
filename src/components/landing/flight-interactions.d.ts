import type { Locale } from "@/i18n/config";
export function mountFlightLanding(
  root: HTMLElement,
  initialLocale: Locale,
  switchLocale: (locale: string) => void,
  authLabels: Record<Locale, { menu: string; signIn: string }>,
): () => void;
