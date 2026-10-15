"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { PlayCircle, BookOpen, Clock, BarChart3 } from "lucide-react";

export interface CourseItem {
  id: number;
  title: string;
  description: string;
  instructorName: string;
  level: string;
  thumbnailUrl: string;
  isPublished: boolean;
  createdAt: string;
  lessonCount: number;
  completedLessons: number;
  progressPct: number;
}

interface CourseCatalogProps {
  courses: CourseItem[];
  onOpen: (courseId: number) => void;
}

export function CourseCatalog({ courses, onOpen }: CourseCatalogProps) {
  const t = useTranslations("courses");

  if (courses.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-10 text-center">
        <BookOpen className="h-10 w-10 text-indigo-400 mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-600">{t("noCourses")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {courses.map((course) => {
        const inProgress = course.progressPct > 0 && course.progressPct < 100;
        const done = course.progressPct >= 100;
        return (
          /* The card was a clickable <div> wrapping a <button>: two nested
             interactive elements, no keyboard focus stop for the card, and a
             screen reader that only saw the inner button. It is now a card
             whose single full-size button is a sibling of the content (the
             stretched-link pattern) — one focus stop, valid markup, same look. */
          <article
            key={course.id}
            className="relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition-all hover:border-indigo-300 hover:shadow-lg"
          >
            <button
              type="button"
              onClick={() => onOpen(course.id)}
              aria-label={`${course.title} — ${done ? t("viewCertificate") : inProgress ? t("continueCourse") : t("startCourse")}`}
              className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
            />
            <div className="relative h-40 bg-gradient-to-br from-indigo-500 via-blue-600 to-violet-600">
              {course.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={course.thumbnailUrl} alt={course.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="h-12 w-12 text-white/60" />
                </div>
              )}
              <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-black/50 backdrop-blur text-white text-[10px] font-bold">
                {course.level}
              </div>
              {done && (
                <div className="absolute inset-0 bg-emerald-600/70 flex items-center justify-center">
                  <span className="text-white font-extrabold text-lg">✓ {t("certificate")}</span>
                </div>
              )}
            </div>

            <div className="p-4 flex flex-col flex-1">
              <h3 className="font-bold text-slate-900 text-sm leading-snug">{course.title}</h3>
              <p className="mt-1 break-words text-[11px] text-slate-400">{course.description}</p>

              <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-3">
                <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {course.lessonCount} {t("lessons")}</span>
                <span className="inline-flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5" /> {course.progressPct}%</span>
              </div>

              <div className="mt-3">
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full transition-all" style={{ width: `${course.progressPct}%` }} />
                </div>
              </div>

              {/* Visual affordance only — the card itself is the button, so
                  this is a span (no nested interactive element). */}
              <div className="mt-auto pt-3">
                <span
                  className={`flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-colors ${
                    inProgress ? "bg-amber-500 text-white sb-ink-on-warm" : done ? "bg-emerald-600 text-white" : "bg-indigo-600 text-white"
                  }`}
                >
                  <PlayCircle className="h-4 w-4" />
                  {done ? t("viewCertificate") : inProgress ? t("continueCourse") : t("startCourse")}
                </span>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
