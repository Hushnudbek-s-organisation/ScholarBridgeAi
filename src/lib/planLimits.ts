/**
 * Free-tier quantitative caps (saves, workspaces, visa practice).
 *
 * Pro (premium/admin) is unlimited. Caps are config-driven so an admin can
 * A/B them without a deploy. Every write path that hits a free cap returns
 * 403 with code `plan_limit` and a stable `limit` / `used` payload the UI
 * can turn into an upgrade prompt.
 */
import { count, eq, gte, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  aiEvaluations,
  applications,
  savedScholarships,
  savedUniversities,
} from "@/db/schema";
import { CONFIG_DEFAULTS, getConfigNumber } from "@/lib/config";
import { FREE_CAPS } from "@/lib/entitlements";
import { getPremiumStatus } from "@/lib/premium";

export const PLAN_LIMIT_CODE = "plan_limit";

export type PlanLimitKind =
  | "saved_universities"
  | "saved_scholarships"
  | "application_workspaces"
  | "visa_practice";

const CAP_CONFIG_KEY: Record<PlanLimitKind, string> = {
  saved_universities: "free_saved_universities",
  saved_scholarships: "free_saved_scholarships",
  application_workspaces: "free_application_workspaces",
  visa_practice: "free_visa_practice_per_day",
};

const CAP_DEFAULT: Record<PlanLimitKind, number> = {
  saved_universities: FREE_CAPS.saved_universities,
  saved_scholarships: FREE_CAPS.saved_scholarships,
  application_workspaces: FREE_CAPS.application_workspaces,
  visa_practice: FREE_CAPS.visa_practice_per_day,
};

export async function freeCap(kind: PlanLimitKind): Promise<number> {
  const key = CAP_CONFIG_KEY[kind];
  const fallback = Number(CONFIG_DEFAULTS[key] ?? CAP_DEFAULT[kind]);
  return getConfigNumber(key, Number.isFinite(fallback) ? fallback : CAP_DEFAULT[kind]);
}

export function planLimitResponse(kind: PlanLimitKind, limit: number, used: number) {
  const labels: Record<PlanLimitKind, string> = {
    saved_universities: `Free plan lets you save up to ${limit} universities. Upgrade to Pro for unlimited shortlists.`,
    saved_scholarships: `Free plan lets you save up to ${limit} scholarships. Upgrade to Pro for unlimited shortlists.`,
    application_workspaces: `Free plan includes ${limit} application workspace. Upgrade to Pro for unlimited workspaces.`,
    visa_practice: `Free plan includes ${limit} visa practice sessions per day. Upgrade to Pro for unlimited practice.`,
  };
  return NextResponse.json(
    {
      error: labels[kind],
      code: PLAN_LIMIT_CODE,
      kind,
      limit,
      used,
      upgrade: true,
    },
    { status: 403 }
  );
}

/** True when this profile is on a paid/gifted Premium plan (or admin). */
export async function isUnlimited(profileId: number): Promise<boolean> {
  const status = await getPremiumStatus(profileId);
  return status.plan === "premium" || status.plan === "admin";
}

async function usedCount(kind: PlanLimitKind, profileId: number): Promise<number> {
  if (kind === "saved_universities") {
    const [row] = await db
      .select({ n: count() })
      .from(savedUniversities)
      .where(eq(savedUniversities.profileId, profileId));
    return Number(row?.n ?? 0);
  }
  if (kind === "saved_scholarships") {
    const [row] = await db
      .select({ n: count() })
      .from(savedScholarships)
      .where(eq(savedScholarships.profileId, profileId));
    return Number(row?.n ?? 0);
  }
  if (kind === "application_workspaces") {
    const [row] = await db
      .select({ n: count() })
      .from(applications)
      .where(eq(applications.profileId, profileId));
    return Number(row?.n ?? 0);
  }
  // visa_practice — rolling 24h window
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [row] = await db
    .select({ n: count() })
    .from(aiEvaluations)
    .where(
      and(
        eq(aiEvaluations.profileId, profileId),
        eq(aiEvaluations.evaluationType, "Visa Practice"),
        gte(aiEvaluations.createdAt, since)
      )
    );
  return Number(row?.n ?? 0);
}

/**
 * Gate a free-tier quantitative action. Returns null when allowed, otherwise
 * the 403 response the route should send. Premium/admin always pass.
 */
export async function enforceFreeCap(
  profileId: number,
  kind: PlanLimitKind
): Promise<NextResponse | null> {
  if (await isUnlimited(profileId)) return null;
  const limit = await freeCap(kind);
  if (limit <= 0) return planLimitResponse(kind, limit, 0);
  const used = await usedCount(kind, profileId);
  if (used >= limit) return planLimitResponse(kind, limit, used);
  return null;
}

/** Snapshot of every free cap for the status/UI (so the client can show "3/10"). */
export async function planCapsSnapshot(profileId: number): Promise<{
  unlimited: boolean;
  caps: Record<PlanLimitKind, { limit: number | null; used: number }>;
}> {
  const unlimited = await isUnlimited(profileId);
  const kinds: PlanLimitKind[] = [
    "saved_universities",
    "saved_scholarships",
    "application_workspaces",
    "visa_practice",
  ];
  const caps = {} as Record<PlanLimitKind, { limit: number | null; used: number }>;
  await Promise.all(
    kinds.map(async (k) => {
      const [limit, used] = await Promise.all([freeCap(k), usedCount(k, profileId)]);
      caps[k] = { limit: unlimited ? null : limit, used };
    })
  );
  return { unlimited, caps };
}
