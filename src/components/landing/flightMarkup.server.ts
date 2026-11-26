import { readFileSync } from "node:fs";
import { join } from "node:path";
import flightCopy from "./flight-copy.json";

const flightMarkup = readFileSync(join(process.cwd(), "src/components/landing/flight-markup.html"), "utf8");

export function localizedFlightMarkup(locale: keyof typeof flightCopy): string {
  const copy = flightCopy[locale] as Record<string, string | string[]>;
  const escapeText = (value: string) => value.replace(/[&<>]/g, character =>
    character === "&" ? "&amp;" : character === "<" ? "&lt;" : "&gt;");
  return flightMarkup.replace(/(data-i18n="([a-z0-9_]+)"[^>]*>)[^<]*(?=<)/g, (unchanged, opening, key) => {
    const label = copy[key];
    return typeof label === "string" ? opening + escapeText(label) : unchanged;
  });
}
