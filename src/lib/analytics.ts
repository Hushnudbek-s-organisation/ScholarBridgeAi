/**
 * Admin analytics queries (server-side only).
 *
 * Table mapping in this project:
 *   - "users"            → `student_profiles`  (the app's user table:
 *                          id, email, is_admin, is_premium, created_at)
 *   - "subscriptions"    → `subscriptions`     (profile_id FK → student_profiles,
 *                          status, current_period_end, created_at)
 *   - "payments"         → `payments`          (status, amount, created_at)
 *   - "visits/traffic"   → `site_visits`       (anonymous page/screen views,
 *                          written by src/lib/visits.ts)
 *
 * Everything here is READ-ONLY — no metric ever writes to the database.
 *
 * Resilience: each metric group is wrapped in `safe()`, so a table that does
 * not exist in a given deployment (e.g. `site_visits` before the analytics
 * migration was applied, or `programs` on an older database) degrades to `0`
 * plus a warning instead of breaking the whole dashboard.
 *
 * Supabase/RLS: this module runs through the server-side Drizzle pool
 * (DATABASE_URL, node-postgres) exactly like every other server query in the
 * app — the `db` handle is never exposed to the client, so the queries run
 * with full server privileges regardless of RLS policies.
 */
import {
  and,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  aiEvaluations,
  aiUsage,
  applicationDocuments,
  applicationTasks,
  auditLogs,
  badges,
  certificates,
  consultingRequests,
  courseCategories,
  courseEnrollments,
  courseModules,
  courses,
  forumCategories,
  forumLikes,
  forumReplies,
  forumReports,
  forumThreads,
  instructors,
  lessonProgress,
  lessons,
  notifications,
  payments,
  pointsLedger,
  quizAttempts,
  referrals,
  refreshJobs,
  savedScholarships,
  savedUniversities,
  scholarships,
  siteVisits,
  studentProfiles,
  subscriptions,
  universities,
  universityPrograms,
  userBadges,
} from "@/db/schema";
import { ensureAnalyticsTables } from "@/lib/visits";

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** Postgres returns bigint/numeric as strings — normalize every metric. */
const num = (v: unknown): number => {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
};

/** Round to 1 decimal (percentages, averages). */
const round1 = (v: number): number => Math.round(v * 10) / 10;

/**
 * Percentage change vs. the previous period.
 * Returns null when there is no base to compare with (a brand-new site has no
 * "previous 30 days"), so the UI shows "—" instead of a misleading +100%.
 */
function deltaPct(current: number, previous: number): number | null {
  if (!previous) return null;
  return round1(((current - previous) / previous) * 100);
}

/** UTC midnight `daysAgo` days before today (today = 0). */
function utcDayStart(daysAgo: number, base: Date = new Date()): Date {
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const isoDay = (d: Date): string => d.toISOString().slice(0, 10);

/** COUNT(*) on any table, optionally filtered. */
async function countTable(table: PgTable, where?: SQL<unknown>): Promise<number> {
  const [row] = await db.select({ value: count() }).from(table).where(where);
  return num(row?.value);
}

/** COUNT(DISTINCT column) on any table, optionally filtered. */
async function countDistinct(
  table: PgTable,
  column: AnyPgColumn | SQL<unknown>,
  where?: SQL<unknown>
): Promise<number> {
  const [row] = await db
    .select({ value: sql<number>`count(distinct ${column})` })
    .from(table)
    .where(where);
  return num(row?.value);
}

/** Run one metric, falling back instead of failing the whole dashboard. */
async function safe<T>(label: string, warnings: string[], fallback: T, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const message = (err as Error)?.message ?? String(err);
    warnings.push(`${label}: ${message.split("\n")[0].slice(0, 160)}`);
    return fallback;
  }
}

/** Day boundaries for the selected window + the previous one (for deltas). */
interface WindowBounds {
  days: number;
  from: Date;
  to: Date;
  prevFrom: Date;
  prevTo: Date;
  todayStart: Date;
  yesterdayStart: Date;
}

// ---------------------------------------------------------------------------
// Legacy helpers (kept — still exported for backwards compatibility)
// ---------------------------------------------------------------------------

/** Total registered users — count of all rows in student_profiles. */
export async function getTotalUsers(): Promise<number> {
  return countTable(studentProfiles);
}

/** Users registered since the start of the current calendar month (UTC). */
export async function getNewUsersThisMonth(): Promise<number> {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return countTable(studentProfiles, gte(studentProfiles.createdAt, monthStart));
}

/** Active paid subscribers — count of subscriptions with status = 'active'. */
export async function getActiveSubscribers(): Promise<number> {
  return countTable(subscriptions, eq(subscriptions.status, "active"));
}

// ---------------------------------------------------------------------------
// Types (shared with the admin dashboard UI via `import type`)
// ---------------------------------------------------------------------------

export interface AnalyticsRange {
  days: number;
  from: string;
  to: string;
  prevFrom: string;
  prevTo: string;
  generatedAt: string;
}

export interface TrafficStats {
  trackingAvailable: boolean;
  trackingSince: string | null;
  views: number;
  prevViews: number;
  viewsDelta: number | null;
  pageViews: number;
  screenViews: number;
  visitors: number;
  prevVisitors: number;
  visitorsDelta: number | null;
  newVisitors: number;
  returningVisitors: number;
  signedInVisitors: number;
  viewsToday: number;
  visitorsToday: number;
  viewsYesterday: number;
  visitorsYesterday: number;
  viewsPerVisitor: number;
  totalViewsAllTime: number;
  totalVisitorsAllTime: number;
  signups: number;
  prevSignups: number;
  signupsDelta: number | null;
  /** visitors → signups conversion for the selected window, in %. */
  conversionRate: number;
}

export interface UserStats {
  total: number;
  prevTotal: number;
  totalDelta: number | null;
  newInWindow: number;
  prevNewInWindow: number;
  newInWindowDelta: number | null;
  newToday: number;
  newYesterday: number;
  newThisMonth: number;
  premium: number;
  activeSubscribers: number;
  onboardingCompleted: number;
  onboardingStarted: number;
  admins: number;
  referredUsers: number;
  usersWithSavedItems: number;
  byLocale: { locale: string; count: number }[];
}

export interface RevenueStats {
  paidCount: number;
  paidTotal: number;
  paidInWindow: number;
  paidTotalInWindow: number;
  prevPaidTotalInWindow: number;
  revenueDelta: number | null;
  avgPayment: number;
  pendingCount: number;
  cancelledCount: number;
  refundedCount: number;
  subscriptionCount: number;
  expiringSoon: number;
  byCurrency: { currency: string; count: number; total: number }[];
  byProvider: { provider: string; count: number; total: number }[];
}

export interface ContentStats {
  universities: number;
  activeUniversities: number;
  verifiedUniversities: number;
  unverifiedUniversities: number;
  countries: number;
  programs: number;
  scholarships: number;
  activeScholarships: number;
  openScholarships: number;
  unverifiedScholarships: number;
  deadlinesSoon: number;
  courses: number;
  publishedCourses: number;
  modules: number;
  lessons: number;
  instructors: number;
  courseCategories: number;
  forumCategories: number;
  forumThreads: number;
  forumReplies: number;
  forumLikes: number;
  openReports: number;
  savedUniversities: number;
  savedScholarships: number;
  tasks: number;
  tasksCompleted: number;
  documents: number;
  documentsUploaded: number;
  consultingRequests: number;
  newConsulting: number;
  completedConsulting: number;
  topCountries: { country: string; count: number }[];
}

export interface EngagementStats {
  aiRequests: number;
  aiRequestsInWindow: number;
  aiFailures: number;
  aiPromptTokens: number;
  aiCompletionTokens: number;
  aiCost: number;
  aiUsers: number;
  aiByTask: { taskType: string; count: number }[];
  evaluations: number;
  enrollments: number;
  enrolledUsers: number;
  courseCompletions: number;
  lessonsCompleted: number;
  certificates: number;
  quizAttempts: number;
  quizPassed: number;
  pointsAwarded: number;
  badgesAwarded: number;
  badgeKinds: number;
  referralsTotal: number;
  referralsCompleted: number;
  notifications: number;
  auditLogs: number;
  refreshJobs: number;
  failedRefreshJobs: number;
  lastRefreshAt: string | null;
}

export interface SeriesPoint {
  date: string;
  views: number;
  visitors: number;
  newVisitors: number;
  signups: number;
}

export interface RecentSignup {
  id: number;
  name: string;
  email: string;
  locale: string;
  isPremium: boolean;
  createdAt: string;
}

export interface RecentVisit {
  id: number;
  path: string;
  screen: string | null;
  device: string;
  referrer: string | null;
  eventType: string;
  visitorId: string;
  profileId: number | null;
  createdAt: string;
}

export interface AnalyticsOverview {
  range: AnalyticsRange;
  traffic: TrafficStats;
  users: UserStats;
  revenue: RevenueStats;
  content: ContentStats;
  engagement: EngagementStats;
  series: SeriesPoint[];
  topPages: { path: string; views: number; visitors: number }[];
  topScreens: { screen: string; views: number; visitors: number }[];
  topReferrers: { referrer: string; views: number; visitors: number }[];
  devices: { device: string; views: number; visitors: number }[];
  recentSignups: RecentSignup[];
  recentVisits: RecentVisit[];
  warnings: string[];
  // Legacy fields (kept so older clients of this endpoint keep working)
  totalUsers: number;
  newUsersThisMonth: number;
  activeSubscribers: number;
}

// ---------------------------------------------------------------------------
// Traffic (site_visits)
// ---------------------------------------------------------------------------

const VIEW_EVENTS = ["page_view", "screen_view"];

function emptyTraffic(): TrafficStats {
  return {
    trackingAvailable: false,
    trackingSince: null,
    views: 0,
    prevViews: 0,
    viewsDelta: null,
    pageViews: 0,
    screenViews: 0,
    visitors: 0,
    prevVisitors: 0,
    visitorsDelta: null,
    newVisitors: 0,
    returningVisitors: 0,
    signedInVisitors: 0,
    viewsToday: 0,
    visitorsToday: 0,
    viewsYesterday: 0,
    visitorsYesterday: 0,
    viewsPerVisitor: 0,
    totalViewsAllTime: 0,
    totalVisitorsAllTime: 0,
    signups: 0,
    prevSignups: 0,
    signupsDelta: null,
    conversionRate: 0,
  };
}

async function trafficStats(bounds: WindowBounds, warnings: string[]): Promise<TrafficStats> {
  const inWindow = and(gte(siteVisits.createdAt, bounds.from), lte(siteVisits.createdAt, bounds.to));
  const inPrev = and(gte(siteVisits.createdAt, bounds.prevFrom), lt(siteVisits.createdAt, bounds.prevTo));
  const isView = inArray(siteVisits.eventType, VIEW_EVENTS);
  const isSignup = eq(siteVisits.eventType, "signup");

  const [windowRow, prevRow, newVisitorsRow, signedInRow, todayRow, yesterdayRow, allTimeRow, sinceRow, signupsRow, prevSignupsRow, byTypeRows] =
    await Promise.all([
      safe("traffic window", warnings, [], () =>
        db
          .select({
            views: count(),
            visitors: sql<number>`count(distinct ${siteVisits.visitorId})`,
            newVisitors: sql<number>`count(distinct case when ${siteVisits.isFirstVisit} then ${siteVisits.visitorId} end)`,
          })
          .from(siteVisits)
          .where(and(isView, inWindow))
      ),
      safe("traffic previous window", warnings, [], () =>
        db
          .select({ views: count(), visitors: sql<number>`count(distinct ${siteVisits.visitorId})` })
          .from(siteVisits)
          .where(and(isView, inPrev))
      ),
      safe("new visitors", warnings, [], () =>
        db
          .select({
            value: sql<number>`count(distinct case when ${siteVisits.isFirstVisit} then ${siteVisits.visitorId} end)`,
          })
          .from(siteVisits)
          .where(and(isView, inWindow))
      ),
      safe("signed-in visitors", warnings, [], () =>
        db
          .select({ value: sql<number>`count(distinct ${siteVisits.profileId})` })
          .from(siteVisits)
          .where(and(isView, isNotNull(siteVisits.profileId), inWindow))
      ),
      safe("traffic today", warnings, [], () =>
        db
          .select({
            views: count(),
            visitors: sql<number>`count(distinct ${siteVisits.visitorId})`,
          })
          .from(siteVisits)
          .where(and(isView, gte(siteVisits.createdAt, bounds.todayStart)))
      ),
      safe("traffic yesterday", warnings, [], () =>
        db
          .select({
            views: count(),
            visitors: sql<number>`count(distinct ${siteVisits.visitorId})`,
          })
          .from(siteVisits)
          .where(
            and(isView, gte(siteVisits.createdAt, bounds.yesterdayStart), lt(siteVisits.createdAt, bounds.todayStart))
          )
      ),
      safe("traffic all time", warnings, [], () =>
        db
          .select({
            views: count(),
            visitors: sql<number>`count(distinct ${siteVisits.visitorId})`,
          })
          .from(siteVisits)
          .where(isView)
      ),
      safe("tracking since", warnings, [], () =>
        db
          .select({ first: sql<string | null>`to_char(min(${siteVisits.createdAt}), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')` })
          .from(siteVisits)
      ),
      safe("signup events", warnings, [], () =>
        db.select({ value: count() }).from(siteVisits).where(and(isSignup, inWindow))
      ),
      safe("signup events (previous)", warnings, [], () =>
        db.select({ value: count() }).from(siteVisits).where(and(isSignup, inPrev))
      ),
      safe("events by type", warnings, [], () =>
        db
          .select({ eventType: siteVisits.eventType, value: count() })
          .from(siteVisits)
          .where(inWindow)
          .groupBy(siteVisits.eventType)
      ),
    ]);

  const views = num(windowRow[0]?.views);
  const visitors = num(windowRow[0]?.visitors);
  const newVisitors = num(newVisitorsRow[0]?.value ?? windowRow[0]?.newVisitors);
  const prevViews = num(prevRow[0]?.views);
  const prevVisitors = num(prevRow[0]?.visitors);
  const signups = num(signupsRow[0]?.value);
  const prevSignups = num(prevSignupsRow[0]?.value);

  return {
    trackingAvailable: true,
    trackingSince: sinceRow[0]?.first ?? null,
    views,
    prevViews,
    viewsDelta: deltaPct(views, prevViews),
    pageViews: num(byTypeRows.find((r) => r.eventType === "page_view")?.value),
    screenViews: num(byTypeRows.find((r) => r.eventType === "screen_view")?.value),
    visitors,
    prevVisitors,
    visitorsDelta: deltaPct(visitors, prevVisitors),
    newVisitors,
    returningVisitors: Math.max(0, visitors - newVisitors),
    signedInVisitors: num(signedInRow[0]?.value),
    viewsToday: num(todayRow[0]?.views),
    visitorsToday: num(todayRow[0]?.visitors),
    viewsYesterday: num(yesterdayRow[0]?.views),
    visitorsYesterday: num(yesterdayRow[0]?.visitors),
    viewsPerVisitor: visitors ? round1(views / visitors) : 0,
    totalViewsAllTime: num(allTimeRow[0]?.views),
    totalVisitorsAllTime: num(allTimeRow[0]?.visitors),
    signups,
    prevSignups,
    signupsDelta: deltaPct(signups, prevSignups),
    conversionRate: visitors ? round1((signups / visitors) * 100) : 0,
  };
}

async function trafficBreakdowns(bounds: WindowBounds, warnings: string[]) {
  const inWindow = and(gte(siteVisits.createdAt, bounds.from), lte(siteVisits.createdAt, bounds.to));
  const viewWindow = and(inArray(siteVisits.eventType, VIEW_EVENTS), inWindow);

  const [topPages, topScreens, topReferrers, devices] = await Promise.all([
    safe("top pages", warnings, [], () =>
      db
        .select({
          path: siteVisits.path,
          views: count(),
          visitors: sql<number>`count(distinct ${siteVisits.visitorId})`,
        })
        .from(siteVisits)
        .where(and(eq(siteVisits.eventType, "page_view"), inWindow))
        .groupBy(siteVisits.path)
        .orderBy(desc(sql`count(*)`))
        .limit(10)
    ),
    safe("top screens", warnings, [], () =>
      db
        .select({
          screen: siteVisits.screen,
          views: count(),
          visitors: sql<number>`count(distinct ${siteVisits.visitorId})`,
        })
        .from(siteVisits)
        .where(and(eq(siteVisits.eventType, "screen_view"), isNotNull(siteVisits.screen), inWindow))
        .groupBy(siteVisits.screen)
        .orderBy(desc(sql`count(*)`))
        .limit(12)
    ),
    safe("top referrers", warnings, [], () =>
      db
        .select({
          referrer: siteVisits.referrer,
          views: count(),
          visitors: sql<number>`count(distinct ${siteVisits.visitorId})`,
        })
        .from(siteVisits)
        .where(and(viewWindow, isNotNull(siteVisits.referrer), ne(siteVisits.referrer, "")))
        .groupBy(siteVisits.referrer)
        .orderBy(desc(sql`count(*)`))
        .limit(10)
    ),
    safe("devices", warnings, [], () =>
      db
        .select({
          device: siteVisits.device,
          views: count(),
          visitors: sql<number>`count(distinct ${siteVisits.visitorId})`,
        })
        .from(siteVisits)
        .where(viewWindow)
        .groupBy(siteVisits.device)
        .orderBy(desc(sql`count(*)`))
    ),
  ]);

  return {
    topPages: topPages.map((r) => ({ path: r.path, views: num(r.views), visitors: num(r.visitors) })),
    topScreens: topScreens.flatMap((r) =>
      r.screen ? [{ screen: r.screen, views: num(r.views), visitors: num(r.visitors) }] : []
    ),
    topReferrers: topReferrers.flatMap((r) =>
      r.referrer ? [{ referrer: r.referrer, views: num(r.views), visitors: num(r.visitors) }] : []
    ),
    devices: devices.map((r) => ({ device: r.device, views: num(r.views), visitors: num(r.visitors) })),
  };
}

const EMPTY_BREAKDOWNS = { topPages: [], topScreens: [], topReferrers: [], devices: [] } as Awaited<
  ReturnType<typeof trafficBreakdowns>
>;

async function dailySeries(bounds: WindowBounds, warnings: string[]): Promise<SeriesPoint[]> {
  const visitDay = sql<string>`to_char(date_trunc('day', ${siteVisits.createdAt}), 'YYYY-MM-DD')`;
  const signupDay = sql<string>`to_char(date_trunc('day', ${studentProfiles.createdAt}), 'YYYY-MM-DD')`;

  const [visitRows, signupRows] = await Promise.all([
    safe("visits series", warnings, [], () =>
      db
        .select({
          day: visitDay,
          views: count(),
          visitors: sql<number>`count(distinct ${siteVisits.visitorId})`,
          newVisitors: sql<number>`count(distinct case when ${siteVisits.isFirstVisit} then ${siteVisits.visitorId} end)`,
        })
        .from(siteVisits)
        .where(
          and(
            inArray(siteVisits.eventType, VIEW_EVENTS),
            gte(siteVisits.createdAt, bounds.from),
            lte(siteVisits.createdAt, bounds.to)
          )
        )
        .groupBy(visitDay)
        .orderBy(visitDay)
    ),
    safe("signups series", warnings, [], () =>
      db
        .select({ day: signupDay, signups: count() })
        .from(studentProfiles)
        .where(and(gte(studentProfiles.createdAt, bounds.from), lte(studentProfiles.createdAt, bounds.to)))
        .groupBy(signupDay)
        .orderBy(signupDay)
    ),
  ]);

  const visitsByDay = new Map(visitRows.map((r) => [r.day, r]));
  const signupsByDay = new Map(signupRows.map((r) => [r.day, num(r.signups)]));

  // Zero-fill every day of the window so the charts never have gaps.
  const series: SeriesPoint[] = [];
  for (let i = bounds.days - 1; i >= 0; i--) {
    const day = isoDay(utcDayStart(i, bounds.to));
    const row = visitsByDay.get(day);
    series.push({
      date: day,
      views: num(row?.views),
      visitors: num(row?.visitors),
      newVisitors: num(row?.newVisitors),
      signups: signupsByDay.get(day) ?? 0,
    });
  }
  return series;
}

async function recentSignups(warnings: string[]): Promise<RecentSignup[]> {
  const rows = await safe("recent signups", warnings, [], () =>
    db
      .select({
        id: studentProfiles.id,
        name: studentProfiles.name,
        email: studentProfiles.email,
        locale: studentProfiles.preferredLocale,
        isPremium: studentProfiles.isPremium,
        createdAt: studentProfiles.createdAt,
      })
      .from(studentProfiles)
      .orderBy(desc(studentProfiles.createdAt))
      .limit(8)
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    locale: r.locale,
    isPremium: !!r.isPremium,
    createdAt: r.createdAt.toISOString(),
  }));
}

async function recentVisits(warnings: string[]): Promise<RecentVisit[]> {
  const rows = await safe("recent visits", warnings, [], () =>
    db
      .select({
        id: siteVisits.id,
        path: siteVisits.path,
        screen: siteVisits.screen,
        device: siteVisits.device,
        referrer: siteVisits.referrer,
        eventType: siteVisits.eventType,
        visitorId: siteVisits.visitorId,
        profileId: siteVisits.profileId,
        createdAt: siteVisits.createdAt,
      })
      .from(siteVisits)
      .orderBy(desc(siteVisits.createdAt))
      .limit(12)
  );
  return rows.map((r) => ({
    id: r.id,
    path: r.path,
    screen: r.screen,
    device: r.device,
    referrer: r.referrer,
    eventType: r.eventType,
    visitorId: (r.visitorId || "").slice(0, 8),
    profileId: r.profileId,
    createdAt: r.createdAt.toISOString(),
  }));
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

async function userStats(bounds: WindowBounds, warnings: string[]): Promise<UserStats> {
  const inWindow = and(gte(studentProfiles.createdAt, bounds.from), lte(studentProfiles.createdAt, bounds.to));
  const inPrev = and(gte(studentProfiles.createdAt, bounds.prevFrom), lt(studentProfiles.createdAt, bounds.prevTo));

  const [
    total,
    prevTotal,
    newInWindow,
    prevNewInWindow,
    newToday,
    newYesterday,
    newThisMonth,
    premium,
    activeSubscribers,
    onboardingCompleted,
    onboardingStarted,
    admins,
    referredUsers,
    usersWithSavedItems,
    byLocale,
  ] = await Promise.all([
    safe("total users", warnings, 0, () => countTable(studentProfiles)),
    safe("users before window", warnings, 0, () => countTable(studentProfiles, lt(studentProfiles.createdAt, bounds.from))),
    safe("new users", warnings, 0, () => countTable(studentProfiles, inWindow)),
    safe("new users (previous)", warnings, 0, () => countTable(studentProfiles, inPrev)),
    safe("new users today", warnings, 0, () => countTable(studentProfiles, gte(studentProfiles.createdAt, bounds.todayStart))),
    safe("new users yesterday", warnings, 0, () =>
      countTable(
        studentProfiles,
        and(gte(studentProfiles.createdAt, bounds.yesterdayStart), lt(studentProfiles.createdAt, bounds.todayStart))
      )
    ),
    safe("new users this month", warnings, 0, () => getNewUsersThisMonth()),
    safe("premium users", warnings, 0, () =>
      countTable(
        studentProfiles,
        and(
          eq(studentProfiles.isPremium, true),
          or(isNull(studentProfiles.premiumUntil), gt(studentProfiles.premiumUntil, bounds.to))
        )
      )
    ),
    safe("active subscribers", warnings, 0, () =>
      countTable(subscriptions, and(eq(subscriptions.status, "active"), gt(subscriptions.currentPeriodEnd, bounds.to)))
    ),
    safe("onboarding completed", warnings, 0, () => countTable(studentProfiles, eq(studentProfiles.onboardingCompleted, true))),
    safe("onboarding started", warnings, 0, () => countTable(studentProfiles, gt(studentProfiles.onboardingStep, 0))),
    safe("admins", warnings, 0, () => countTable(studentProfiles, eq(studentProfiles.isAdmin, true))),
    safe("referred users", warnings, 0, () => countTable(studentProfiles, isNotNull(studentProfiles.referredBy))),
    safe("users with saved items", warnings, 0, () => countDistinct(savedUniversities, savedUniversities.profileId)),
    safe("users by locale", warnings, [], () =>
      db
        .select({ locale: studentProfiles.preferredLocale, value: count() })
        .from(studentProfiles)
        .groupBy(studentProfiles.preferredLocale)
        .orderBy(desc(sql`count(*)`))
        .limit(6)
    ),
  ]);

  return {
    total,
    prevTotal,
    totalDelta: deltaPct(total, prevTotal),
    newInWindow,
    prevNewInWindow,
    newInWindowDelta: deltaPct(newInWindow, prevNewInWindow),
    newToday,
    newYesterday,
    newThisMonth,
    premium,
    activeSubscribers,
    onboardingCompleted,
    onboardingStarted,
    admins,
    referredUsers,
    usersWithSavedItems,
    byLocale: byLocale.map((r) => ({ locale: r.locale || "unknown", count: num(r.value) })),
  };
}

// ---------------------------------------------------------------------------
// Revenue
// ---------------------------------------------------------------------------

async function revenueStats(bounds: WindowBounds, warnings: string[]): Promise<RevenueStats> {
  const paid = eq(payments.status, "paid");
  const paidWindow = and(paid, gte(payments.createdAt, bounds.from), lte(payments.createdAt, bounds.to));
  const paidPrev = and(paid, gte(payments.createdAt, bounds.prevFrom), lt(payments.createdAt, bounds.prevTo));
  const totalExpr = sql<number>`coalesce(sum(${payments.amount}), 0)`;

  const [paidAll, paidInWindow, paidPrevWindow, pendingCount, cancelledCount, refundedCount, byCurrency, byProvider, subscriptionCount, expiringSoon] =
    await Promise.all([
      safe("paid payments", warnings, [], () =>
        db.select({ value: count(), total: totalExpr }).from(payments).where(paid)
      ),
      safe("paid payments (window)", warnings, [], () =>
        db.select({ value: count(), total: totalExpr }).from(payments).where(paidWindow)
      ),
      safe("paid payments (previous window)", warnings, [], () =>
        db.select({ value: count(), total: totalExpr }).from(payments).where(paidPrev)
      ),
      safe("pending payments", warnings, 0, () => countTable(payments, eq(payments.status, "pending"))),
      safe("cancelled payments", warnings, 0, () => countTable(payments, eq(payments.status, "cancelled"))),
      safe("refunded payments", warnings, 0, () => countTable(payments, eq(payments.status, "refunded"))),
      safe("payments by currency", warnings, [], () =>
        db
          .select({ currency: payments.currency, value: count(), total: totalExpr })
          .from(payments)
          .where(paid)
          .groupBy(payments.currency)
          .orderBy(desc(sql`count(*)`))
      ),
      safe("payments by provider", warnings, [], () =>
        db
          .select({ provider: payments.provider, value: count(), total: totalExpr })
          .from(payments)
          .where(paid)
          .groupBy(payments.provider)
          .orderBy(desc(sql`count(*)`))
      ),
      safe("subscriptions", warnings, 0, () => countTable(subscriptions)),
      safe("subscriptions expiring soon", warnings, 0, () =>
        countTable(
          subscriptions,
          and(
            eq(subscriptions.status, "active"),
            gt(subscriptions.currentPeriodEnd, bounds.to),
            lte(subscriptions.currentPeriodEnd, new Date(bounds.to.getTime() + 7 * DAY_MS))
          )
        )
      ),
    ]);

  const paidCount = num(paidAll[0]?.value);
  const paidTotal = Math.round(num(paidAll[0]?.total));
  const paidTotalInWindow = Math.round(num(paidInWindow[0]?.total));
  const prevPaidTotalInWindow = Math.round(num(paidPrevWindow[0]?.total));

  return {
    paidCount,
    paidTotal,
    paidInWindow: num(paidInWindow[0]?.value),
    paidTotalInWindow,
    prevPaidTotalInWindow,
    revenueDelta: deltaPct(paidTotalInWindow, prevPaidTotalInWindow),
    avgPayment: paidCount ? Math.round(paidTotal / paidCount) : 0,
    pendingCount,
    cancelledCount,
    refundedCount,
    subscriptionCount,
    expiringSoon,
    byCurrency: byCurrency.map((r) => ({
      currency: r.currency || "UZS",
      count: num(r.value),
      total: Math.round(num(r.total)),
    })),
    byProvider: byProvider.map((r) => ({
      provider: r.provider || "unknown",
      count: num(r.value),
      total: Math.round(num(r.total)),
    })),
  };
}

// ---------------------------------------------------------------------------
// Content inventory
// ---------------------------------------------------------------------------

async function contentStats(bounds: WindowBounds, warnings: string[]): Promise<ContentStats> {
  const soon = new Date(bounds.to.getTime() + 30 * DAY_MS);

  const [
    universitiesTotal,
    activeUniversities,
    verifiedUniversities,
    countries,
    programs,
    scholarshipsTotal,
    activeScholarships,
    openScholarships,
    unverifiedScholarships,
    deadlinesSoon,
    coursesTotal,
    publishedCourses,
    modules,
    lessonsTotal,
    instructorsTotal,
    courseCategoriesTotal,
    forumCategoriesTotal,
    forumThreadsTotal,
    forumRepliesTotal,
    forumLikesTotal,
    openReports,
    savedUniversitiesTotal,
    savedScholarshipsTotal,
    tasksTotal,
    tasksCompleted,
    documentsTotal,
    documentsUploaded,
    consultingTotal,
    newConsulting,
    completedConsulting,
    topCountries,
  ] = await Promise.all([
    safe("universities", warnings, 0, () => countTable(universities)),
    safe("active universities", warnings, 0, () => countTable(universities, eq(universities.isActive, true))),
    safe("verified universities", warnings, 0, () => countTable(universities, eq(universities.verificationStatus, "verified"))),
    safe("countries", warnings, 0, () => countDistinct(universities, universities.country)),
    safe("programs", warnings, 0, () => countTable(universityPrograms)),
    safe("scholarships", warnings, 0, () => countTable(scholarships)),
    safe("active scholarships", warnings, 0, () => countTable(scholarships, eq(scholarships.isActive, true))),
    safe("open scholarships", warnings, 0, () => countTable(scholarships, eq(scholarships.applicationStatus, "open"))),
    safe("unverified scholarships", warnings, 0, () => countTable(scholarships, eq(scholarships.verificationStatus, "unverified"))),
    safe("deadlines in 30 days", warnings, 0, () =>
      countTable(
        scholarships,
        and(
          eq(scholarships.isActive, true),
          gte(scholarships.deadlineDate, isoDay(bounds.todayStart)),
          lte(scholarships.deadlineDate, isoDay(soon))
        )
      )
    ),
    safe("courses", warnings, 0, () => countTable(courses)),
    safe("published courses", warnings, 0, () => countTable(courses, eq(courses.isPublished, true))),
    safe("course modules", warnings, 0, () => countTable(courseModules)),
    safe("lessons", warnings, 0, () => countTable(lessons)),
    safe("instructors", warnings, 0, () => countTable(instructors)),
    safe("course categories", warnings, 0, () => countTable(courseCategories)),
    safe("forum categories", warnings, 0, () => countTable(forumCategories)),
    safe("forum threads", warnings, 0, () => countTable(forumThreads)),
    safe("forum replies", warnings, 0, () => countTable(forumReplies)),
    safe("forum likes", warnings, 0, () => countTable(forumLikes)),
    safe("open reports", warnings, 0, () => countTable(forumReports, eq(forumReports.status, "open"))),
    safe("saved universities", warnings, 0, () => countTable(savedUniversities)),
    safe("saved scholarships", warnings, 0, () => countTable(savedScholarships)),
    safe("application tasks", warnings, 0, () => countTable(applicationTasks)),
    safe("completed tasks", warnings, 0, () => countTable(applicationTasks, eq(applicationTasks.isCompleted, true))),
    safe("documents", warnings, 0, () => countTable(applicationDocuments)),
    safe("uploaded documents", warnings, 0, () => countTable(applicationDocuments, eq(applicationDocuments.status, "uploaded"))),
    safe("consulting requests", warnings, 0, () => countTable(consultingRequests)),
    safe("new consulting requests", warnings, 0, () => countTable(consultingRequests, eq(consultingRequests.status, "new"))),
    safe("completed consulting", warnings, 0, () => countTable(consultingRequests, eq(consultingRequests.status, "completed"))),
    safe("top university countries", warnings, [], () =>
      db
        .select({ country: universities.country, value: count() })
        .from(universities)
        .groupBy(universities.country)
        .orderBy(desc(sql`count(*)`))
        .limit(8)
    ),
  ]);

  return {
    universities: universitiesTotal,
    activeUniversities,
    verifiedUniversities,
    unverifiedUniversities: Math.max(0, universitiesTotal - verifiedUniversities),
    countries,
    programs,
    scholarships: scholarshipsTotal,
    activeScholarships,
    openScholarships,
    unverifiedScholarships,
    deadlinesSoon,
    courses: coursesTotal,
    publishedCourses,
    modules,
    lessons: lessonsTotal,
    instructors: instructorsTotal,
    courseCategories: courseCategoriesTotal,
    forumCategories: forumCategoriesTotal,
    forumThreads: forumThreadsTotal,
    forumReplies: forumRepliesTotal,
    forumLikes: forumLikesTotal,
    openReports,
    savedUniversities: savedUniversitiesTotal,
    savedScholarships: savedScholarshipsTotal,
    tasks: tasksTotal,
    tasksCompleted,
    documents: documentsTotal,
    documentsUploaded,
    consultingRequests: consultingTotal,
    newConsulting,
    completedConsulting,
    topCountries: topCountries.map((r) => ({ country: r.country, count: num(r.value) })),
  };
}

// ---------------------------------------------------------------------------
// Engagement (AI, courses, gamification, operations)
// ---------------------------------------------------------------------------

async function engagementStats(bounds: WindowBounds, warnings: string[]): Promise<EngagementStats> {
  const [
    aiRequests,
    aiRequestsInWindow,
    aiFailures,
    aiTotals,
    aiUsers,
    aiByTask,
    evaluations,
    enrollments,
    enrolledUsers,
    courseCompletions,
    lessonsCompleted,
    certificatesTotal,
    quizAttemptsTotal,
    quizPassed,
    pointsAwarded,
    badgesAwarded,
    badgeKinds,
    referralsTotal,
    referralsCompleted,
    notificationsTotal,
    auditLogsTotal,
    refreshJobsTotal,
    failedRefreshJobs,
    lastRefresh,
  ] = await Promise.all([
    safe("ai requests", warnings, 0, () => countTable(aiUsage)),
    safe("ai requests (window)", warnings, 0, () =>
      countTable(aiUsage, and(gte(aiUsage.createdAt, bounds.from), lte(aiUsage.createdAt, bounds.to)))
    ),
    safe("ai failures", warnings, 0, () => countTable(aiUsage, ne(aiUsage.status, "success"))),
    safe("ai tokens & cost", warnings, [], () =>
      db
        .select({
          prompt: sql<number>`coalesce(sum(${aiUsage.promptTokens}), 0)`,
          completion: sql<number>`coalesce(sum(${aiUsage.completionTokens}), 0)`,
          cost: sql<number>`coalesce(sum(${aiUsage.costEstimate}), 0)`,
        })
        .from(aiUsage)
    ),
    safe("ai users", warnings, 0, () => countDistinct(aiUsage, aiUsage.profileId)),
    safe("ai by task", warnings, [], () =>
      db
        .select({ taskType: aiUsage.taskType, value: count() })
        .from(aiUsage)
        .groupBy(aiUsage.taskType)
        .orderBy(desc(sql`count(*)`))
        .limit(8)
    ),
    safe("ai evaluations", warnings, 0, () => countTable(aiEvaluations)),
    safe("enrollments", warnings, 0, () => countTable(courseEnrollments)),
    safe("enrolled users", warnings, 0, () => countDistinct(courseEnrollments, courseEnrollments.profileId)),
    safe("course completions", warnings, 0, () => countTable(courseEnrollments, eq(courseEnrollments.isCompleted, true))),
    safe("lessons completed", warnings, 0, () => countTable(lessonProgress, eq(lessonProgress.isCompleted, true))),
    safe("certificates", warnings, 0, () => countTable(certificates)),
    safe("quiz attempts", warnings, 0, () => countTable(quizAttempts)),
    safe("quiz passed", warnings, 0, () => countTable(quizAttempts, eq(quizAttempts.passed, true))),
    safe("points awarded", warnings, 0, () =>
      db.select({ value: sql<number>`coalesce(sum(${pointsLedger.points}), 0)` }).from(pointsLedger).then((r) => num(r[0]?.value))
    ),
    safe("badges awarded", warnings, 0, () => countTable(userBadges)),
    safe("badge kinds", warnings, 0, () => countTable(badges)),
    safe("referrals", warnings, 0, () => countTable(referrals)),
    safe("completed referrals", warnings, 0, () => countTable(referrals, eq(referrals.status, "completed"))),
    safe("notifications", warnings, 0, () => countTable(notifications)),
    safe("audit logs", warnings, 0, () => countTable(auditLogs)),
    safe("refresh jobs", warnings, 0, () => countTable(refreshJobs)),
    safe("failed refresh jobs", warnings, 0, () => countTable(refreshJobs, eq(refreshJobs.status, "failed"))),
    safe("last refresh job", warnings, [], () =>
      db.select({ createdAt: refreshJobs.createdAt }).from(refreshJobs).orderBy(desc(refreshJobs.createdAt)).limit(1)
    ),
  ]);

  return {
    aiRequests,
    aiRequestsInWindow,
    aiFailures,
    aiPromptTokens: num(aiTotals[0]?.prompt),
    aiCompletionTokens: num(aiTotals[0]?.completion),
    aiCost: round1(num(aiTotals[0]?.cost)),
    aiUsers,
    aiByTask: aiByTask.map((r) => ({ taskType: r.taskType, count: num(r.value) })),
    evaluations,
    enrollments,
    enrolledUsers,
    courseCompletions,
    lessonsCompleted,
    certificates: certificatesTotal,
    quizAttempts: quizAttemptsTotal,
    quizPassed,
    pointsAwarded,
    badgesAwarded,
    badgeKinds,
    referralsTotal,
    referralsCompleted,
    notifications: notificationsTotal,
    auditLogs: auditLogsTotal,
    refreshJobs: refreshJobsTotal,
    failedRefreshJobs,
    lastRefreshAt: lastRefresh[0]?.createdAt ? lastRefresh[0].createdAt.toISOString() : null,
  };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 45_000;
const overviewCache = new Map<number, { at: number; data: AnalyticsOverview }>();

export interface AnalyticsOptions {
  /** Window size in days: 7, 30 (default) or 90. */
  days?: number | string | null;
  /** Skip the short-lived cache (the dashboard "Refresh" button). */
  fresh?: boolean;
}

/** Normalize the `?days=` query param to a supported window. */
export function normalizeDays(raw: number | string | null | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 30;
  if (n <= 7) return 7;
  if (n <= 30) return 30;
  return 90;
}

/**
 * Full admin analytics payload for the selected window.
 * Read-only, cached for ~45s, every metric group degrades gracefully.
 */
export async function getAnalyticsOverview(options: AnalyticsOptions = {}): Promise<AnalyticsOverview> {
  const days = normalizeDays(options.days);
  const cached = overviewCache.get(days);
  if (!options.fresh && cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.data;
  }

  const warnings: string[] = [];
  const now = new Date();
  const from = utcDayStart(days - 1, now);

  const bounds: WindowBounds = {
    days,
    from,
    to: now,
    prevFrom: utcDayStart(days * 2 - 1, now),
    prevTo: from,
    todayStart: utcDayStart(0, now),
    yesterdayStart: utcDayStart(1, now),
  };

  // Traffic needs `site_visits`; make sure it exists (additive + idempotent).
  const trackingAvailable = await ensureAnalyticsTables();

  const [traffic, breakdowns, series, visits, signups, users, revenue, content, engagement] = await Promise.all([
    trackingAvailable
      ? trafficStats(bounds, warnings)
      : Promise.resolve(emptyTraffic()),
    trackingAvailable ? trafficBreakdowns(bounds, warnings) : Promise.resolve(EMPTY_BREAKDOWNS),
    trackingAvailable ? dailySeries(bounds, warnings) : Promise.resolve<SeriesPoint[]>([]),
    trackingAvailable ? recentVisits(warnings) : Promise.resolve<RecentVisit[]>([]),
    recentSignups(warnings),
    userStats(bounds, warnings),
    revenueStats(bounds, warnings),
    contentStats(bounds, warnings),
    engagementStats(bounds, warnings),
  ]);

  if (!trackingAvailable) {
    warnings.unshift(
      "site_visits jadvali mavjud emas — tashriflar 0 ko'rinadi. supabase/add_analytics.sql ni ishga tushiring."
    );
  }

  const data: AnalyticsOverview = {
    range: {
      days,
      from: from.toISOString(),
      to: now.toISOString(),
      prevFrom: bounds.prevFrom.toISOString(),
      prevTo: from.toISOString(),
      generatedAt: now.toISOString(),
    },
    traffic,
    users,
    revenue,
    content,
    engagement,
    series,
    topPages: breakdowns.topPages,
    topScreens: breakdowns.topScreens,
    topReferrers: breakdowns.topReferrers,
    devices: breakdowns.devices,
    recentSignups: signups,
    recentVisits: visits,
    warnings: warnings.slice(0, 12),
    totalUsers: users.total,
    newUsersThisMonth: users.newThisMonth,
    activeSubscribers: users.activeSubscribers,
  };

  overviewCache.set(days, { at: Date.now(), data });
  return data;
}
