import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pointsLedger, schollyProfiles, schollyWardrobeItems, studentProfiles } from "@/db/schema";
import { privateNoStoreJson } from "@/lib/apiResponse";
import { requireProfileAccess } from "@/lib/auth";
import { readJsonBody } from "@/lib/request";
import { logSchollyEvent } from "@/lib/scholly-events";
import { currentSchollyDay, ensureSchollyProfile } from "@/lib/scholly-mission-store.server";
import { loadSchollyStreak } from "@/lib/scholly-streak.server";
import { grantSeasonalSchollyWardrobe } from "@/lib/scholly-wardrobe.server";
import { readSchollyBalance, syncSchollyPointCache } from "@/lib/scholly-points-balance.server";
import {
  sanitizeSchollyOutfit, SCHOLLY_LEVEL_THRESHOLDS, SCHOLLY_WARDROBE,
  STARTER_SCHOLLY_COLORS, wardrobeId, wardrobeItem, type WardrobeSnapshot,
} from "@/lib/scholly-wardrobe";

const defaultIds = SCHOLLY_WARDROBE.filter(item => item.unlock.type === "default").map(wardrobeId);
const reject = (code: string, status: number) => privateNoStoreJson({ code }, { status });

function unavailable(error: unknown) {
  console.error("Scholly wardrobe API error:", error);
  return reject("wardrobe_unavailable", 500);
}

async function wardrobe(req: Request, requestedProfileId: unknown, body?: Record<string, unknown>) {
  const access = await requireProfileAccess(req, requestedProfileId);
  if (!access.ok) return reject(access.code, access.status);
  const profileId = access.session.profile.id;
  if (access.targetId !== profileId) return reject("forbidden", 403);

  const action = body?.action;
  const item = wardrobeItem(body?.slot, body?.key);
  const removeAura = action === "equip" && body?.slot === "aura" && body.key === null;
  const isStarterColor = item?.slot === "body" && STARTER_SCHOLLY_COLORS.some(color => color === item.key);
  if (body && (
    (action !== "equip" && action !== "buy" && action !== "starter") || (!item && !removeAura)
    || (action === "buy" && item?.unlock.type !== "buy") || (action === "starter" && !isStarterColor)
  )) return reject("invalid_wardrobe_action", 400);

  if (!(await ensureSchollyProfile(profileId))) return reject("profile_not_found", 404);
  const now = new Date();
  const streak = await loadSchollyStreak(profileId, now);

  return db.transaction(async (tx) => {
    // The shared profile lock orders cosmetics purchases against simultaneous
    // awards and purchases, including requests arriving from different devices.
    const [locked] = await tx.select({ id: studentProfiles.id }).from(studentProfiles)
      .where(eq(studentProfiles.id, profileId)).for("no key update").limit(1);
    if (!locked) return reject("profile_not_found", 404);

    const [profile] = await tx.select({ outfit: schollyProfiles.outfit, onboardedAt: schollyProfiles.onboardedAt })
      .from(schollyProfiles).where(eq(schollyProfiles.userId, profileId)).for("update").limit(1);
    if (!profile) return reject("profile_not_found", 404);

    const totals = await readSchollyBalance(profileId, tx);
    const { lifetimePoints } = totals;
    const level = SCHOLLY_LEVEL_THRESHOLDS.filter(threshold => lifetimePoints >= threshold).length;
    const owned = await tx.select().from(schollyWardrobeItems).where(eq(schollyWardrobeItems.userId, profileId));
    const ownedIds = new Set([...defaultIds, ...owned.map(row => row.itemKey)]);
    // Spending changes the cosmetic balance while lifetime achievement points
    // continue to determine levels, badges and leaderboard entries.
    let balance = totals.balance;
    let starterAvailable = Boolean(profile.onboardedAt) && !owned.some(row => row.source === "starter");
    const outfit = sanitizeSchollyOutfit(profile.outfit);
    const storedOutfit = { ...(profile.outfit as Record<string, unknown>) };

    async function acquire(key: string, source: "purchase" | "starter" | "achievement", spentPoints = 0) {
      const [inserted] = await tx.insert(schollyWardrobeItems).values({
        userId: profileId, itemKey: key, source, spentPoints,
      }).onConflictDoNothing().returning({ itemKey: schollyWardrobeItems.itemKey });
      if (!inserted) return;
      ownedIds.add(key);
      balance -= spentPoints;
      if (source === "purchase") {
        await tx.insert(pointsLedger).values({
          profileId, points: -spentPoints, bucket: "spend", reason: "scholly_cosmetic_purchase",
          idempotencyKey: `scholly:${profileId}:outfit:${key}`, createdAt: now,
        });
        await syncSchollyPointCache(profileId, lifetimePoints, tx);
      }
      if (source === "starter") starterAvailable = false;
      await logSchollyEvent(profileId, source === "purchase" ? "item_bought" : "item_unlocked",
        { itemKey: key, ...(spentPoints ? { spentPoints } : {}), source }, tx);
    }

    const { day } = await currentSchollyDay(profileId, now, tx);
    for (const entry of SCHOLLY_WARDROBE) {
      const key = wardrobeId(entry);
      const unlock = entry.unlock;
      if (ownedIds.has(key)) continue;
      if ((unlock.type === "level" && level >= unlock.value) ||
          (unlock.type === "streak" && streak.longest >= unlock.value)) {
        await acquire(key, "achievement");
      }
    }
    await grantSeasonalSchollyWardrobe(profileId, day, tx, ownedIds);

    if (item) {
      const key = wardrobeId(item);
      if (!ownedIds.has(key)) {
        if (action === "buy" && item.unlock.type === "buy") {
          if (balance < item.unlock.price) return reject("insufficient_points", 409);
          await acquire(key, "purchase", item.unlock.price);
        } else if (action === "starter" && starterAvailable) {
          await acquire(key, "starter");
        }
      }
      if (!ownedIds.has(key)) return reject("item_locked", 409);
    }

    if (item || removeAura) {
      const slot = item?.slot ?? "aura";
      const key = item?.key;
      if (outfit[slot] !== key) {
        if (key) {
          outfit[slot] = key;
          storedOutfit[slot] = key;
        } else {
          delete outfit[slot];
          delete storedOutfit[slot];
        }
        await tx.update(schollyProfiles).set({ outfit: storedOutfit, updatedAt: now })
          .where(eq(schollyProfiles.userId, profileId));
        await logSchollyEvent(profileId, "item_equipped", { slot, key: key ?? null }, tx);
      }
    }

    const snapshot: WardrobeSnapshot = { outfit, owned: [...ownedIds], balance, lifetimePoints, starterAvailable };
    return privateNoStoreJson(snapshot);
  });
}

export async function GET(req: Request) {
  try {
    return await wardrobe(req, new URL(req.url).searchParams.get("profileId"));
  } catch (error) {
    return unavailable(error);
  }
}

export async function POST(req: Request) {
  try {
    const parsed = await readJsonBody<Record<string, unknown>>(req, 4096);
    if (!parsed.ok) return reject(parsed.code, parsed.status);
    return await wardrobe(req, parsed.body.profileId, parsed.body);
  } catch (error) {
    return unavailable(error);
  }
}
