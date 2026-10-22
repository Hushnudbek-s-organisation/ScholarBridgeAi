# Phase 11 read-only preflight

The migration `supabase/catalog_and_integrity_2026_patch.sql` was **not executed**. The preflight is deliberately fail-closed and binds its preview extractor to the reviewed migration SHA-256:

```text
806c7b767e17d8109d2a5ea4ef8e767e3158855c914f849d516f8e0c5c847ca9
```

Run the offline check (it never opens a database connection without all live-mode gates):

```sh
npm run preflight:phase11
```

It checks the pinned migration hash, statically reconciles every migration predicate/target column with `src/db/schema.ts` and `supabase/full_schema.sql`, extracts only the migration's labelled `PREVIEW`/`PREFLIGHT` `SELECT` statements, and prepares supplemental read-only checks for URL exceptions, identity/upsert collisions, unique constraints, duplicate title groups and nullable predicate fields. The Phase 11A quota-note expression is known to depend on `uzbekistan_quota_notes`, which this same patch adds; if that column is absent before the patch, its existing-row count is logically zero because the patch-created column starts NULL. The live runner handles that specific expected addition without applying DDL. Unexpected missing pre-existing columns or unexpected types for already-present patch-added fields block previews.

## Live staging mode

Live data counts/rows cannot be collected until an operator has independently identified an isolated staging project in the provider control plane. Do **not** set a label and assume that proves safety. No database URL or verified target is currently configured, so the live runner is not used in this workspace.

If a staging target is later approved, an operator must create an owner-only (`chmod 600`) JSON manifest from an independent control-plane check. Required fields:

```json
{
  "targetId": "staging:<20-character-project-ref>",
  "environment": "staging",
  "projectRef": "<20-character-project-ref>",
  "hostname": "db.<20-character-project-ref>.supabase.co",
  "port": 5432,
  "database": "postgres",
  "readonlyRole": "phase11_preflight_<staging-id>",
  "production": false,
  "isolatedFromProduction": true,
  "verifiedBy": "operator name",
  "independentlyCheckedAt": "2026-10-22T12:00:00Z",
  "expiresAt": "2026-10-22T13:00:00Z"
}
```

The manifest must be checked within 24 hours and expire within 24 hours. Use a dedicated, non-superuser, non-owner `phase11_preflight_*` role with TLS-verified direct Postgres access; never reuse an application/service-role credential. Set `PHASE11_PREFLIGHT_DSN` only in the shell environment, not in the manifest or chat. The DSN host, port, database, and role must exactly match the manifest, and the operator must explicitly confirm the SHA-256 of that exact reviewed manifest on the command line:

```sh
chmod 600 /path/to/staging-target.json
sha256sum /path/to/staging-target.json
PHASE11_PREFLIGHT_DSN='postgresql://phase11_preflight_staging:...@db.<ref>.supabase.co:5432/postgres?sslmode=verify-full' \
  node scripts/phase11-preflight.mjs \
  --manifest=/path/to/staging-target.json \
  --confirm-manifest-sha256=<reviewed-file-sha256>
```

The runner checks the connected database/role/transaction identity and role privilege flags before issuing previews. It begins `BEGIN READ ONLY`, issues only `SELECT` statements (no `SET`, DDL, advisory lock, update, insert or delete), then rolls back. It reports every returned row plus row counts. Preview output is for human review only; even `GO FOR HUMAN REVIEW ONLY` is not authorization to apply the migration. Ambiguous duplicates, URL exceptions, collisions or schema mismatches yield `NO-GO`. Review all rows and obtain a separate migration approval before any future execution.

## Result in this workspace

`npm run preflight:phase11` completed the static checks successfully, extracted **9** labelled migration preview queries, and prepared **7** supplemental read-only checks. It then returned **NO-GO** with an expected nonzero exit because no verified staging manifest/DSN is available. It made **no database connection**. Therefore exact staging affected counts, duplicate identities, live schema/NULL assumptions, URL exception rows, and upsert-collision counts remain **blocked / uncollected**. Do not infer them from local fixtures or production.
