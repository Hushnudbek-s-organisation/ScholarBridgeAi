export const SCHOLLY_TOPICS = [
  "universities", "scholarships", "study-plan", "applications", "tasks",
  "materials", "materials/documents", "visa/speaking", "visa/daily-speaking", "visa", "profile", "general",
] as const;

export type SchollyTopic = (typeof SCHOLLY_TOPICS)[number];
export type SchollyTopicStats = { visits: number; helpful: number; needsWork: number };
export type SchollyLearning = { enabled: boolean; topics: Partial<Record<SchollyTopic, SchollyTopicStats>> };

export function isSchollyTopic(value: unknown): value is SchollyTopic {
  return typeof value === "string" && SCHOLLY_TOPICS.some(topic => topic === value);
}

export function readSchollyLearning(preferences: unknown): SchollyLearning {
  const stored = (preferences as { companionLearning?: { enabled?: unknown; topics?: unknown } } | null)?.companionLearning;
  if (stored?.enabled !== true) return { enabled: false, topics: {} };
  const topics: SchollyLearning["topics"] = {};
  if (!stored.topics || typeof stored.topics !== "object") return { enabled: true, topics };
  const numbers = (value: unknown) => typeof value === "number" && Number.isInteger(value) ? Math.max(0, Math.min(30, value)) : 0;
  for (const topic of SCHOLLY_TOPICS) {
    const item = (stored.topics as SchollyLearning["topics"])[topic];
    if (item) topics[topic] = { visits: numbers(item.visits), helpful: numbers(item.helpful), needsWork: numbers(item.needsWork) };
  }
  return { enabled: true, topics };
}
