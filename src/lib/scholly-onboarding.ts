export const SCHOLLY_ONBOARDING_STEPS = ["name", "reminder", "tone", "challenge", "complete"] as const;
export type SchollyOnboardingStep = (typeof SCHOLLY_ONBOARDING_STEPS)[number];
export type SchollyOnboardingState = "not_started" | "in_progress" | "skipped" | "completed";
export type SchollyReminderWindow = "before_school" | "after_school" | "evening" | "not_needed";
export type SchollyTone = "friendly" | "short";
export type SchollyChallenge = "university" | "grant" | "ielts" | "documents";

export interface SchollyOnboardingSnapshot {
  onboardingState: SchollyOnboardingState;
  onboardingStep: SchollyOnboardingStep;
  nameConfirmed: boolean;
  namePref: string | null;
  reminderWindow: string | null;
  tone: string;
  onboardingAnswers: Record<string, unknown>;
}

export type SchollyOnboardingAction =
  | { action: "start" | "resume" | "skip" }
  | { action: "name"; confirmed: boolean; namePref?: string }
  | { action: "reminder"; value: SchollyReminderWindow }
  | { action: "tone"; value: SchollyTone }
  | { action: "challenge"; value: SchollyChallenge };

export type SchollyOnboardingTransition = {
  patch: Partial<SchollyOnboardingSnapshot> & { onboardedAt?: Date | null };
  event: "onboarding_started" | "onboarding_step" | "onboarding_completed" | "onboarding_skipped";
  payload: Record<string, unknown>;
} | { error: string };

const reminderWindows = new Set<SchollyReminderWindow>(["before_school", "after_school", "evening", "not_needed"]);
const tones = new Set<SchollyTone>(["friendly", "short"]);
const challenges = new Set<SchollyChallenge>(["university", "grant", "ielts", "documents"]);

/** Pure, strict transition function shared by the API and regression tests. */
export function transitionSchollyOnboarding(
  current: SchollyOnboardingSnapshot,
  input: unknown,
  now = new Date(),
): SchollyOnboardingTransition {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { error: "Invalid onboarding action" };
  const body = input as Record<string, unknown>;
  const action = body.action;
  if (current.onboardingState === "completed") return { error: "Onboarding is already complete" };

  if (action === "start" || action === "resume") {
    if (action === "start" && current.onboardingState !== "not_started") return { error: "Onboarding has already started" };
    return {
      patch: { onboardingState: "in_progress" },
      event: action === "start" ? "onboarding_started" : "onboarding_step",
      payload: action === "start" ? {} : { step: current.onboardingStep, resumed: true },
    };
  }
  if (action === "skip") {
    if (current.onboardingState !== "in_progress" && current.onboardingState !== "not_started") return { error: "Onboarding cannot be skipped from this state" };
    return {
      patch: { onboardingState: "skipped" },
      event: "onboarding_skipped",
      payload: { step: current.onboardingStep },
    };
  }
  if (current.onboardingState !== "in_progress") return { error: "Start or resume onboarding first" };

  if (action === "name" && current.onboardingStep === "name") {
    if (typeof body.confirmed !== "boolean") return { error: "Choose whether the displayed name is correct" };
    let namePref: string | null = null;
    if (!body.confirmed) {
      if (typeof body.namePref !== "string") return { error: "Enter the name you prefer" };
      namePref = body.namePref.trim().slice(0, 40);
      if (!namePref || /[\u0000-\u001f\u007f]/u.test(namePref)) return { error: "Enter a valid preferred name" };
    }
    return {
      patch: { nameConfirmed: body.confirmed, namePref, onboardingStep: "reminder" },
      event: "onboarding_step",
      payload: { step: "name", confirmed: body.confirmed },
    };
  }
  if (action === "reminder" && current.onboardingStep === "reminder") {
    if (typeof body.value !== "string" || !reminderWindows.has(body.value as SchollyReminderWindow)) return { error: "Choose a reminder window" };
    const answers = { ...current.onboardingAnswers, reminderWindow: body.value };
    return {
      patch: { reminderWindow: body.value, onboardingAnswers: answers, onboardingStep: "tone" },
      event: "onboarding_step",
      payload: { step: "reminder", value: body.value },
    };
  }
  if (action === "tone" && current.onboardingStep === "tone") {
    if (typeof body.value !== "string" || !tones.has(body.value as SchollyTone)) return { error: "Choose a supported tone" };
    const answers = { ...current.onboardingAnswers, tone: body.value };
    return {
      patch: { tone: body.value, onboardingAnswers: answers, onboardingStep: "challenge" },
      event: "onboarding_step",
      payload: { step: "tone", value: body.value },
    };
  }
  if (action === "challenge" && current.onboardingStep === "challenge") {
    if (typeof body.value !== "string" || !challenges.has(body.value as SchollyChallenge)) return { error: "Choose what feels hardest right now" };
    const answers = { ...current.onboardingAnswers, challenge: body.value };
    return {
      patch: { onboardingState: "completed", onboardingStep: "complete", onboardingAnswers: answers, onboardedAt: now },
      event: "onboarding_completed",
      payload: { answeredQuestions: 3 },
    };
  }
  return { error: "That answer does not match the current onboarding step" };
}
