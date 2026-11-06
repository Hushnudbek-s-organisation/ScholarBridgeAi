/**
 * Parsing the applications list is a SUCCESS-only operation.
 *
 * The old MaterialsHub did `.then(r => r.ok ? r.json() : { applications: [] })`
 * and `.catch(() => {})`. A 401, a 429, a 500, an offline device and a hung
 * request all became "You have not started an application yet" — while the
 * dashboard showed three real applications. An error is now an error state.
 *
 * Pure module — asserted in `scripts/check-applications-state.ts`.
 */
import { ClientRequestError, type RequestFailureKind } from "./clientFetch";

export interface ApplicationSummary {
  id: number;
  universityId: number | null;
  universityName: string;
  programName: string | null;
}

export type ApplicationsState = "loading" | "success" | "empty" | "error";

export interface ApplicationsFailure {
  kind: RequestFailureKind | "error";
  status: number | null;
  message: string;
  retryable: boolean;
}

/** Only a well-formed 200 payload may produce a list (possibly empty). */
export function parseApplicationsResponse(payload: unknown): ApplicationSummary[] {
  if (!payload || typeof payload !== "object" || !Array.isArray((payload as { applications?: unknown }).applications)) {
    throw new ClientRequestError("bad_response", "The applications response could not be read.");
  }
  const list = (payload as { applications: unknown[] }).applications;
  return list.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const item = row as Record<string, unknown>;
    const id = typeof item.id === "number" && Number.isSafeInteger(item.id) && item.id > 0
      ? item.id
      : null;
    if (id == null) return []; // a malformed row is not an application
    return [{
      id,
      universityId: typeof item.universityId === "number" ? item.universityId : null,
      universityName: typeof item.universityName === "string" && item.universityName.trim()
        ? item.universityName
        : "Application",
      programName: typeof item.programName === "string" ? item.programName : null,
    }];
  });
}

/** Classify a failed read without ever turning it into an empty list. */
export function describeApplicationsFailure(error: unknown): ApplicationsFailure {
  if (error instanceof ClientRequestError) {
    return {
      kind: error.kind,
      status: error.status,
      message: error.message,
      retryable: error.kind !== "cancelled" && error.kind !== "unauthorized" && error.kind !== "forbidden",
    };
  }
  return {
    kind: "error",
    status: null,
    message: error instanceof Error ? error.message : "Applications could not be loaded.",
    retryable: true,
  };
}
