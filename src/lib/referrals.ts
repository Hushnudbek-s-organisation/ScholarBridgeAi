import { eq, and, asc, desc, gt, inArray, isNotNull, isNull } from "drizzle-orm";
import { configuredAppUrl } from "@/lib/appUrl";
import { db } from "@/db";
import { pointsLedger, referrals, studentProfiles } from "@/db/schema";
import { generateReferralCode, awardPoints } from "@/lib/gamification";
import { getConfigNumber } from "@/lib/config";
import { profileCompletenessRatio, type ChancingProfile } from "@/lib/chancing";
import { createLocalizedNotification } from "@/lib/notifications";
import { NOTIFY_TEXTS } from "@/lib/notificationTexts";
import { awardSchollyPoints } from "@/lib/scholly-points.server";
import { REFERRAL_MONTHLY_POINT_LIMIT, REFERRAL_POINTS_REFERRER } from "@/lib/referral-point-rules";

export { REFERRAL_POINTS_REFERRER } from "@/lib/referral-point-rules";

/** Base for shareable referral links — the canonical APP_URL (see appUrl.ts). */
export function referralLinkBase(): string {
  return configuredAppUrl();
}
/**
 * Premium milestones, the invitee bonus and the profile completion threshold
 * use the configured program rules. Scholly applies its fixed inviter credit.
 */
export const REFERRAL_PREMIUM_MULTIPLE = 5;
export const REFERRAL_PREMIUM_DAYS = 30;
export const REFERRAL_POINTS_REFERRED = 50;
/**
 * Default activation bar, in percent of the canonical completeness engine
 * (12 checks). 50% = 6 filled checks: a real applicant passes it just by
 * entering their academic basics, while a signup that never opened the wizard
 * (2/12 = 17%) can never farm a Premium grant.
 */
export const REFERRAL_ACTIVATION_COMPLETENESS = 50;

export interface ReferralRules {
  /** Activated referrals needed for one premium grant (≥ 1). */
  premiumMultiple: number;
  /** Premium days added per grant (≥ 1). */
  premiumDays: number;
  /** Gamification points the referrer earns per activated referral. */
  referrerPoints: number;
  /** Maximum number of credited Scholly referrals per local calendar month. */
  referrerMonthlyLimit: number;
  /** Gamification points the referred student earns (0 = none). */
  referredPoints: number;
  /** Profile completeness (%) required before an activation counts. */
  activationCompleteness: number;
}

/** Read the admin-configured reward rules (single source of truth). */
export async function referralRules(): Promise<ReferralRules> {
  const [multiple, days, referredPoints, activation] = await Promise.all([
    getConfigNumber("referral_premium_multiple", REFERRAL_PREMIUM_MULTIPLE),
    getConfigNumber("referral_premium_days", REFERRAL_PREMIUM_DAYS),
    getConfigNumber("referral_points_referred", REFERRAL_POINTS_REFERRED),
    getConfigNumber("referral_activation_completeness", REFERRAL_ACTIVATION_COMPLETENESS),
  ]);
  return {
    // A multiple of 0 would mean "every referral is a grant" and would divide
    // by zero in the progress math — the honest floor is 1.
    premiumMultiple: multiple >= 1 ? Math.floor(multiple) : REFERRAL_PREMIUM_MULTIPLE,
    premiumDays: days >= 1 ? Math.floor(days) : REFERRAL_PREMIUM_DAYS,
    referrerPoints: REFERRAL_POINTS_REFERRER,
    referrerMonthlyLimit: REFERRAL_MONTHLY_POINT_LIMIT,
    referredPoints: referredPoints >= 0 ? Math.floor(referredPoints) : REFERRAL_POINTS_REFERRED,
    activationCompleteness:
      activation >= 0 && activation <= 100 ? Math.floor(activation) : REFERRAL_ACTIVATION_COMPLETENESS,
  };
}

/**
 * The completeness number the referral gate uses.
 *
 * It MUST be the same number the student sees as "Profile completeness" on the
 * profile page / journey bar — `profileCompletenessRatio` (src/lib/chancing.ts),
 * the one definition shared by the growth dashboard (`profileCompleteness` in
 * src/lib/growth/logic.ts) and the referral gate. The gamification module has
 * its own 14-field percentage, and using it here meant a referral card could
 * say "52%" about the very profile whose header said "58%". One engine, one
 * number — scripts/check-growth.ts keeps it that way.
 */
export function referralCompleteness(profile: ChancingProfile): number {
  return Math.round(profileCompletenessRatio(profile) * 100);
}

/** The profile columns the completeness engine reads (single source). */
export const COMPLETENESS_COLUMNS = {
  gpa: studentProfiles.gpa,
  gpaScale: studentProfiles.gpaScale,
  ieltsScore: studentProfiles.ieltsScore,
  toeflScore: studentProfiles.toeflScore,
  duolingoScore: studentProfiles.duolingoScore,
  satScore: studentProfiles.satScore,
  actScore: studentProfiles.actScore,
  country: studentProfiles.country,
  targetMajor: studentProfiles.targetMajor,
  budgetAnnualUsd: studentProfiles.budgetAnnualUsd,
  extracurriculars: studentProfiles.extracurriculars,
  volunteering: studentProfiles.volunteering,
  sports: studentProfiles.sports,
  clubs: studentProfiles.clubs,
  projects: studentProfiles.projects,
  leadership: studentProfiles.leadership,
  awards: studentProfiles.awards,
  olympiads: studentProfiles.olympiads,
  careerGoal: studentProfiles.careerGoal,
  graduationYear: studentProfiles.graduationYear,
} as const;

/** Points still needed for the next premium grant, from the live rules. */
export function referralsToNextGrant(points: number, rules: ReferralRules): number {
  const remainder = ((points % rules.premiumMultiple) + rules.premiumMultiple) % rules.premiumMultiple;
  return rules.premiumMultiple - remainder;
}

/**
 * Each referrer owns a single "anchor" referral row (referredProfileId = null)
 * that holds their unique referral code. Real referrals add new rows.
 */
export async function getOrCreateReferralAnchor(profileId: number) {
  const [existing] = await db
    .select()
    .from(referrals)
    .where(
      and(
        eq(referrals.referrerProfileId, profileId),
        isNull(referrals.referredProfileId)
      )
    );

  if (existing) return existing;

  // Retry on the rare code collision.
  let code = generateReferralCode();
  for (let i = 0; i < 5; i++) {
    const clash = await db.select().from(referrals).where(eq(referrals.referralCode, code));
    if (clash.length === 0) break;
    code = generateReferralCode();
  }

  const [anchor] = await db
    .insert(referrals)
    .values({
      referrerProfileId: profileId,
      referredProfileId: null,
      referralCode: code,
      status: "pending",
      pointsAwarded: 0,
    })
    .returning();
  return anchor;
}

/** Fetch the referral overview for a profile (code, link, their referrals, incoming). */
export async function getReferralOverview(profileId: number) {
  const anchor = await getOrCreateReferralAnchor(profileId);
  const base = configuredAppUrl();

  const outgoing = await db
    .select({
      id: referrals.id,
      referralCode: referrals.referralCode,
      status: referrals.status,
      pointsAwarded: referrals.pointsAwarded,
      createdAt: referrals.createdAt,
      referredName: studentProfiles.name,
    })
    .from(referrals)
    .leftJoin(studentProfiles, eq(referrals.referredProfileId, studentProfiles.id))
    .where(
      and(
        eq(referrals.referrerProfileId, profileId),
        isNotNull(referrals.referredProfileId)
      )
    )
    .orderBy(desc(referrals.createdAt));

  const [incoming] = await db
    .select()
    .from(referrals)
    .where(eq(referrals.referredProfileId, profileId))
    .limit(1);

  return {
    code: anchor.referralCode,
    link: `${base}/?ref=${anchor.referralCode}`,
    outgoing,
    incoming: incoming ?? null,
  };
}

/**
 * Apply a referral code to a profile. Creates a pending referral linking the
 * applicant as the referred user. Returns the referral or null on failure.
 */
export async function applyReferralCode(profileId: number, code: string) {
  const normalized = String(code || "").trim().toUpperCase();
  if (!normalized) return { error: "EMPTY" };

  const [anchor] = await db.select().from(referrals).where(eq(referrals.referralCode, normalized));
  if (!anchor || anchor.referredProfileId !== null) {
    return { error: "INVALID" };
  }
  if (anchor.referrerProfileId === profileId) {
    return { error: "SELF" };
  }

  return db.transaction(async (tx) => {
    const [profile] = await tx.select({ referredBy: studentProfiles.referredBy })
      .from(studentProfiles).where(eq(studentProfiles.id, profileId)).for("no key update");
    if (!profile) return { error: "INVALID" };
    const [already] = await tx.select({ id: referrals.id }).from(referrals)
      .where(eq(referrals.referredProfileId, profileId)).limit(1);
    if (already || profile.referredBy != null) return { error: "EXISTS" };

    // The share code belongs to its anchor. Each tracked activation has its
    // own unique record code so many invitees can use the same share code.
    const [referral] = await tx.insert(referrals).values({
      referrerProfileId: anchor.referrerProfileId,
      referredProfileId: profileId,
      referralCode: generateReferralCode(),
      status: "pending",
      pointsAwarded: 0,
    }).returning();
    return { referral };
  });
}

type ReferralTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function lockReferralProfiles(tx: ReferralTransaction, profileId: number, referrerId: number) {
  // A stable order also covers old data in which two accounts referred each other.
  return tx.select().from(studentProfiles)
    .where(inArray(studentProfiles.id, [profileId, referrerId]))
    .orderBy(asc(studentProfiles.id)).for("no key update");
}

async function awardReferralCredits(
  tx: ReferralTransaction,
  profileId: number,
  referrerId: number,
  rules: ReferralRules,
  legacyReferralId?: number,
) {
  const oldInviterCredit = legacyReferralId == null ? [] : await tx.select({ id: pointsLedger.id })
    .from(pointsLedger).where(and(eq(pointsLedger.profileId, referrerId), eq(pointsLedger.reason, "referral_referrer"),
      eq(pointsLedger.relatedEntityId, legacyReferralId), isNull(pointsLedger.idempotencyKey), gt(pointsLedger.points, 0))).limit(1);
  const referrerPointsAwarded = oldInviterCredit.length ? 0 : (await awardSchollyPoints(
    referrerId, "referral_completed", `referral:${referrerId}:${profileId}`, tx, { relatedEntityId: profileId },
  )).points;

  // The existing invitee-side benefit has a separate rule. Both referral entry
  // points now use the same identity, including v1 credits paid before Scholly.
  const inviteeRewardIds = legacyReferralId == null ? [profileId] : [profileId, legacyReferralId];
  const inviteeCredits = rules.referredPoints === 0 ? [] : await tx.select({ id: pointsLedger.id })
    .from(pointsLedger).where(and(eq(pointsLedger.profileId, profileId), eq(pointsLedger.reason, "referral_referred"),
      inArray(pointsLedger.relatedEntityId, inviteeRewardIds), gt(pointsLedger.points, 0))).limit(1);
  const referredPointsAwarded = inviteeCredits.length ? 0 : rules.referredPoints;
  if (referredPointsAwarded) await awardPoints(profileId, referredPointsAwarded, "referral_referred", profileId, tx);
  return { referrerPointsAwarded, referredPointsAwarded };
}

/**
 * Called after a referred user reaches profile completion. Marks their pending
 * referral as completed and awards points to both parties (idempotent).
 */
export async function completeReferralIfDue(profileId: number) {
  const [ref] = await db
    .select()
    .from(referrals)
    .where(
      and(
        eq(referrals.referredProfileId, profileId),
        eq(referrals.status, "pending")
      )
    );
  if (!ref || ref.referrerProfileId === profileId) return null;
  const rules = await referralRules();
  return db.transaction(async (tx) => {
    const people = await lockReferralProfiles(tx, profileId, ref.referrerProfileId);
    const invited = people.find(person => person.id === profileId);
    if (!invited || people.length !== 2 || referralCompleteness(invited) < rules.activationCompleteness) return null;
    if (invited.referredBy != null && invited.referredBy !== ref.referrerProfileId) return null;

    const [active] = await tx.select().from(referrals)
      .where(and(eq(referrals.id, ref.id), eq(referrals.status, "pending"))).for("update").limit(1);
    if (!active) return null;
    const credits = invited.referralRewarded
      ? { referrerPointsAwarded: 0, referredPointsAwarded: 0 }
      : await awardReferralCredits(tx, profileId, ref.referrerProfileId, rules, ref.id);
    const [completed] = await tx.update(referrals)
      .set({ status: "completed", pointsAwarded: credits.referrerPointsAwarded + credits.referredPointsAwarded })
      .where(eq(referrals.id, active.id)).returning();
    return completed ?? null;
  });
}

// ---------------------------------------------------------------------------
// Referral system v2 — columns on student_profiles
// ---------------------------------------------------------------------------

/**
 * Ensure a profile has a unique referral code (8-char, e.g. "HUSH2026X").
 * Creates one if missing. Used at registration and as a backfill.
 */
export async function ensureReferralCode(profileId: number) {
  const [profile] = await db
    .select()
    .from(studentProfiles)
    .where(eq(studentProfiles.id, profileId));
  if (!profile) return null;
  if (profile.referralCode) return profile;

  let code = generateReferralCode();
  for (let i = 0; i < 5; i++) {
    const clash = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.referralCode, code));
    if (clash.length === 0) break;
    code = generateReferralCode();
  }

  const [updated] = await db
    .update(studentProfiles)
    .set({ referralCode: code })
    .where(eq(studentProfiles.id, profileId))
    .returning();
  return updated ?? null;
}

/**
 * Server-side application of a ?ref= code to a newly registered profile.
 * Sets referred_by to the referrer's id. Guards:
 *  - empty/invalid code   → { error: "INVALID" }
 *  - self-referral        → { error: "SELF" }  (never writes referred_by)
 *  - already referred     → { error: "EXISTS" } (only first referral counts)
 */
export async function applyReferralCodeToProfile(profileId: number, code: string) {
  const normalized = String(code || "").trim().toUpperCase();
  if (!normalized) return { error: "EMPTY" };

  const [target] = await db
    .select()
    .from(studentProfiles)
    .where(eq(studentProfiles.referralCode, normalized));
  if (!target) return { error: "INVALID" };

  // Self-referral is not allowed — and must never be written.
  if (target.id === profileId) return { error: "SELF" };
  return db.transaction(async (tx) => {
    const [newProfile] = await tx.select({ referredBy: studentProfiles.referredBy })
      .from(studentProfiles).where(eq(studentProfiles.id, profileId)).for("no key update");
    if (!newProfile) return { error: "INVALID" };
    const [legacy] = await tx.select({ id: referrals.id }).from(referrals)
      .where(eq(referrals.referredProfileId, profileId)).limit(1);
    if (newProfile.referredBy != null || legacy) return { error: "EXISTS" };
    await tx.update(studentProfiles).set({ referredBy: target.id }).where(eq(studentProfiles.id, profileId));
    return { ok: true, referrerId: target.id };
  });
}

/**
 * Grant a referrer +1 referral point and, when referral_points reaches a
 * multiple of 5 (5, 10, 15...), grant/stack 30 days of premium.
 * Everything runs inside ONE atomic transaction — safe against concurrent
 * activation calls. Only called server-side.
 */
async function grantReferralPremium(
  tx: ReferralTransaction,
  referrer: typeof studentProfiles.$inferSelect,
  rules: ReferralRules,
) {
  const points = (referrer.referralPoints ?? 0) + 1;
  const now = new Date();
  let isPremium = referrer.isPremium;
  let premiumUntil = referrer.premiumUntil;
  const premiumGranted = points % rules.premiumMultiple === 0;
  if (premiumGranted) {
    const base = Math.max(premiumUntil?.getTime() ?? 0, now.getTime());
    premiumUntil = new Date(base + rules.premiumDays * 86_400_000);
    isPremium = true;
  }
  await tx.update(studentProfiles)
    .set({ referralPoints: points, isPremium, premiumUntil, updatedAt: now })
    .where(eq(studentProfiles.id, referrer.id));
  return {
    referrer: { id: referrer.id, name: referrer.name },
    points, premiumGranted, premiumUntil,
    premiumDays: premiumGranted ? rules.premiumDays : 0,
    premiumMultiple: rules.premiumMultiple,
  };
}

export interface ReferralRewardResult {
  ok: boolean;
  reason?: string;
  referrer?: Pick<typeof studentProfiles.$inferSelect, "id" | "name">;
  points?: number;
  premiumGranted?: boolean;
  premiumDays?: number;
  premiumMultiple?: number;
  premiumUntil?: Date | null;
  /** Gamification points granted to each side by this activation. */
  referrerPointsAwarded?: number;
  referredPointsAwarded?: number;
  /** Live profile completeness (%) and the bar it was compared against. */
  completeness?: number;
  activationCompleteness?: number;
}

/**
 * Called server-side when a referred user becomes "active" (completes
 * onboarding / fills their profile). Awards the referrer +1 point exactly
 * once per referred profile (referral_rewarded flag makes it idempotent).
 */
export async function activateReferralReward(profileId: number): Promise<ReferralRewardResult> {
  const rules = await referralRules();
  const [profile] = await db
    .select()
    .from(studentProfiles)
    .where(eq(studentProfiles.id, profileId));
  if (!profile) return { ok: false, reason: "NOT_FOUND" };
  if (profile.referredBy == null) return { ok: false, reason: "NO_REFERRER" };
  if (profile.referredBy === profileId) return { ok: false, reason: "SELF" };
  if (profile.referralRewarded) return { ok: false, reason: "ALREADY_REWARDED" };

  // Activation bar (admin-configured): a bare signup that flips
  // `onboardingCompleted` without entering anything must not mint premium.
  // The percentage is the SAME one the profile page shows as completeness.
  const completeness = referralCompleteness(profile);
  if (completeness < rules.activationCompleteness) {
    return {
      ok: false,
      reason: "NOT_ACTIVE_YET",
      activationCompleteness: rules.activationCompleteness,
      completeness,
    };
  }

  const referrerId = profile.referredBy;
  const outcome = await db.transaction(async (tx) => {
    const people = await lockReferralProfiles(tx, profileId, referrerId);
    const invited = people.find(person => person.id === profileId);
    const referrer = people.find(person => person.id === referrerId);
    if (!invited || !referrer || invited.referredBy !== referrerId) return { reason: "NO_REFERRER" } as const;
    if (invited.referralRewarded) return { reason: "ALREADY_REWARDED" } as const;
    const liveCompleteness = referralCompleteness(invited);
    if (liveCompleteness < rules.activationCompleteness) {
      return { reason: "NOT_ACTIVE_YET", completeness: liveCompleteness, activationCompleteness: rules.activationCompleteness } as const;
    }
    const [legacy] = await tx.select({ id: referrals.id }).from(referrals)
      .where(and(eq(referrals.referredProfileId, profileId), eq(referrals.referrerProfileId, referrerId))).limit(1);
    const credits = await awardReferralCredits(tx, profileId, referrerId, rules, legacy?.id);
    const result = await grantReferralPremium(tx, referrer, rules);
    await tx.update(studentProfiles).set({ referralRewarded: true, updatedAt: new Date() })
      .where(eq(studentProfiles.id, profileId));
    return { result, credits };
  });
  if ("reason" in outcome) return { ok: false, ...outcome };
  const { result, credits: { referrerPointsAwarded, referredPointsAwarded } } = outcome;

  // Tell BOTH sides in their own language — the promise is "you both earn",
  // and until now nothing in the bell reflected it. The `link` doubles as the
  // sweep's dedupe key, one row per activation.
  const dedupe = `#rewards/referral-${profileId}`;
  try {
    await createLocalizedNotification(result.referrer.id, {
      type: "referral",
      link: dedupe,
      text: (lang) =>
        NOTIFY_TEXTS.referralRewarded(lang, {
          name: profile.name,
          points: referrerPointsAwarded,
          premiumDays: result.premiumGranted ? result.premiumDays ?? 0 : 0,
        }),
    });
    if (referredPointsAwarded) {
      await createLocalizedNotification(profileId, {
        type: "referral",
        link: dedupe,
        text: (lang) => NOTIFY_TEXTS.referralWelcome(lang, {
          points: referredPointsAwarded,
          referrerName: result.referrer.name,
        }),
      });
    }
  } catch (err) {
    // Notifications are informational; never fail the reward over them.
    console.error("Failed to send referral notifications:", err);
  }

  return { ok: true, ...result, referrerPointsAwarded, referredPointsAwarded };
}

/**
 * Is the premium window stored on the profile still open?
 *
 * The columns carry the UNION of every grant (paid, admin-gifted, referral),
 * so this answers "premium until <window>", not "premium came from a referral".
 * Callers that need the SOURCE must check the subscription table first (see
 * getPremiumStatus and the admin profile list).
 */
export function referralPremiumActive(profile: {
  isPremium?: boolean | null;
  premiumUntil?: Date | string | null;
}): boolean {
  if (!profile.isPremium) return false;
  if (!profile.premiumUntil) return false;
  return new Date(profile.premiumUntil).getTime() > Date.now();
}

/**
 * Full referral status for the UI: code, shareable link, points, premium
 * state and the list of referred users (name/email + active flag).
 */
export async function getReferralStatus(profileId: number) {
  const profile = await ensureReferralCode(profileId);
  if (!profile) return null;

  const referredUsers = await db
    .select({
      id: studentProfiles.id,
      name: studentProfiles.name,
      email: studentProfiles.email,
      referralRewarded: studentProfiles.referralRewarded,
      onboardingCompleted: studentProfiles.onboardingCompleted,
      createdAt: studentProfiles.createdAt,
      // Progress toward the activation bar — the canonical completeness engine.
      ...COMPLETENESS_COLUMNS,
    })
    .from(studentProfiles)
    .where(eq(studentProfiles.referredBy, profileId))
    .orderBy(desc(studentProfiles.createdAt));

  const premiumActive = referralPremiumActive(profile);
  const rules = await referralRules();
  const points = profile.referralPoints ?? 0;
  // Milestones are NOT "multiples of N" — after 5 points a six-referral user
  // must see 10, not 5 again (which would show a finished bar forever).
  const nextMilestone =
    Math.floor(points / rules.premiumMultiple) * rules.premiumMultiple + rules.premiumMultiple;

  return {
    code: profile.referralCode,
    // Relative when no canonical URL is configured — the client prefixes its own origin.
    link: `${referralLinkBase()}/?ref=${profile.referralCode}`,
    referralPoints: points,
    nextMilestone,
    toNextGrant: referralsToNextGrant(points, rules),
    /** The live reward rules the card must display (never hardcoded). */
    rules,
    isPremium: premiumActive,
    premiumUntil: premiumActive ? profile.premiumUntil : null,
    referredBy: profile.referredBy,
    referredUsers: referredUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      // "Active" must mean exactly what the reward engine means by it: the
      // referral was counted (rewarded) — the onboarding flag alone is not
      // enough once an activation bar is configured.
      isActive: u.referralRewarded,
      completeness: referralCompleteness(u),
    })),
  };
}
