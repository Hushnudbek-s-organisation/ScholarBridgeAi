"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { GraduationCap } from "lucide-react";
import { StudentProfile } from "./Navbar";
import { CourseCatalog, CourseItem } from "./CourseCatalog";
import { CoursePlayer } from "./CoursePlayer";
import { MyCertificatesPanel } from "./MyCertificatesPanel";

interface CoursesSectionProps {
  activeProfile: StudentProfile | null;
}

export function CoursesSection({ activeProfile }: CoursesSectionProps) {
  const t = useTranslations("courses");
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCourseId, setOpenCourseId] = useState<number | null>(null);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/courses${activeProfile ? `?profileId=${activeProfile.id}` : ""}`);
      const data = await res.json();
      if (data.courses) setCourses(data.courses);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeProfile]);

  useEffect(() => {
    void Promise.resolve().then(loadCourses);
  }, [loadCourses]);

  return (
    <div className="space-y-6">
      {/* Section toolbar, not a second hero: the Community destination
          (HubPage) already owns this screen's hero and <h1>. */}
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-xs dark:border-slate-700">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 ring-1 ring-indigo-100 dark:ring-indigo-500/25">
          <GraduationCap className="h-5 w-5 text-indigo-600" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">{t("title")}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{t("subtitle")}</p>
        </div>
      </div>

      <MyCertificatesPanel activeProfile={activeProfile} />

      {openCourseId && activeProfile ? (
        <CoursePlayer
          courseId={openCourseId}
          profileId={activeProfile.id}
          profileName={activeProfile.name}
          onBack={() => {
            setOpenCourseId(null);
            loadCourses();
          }}
        />
      ) : loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-10 text-center">
          <p className="text-sm text-slate-500">{t("loading")}</p>
        </div>
      ) : (
        <CourseCatalog courses={courses} onOpen={setOpenCourseId} />
      )}
    </div>
  );
}
