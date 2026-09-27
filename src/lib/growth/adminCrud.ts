/**
 * Tiny admin CRUD factory for the growth catalogues (goal templates, answer
 * prompts, checklist items). Every mutation is admin-only, throttled,
 * whitelisted through `toValues` and written to the audit log.
 */
import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { writeAudit, type AuditEntityType } from "@/lib/audit";
import { guardAdmin, idParam, jsonError, readBody, serverError } from "./api";

interface CrudTable {
  id: PgColumn;
  sortOrder: PgColumn;
}

export function makeAdminCrud<T extends PgTable & CrudTable>(opts: {
  table: T;
  entity: AuditEntityType;
  label: (values: Record<string, unknown>) => string;
  toValues: (body: Record<string, unknown>) => { values: Record<string, unknown>; error?: string };
  shape?: (row: Record<string, unknown>) => Record<string, unknown>;
}) {
  const { table, entity } = opts;
  const shape = opts.shape ?? ((r) => r);

  async function GET(req: Request) {
    const g = await guardAdmin(req);
    if (!g.ok) return g.response;
    try {
      const rows = (await db.select().from(table as PgTable).orderBy(asc(table.sortOrder), asc(table.id))) as Record<string, unknown>[];
      return NextResponse.json({ items: rows.map(shape) });
    } catch (err) {
      return serverError(`${entity} GET`, err);
    }
  }

  async function POST(req: Request) {
    const g = await guardAdmin(req, { write: true });
    if (!g.ok) return g.response;
    const b = await readBody(req);
    if (!b.ok) return b.response;
    const { values, error } = opts.toValues(b.value);
    if (error) return jsonError(400, error, "validation");
    try {
      const [row] = (await db.insert(table).values(values as never).returning()) as Record<string, unknown>[];
      await writeAudit({ entityType: entity, entityId: Number(row.id), fieldChanged: "created", newValue: opts.label(values), actor: "ADMIN", source: "admin" });
      return NextResponse.json({ item: shape(row) }, { status: 201 });
    } catch (err) {
      return serverError(`${entity} POST`, err);
    }
  }

  async function PUT(req: Request) {
    const g = await guardAdmin(req, { write: true });
    if (!g.ok) return g.response;
    const b = await readBody(req);
    if (!b.ok) return b.response;
    const id = Number(b.value.id);
    if (!Number.isInteger(id) || id <= 0) return jsonError(400, "id is required", "bad_request");
    // Quick toggles ({ id, isActive } / { id, sortOrder }) skip full validation.
    const keys = Object.keys(b.value).filter((k) => k !== "id");
    const quick = keys.length > 0 && keys.every((k) => k === "isActive" || k === "sortOrder");
    let values: Record<string, unknown>;
    if (quick) {
      values = {};
      if (typeof b.value.isActive === "boolean") values.isActive = b.value.isActive;
      const order = Number(b.value.sortOrder);
      if (b.value.sortOrder !== undefined && Number.isInteger(order) && order >= 0 && order <= 9999) values.sortOrder = order;
      if (!Object.keys(values).length) return jsonError(400, "Nothing to update", "validation");
    } else {
      const parsed = opts.toValues(b.value);
      if (parsed.error) return jsonError(400, parsed.error, "validation");
      values = parsed.values;
    }
    try {
      const [row] = (await db.update(table).set(values as never).where(eq(table.id, id)).returning()) as Record<string, unknown>[];
      if (!row) return jsonError(404, "Not found", "not_found");
      await writeAudit({ entityType: entity, entityId: id, fieldChanged: quick ? keys.join(",") : "updated", newValue: quick ? JSON.stringify(values) : opts.label(values), actor: "ADMIN", source: "admin" });
      return NextResponse.json({ item: shape(row) });
    } catch (err) {
      return serverError(`${entity} PUT`, err);
    }
  }

  async function DELETE(req: Request) {
    const g = await guardAdmin(req, { write: true });
    if (!g.ok) return g.response;
    const id = idParam(req);
    if (!id) return jsonError(400, "id is required", "bad_request");
    try {
      const [row] = (await db.delete(table).where(eq(table.id, id)).returning()) as Record<string, unknown>[];
      if (!row) return jsonError(404, "Not found", "not_found");
      await writeAudit({ entityType: entity, entityId: id, fieldChanged: "deleted", oldValue: opts.label(row), actor: "ADMIN", source: "admin" });
      return NextResponse.json({ deleted: id });
    } catch (err) {
      return serverError(`${entity} DELETE`, err);
    }
  }

  return { GET, POST, PUT, DELETE };
}
