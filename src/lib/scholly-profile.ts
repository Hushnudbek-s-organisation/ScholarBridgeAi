export function isSupportedTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || value.length < 1 || value.length > 100) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

export function isSchollyLocale(value: unknown): value is "uz" | "ru" | "en" {
  return value === "uz" || value === "ru" || value === "en";
}
