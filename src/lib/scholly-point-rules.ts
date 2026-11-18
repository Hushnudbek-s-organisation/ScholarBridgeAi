export const SCHOLLY_SMALL_LIMIT = 60;

export const SCHOLLY_POINT_RULES = {
  mission_complete: { bucket: "main", ledgerReason: "scholly_daily_mission", amounts: [10, 15, 20, 30] },
  document_uploaded: { bucket: "main", ledgerReason: "scholly_document_uploaded", amounts: [15] },
  sop_paragraph: { bucket: "main", ledgerReason: "scholly_sop_paragraph", amounts: [10], dailyLimit: 3 },
  application_submitted: { bucket: "main", ledgerReason: "scholly_application_submitted", amounts: [100] },
  referral_completed: { bucket: "main", ledgerReason: "referral_referrer", amounts: [50], monthlyLimit: 10 },
  daily_quiz: { bucket: "small", ledgerReason: "scholly_daily_quiz", amounts: [5, 8] },
  profile_field_filled: { bucket: "small", ledgerReason: "scholly_profile_field_filled", amounts: [3] },
  university_saved: { bucket: "small", ledgerReason: "scholly_university_saved", amounts: [3] },
  forum_helpful: { bucket: "small", ledgerReason: "scholly_forum_helpful", amounts: [5], dailyLimit: 3 },
  streak_3: { bucket: "bonus", ledgerReason: "scholly_streak_3", amounts: [5] },
  streak_7: { bucket: "bonus", ledgerReason: "scholly_streak_7", amounts: [20] },
  streak_14: { bucket: "bonus", ledgerReason: "scholly_streak_14", amounts: [40] },
  streak_30: { bucket: "bonus", ledgerReason: "scholly_streak_30", amounts: [100] },
  weekly_activity: { bucket: "bonus", ledgerReason: "scholly_weekly_activity", amounts: [25] },
  comeback: { bucket: "bonus", ledgerReason: "scholly_comeback", amounts: [10] },
  friend_streak: { bucket: "bonus", ledgerReason: "scholly_friend_streak", amounts: [15] },
} as const;

export type SchollyPointReason = keyof typeof SCHOLLY_POINT_RULES;
export type SchollyPointBucket = "main" | "small" | "bonus" | "spend";
export type SchollyPointsSummary = {
  balance: number;
  lifetimePoints: number;
  level: number;
  nextLevelAt: number | null;
  todayPoints: number;
  smallPoints: number;
  smallLimit: typeof SCHOLLY_SMALL_LIMIT;
  todayByReason: Partial<Record<SchollyPointReason, number>>;
};
