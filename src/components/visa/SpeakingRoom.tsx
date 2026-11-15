"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function SpeakingRoom({ open, title, exitLabel, onExit, children }: {
  open: boolean;
  title: string;
  exitLabel: string;
  onExit: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useId();

  useEffect(() => {
    const room = dialog.current;
    if (!room || !open) return;
    room.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      room.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <dialog ref={dialog} aria-labelledby={heading}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto overscroll-contain border-0 bg-canvas text-slate-900 backdrop:bg-canvas dark:text-slate-100"
      onCancel={event => { event.preventDefault(); onExit(); }}>
      {open && <div className="mx-auto max-w-6xl space-y-5 px-4 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-8 sm:pt-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h2 id={heading} className="text-lg font-bold sm:text-xl">{title}</h2>
          <Button variant="outline" type="button" onClick={onExit}><ArrowLeft size={16} aria-hidden /> {exitLabel}</Button>
        </header>
        {children}
      </div>}
    </dialog>
  );
}
