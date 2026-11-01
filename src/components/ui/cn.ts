export type ClassValue = string | false | null | undefined;

/** Join conditional classes without pulling a second class-name library into the app. */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
