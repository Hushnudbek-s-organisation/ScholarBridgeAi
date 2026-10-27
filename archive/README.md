# Archive — historical work, kept for provenance

Nothing in this folder is loaded, imported, built or executed by the app or
by CI. It is here so that a decision can still be explained two years later,
not so that anything can be run again.

## `docs/` — 90 scholarship rewrite reports

`SCHOLARSHIP_REWRITE_PASS_1..111_2026-10-23.md` (and the 2026-10-26 follow-ups).

Each report documents one pass over the imported scholarship catalogue: what
the database said, what the provider's own page says, and the exact rewrite or
retirement that followed. They lived in `docs/` next to the living
documentation (`CODE_AUDIT`, `DATA_ENRICHMENT`, `PERFORMANCE`, …) and had
started to outnumber it 90 to 66, which made `docs/` hard to scan.

## `supabase/` — 80 companion SQL files

`scholarship_rewrite_pass*.sql` — the `UPDATE`/`DELETE` statements that the
reports describe. **They were applied to the live project on 2026-10-23 and
must not be re-run blindly**: they are positional (`UPDATE … WHERE id = 848`)
and the live rows have changed since.

They are deliberately *not* under `supabase/`, because that folder is read by
`scripts/check-supabase-schema.ts` (`readSupabaseSqlFiles()` reads every
top-level `*.sql` there and parses it as shipped DDL). Keeping data rewrites in
that folder would mix applied-once data migrations with the schema the app is
checked against.

## Conventions

- `docs/` — living documentation for the current product. If a claim here is
  still true today, it belongs in `docs/`, not in this folder.
- `supabase/` — the DDL the app expects (schema files stay flat in the root).
- `archive/` — frozen history. Nothing is added here until it is finished.
