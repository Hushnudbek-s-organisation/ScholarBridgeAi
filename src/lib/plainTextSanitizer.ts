/** Normalize Word/Office pasted text without interpreting HTML or retaining formatting. */
export function sanitizePastedPlainText(input: string): string {
  return input
    .replace(/\r\n?/g, "\n")
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u00A0\u2007\u202F]/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "");
}
