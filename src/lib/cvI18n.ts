import { dictionaries } from "@/i18n/messages.server";
import type { Locale } from "@/i18n/config";
import type { CvIssue, CvMissingKey, CvResult, CvWarningKey } from "@/lib/cv";

export type LocalizedCvResult = Omit<CvResult, "missing" | "warnings"> & {
  missing: string[];
  warnings: string[];
};

function interpolate(template: string, values: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : whole
  );
}

function localizeMissing(locale: Locale, issue: CvIssue<CvMissingKey>): string {
  const template =
    dictionaries[locale].cvBuilder.missing[issue.key] ??
    dictionaries.en.cvBuilder.missing[issue.key] ??
    issue.key;
  return interpolate(template, issue.values);
}

function localizeWarning(locale: Locale, issue: CvIssue<CvWarningKey>): string {
  const template =
    dictionaries[locale].cvBuilder.warning[issue.key] ??
    dictionaries.en.cvBuilder.warning[issue.key] ??
    issue.key;
  return interpolate(template, issue.values);
}

/** Localize generated gaps and review prompts at the API boundary. */
export function localizeCv(locale: Locale, cv: CvResult): LocalizedCvResult {
  return {
    ...cv,
    missing: cv.missing.map((issue) => localizeMissing(locale, issue)),
    warnings: cv.warnings.map((issue) => localizeWarning(locale, issue)),
  };
}
