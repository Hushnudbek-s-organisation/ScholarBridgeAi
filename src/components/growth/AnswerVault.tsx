"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Archive, Check, ChevronDown, Copy, Lightbulb, Loader2, Save } from "lucide-react";
import type { StudentProfile } from "../Navbar";
import { AnimatedBar } from "../motion";
import { useSeedText } from "./useSeedText";
import { api, EmptyState, ErrorNote, LoadingBlock, PageHeader, Segmented, Toast, useToast } from "./ui";
import { SampleInlineCard } from "../samples/SampleExemplarBar";
import { useSampleLibrary } from "../samples/useSampleLibrary";
import { isUnmodifiedSample } from "@/lib/samples/text";

interface VaultItem {
  promptId: number;
  category: string;
  question: string;
  hint: string;
  wordLimit: number | null;
  answer: string;
  words: number;
  updatedAt: string | null;
}

const countWords = (s: string) => (s.trim().match(/\S+/g) ?? []).length;

/**
 * Answer Vault — "write once, reuse everywhere" (ScholarshipOwl's universal
 * application, adapted). Questions are managed by the admin; answers autosave
 * and have a one-tap Copy for pasting into official forms.
 */
export function AnswerVault({ activeProfile }: { activeProfile: StudentProfile | null }) {
  const t = useTranslations("vault");
  const ts = useTranslations("samples");
  const tr = useSeedText();
  const { lib: sampleLib } = useSampleLibrary();
  // Example answers: shown per prompt on request; a loaded example is never
  // autosaved and cannot be saved until the student has rewritten it.
  const [exampleOpen, setExampleOpen] = useState<Record<number, boolean>>({});
  const [loadedExample, setLoadedExample] = useState<Record<number, string>>({});
  const [items, setItems] = useState<VaultItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("all");
  const [open, setOpen] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<number | null>(null);
  const [savedAt, setSavedAt] = useState<Record<number, boolean>>({});
  const [toast, showToast] = useToast();
  const timers = useRef<Record<number, number>>({});
  const profileId = activeProfile?.id ?? null;

  useEffect(() => {
    if (!profileId) return;
    let live = true;
    api<{ items: VaultItem[] }>(`/api/vault?profileId=${profileId}`)
      .then((d) => {
        if (!live) return;
        setItems(d.items);
        setDrafts(Object.fromEntries(d.items.map((i) => [i.promptId, i.answer])));
        const firstEmpty = d.items.find((i) => !i.answer.trim());
        setOpen((firstEmpty ?? d.items[0])?.promptId ?? null);
      })
      .catch((e: Error) => live && setError(e.message));
    const pending = timers.current;
    return () => {
      live = false;
      Object.values(pending).forEach((id) => window.clearTimeout(id));
    };
  }, [profileId]);

  const persist = async (promptId: number, answer: string) => {
    if (!profileId) return;
    if (isUnmodifiedSample(answer, loadedExample[promptId])) {
      showToast(ts("unmodified"));
      return;
    }
    setSaving(promptId);
    try {
      await api("/api/vault", { method: "PUT", body: JSON.stringify({ profileId, promptId, answer }) });
      setItems((prev) => prev?.map((i) => (i.promptId === promptId ? { ...i, answer, words: countWords(answer) } : i)) ?? prev);
      setSavedAt((s) => ({ ...s, [promptId]: true }));
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setSaving((s) => (s === promptId ? null : s));
    }
  };

  // Autosave 1.2 s after the student stops typing.
  const onType = (promptId: number, value: string) => {
    setDrafts((d) => ({ ...d, [promptId]: value }));
    setSavedAt((s) => ({ ...s, [promptId]: false }));
    if (timers.current[promptId]) window.clearTimeout(timers.current[promptId]);
    timers.current[promptId] = window.setTimeout(() => void persist(promptId, value), 1200);
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(t("copied"));
    } catch {
      showToast(t("copyFailed"));
    }
  };

  const categories = useMemo(() => [...new Set((items ?? []).map((i) => i.category))], [items]);
  const answered = (items ?? []).filter((i) => (drafts[i.promptId] ?? "").trim()).length;
  const total = items?.length ?? 0;
  const visible = (items ?? []).filter((i) => category === "all" || i.category === category);

  const catLabel = (c: string) => {
    const known = ["general", "motivation", "career", "leadership", "challenge", "community"];
    return known.includes(c) ? t(`cat.${c}`) : c;
  };

  if (!profileId) return <EmptyState icon={Archive} title={t("signInTitle")} body={t("signInBody")} />;

  return (
    <div className="space-y-4">
      <PageHeader icon={Archive} title={t("title")} subtitle={t("subtitle")} accent="sky" />

      {error && <ErrorNote message={error} />}
      {!items && !error && <LoadingBlock label={t("loading")} />}

      {items && items.length === 0 && <EmptyState icon={Archive} title={t("empty")} />}

      {items && items.length > 0 && (
        <>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>{t("progress", { done: answered, total })}</span>
              <span className="font-black text-sky-600">{total ? Math.round((answered / total) * 100) : 0}%</span>
            </div>
            <div className="mt-2">
              <AnimatedBar value={total ? (answered / total) * 100 : 0} barClassName="bg-sky-500" />
            </div>
            <p className="mt-2 text-[11px] text-slate-500">{t("tip")}</p>
          </div>

          {categories.length > 1 && (
            <Segmented
              value={category}
              onChange={setCategory}
              options={[{ id: "all", label: t("all") }, ...categories.map((c) => ({ id: c, label: catLabel(c) }))]}
            />
          )}

          <ul className="space-y-2">
            {visible.map((i) => {
              const draft = drafts[i.promptId] ?? "";
              const words = countWords(draft);
              const over = i.wordLimit != null && words > i.wordLimit;
              const isOpen = open === i.promptId;
              const done = draft.trim().length > 0;
              const example = sampleLib?.ANSWER_VAULT_SAMPLES.find((sample) => sample.category === i.category) ?? null;
              const holdsExample = isUnmodifiedSample(draft, loadedExample[i.promptId]);
              return (
                <li key={i.promptId} className={`overflow-hidden rounded-2xl border bg-white dark:bg-slate-900 ${isOpen ? "border-sky-300 shadow-sm" : "border-slate-200 dark:border-slate-700"}`}>
                  <button
                    onClick={() => setOpen(isOpen ? null : i.promptId)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                    aria-expanded={isOpen}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${done ? "bg-emerald-500 text-white sb-ink-on-bright" : "border-2 border-slate-200 dark:border-slate-700"}`}
                    >
                      {done && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">{tr(i.question)}</span>
                      <span className="text-[11px] text-slate-400">
                        {catLabel(i.category)}
                        {i.wordLimit ? ` · ${t("limit", { n: i.wordLimit })}` : ""}
                        {done ? ` · ${t("words", { n: words })}` : ""}
                      </span>
                    </span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                      {i.hint && (
                        <p className="mb-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-800">
                          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {tr(i.hint)}
                        </p>
                      )}
                      {example && (
                        <div className="mb-2">
                          <button
                            type="button"
                            aria-expanded={Boolean(exampleOpen[i.promptId])}
                            onClick={() => setExampleOpen((o) => ({ ...o, [i.promptId]: !o[i.promptId] }))}
                            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-sky-200 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold text-sky-800 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-sky-500/30 dark:text-sky-200"
                          >
                            <Lightbulb className="h-3.5 w-3.5" aria-hidden />
                            {exampleOpen[i.promptId] ? ts("answerHide") : ts("answerShow")}
                          </button>
                          {exampleOpen[i.promptId] && (
                            <div className="mt-2">
                              <SampleInlineCard
                                sample={example}
                                title={ts("answerTitle", { category: catLabel(i.category) })}
                                loadLabel={ts("answerLoad")}
                                onLoad={() => {
                                  setDrafts((d) => ({ ...d, [i.promptId]: example.text }));
                                  setSavedAt((st) => ({ ...st, [i.promptId]: false }));
                                  setLoadedExample((l) => ({ ...l, [i.promptId]: example.text }));
                                }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                      <textarea
                        value={draft}
                        onChange={(e) => onType(i.promptId, e.target.value)}
                        rows={7}
                        maxLength={6000}
                        placeholder={t("placeholder")}
                        className="w-full resize-y rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm leading-relaxed text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                      />
                      {holdsExample && (
                        <p className="mt-2 text-[11px] leading-relaxed text-violet-800 dark:text-violet-200">{ts("unmodified")}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <span className={`text-[11px] font-semibold ${over ? "text-rose-600" : "text-slate-500"}`}>
                          {i.wordLimit ? t("wordsOf", { n: words, max: i.wordLimit }) : t("words", { n: words })}
                          {over ? ` · ${t("tooLong")}` : ""}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400">
                            {saving === i.promptId ? (
                              <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> {t("saving")}</span>
                            ) : savedAt[i.promptId] ? (
                              t("savedAuto")
                            ) : null}
                          </span>
                          <button
                            onClick={() => void persist(i.promptId, draft)}
                            disabled={holdsExample}
                            title={holdsExample ? ts("unmodified") : undefined}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                          >
                            <Save className="h-3.5 w-3.5" /> {t("save")}
                          </button>
                          <button
                            disabled={!draft.trim()}
                            onClick={() => void copy(draft)}
                            className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-sky-700 disabled:opacity-40"
                          >
                            <Copy className="h-3.5 w-3.5" /> {t("copy")}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
      <Toast message={toast} />
    </div>
  );
}
