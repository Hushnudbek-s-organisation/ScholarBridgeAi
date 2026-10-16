/**
 * Course tracks — the catalogue's filter bar.
 *
 * The catalogue mixes three kinds of courses: practical portal walkthroughs
 * ("How to fill Common App"), funding walkthroughs ("El-yurt umidi, GKS"), and
 * exam/visa preparation. Instead of a new database column (which would be
 * empty for every existing row and for anything an admin adds without knowing
 * about it), the track is derived from the title + description with an
 * ordered, deterministic keyword match. Admins get the right grouping for free
 * — the seeded titles were written to hit these keywords.
 *
 * `all` is the default and matches everything.
 */
export const COURSE_TRACKS = ["all", "portals", "scholarships", "documents", "exams"] as const;

export type CourseTrack = (typeof COURSE_TRACKS)[number];

/** Human label keys for the i18n message files (`courses.track*`). */
export const COURSE_TRACK_LABEL_KEYS: Record<CourseTrack, string> = {
  all: "trackAll",
  portals: "trackPortals",
  scholarships: "trackScholarships",
  documents: "trackDocuments",
  exams: "trackExams",
};

const TRACK_PATTERNS: { track: Exclude<CourseTrack, "all">; re: RegExp }[] = [
  // Application portals first: "Common App & CSS Profile" must not be filed
  // under scholarships just because the CSS Profile is a funding form.
  {
    track: "portals",
    re: /common\s?app|css\s?profile|uni-?assist|tumonline|dreamapply|universitaly|my\s?assist|sperrkonto|blocked account|portal|walkthrough|platform|scholarbridge/i,
  },
  {
    track: "scholarships",
    re: /el-yurt|elyurt|gks|study in korea|t[üu]rkiye burslar|türkiye|chevening|daad|mext|stipendium|scholarship|grant|moliyaviy|sovrin/i,
  },
  {
    track: "documents",
    re: /\bsop\b|statement of purpose|personal statement|essay|\bcv\b|résumé|resume|apostille|notar|transcript|shahodatnoma|document|hujjat|tavsiyanoma|recommendation letter/i,
  },
  {
    track: "exams",
    re: /ielts|toefl|duolingo|\bsat\b|\bact\b|exam|visa|interview|suhbat|elchixona|embassy/i,
  },
];

/** Which track a course belongs to (never `all`). */
export function courseTrackOf(title: string, description = ""): Exclude<CourseTrack, "all"> {
  const haystack = `${title} ${description}`;
  for (const { track, re } of TRACK_PATTERNS) {
    if (re.test(haystack)) return track;
  }
  // Anything unrecognised stays under "All" only.
  return "documents";
}

/** Post-filter: `courseTrackOf` when a specific track is selected. */
export function courseMatchesTrack(
  course: { title: string; description?: string | null },
  track: CourseTrack,
): boolean {
  if (track === "all") return true;
  return courseTrackOf(course.title, course.description ?? "") === track;
}
