"use client";

import React, { useId, useRef } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";
import { Button } from "@/components/ui/Button";

interface BottomSheetProps {
  id?: string;
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** Phone-only modal sheet with the same keyboard contract as other dialogs. */
export function BottomSheet({ id, open, onClose, title, description, children, footer }: BottomSheetProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const t = useTranslations("common");
  useDialogFocusTrap({ open, dialogRef, onEscape: onClose });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-sm sm:hidden"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className="sb-sheet absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-overlay border border-b-0 border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl outline-none dark:border-slate-700 dark:bg-surface"
      >
        <div aria-hidden="true" className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" />
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h2>
            {description && <p id={descriptionId} className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>}
          </div>
          <Button
            variant="unstyled"
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">{children}</div>
        {footer && <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-surface">{footer}</div>}
      </div>
    </div>
  );
}
