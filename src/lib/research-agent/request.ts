import { postgresId } from "@/lib/pagination";
import { AGENT_CONFIG, DEFAULT_SCOPES } from "./config";
import type { ResearchScope, RunRequest } from "./types";

/** Validate limits before reserving a worker slot or performing any research. */
export function parseResearchRequest(body: Record<string, unknown>): { ok: true; request: RunRequest } | { ok: false; error: string } {
  const raw = body.universityIds ?? (body.universityId === undefined ? [] : [body.universityId]);
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 50) return { ok: false, error: "Provide 1 to 50 university IDs" };
  const ids = raw.map(postgresId);
  if (ids.some((id) => id === null)) return { ok: false, error: "Invalid university ID" };
  const scopes = body.scopes ?? [...DEFAULT_SCOPES];
  if (!Array.isArray(scopes) || scopes.length === 0 || scopes.some((scope) => !DEFAULT_SCOPES.includes(scope))) return { ok: false, error: "Invalid research scopes" };
  if (body.dryRun !== undefined && typeof body.dryRun !== "boolean") return { ok: false, error: "dryRun must be a boolean" };
  if (body.maxPages !== undefined && typeof body.maxPages !== "number" && typeof body.maxPages !== "string") return { ok: false, error: "Invalid maxPages" };
  const maxPages = body.maxPages === undefined ? AGENT_CONFIG.maxPagesDefault : Number(body.maxPages);
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 16 || typeof body.maxPages === "boolean") return { ok: false, error: "maxPages must be an integer from 1 to 16" };
  return { ok: true, request: { universityIds: [...new Set(ids as number[])], scopes: [...new Set(scopes)] as ResearchScope[], dryRun: body.dryRun === true, maxPages } };
}
