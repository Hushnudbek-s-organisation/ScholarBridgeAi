"use client";

import React, { useState } from "react";
import { Building2, ExternalLink, Globe, MapPin, Star } from "lucide-react";
import { UniversityDetail } from "@/components/UniversityDetail";

const DEMO = {
  name: "Massachusetts Institute of Technology (MIT)",
  city: "Cambridge, MA",
  country: "United States",
  flagEmoji: "🇺🇸",
  worldRanking: 1,
  websiteUrl: "https://www.mit.edu",
  applicationUrl: "https://apply.mitadmissions.org",
  imageUrl:
    "https://images.unsplash.com/photo-1564981797816-1043664bf78d?q=80&w=1600&auto=format&fit=crop",
};

function OldHero() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl">
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_80%_10%,white_1px,transparent_1px)] bg-[length:24px_24px]" />
      <div className="relative p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={DEMO.imageUrl}
            alt={`${DEMO.name} logo`}
            className="h-16 w-16 rounded-2xl bg-white object-contain p-1.5 shadow-lg"
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{DEMO.name}</h1>
            <p className="text-sm text-indigo-200 mt-1 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {DEMO.city}, {DEMO.country} {DEMO.flagEmoji}
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/15 px-3 py-1.5">
              <Star className="h-4 w-4 fill-amber-300 text-amber-300" />
              <span className="text-xs font-bold">QS World Ranking 2027</span>
              <span className="text-sm font-extrabold text-amber-300">#{DEMO.worldRanking}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <a
              href={DEMO.websiteUrl}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white text-slate-900 px-4 py-2 text-xs font-bold"
            >
              <Globe className="h-3.5 w-3.5" /> Official Website
            </a>
            <a
              href={DEMO.applicationUrl}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 text-slate-900 px-4 py-2 text-xs font-bold"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Apply Now
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function NewHero({ showImage }: { showImage: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={DEMO.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover scale-105" />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/85 via-indigo-950/75 to-slate-900/85 backdrop-blur-[2px]" />
      <div className="absolute inset-0 bg-black/10" />
      <div className="relative p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-3xl bg-white shadow-2xl border border-white/30 overflow-hidden flex items-center justify-center shrink-0">
            {showImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={DEMO.imageUrl} alt={`${DEMO.name} logo`} className="h-full w-full object-contain p-2" />
            ) : (
              <div className="flex flex-col items-center justify-center gap-1 text-slate-700">
                <span className="text-2xl leading-none">{DEMO.flagEmoji}</span>
                <Building2 className="h-7 w-7 text-amber-500" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{DEMO.name}</h1>
            <p className="text-sm text-indigo-200 mt-1 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {DEMO.city}, {DEMO.country} {DEMO.flagEmoji}
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 px-3 py-1.5">
              <Star className="h-4 w-4 fill-amber-300 text-amber-300" />
              <span className="text-xs font-bold">QS World Ranking 2027</span>
              <span className="text-sm font-extrabold text-amber-300">#{DEMO.worldRanking}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <a
              href={DEMO.websiteUrl}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white text-slate-900 px-5 py-2.5 text-xs font-bold shadow-lg"
            >
              <Globe className="h-3.5 w-3.5" /> Official Website
            </a>
            <a
              href={DEMO.applicationUrl}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 px-5 py-2.5 text-xs font-bold shadow-lg"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Apply Now
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PreviewPage() {
  const [uniId, setUniId] = useState(1);

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-5xl space-y-10 px-4 py-10">
        <header>
          <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600">ScholarBridgeAI preview</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">UniversityDetail hero redesign</h1>
          <p className="mt-2 text-sm text-slate-600">
            Campus photo as a softly blurred background, medium white logo card, frosted QS badge, and stronger CTA buttons.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">Before</h2>
          <OldHero />
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">After — campus background</h2>
          <NewHero showImage />
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">After — logo fallback (no image)</h2>
          <NewHero showImage={false} />
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">Full UniversityDetail</h2>
            <label className="text-xs font-bold text-slate-600">
              University{" "}
              <select
                value={uniId}
                onChange={(e) => setUniId(Number(e.target.value))}
                className="ml-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-800"
              >
                <option value={1}>MIT</option>
                <option value={2}>Oxford</option>
                <option value={3}>TUM</option>
              </select>
            </label>
          </div>
          <UniversityDetail universityId={uniId} onBack={() => {}} />
        </section>
      </div>
    </div>
  );
}
