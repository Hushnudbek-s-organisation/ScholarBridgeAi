"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button } from "./Button";
import { ErrorNote } from "./journey";

export function PanelDialog({ title, busy = false, error, onClose, children, className = "" }: {
  title: string;
  busy?: boolean;
  error?: string;
  className?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const tc = useTranslations("common");
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => { if (dialog.open) dialog.close(); };
  }, []);
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={id}
      className={`m-auto max-h-[90dvh] w-[calc(100%-1.5rem)] overflow-y-auto rounded-overlay border border-slate-200 bg-white p-4 text-slate-900 shadow-xl backdrop:bg-slate-950/70 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 sm:p-6 ${className || "max-w-lg"}`}
      onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <h2 id={id} className="break-words text-lg font-bold">{title}</h2>
        <Button type="button" size="sm" variant="ghost" className="min-h-11" disabled={busy} onClick={onClose}>{tc("close")}</Button>
      </header>
      {error && <div className="mb-3"><ErrorNote message={error} /></div>}
      {children}
    </dialog>
  );
}
