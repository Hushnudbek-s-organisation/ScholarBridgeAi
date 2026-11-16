"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  SCHOLLY_APPLICATION_SUBMITTED,
  SCHOLLY_DASHBOARD_MESSAGES,
  SCHOLLY_DEADLINE_NEAR,
  type SchollyDashboardMessages,
  type SchollyDeadlineCue,
  type SchollySubmissionCue,
} from "@/lib/scholly-client-events";
import {
  markSchollyMessageShown,
  nextSchollyMessage,
  recentSchollyMessageHistory,
  type SchollyMessageSession,
  type SchollyQueuedMessage,
  type SchollyReminderMode,
} from "@/lib/scholly-messages";
import { schollyDayKey } from "@/lib/scholly-missions";
import { SCHOLLY_MOTION_PRIORITY, type SchollyMotion } from "./useSchollyMotion";

type Cue = SchollyQueuedMessage & { profileId: number };
type StoredSession = { session: SchollyMessageSession; history: Record<string, number> };
const DISPLAY_MS = 5_000;

function userIsEditing() {
  const element = document.activeElement;
  return element instanceof HTMLElement && (element.matches("input, textarea") || element.isContentEditable);
}

function subscribeToEditing(listener: () => void) {
  const notify = () => queueMicrotask(listener);
  document.addEventListener("focusin", notify);
  document.addEventListener("focusout", notify);
  return () => {
    document.removeEventListener("focusin", notify);
    document.removeEventListener("focusout", notify);
  };
}

function readStoredSession(profileId: number, fallback?: StoredSession): StoredSession {
  let session = fallback?.session ?? { count: 0, lastShown: 0 };
  let history = fallback?.history ?? {};
  try {
    const storedSession = JSON.parse(sessionStorage.getItem(`scholly:message-session:${profileId}`) ?? "null") as SchollyMessageSession | null;
    if (storedSession && Number.isInteger(storedSession.count) && Number.isFinite(storedSession.lastShown)) {
      session = storedSession;
    }
    const stored = JSON.parse(localStorage.getItem(`scholly:message-history:${profileId}`) ?? "{}") as Record<string, number>;
    history = recentSchollyMessageHistory({ ...history, ...stored }, Date.now());
  } catch {
    // Private browsing may disable one of the storage APIs.
  }
  return { session, history };
}

function storeShownCue(cue: Cue, state: StoredSession, now: number) {
  state.history[cue.key] = now;
  if (cue.kind !== "submission") state.session = markSchollyMessageShown(state.session, now);
  try {
    localStorage.setItem(`scholly:message-history:${cue.profileId}`, JSON.stringify(state.history));
  } catch {}
  try {
    sessionStorage.setItem(`scholly:message-session:${cue.profileId}`, JSON.stringify(state.session));
    if (cue.kind === "deadline") sessionStorage.setItem(cue.key, "1");
  } catch {}
}

function poseFor(message: SchollyQueuedMessage): SchollyMotion {
  switch (message.kind) {
    case "deadline": return "concern";
    case "submission": return "proud";
    case "level": return "levelup";
    case "badge": return "celebrate";
    case "mission-done": return "happy";
    default: return "notice";
  }
}

export function useSchollyActivityCues(
  profileId: number | null,
  blocked: boolean,
  motion: SchollyMotion,
  playMotion: (name: SchollyMotion) => boolean,
  mode: SchollyReminderMode,
  onDashboard: boolean,
  timeZone: string,
) {
  const [deadline, setDeadline] = useState<Cue | null>(null);
  const [submission, setSubmission] = useState<Cue | null>(null);
  const [dashboard, setDashboard] = useState<SchollyDashboardMessages | null>(null);
  const [shown, setShown] = useState<Cue | null>(null);
  const [quietDays, setQuietDays] = useState<Readonly<Record<number, string>>>({});
  const storedByProfile = useRef(new Map<number, StoredSession>());
  const editing = useSyncExternalStore(subscribeToEditing, userIsEditing, () => false);
  const dashboardData = dashboard?.profileId === profileId ? dashboard : null;

  useLayoutEffect(() => {
    if (!profileId) return;
    function onDeadline(event: Event) {
      const detail = (event as CustomEvent<SchollyDeadlineCue>).detail;
      if (detail?.profileId !== profileId || !Number.isInteger(detail.daysRemaining)
        || detail.daysRemaining < 0 || detail.daysRemaining > 3) return;
      const key = `scholly:deadline-cue:${profileId}:${detail.id}:${detail.dueDate}:${detail.daysRemaining}`;
      setDeadline({ kind: "deadline", key, profileId, daysRemaining: detail.daysRemaining });
    }

    function onSubmission(event: Event) {
      const detail = (event as CustomEvent<SchollySubmissionCue>).detail;
      if (detail?.profileId !== profileId || !Number.isInteger(detail.applicationId)) return;
      setSubmission({ kind: "submission", key: `submission:${detail.applicationId}`, profileId });
    }

    function onDashboardMessages(event: Event) {
      const detail = (event as CustomEvent<SchollyDashboardMessages>).detail;
      if (detail?.profileId === profileId) setDashboard(detail);
    }

    window.addEventListener(SCHOLLY_DEADLINE_NEAR, onDeadline);
    window.addEventListener(SCHOLLY_APPLICATION_SUBMITTED, onSubmission);
    window.addEventListener(SCHOLLY_DASHBOARD_MESSAGES, onDashboardMessages);
    return () => {
      window.removeEventListener(SCHOLLY_DEADLINE_NEAR, onDeadline);
      window.removeEventListener(SCHOLLY_APPLICATION_SUBMITTED, onSubmission);
      window.removeEventListener(SCHOLLY_DASHBOARD_MESSAGES, onDashboardMessages);
    };
  }, [profileId]);

  useEffect(() => {
    if (!profileId || blocked || editing || shown?.profileId === profileId) return;
    const pending: Cue[] = [];
    if (deadline?.profileId === profileId) pending.push(deadline);
    if (submission?.profileId === profileId) pending.push(submission);
    if (onDashboard && dashboardData) pending.push(...dashboardData.messages.map((message) => ({ ...message, profileId })));
    const state = readStoredSession(profileId, storedByProfile.current.get(profileId));
    const quietDay = quietDays[profileId] ?? (() => {
      try { return localStorage.getItem(`scholly:quiet-day:${profileId}`); } catch { return null; }
    })();
    const currentMode = quietDay === schollyDayKey(new Date(), timeZone) ? "muted" : mode;
    const next = nextSchollyMessage(pending, state.history, state.session, currentMode, Date.now());
    if (!next) return;
    const pose = poseFor(next.message);
    if (SCHOLLY_MOTION_PRIORITY[motion] >= SCHOLLY_MOTION_PRIORITY[pose]) return;
    const cueDelay = next.message.kind === "submission" ? 0 : next.message.kind === "deadline" ? 450 : 3_000;
    const timer = setTimeout(() => {
      if (userIsEditing() || document.hidden) return;
      const current = readStoredSession(profileId, storedByProfile.current.get(profileId));
      const candidate = nextSchollyMessage(pending, current.history, current.session, currentMode, Date.now());
      if (!candidate || candidate.waitMs > 0 || candidate.message.key !== next.message.key || !playMotion(pose)) return;
      const cue = { ...candidate.message, profileId };
      storeShownCue(cue, current, Date.now());
      storedByProfile.current.set(profileId, current);
      setShown(cue);
      if (cue.kind === "submission") setSubmission(null);
      if (cue.kind === "deadline") setDeadline(null);
    }, Math.max(next.waitMs, cueDelay));
    return () => clearTimeout(timer);
  }, [blocked, dashboardData, deadline, editing, mode, motion, onDashboard, playMotion, profileId, quietDays, shown, submission, timeZone]);

  useEffect(() => {
    if (!shown) return;
    const timer = setTimeout(() => setShown(null), shown.kind === "submission" ? 2_500 : DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [shown]);

  const visible = !blocked && !editing && motion !== "drag" && motion !== "shake" && motion !== "easter"
    && shown?.profileId === profileId && (onDashboard || shown.kind === "deadline" || shown.kind === "submission")
    && (shown.kind === "submission" || mode === "full" || (mode === "important" && shown.kind === "deadline"));
  function muteToday() {
    if (!profileId) return;
    const day = schollyDayKey(new Date(), timeZone);
    try { localStorage.setItem(`scholly:quiet-day:${profileId}`, day); } catch {}
    setQuietDays((previous) => ({ ...previous, [profileId]: day }));
    setShown(null);
  }

  return { cue: visible ? shown : null, audience: dashboardData?.audience ?? [], muteToday };
}
