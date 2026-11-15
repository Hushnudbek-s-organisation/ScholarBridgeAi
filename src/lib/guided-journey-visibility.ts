"use client";

import { useSyncExternalStore } from "react";

const storageKey = "scholarbridge:guided-journey-hidden";
const changeEvent = "scholarbridge:guided-journey-visibility";
let hiddenForVisit = false;

function subscribe(listener: () => void) {
  window.addEventListener(changeEvent, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(changeEvent, listener);
    window.removeEventListener("storage", listener);
  };
}

function isHidden() {
  try { return localStorage.getItem(storageKey) === "1"; } catch { return hiddenForVisit; }
}

export function setGuidedJourneyHidden(hidden: boolean) {
  hiddenForVisit = hidden;
  try { localStorage.setItem(storageKey, hidden ? "1" : "0"); } catch {}
  window.dispatchEvent(new Event(changeEvent));
}

export function useGuidedJourneyHidden() {
  return useSyncExternalStore(subscribe, isHidden, () => false);
}
