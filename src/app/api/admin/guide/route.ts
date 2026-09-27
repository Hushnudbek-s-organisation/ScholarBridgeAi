import { NextResponse } from "next/server";
import { getConfig, setConfig } from "@/lib/config";
import { writeAudit } from "@/lib/audit";
import {
  HELP_SECTIONS,
  JOURNEY_STEPS,
  parseJourneyOverrides,
  parseSectionHelp,
  resolveJourneySteps,
} from "@/lib/growth/defaults";
import { guardAdmin, readBody, serverError } from "@/lib/growth/api";

export const dynamic = "force-dynamic";

/**
 * Admin → Growth tools → Guide & help.
 * GET → journey steps (resolved order/visibility/custom text) + section intros.
 * PUT { journey?: [...], help?: {...} } → validated and stored in app_config.
 */
export async function GET(req: Request) {
  const g = await guardAdmin(req);
  if (!g.ok) return g.response;
  try {
    return NextResponse.json({
      journey: resolveJourneySteps(parseJourneyOverrides(await getConfig("journey_steps"))),
      help: parseSectionHelp(await getConfig("section_help")),
      sections: HELP_SECTIONS,
      builtInSteps: JOURNEY_STEPS.map((s) => s.id),
    });
  } catch (err) {
    return serverError("admin guide GET", err);
  }
}

export async function PUT(req: Request) {
  const g = await guardAdmin(req, { write: true });
  if (!g.ok) return g.response;
  const b = await readBody(req);
  if (!b.ok) return b.response;
  try {
    if (b.value.journey !== undefined) {
      const clean = parseJourneyOverrides(JSON.stringify(b.value.journey));
      await setConfig("journey_steps", JSON.stringify(clean), "Dashboard 'Your path' steps: order, visibility, custom text");
      await writeAudit({ entityType: "config", entityId: 0, fieldChanged: "journey_steps", newValue: clean.map((s) => `${s.id}${s.enabled === false ? "(off)" : ""}`).join(" → "), actor: "ADMIN", source: "admin" });
    }
    if (b.value.help !== undefined) {
      const clean = parseSectionHelp(JSON.stringify(b.value.help));
      await setConfig("section_help", JSON.stringify(clean), "Section intro banners: on/off + custom text");
      await writeAudit({ entityType: "config", entityId: 0, fieldChanged: "section_help", newValue: `${Object.keys(clean).length} sections customised`, actor: "ADMIN", source: "admin" });
    }
    return NextResponse.json({
      journey: resolveJourneySteps(parseJourneyOverrides(await getConfig("journey_steps"))),
      help: parseSectionHelp(await getConfig("section_help")),
    });
  } catch (err) {
    return serverError("admin guide PUT", err);
  }
}
