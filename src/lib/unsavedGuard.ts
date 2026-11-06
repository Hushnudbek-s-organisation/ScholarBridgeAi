/**
 * Never lose an unsaved essay or form to an automatic reload.
 *
 * Recovery from a failed chunk must not call `location.reload()` on its own.
 * Even an explicit "Refresh" button first asks this module whether the page is
 * holding unsaved work. We watch only the fields that can contain an essay or
 * a long answer (textarea / contenteditable / explicitly marked inputs), so a
 * search box or a theme toggle does not falsely block recovery.
 */

export const UNSAVED_EVENT = "sb:unsaved-changed";
export const UNSAVED_CLEAR_EVENT = "sb:unsaved-cleared";

let dirty = false;
let listening = false;

function setDirty(next: boolean) {
  if (dirty === next) return;
  dirty = next;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(UNSAVED_EVENT, { detail: { dirty } }));
  }
}

/** Called once from the version monitor. Idempotent. */
export function trackUnsavedWork(): () => void {
  if (listening || typeof window === "undefined") {
    return () => { /* another monitor owns the listener */ };
  }
  listening = true;
  const onInput = (event: Event) => {
    const el = event.target as HTMLElement | null;
    if (!el) return;
    if (el.getAttribute("data-sb-track-unsaved") === "false") return;
    const tag = el.tagName?.toLowerCase();
    if (tag === "textarea" || el.isContentEditable || el.getAttribute("data-sb-unsaved") === "true") {
      setDirty(true);
    }
  };
  const clear = () => setDirty(false);
  const beforeUnload = (event: BeforeUnloadEvent) => {
    if (!hasUnsavedWork()) return;
    event.preventDefault();
    event.returnValue = "";
  };
  window.addEventListener("input", onInput, true);
  window.addEventListener("submit", clear, true);
  window.addEventListener(UNSAVED_CLEAR_EVENT, clear);
  window.addEventListener("beforeunload", beforeUnload);
  return () => {
    window.removeEventListener("input", onInput, true);
    window.removeEventListener("submit", clear, true);
    window.removeEventListener(UNSAVED_CLEAR_EVENT, clear);
    window.removeEventListener("beforeunload", beforeUnload);
    listening = false;
  };
}

/** Explicitly marked dirty elements win over the tracked flag. */
export function hasUnsavedWork(): boolean {
  if (dirty) return true;
  if (typeof document === "undefined") return false;
  return Boolean(
    document.querySelector(
      '[data-sb-unsaved="true"], textarea[data-sb-dirty="true"], [contenteditable="true"][data-sb-dirty="true"]',
    ),
  );
}

/** A saved draft or a successful submit can clear the guard. */
export function clearUnsavedWork(): void {
  setDirty(false);
}

/**
 * Reload only after the user asked for it, and never over an unsaved draft
 * without a confirmation. Returns false when the reload was declined.
 */
export function confirmSafeReload(): boolean {
  if (typeof window === "undefined") return false;
  if (hasUnsavedWork() && !window.confirm(
    document.documentElement.lang?.startsWith("ru")
      ? "На странице есть несохранённый текст. Всё равно обновить страницу?"
      : document.documentElement.lang?.startsWith("uz")
        ? "Sahifada saqlanmagan matn bor. Baribir yangilansinmi?"
        : "This page has unsaved writing. Reload anyway?",
  )) {
    return false;
  }
  window.location.reload();
  return true;
}
