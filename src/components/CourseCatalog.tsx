"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { PlayCircle, BookOpen, Clock, BarChart3, Search, Layers, Video, X } from "lucide-react";
import {
  COURSE_TRACKS,
  COURSE_TRACK_LABEL_KEYS,
  courseMatchesTrack,
  courseTrackOf,
  type CourseTrack,
} from "@/lib/courseTracks";

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
  moduleCount?: number;
  totalDurationSeconds?: number;
  hasVideo?: boolean;
}

interface CourseCatalogProps {
  courses: CourseItem[];
  onOpen: (courseId: number) => void;
}

/** "2 h 15 m" / "45 m" — never a raw seconds count. */
function formatDuration(totalSeconds: number, hourSuffix: string, minuteSuffix: string): string {
  const minutes = Math.round((totalSeconds || 0) / 60);
  if (minutes < 60) return `${minutes}${minuteSuffix}`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}${hourSuffix}` : `${hours}${hourSuffix} ${rest}${minuteSuffix}`;
}

export function CourseCatalog({ courses, onOpen }: CourseCatalogProps) {
  const t = useTranslations("courses");
  const [track, setTrack] = useState<CourseTrack>("all");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses.filter((course) => {
      if (!courseMatchesTrack(course, track)) return false;
      if (!q) return true;
      return (
        course.title.toLowerCase().includes(q) ||
        course.description.toLowerCase().includes(q) ||
        course.instructorName.toLowerCase().includes(q)
      );
    });
  }, [courses, track, query]);

  const trackCounts = useMemo(() => {
    const counts = new Map<CourseTrack, number>();
    for (const key of COURSE_TRACKS) {
      counts.set(
        key,
        key === "all" ? courses.length : courses.filter((c) => courseTrackOf(c.title, c.description) === key).length,
      );
    }
    return counts;
  }, [courses]);

  if (courses.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-10 text-center dark:border-slate-700 dark:bg-[#111a2e]">
        <BookOpen className="h-10 w-10 text-indigo-400 mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{t("noCourses")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Track filter + instant search */}
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-700 dark:bg-[#111a2e]">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchCourses")}
            aria-label={t("searchCourses")}
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-9 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 sm:text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label={t("clearSearch")}
              className="absolute right-2 top-2.5 rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {COURSE_TRACKS.map((key) => {
            const active = track === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTrack(key)}
                aria-pressed={active}
                className={`min-h-9 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${
                  active
                    ? "border-indigo-500 bg-indigo-600 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-300 hover:text-indigo-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                }`}
              >
                {t(COURSE_TRACK_LABEL_KEYS[key])}
                <span className={`ml-1.5 ${active ? "text-indigo-100" : "text-slate-400"}`}>
                  {trackCounts.get(key) ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {t("noTrackMatches")}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {visible.map((course) => {
            const inProgress = course.progressPct > 0 && course.progressPct < 100;
            const done = course.progressPct >= 100;
            const clip = course.totalDurationSeconds
              ? formatDuration(course.totalDurationSeconds, t("durationHourShort"), t("durationMinuteShort"))
              : null;
            return (
              <div
                key={course.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden hover:shadow-lg hover:border-indigo-300 transition-all flex flex-col dark:border-slate-700 dark:bg-[#111a2e]"
              >
                <button
                  type="button"
                  onClick={() => onOpen(course.id)}
                  className="relative block h-40 w-full bg-gradient-to-br from-indigo-500 via-blue-600 to-violet-600 text-left"
                  aria-label={`${t("continueCourse")} — ${course.title}`}
                >
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
                  {(course.hasVideo ?? true) && (
                    <div className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-rose-600/90 px-2 py-1 text-[10px] font-bold text-white backdrop-blur">
                      <Video className="h-3 w-3" /> {t("videoGuideBadge")}
                    </div>
                  )}
                  {done && (
                    <div className="absolute inset-0 bg-emerald-600/70 flex items-center justify-center">
                      <span className="text-white font-extrabold text-lg">✓ {t("certificate")}</span>
                    </div>
                  )}
                </button>

                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-bold text-slate-900 text-sm leading-snug dark:text-slate-100">{course.title}</h3>
                  <p className="mt-1 break-words text-[11px] text-slate-400">{course.description}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5" /> {course.moduleCount ?? 0} {t("modules")}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" /> {course.lessonCount} {t("lessons")}
                    </span>
                    {clip && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {clip}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <BarChart3 className="h-3.5 w-3.5" /> {course.progressPct}%
                    </span>
                  </div>

                  <div className="mt-3">
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden dark:bg-slate-800">
                      <div className="h-full bg-indigo-600 rounded-full transition-all" style={{ width: `${course.progressPct}%` }} />
                    </div>
                  </div>

                  <div className="mt-auto pt-3">
                    <button
                      type="button"
                      onClick={() => onOpen(course.id)}
                      className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                        inProgress ? "bg-amber-500 text-white sb-ink-on-warm hover:bg-amber-600" : done ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-indigo-600 text-white hover:bg-indigo-700"
                      }`}
                    >
                      <PlayCircle className="h-4 w-4" />
                      {done ? t("viewCertificate") : inProgress ? t("continueCourse") : t("startCourse")}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
