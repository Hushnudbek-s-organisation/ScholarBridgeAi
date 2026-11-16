"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  SCHOLLY_APPLICATION_SUBMITTED,
  SCHOLLY_DEADLINE_NEAR,
  type SchollyDeadlineCue,
  type SchollySubmissionCue,
} from "@/lib/scholly-client-events";
import { SCHOLLY_MOTION_PRIORITY, type SchollyMotion } from "./useSchollyMotion";

type Cue = { key: string; profileId: number } & (
  | { kind: "deadline"; daysRemaining: number }
  | { kind: "submission" }
);

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

export function useSchollyActivityCues(
  profileId: number | null,
  blocked: boolean,
  motion: SchollyMotion,
  playMotion: (name: SchollyMotion) => boolean,
) {
  const [deadline, setDeadline] = useState<Cue | null>(null);
  const [submission, setSubmission] = useState<Cue | null>(null);
  const [shown, setShown] = useState<Cue | null>(null);
  const played = useRef(new Set<string>());
  const editing = useSyncExternalStore(subscribeToEditing, userIsEditing, () => false);

  useLayoutEffect(() => {
    if (!profileId) return;
    function onDeadline(event: Event) {
      const detail = (event as CustomEvent<SchollyDeadlineCue>).detail;
      if (detail?.profileId !== profileId || !Number.isInteger(detail.daysRemaining)
        || detail.daysRemaining < 0 || detail.daysRemaining > 3) return;
      const key = `scholly:deadline-cue:${profileId}:${detail.id}:${detail.dueDate}:${detail.daysRemaining}`;
      if (played.current.has(key)) return;
      try { if (sessionStorage.getItem(key)) return; } catch {}
      setDeadline({ kind: "deadline", key, profileId, daysRemaining: detail.daysRemaining });
    }

    function onSubmission(event: Event) {
      const detail = (event as CustomEvent<SchollySubmissionCue>).detail;
      if (detail?.profileId !== profileId || !Number.isInteger(detail.applicationId)) return;
      const key = `scholly:submission-cue:${profileId}:${detail.applicationId}`;
      if (!played.current.has(key)) setSubmission({ kind: "submission", key, profileId });
    }

    window.addEventListener(SCHOLLY_DEADLINE_NEAR, onDeadline);
    window.addEventListener(SCHOLLY_APPLICATION_SUBMITTED, onSubmission);
    return () => {
      window.removeEventListener(SCHOLLY_DEADLINE_NEAR, onDeadline);
      window.removeEventListener(SCHOLLY_APPLICATION_SUBMITTED, onSubmission);
    };
  }, [profileId]);

  const pending = submission?.profileId === profileId ? submission : deadline?.profileId === profileId ? deadline : null;
  useEffect(() => {
    if (!pending || blocked || (pending.kind === "deadline" && editing)) return;
    const pose = pending.kind === "submission" ? "proud" : "concern";
    if (SCHOLLY_MOTION_PRIORITY[motion] >= SCHOLLY_MOTION_PRIORITY[pose]) return;
    const timer = setTimeout(() => {
      if (pending.kind === "deadline" && userIsEditing()) return;
      if (!playMotion(pose)) return;
      played.current.add(pending.key);
      setShown(pending);
      if (pending.kind === "submission") {
        setSubmission(previous => previous === pending ? null : previous);
      } else {
        try { sessionStorage.setItem(pending.key, "1"); } catch {}
        setDeadline(previous => previous === pending ? null : previous);
      }
    }, pending.kind === "deadline" ? 450 : 0);
    return () => clearTimeout(timer);
  }, [blocked, editing, motion, pending, playMotion]);

  useEffect(() => {
    if (!shown || motion === (shown.kind === "submission" ? "proud" : "concern")) return;
    const timer = setTimeout(() => setShown(previous => previous === shown ? null : previous), 0);
    return () => clearTimeout(timer);
  }, [motion, shown]);

  return shown?.profileId === profileId && (shown.kind !== "deadline" || !editing) ? shown : null;
}
