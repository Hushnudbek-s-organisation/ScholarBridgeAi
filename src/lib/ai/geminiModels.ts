/** Stable IDs from the Gemini Developer API model catalogue. */
export const GEMINI_MODELS = {
  flash: "gemini-3.8-flash",
  lite: "gemini-3.1-flash-lite",
  live: "gemini-3.8-live",
  tts: "gemini-3.8-flash-lite-tts",
} as const;

/** Scope the cheaper FAQ route to product navigation without applicant context. */
export function isProductNavigationFaq(text: string, hasHistory: boolean): boolean {
  if (hasHistory || text.length > 180) return false;
  return /^(?:how (?:do|can) i (?:open|find|use)|where (?:is|can i find)|qayerda|qanday ochaman|где найти|как открыть)(?:\s|$)/i.test(text.trim()) &&
    /(?:^|\s)(?:dashboard|settings|profile|shortlist|tracker|language|scholarship hub|sozlamalar|profil|kuzatuv|настройки|профиль)(?:\s|[?.!,]|$)/i.test(text);
}
