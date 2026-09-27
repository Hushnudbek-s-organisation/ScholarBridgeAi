import { checklistItems } from "@/db/schema";
import { clampString, optionalNumber } from "@/lib/request";
import { CHECKLIST_PHASES } from "@/lib/growth/defaults";
import { NAV_SECTIONS } from "@/lib/navSections";
import { bool, oneOf } from "@/lib/growth/api";
import { makeAdminCrud } from "@/lib/growth/adminCrud";

const TABS = new Set(NAV_SECTIONS.map((s) => s.id));

/** Admin → Growth tools → Departure checklist. */
export const { GET, POST, PUT, DELETE } = makeAdminCrud({
  table: checklistItems,
  entity: "checklist_item",
  label: (v) => String(v.title ?? ""),
  toValues: (b) => {
    const title = clampString(b.title, 160);
    if (!title) return { values: {}, error: "Title is required" };
    const tab = clampString(b.linkTab, 40);
    return {
      values: {
        phase: oneOf(b.phase, CHECKLIST_PHASES, "offer"),
        title,
        description: clampString(b.description, 500),
        linkTab: tab && TABS.has(tab) ? tab : null,
        isActive: bool(b.isActive, true),
        sortOrder: optionalNumber(b.sortOrder, { min: 0, max: 9999, integer: true }) ?? 0,
      },
    };
  },
});
