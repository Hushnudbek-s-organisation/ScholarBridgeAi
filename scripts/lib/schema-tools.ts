/**
 * Shared tooling for schema accuracy checks.
 *
 * Two "views" of the schema are compared:
 *
 *  1. EXPECTED — everything the app actually reads/writes. This is the
 *     Drizzle definition in `src/db/schema.ts`: every `db.select()` /
 *     `db.insert()` the app runs is typed against it, so a missing column
 *     there is a guaranteed runtime error ("column ... does not exist").
 *
 *  2. PROVIDED — what the database actually has. Offline: the union of every
 *     DDL statement in the repo (`supabase/*.sql` + the lazy DDL strings the
 *     app executes at runtime: journey / growth / telegram / ownership /
 *     analytics). Live: `information_schema` of the real database.
 *
 * The checker (`scripts/check-supabase-schema.ts`) and the generator
 * (`scripts/gen-full-schema-sql.ts`) both live on top of this module so they
 * can never drift apart.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as drizzleSchema from "../../src/db/schema";
import { getTableColumns, getTableName } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ColumnSpec {
  /** DB column name (snake_case). */
  name: string;
  /** Normalized SQL type, e.g. `text`, `integer`, `double precision`, `numeric`. */
  type: string;
  notNull: boolean;
  pk: boolean;
  unique: boolean;
  hasDefault: boolean;
  /** Raw Drizzle column (carries the default value) — present when collected
   * from schema.ts. */
  raw?: RawDrizzleColumn;
}

export interface FkSpec {
  sourceCols: string[];
  refTable: string;
  refCols: string[];
  onDelete: string; // "cascade" | "set null" | "restrict" | "no action" | "set default"
  onUpdate?: string;
  name?: string;
}

export interface IndexSpec {
  name: string;
  columnsText: string;
  unique: boolean;
  partial: boolean;
}

export interface TableSpec {
  name: string;
  columns: Map<string, ColumnSpec>;
  /** table-level / inline FKs found in the DDL. */
  fks: FkSpec[];
  uniqueConstraints: { name?: string; cols: string[] }[];
  checks: { name?: string; expr: string }[];
}

/** table name -> spec; a "provided" view of the database. */
export type SchemaMap = Map<string, TableSpec>;

// ---------------------------------------------------------------------------
// Type normalization
// ---------------------------------------------------------------------------

const TYPE_ALIASES: Record<string, string> = {
  int: "integer",
  int2: "smallint",
  int4: "integer",
  int8: "bigint",
  bool: "boolean",
  "character varying": "varchar",
  char: "varchar",
  "timestamp without time zone": "timestamp",
  "time without time zone": "time",
  timestamptz: "timestamp with time zone",
  float8: "double precision",
  float4: "real",
};

/**
 * Normalize a SQL type to a canonical short form so `INTEGER` == `int` and
 * `NUMERIC(10,2)` == `numeric` (precision differences never break the app;
 * the app only writes plain numbers).
 */
export function normalizeType(raw: string): string {
  let t = raw.trim().toLowerCase().replace(/\s+/g, " ");
  // strip precision/length: numeric(10,2) -> numeric, varchar(255) -> varchar
  t = t.replace(/\(([^()]*)\)/g, "").trim();
  t = TYPE_ALIASES[t] ?? t;
  return t;
}

/**
 * Serial is "integer" + sequence in Postgres, and `timestamp` vs
 * `timestamptz` are interchangeable for the app (drizzle returns JS Date
 * either way, all app defaults use now()) — both are treated as equivalent
 * so the checker reports only drift that can actually break a query.
 */
export function typesEquivalent(a: string, b: string): boolean {
  const norm = (t: string) => {
    if (t === "serial" || t === "bigserial" || t === "smallserial") return "integer";
    if (t === "timestamp" || t === "timestamp with time zone") return "timestamp";
    return t;
  };
  return norm(a) === norm(b);
}

// ---------------------------------------------------------------------------
// EXPECTED — collect the Drizzle tables from src/db/schema.ts
// ---------------------------------------------------------------------------

export interface DrizzleTable {
  /** export name in schema.ts (e.g. `universityPrograms`). */
  prop: string;
  /** DB table name (e.g. `programs`). */
  name: string;
  /** declaration order in schema.ts. */
  order: number;
  columns: ColumnSpec[]; // in declaration order
  columnMap: Map<string, ColumnSpec>;
  /** drizzle property name -> DB column name (e.g. `degree` -> `degree_level`). */
  propToCol: Map<string, string>;
  indexes: {
    name: string;
    columns: { col?: ColumnSpec; exprText: string }[];
    unique: boolean;
    whereText?: string;
  }[];
  foreignKeys: {
    constraintName?: string;
    sourceCols: string[];
    refTable: string;
    refColNames: string[];
    onDelete?: string;
    onUpdate?: string;
  }[];
}

/** Raw Drizzle column object, kept for defaults inspection. */
export type RawDrizzleColumn = {
  name: string;
  notNull: boolean;
  primary: boolean;
  isUnique: boolean;
  hasDefault: boolean;
  default?: unknown;
  getSQLType(): string;
};

function asColumnSpec(col: any): ColumnSpec & { raw: RawDrizzleColumn } {
  return {
    name: col.name as string,
    type: normalizeType(col.getSQLType() as string),
    notNull: Boolean(col.notNull),
    pk: Boolean(col.primary),
    unique: Boolean(col.isUnique),
    hasDefault: Boolean(col.hasDefault),
    raw: col as RawDrizzleColumn,
  };
}

function sqlChunkText(chunk: unknown): string | null {
  if (!chunk || typeof chunk !== "object") return null;
  const c = chunk as { queryChunks?: unknown[] };
  if (!Array.isArray(c.queryChunks)) return null;
  const parts: string[] = [];
  for (const sub of c.queryChunks) {
    const value = (sub as { value?: unknown })?.value;
    if (Array.isArray(value) && value.every((v) => typeof v === "string")) parts.push(value.join(""));
    else if (typeof value === "string") parts.push(value);
  }
  return parts.length ? parts.join("") : null;
}

/** Every pgTable exported by `src/db/schema.ts`, in declaration order. */
export function collectDrizzleTables(): DrizzleTable[] {
  const out: DrizzleTable[] = [];
  let order = 0;
  for (const [prop, value] of Object.entries(drizzleSchema)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    let columns: Record<string, any>;
    try {
      columns = getTableColumns(value as never) as unknown as Record<string, any>;
    } catch {
      continue; // not a pgTable
    }
    if (!columns || typeof columns !== "object") continue;
    const list = Object.values(columns).map(asColumnSpec);
    const columnMap = new Map(list.map((c) => [c.name, c]));
    const propToCol = new Map(Object.entries(columns).map(([p, c]) => [p, c.name as string]));

    let cfg: any;
    try {
      cfg = getTableConfig(value as never);
    } catch {
      cfg = undefined;
    }

    const indexes: DrizzleTable["indexes"] = [];
    if (cfg?.indexes?.length) {
      for (const ix of cfg.indexes) {
        const config = ix.config ?? ix;
        if (!config?.name) continue;
        const cols: { col?: ColumnSpec; exprText: string }[] = [];
        for (const entry of config.columns ?? []) {
          const e = entry as Record<string, any>;
          const isPlainCol =
            e && typeof e === "object" && typeof e.name === "string" && !Array.isArray(e.queryChunks);
          if (isPlainCol) {
            const spec = (columnMap.get(e.name) ?? {
              name: e.name,
              type: "",
              notNull: false,
              pk: false,
              unique: false,
              hasDefault: false,
            }) as ColumnSpec;
            cols.push({ col: spec, exprText: `(${e.name})` });
          } else {
            const text = sqlChunkText(entry) ?? "";
            cols.push({ exprText: text });
          }
        }
        indexes.push({
          name: config.name,
          columns: cols,
          unique: Boolean(config.unique),
          whereText: sqlChunkText(config.where ?? null) ?? undefined,
        });
      }
    }

    const foreignKeys: DrizzleTable["foreignKeys"] = [];
    if (cfg?.foreignKeys?.length) {
      for (const fk of cfg.foreignKeys) {
        // fk.reference() -> { name, columns, foreignTable, foreignColumns }
        const def = typeof fk.reference === "function" ? fk.reference() : null;
        foreignKeys.push({
          constraintName: def?.name,
          sourceCols: (def?.columns ?? []).map((c: any) => c.name as string),
          refTable: def?.foreignTable ? (getTableName(def.foreignTable) as string) : "?",
          refColNames: (def?.foreignColumns ?? []).map((c: any) => c.name as string),
          onDelete: fk.onDelete,
          onUpdate: fk.onUpdate,
        });
      }
    }

    out.push({
      prop,
      name: getTableName(value as never),
      order: order++,
      columns: list,
      columnMap,
      propToCol,
      indexes,
      foreignKeys,
    });
  }
  out.sort((a, b) => a.order - b.order);
  return out;
}

/** property name -> DB table name (e.g. `universityPrograms` -> `programs`). */
export function drizzlePropertyToTable(): Map<string, string> {
  return new Map(collectDrizzleTables().map((t) => [t.prop, t.name]));
}

// ---------------------------------------------------------------------------
// PROVIDED — a lightweight SQL DDL parser
// ---------------------------------------------------------------------------

/** Strip line comments and block comments (C-style) outside strings and $$ blocks. */
function stripComments(sql: string): string {
  let out = "";
  let i = 0;
  let state: "code" | "line" | "block" | "str" | "dollar" = "code";
  let dollar = "";
  while (i < sql.length) {
    const ch = sql[i];
    const two = sql.slice(i, i + 2);
    switch (state) {
      case "code":
        if (two === "--") { state = "line"; i += 2; continue; }
        if (two === "/*") { state = "block"; i += 2; continue; }
        if (ch === "'") { state = "str"; }
        else if (ch === "$" && /^[A-Za-z_]*\$$/.test(matchDollar(sql, i))) {
          dollar = matchDollar(sql, i);
          state = "dollar";
          out += dollar;
          i += dollar.length;
          continue;
        }
        out += ch;
        i++;
        break;
      case "line":
        if (ch === "\n") { state = "code"; out += "\n"; }
        i++;
        break;
      case "block":
        if (two === "*/") { state = "code"; i += 2; continue; }
        if (ch === "\n") out += "\n";
        i++;
        break;
      case "str":
        if (ch === "'" && sql[i + 1] === "'") { out += "''"; i += 2; continue; }
        if (ch === "'") state = "code";
        out += ch;
        i++;
        break;
      case "dollar":
        if (sql.startsWith(dollar, i)) {
          out += dollar;
          i += dollar.length;
          state = "code";
          continue;
        }
        out += ch;
        i++;
        break;
    }
  }
  return out;
}

function matchDollar(sql: string, i: number): string {
  const m = /^\$[A-Za-z_]*\$$/.exec(sql.slice(i));
  return m ? m[0] : "$";
}

/** Split into statements on top-level `;` (outside strings and $$ blocks). */
export function splitStatements(sql: string): string[] {
  const clean = stripComments(sql);
  const stmts: string[] = [];
  let cur = "";
  let i = 0;
  let state: "code" | "str" | "dollar" = "code";
  let dollar = "";
  while (i < clean.length) {
    const ch = clean[i];
    if (state === "code") {
      if (ch === ";") { if (cur.trim()) stmts.push(cur); cur = ""; i++; continue; }
      if (ch === "'") state = "str";
      else if (ch === "$" && /^[A-Za-z_]*\$$/.test(matchDollar(clean, i))) {
        dollar = matchDollar(clean, i);
        state = "dollar";
      }
      cur += ch;
      i++;
    } else if (state === "str") {
      if (ch === "'" && clean[i + 1] === "'") { cur += "''"; i += 2; continue; }
      if (ch === "'") state = "code";
      cur += ch;
      i++;
    } else {
      if (clean.startsWith(dollar, i)) { cur += dollar; i += dollar.length; state = "code"; continue; }
      cur += ch;
      i++;
    }
  }
  if (cur.trim()) stmts.push(cur);
  return stmts;
}

const CONSTRAINT_KEYWORDS = new Set(["primary", "unique", "foreign", "check", "constraint", "exclude", "like", "index", "partition"]);

const TYPE_TOKENS = new Set([
  "serial", "bigserial", "smallserial", "smallint", "integer", "bigint", "text", "character",
  "varying", "varchar", "char", "numeric", "decimal", "real", "double", "precision", "boolean",
  "date", "time", "timestamp", "timestamptz", "timetz", "with", "without", "zone", "json",
  "jsonb", "uuid", "bytea", "money", "interval", "bit", "varying",
]);

const MODIFIER_STOP = new Set([
  "not", "null", "default", "primary", "unique", "references", "check", "constraint",
  "generated", "collate", "using", "identity", "if",
]);

interface ParsedCol {
  name: string;
  rawType: string;
  notNull: boolean;
  pk: boolean;
  unique: boolean;
  hasDefault: boolean;
  inlineRef?: { table: string; col?: string; onDelete: string; onUpdate: string };
}

/** Parse one column definition (after the name) or return null on failure. */
function parseColumnDef(text: string): ParsedCol | null {
  // tokenize-ish walk
  const src = text.trim();
  const m = /^("(?:[^"]|"")+"|[A-Za-z_][A-Za-z0-9_$]*)\s+([\s\S]*)$/.exec(src);
  if (!m) return null;
  const name = m[1].replace(/^"|"$/g, "").replace(/""/g, '"');
  let rest = m[2].trim();

  // --- type ---
  const typeParts: string[] = [];
  let precision: string | null = null;
  const readType = () => {
    while (rest.length) {
      const tokMatch = /^("(?:[^"]|"")+"|[A-Za-z_][A-Za-z0-9_$]*)/.exec(rest);
      if (!tokMatch) break;
      const tok = tokMatch[1].toLowerCase();
      if (TYPE_TOKENS.has(tok) || tok === "varchar" || tok === "char") {
        typeParts.push(tok);
        rest = rest.slice(tokMatch[1].length).trim();
        // precision (n[, m]) directly after numeric/decimal/varchar/char/bit
        if (/^\(/.test(rest)) {
          precision = rest.slice(1, rest.indexOf(")"));
          rest = rest.slice(rest.indexOf(")") + 1).trim();
        }
        continue;
      }
      break;
    }
  };
  readType();
  if (!typeParts.length) return null;
  const rawType = typeParts.join(" ") + (precision ? `(${precision})` : "");

  const col: ParsedCol = {
    name,
    rawType,
    notNull: false,
    pk: false,
    unique: false,
    hasDefault: false,
  };

  // --- modifiers ---
  for (let guard = 0; guard < 60; guard++) {
    rest = rest.replace(/^\s+/, "");
    if (!rest) break;
    let lm = /^NOT\s+NULL/i.exec(rest);
    if (lm) { col.notNull = true; rest = rest.slice(lm[0].length); continue; }
    lm = /^NULL$/i.exec(rest);
    if (lm) { rest = rest.slice(lm[0].length); continue; }
    lm = /^DEFAULT\s+/i.exec(rest);
    if (lm) {
      rest = rest.slice(lm[0].length);
      const consumed = consumeDefaultExpr(rest);
      col.hasDefault = true;
      rest = rest.slice(consumed.length);
      continue;
    }
    lm = /^PRIMARY\s+KEY/i.exec(rest);
    if (lm) { col.pk = true; rest = rest.slice(lm[0].length); continue; }
    lm = /^UNIQUE$/i.exec(rest);
    if (lm) { col.unique = true; rest = rest.slice(lm[0].length); continue; }
    lm = /^REFERENCES\s+/i.exec(rest);
    if (lm) {
      rest = rest.slice(lm[0].length);
      const ref = consumeRef(rest);
      col.inlineRef = ref.ref;
      rest = rest.slice(ref.consumed);
      continue;
    }
    lm = /^CHECK\s*\(/i.exec(rest);
    if (lm) {
      const depth = skipBalanced(rest, rest.indexOf("("));
      rest = rest.slice(depth);
      continue;
    }
    lm = /^COLLATE\s+[\w."]+/i.exec(rest);
    if (lm) { rest = rest.slice(lm[0].length); continue; }
    lm = /^GENERATED\s+[\s\S]*$/i.exec(rest);
    if (lm) { break; }
    // unknown token — stop (do not corrupt)
    break;
  }
  return col;
}

/** Consume a DEFAULT expression: string, number, bool, now(), fn(), array literal. */
function consumeDefaultExpr(rest: string): string {
  rest = rest.replace(/^\s+/, "");
  if (rest.startsWith("'")) {
    let i = 1;
    while (i < rest.length) {
      if (rest[i] === "'" && rest[i + 1] === "'") { i += 2; continue; }
      if (rest[i] === "'") return rest.slice(0, i + 1);
      i++;
    }
    return rest;
  }
  const m = /^[\w.()+-]+/.exec(rest); // 123, -1, now(), current_timestamp, 'x' handled above
  return m ? m[0] : rest.slice(0, 1);
}

function consumeRef(rest: string): { ref: ParsedCol["inlineRef"]; consumed: number } {
  const m = /^("(?:[^"]|"")+"|[A-Za-z_][\w]*(?:\."(?:[^"]|"")+"|[A-Za-z_][\w]*))?\s*(\(([^)]*)\))?\s*([\s\S]*)$/i.exec(rest);
  if (!m) return { ref: undefined, consumed: 0 };
  let refTable = (m[1] ?? "").replace(/^"|"$/g, "");
  if (refTable.includes(".")) refTable = refTable.split(".").pop() ?? refTable;
  const refCols = m[3] ? m[3].trim() : "";
  let tail = m[4] ?? "";
  let onDelete = "no action";
  let onUpdate = "no action";
  for (let guard = 0; guard < 6; guard++) {
    tail = tail.replace(/^\s+/, "");
    const dm = /^ON\s+DELETE\s+(CASCADE|SET\s+NULL|SET\s+DEFAULT|RESTRICT|NO\s+ACTION)/i.exec(tail);
    if (dm) { onDelete = dm[1].toLowerCase().replace(/\s+/g, " "); tail = tail.slice(dm[0].length); continue; }
    const um = /^ON\s+UPDATE\s+(CASCADE|SET\s+NULL|SET\s+DEFAULT|RESTRICT|NO\s+ACTION)/i.exec(tail);
    if (um) { onUpdate = um[1].toLowerCase().replace(/\s+/g, " "); tail = tail.slice(um[0].length); continue; }
    break;
  }
  return {
    ref: { table: refTable, col: refCols || undefined, onDelete, onUpdate },
    consumed: rest.length - tail.length,
  };
}

function skipBalanced(text: string, openIdx: number): number {
  let depth = 0;
  let inStr = false;
  for (let i = openIdx; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (ch === "'" && text[i + 1] === "'") { i++; continue; }
      if (ch === "'") inStr = false;
      continue;
    }
    if (ch === "'") inStr = true;
    else if (ch === "(") depth++;
    else if (ch === ")") { depth--; if (depth === 0) return i + 1; }
  }
  return text.length;
}

function splitTopLevel(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inStr = false;
  let cur = "";
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (inStr) {
      cur += ch;
      if (ch === "'" && body[i + 1] === "'") { cur += body[i + 1]; i++; continue; }
      if (ch === "'") inStr = false;
      continue;
    }
    if (ch === "'") inStr = true;
    else if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    if (ch === "," && depth === 0) { parts.push(cur); cur = ""; continue; }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  return parts;
}

/**
 * Parse DDL text into a provided-schema map. Ignores statements it cannot
 * understand (DO blocks, GRANT, SELECT, …) — it only accumulates table/column
 * facts from CREATE TABLE, ALTER TABLE ADD COLUMN and CREATE INDEX.
 */
export function parseDdl(sqlText: string): SchemaMap {
  const map: SchemaMap = new Map();
  const get = (name: string): TableSpec => {
    let t = map.get(name);
    if (!t) {
      t = { name, columns: new Map(), fks: [], uniqueConstraints: [], checks: [] };
      map.set(name, t);
    }
    return t;
  };

  for (const rawStmt of splitStatements(sqlText)) {
    const stmt = rawStmt.trim();
    if (!stmt) continue;

    let m = /^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:[A-Za-z_][\w]*\.)?("[^"]+"|[A-Za-z_][\w]*)\s*\(([\s\S]*)\)\s*(?:WITH\s*\([^)]*\))?\s*$/i.exec(stmt);
    if (m) {
      const tname = m[1].replace(/^"|"$/g, "").toLowerCase();
      const t = get(tname);
      for (const partRaw of splitTopLevel(m[2])) {
        const part = partRaw.trim();
        if (!part) continue;
        const firstTok = (part.match(/^[A-Za-z_]+/) ?? [])[0]?.toLowerCase() ?? "";
        if (CONSTRAINT_KEYWORDS.has(firstTok)) {
          if (firstTok === "unique") {
            const cm = /^\(\s*([^)]*)\s*\)/.exec(part.replace(/^UNIQUE\s*(\(\s*|ON\s+)/i, ""));
            const cm2 = /^\(([^)]*)\)/.exec(part);
            if (cm2) t.uniqueConstraints.push({ cols: cm2[1].split(",").map((c) => c.trim().replace(/^"|"$/g, "")) });
          } else if (firstTok === "foreign" || (firstTok === "constraint" && /FOREIGN\s+KEY/i.test(part))) {
            const fm = /FOREIGN\s+KEY\s*\(([^)]*)\)\s*REFERENCES\s+("[^"]+"|[A-Za-z_][\w]*)(?:\s*\(([^)]*)\))?\s*([\s\S]*)$/i.exec(part);
            if (fm) {
              const refTable = fm[2].replace(/^"|"$/g, "").split(".").pop() ?? fm[2];
              let tail = fm[4] ?? "";
              let onDelete = "no action";
              const dm = /ON\s+DELETE\s+(CASCADE|SET\s+NULL|SET\s+DEFAULT|RESTRICT|NO\s+ACTION)/i.exec(tail);
              if (dm) onDelete = dm[1].toLowerCase().replace(/\s+/g, " ");
              t.fks.push({
                sourceCols: fm[1].split(",").map((c) => c.trim().replace(/^"|"$/g, "")),
                refTable: refTable.toLowerCase(),
                refCols: fm[3] ? fm[3].split(",").map((c) => c.trim().replace(/^"|"$/g, "")) : [],
                onDelete,
              });
            }
          } else if (firstTok === "check" || (firstTok === "constraint" && /CHECK/i.test(part))) {
            t.checks.push({ expr: part });
          }
          continue;
        }
        const col = parseColumnDef(part);
        if (!col) continue;
        const spec: ColumnSpec = {
          name: col.name.toLowerCase(),
          type: normalizeType(col.rawType),
          notNull: col.notNull || col.pk,
          pk: col.pk,
          unique: col.unique,
          hasDefault: col.hasDefault,
        };
        t.columns.set(spec.name, spec);
        if (col.inlineRef?.table) {
          t.fks.push({
            sourceCols: [spec.name],
            refTable: col.inlineRef.table.toLowerCase(),
            refCols: col.inlineRef.col ? [col.inlineRef.col] : [],
            onDelete: col.inlineRef.onDelete,
            onUpdate: col.inlineRef.onUpdate,
          });
        }
      }
      continue;
    }

    m = /^ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:[A-Za-z_][\w]*\.)?("[^"]+"|[A-Za-z_][\w]*)\s+([\s\S]+)$/i.exec(stmt);
    if (m) {
      const tname = m[1].replace(/^"|"$/g, "").toLowerCase();
      const t = get(tname);
      // A single statement may carry several comma-separated actions:
      //   ADD COLUMN IF NOT EXISTS a text, ADD COLUMN IF NOT EXISTS b integer
      for (const partRaw of splitTopLevel(m[2])) {
        const part = partRaw.trim();
        if (!part) continue;
        const am = /^ADD\s+(?:COLUMN\s+)?(?:IF\s+NOT\s+EXISTS\s+)?([\s\S]+)$/i.exec(part);
        if (am) {
          const col = parseColumnDef(am[1]);
          if (!col) continue;
          const spec: ColumnSpec = {
            name: col.name.toLowerCase(),
            type: normalizeType(col.rawType),
            notNull: col.notNull || col.pk,
            pk: col.pk,
            unique: col.unique,
            hasDefault: col.hasDefault,
          };
          const prev = t.columns.get(spec.name);
          t.columns.set(spec.name, prev ? { ...spec, notNull: prev.notNull || spec.notNull } : spec);
          if (col.inlineRef?.table) {
            t.fks.push({
              sourceCols: [spec.name],
              refTable: col.inlineRef.table.toLowerCase(),
              refCols: col.inlineRef.col ? [col.inlineRef.col] : [],
              onDelete: col.inlineRef.onDelete,
            });
          }
          continue;
        }
        const cm = /^ALTER\s+(?:COLUMN\s+)?"?(\w+)"?\s+(SET\s+NOT\s+NULL|DROP\s+NOT\s+NULL|SET\s+DEFAULT\s+[\s\S]+)$/i.exec(part);
        if (cm) {
          const colName = cm[1].toLowerCase();
          const prev = t.columns.get(colName);
          if (prev) {
            t.columns.set(colName, {
              ...prev,
              notNull: cm[2].toUpperCase() === "SET NOT NULL" ? true : false,
              hasDefault: cm[2].toUpperCase().startsWith("SET DEFAULT") ? true : prev.hasDefault,
            });
          }
        }
      }
      continue;
    }

    m = /^CREATE\s+(UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?("[^"]+"|[A-Za-z_][\w]*)\s+ON\s+(?:[A-Za-z_][\w]*\.)?("[^"]+"|[A-Za-z_][\w]*)\s*([\s\S]*)$/i.exec(stmt);
    if (m) {
      const idxName = m[2].replace(/^"|"$/g, "").toLowerCase();
      const tname = m[3].replace(/^"|"$/g, "").toLowerCase();
      const t = get(tname);
      const tail = (m[4] ?? "").trim();
      const bm = /^\(([^()]*(?:\([^()]*\)[^()]*)*)\)/.exec(tail);
      const columnsText = bm ? bm[1].trim() : tail.replace(/\s+WHERE\s+[\s\S]*$/i, "").trim();
      const partial = /\bWHERE\b/i.test(tail);
      void idxName;
      void partial;
      void columnsText;
      // indexes are recorded on the table for completeness:
      (t as unknown as { indexes?: string[] }).indexes = (t as unknown as { indexes?: string[] }).indexes ?? [];
      (t as unknown as { indexes?: string[] }).indexes!.push(idxName);
      continue;
    }

    // GRANT / REVOKE / DO / SELECT / SET / CREATE POLICY … — not column facts.
  }
  return map;
}

/** Merge several provided maps (later wins only for missing facts). */
export function mergeProvided(...maps: SchemaMap[]): SchemaMap {
  const out: SchemaMap = new Map();
  for (const m of maps) {
    for (const [name, t] of m) {
      const dst: TableSpec = out.get(name) ?? { name, columns: new Map(), fks: [], uniqueConstraints: [], checks: [] };
      for (const [cname, col] of t.columns) {
        const prev = dst.columns.get(cname);
        dst.columns.set(cname, prev ? { ...col, notNull: prev.notNull || col.notNull, pk: prev.pk || col.pk } : col);
      }
      dst.fks.push(...t.fks);
      dst.uniqueConstraints.push(...t.uniqueConstraints);
      dst.checks.push(...t.checks);
      out.set(name, dst);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Repo DDL sources (offline "provided" view)
// ---------------------------------------------------------------------------

const REPO_ROOT = join(__dirname, "..", "..");

/** Read every `supabase/*.sql` file. */
export function readSupabaseSqlFiles(): { file: string; sql: string }[] {
  const { readdirSync } = require("node:fs") as typeof import("node:fs");
  const dir = join(REPO_ROOT, "supabase");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => ({ file: `supabase/${f}`, sql: readFileSync(join(dir, f), "utf8") }));
}

/** Lazy DDL strings the app executes at runtime (self-healing sources). */
export function readLazyDdlSources(): { name: string; sql: string }[] {
  const out: { name: string; sql: string }[] = [];
  const grab = (rel: string, re: RegExp) => {
    try {
      const src = readFileSync(join(REPO_ROOT, rel), "utf8");
      const m = re.exec(src);
      if (m?.[1]) out.push({ name: rel, sql: m[1] });
    } catch {
      /* optional source */
    }
  };
  // template literals exported as *_DDL constants
  grab("src/lib/journey/ddl.ts", /export const JOURNEY_DDL = `([\s\S]*?)`n?;\nexport function/);
  grab("src/lib/growth/ddl.ts", /export const GROWTH_DDL = `([\s\S]*?)`n?;\nexport function/);
  grab("src/lib/telegram/ddl.ts", /export const TELEGRAM_DDL = `([\s\S]*?)`n?;\nexport function/);
  grab("src/lib/ownership/ddl.ts", /export const OWNERSHIP_DDL = `([\s\S]*?)`n?;\nexport function/);
  // visits.ts keeps its SQL inside sql`…` calls
  const visitsSrc = readFileSync(join(REPO_ROOT, "src/lib/visits.ts"), "utf8");
  for (const m of visitsSrc.matchAll(/sql`([\s\S]*?CREATE TABLE IF NOT EXISTS[\s\S]*?)`/g)) {
    out.push({ name: "src/lib/visits.ts (create)", sql: m[1] });
  }
  for (const m of visitsSrc.matchAll(/sql`(\s*CREATE INDEX IF NOT EXISTS[^`]*)`/g)) {
    out.push({ name: "src/lib/visits.ts (indexes)", sql: m[1] });
  }
  return out;
}

/** True when the table/column is repaired automatically by the app. */
export function selfHealingTables(): { name: string; tables: Set<string> }[] {
  return readLazyDdlSources().map((s) => ({
    name: s.name,
    tables: new Set([...parseDdl(s.sql).keys()]),
  }));
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

export interface ColumnIssue {
  table: string;
  column: string;
  kind: "missing" | "type";
  expected?: string;
  found?: string;
  selfHealed: boolean;
}

export interface Comparison {
  missingTables: { name: string; selfHealed: boolean }[];
  columnIssues: ColumnIssue[];
  typeMismatches: ColumnIssue[];
  extraTables: string[];
}

export function compareSchemas(expected: DrizzleTable[], provided: SchemaMap): Comparison {
  const healing = selfHealingTables();
  const isHealed = (table: string, column: string | null): boolean =>
    healing.some((h) => (column ? h.tables.has(table) : h.tables.has(table)));

  const missingTables: Comparison["missingTables"] = [];
  const columnIssues: ColumnIssue[] = [];
  const typeMismatches: ColumnIssue[] = [];
  const extraTables: string[] = [];

  for (const t of expected) {
    const p = provided.get(t.name);
    if (!p) {
      missingTables.push({ name: t.name, selfHealed: isHealed(t.name, null) });
      continue;
    }
    for (const col of t.columns) {
      const pc = p.columns.get(col.name);
      if (!pc) {
        columnIssues.push({ table: t.name, column: col.name, kind: "missing", expected: col.type, selfHealed: isHealed(t.name, col.name) });
      } else if (!typesEquivalent(col.type, pc.type)) {
        typeMismatches.push({ table: t.name, column: col.name, kind: "type", expected: col.type, found: pc.type, selfHealed: isHealed(t.name, col.name) });
      }
    }
  }
  for (const name of provided.keys()) {
    if (!expected.some((t) => t.name === name)) extraTables.push(name);
  }
  return { missingTables, columnIssues, typeMismatches, extraTables };
}
