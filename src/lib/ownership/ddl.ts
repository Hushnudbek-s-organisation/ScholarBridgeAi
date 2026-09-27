/**
 * DDL for platform ownership. Kept in TypeScript so it ships inside the
 * server bundle; `supabase/add_ownership.sql` holds the identical statements
 * for manual runs (`scripts/check-ownership.ts` fails if they drift apart).
 *
 * - platform_ownership: exactly one row (id = 1) — the current owner.
 *   ON DELETE RESTRICT: the owner's profile cannot be deleted.
 * - ownership_transfers: every request, kept as history. At most one open
 *   (pending/accepted) transfer at a time — enforced by a partial unique
 *   index, so two concurrent "start" requests cannot both succeed.
 * Constraint names match drizzle-kit, so `db:push` sees no drift.
 * RLS is enabled with no policies: only the server role (table owner)
 * reads these tables; Supabase anon/authenticated keys get nothing.
 */
export const OWNERSHIP_DDL = `
CREATE TABLE IF NOT EXISTS platform_ownership (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  owner_profile_id INTEGER NOT NULL CONSTRAINT platform_ownership_owner_profile_id_student_profiles_id_fk REFERENCES student_profiles(id) ON DELETE RESTRICT,
  source TEXT NOT NULL DEFAULT 'bootstrap',
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ownership_transfers (
  id SERIAL PRIMARY KEY,
  from_profile_id INTEGER NOT NULL CONSTRAINT ownership_transfers_from_profile_id_student_profiles_id_fk REFERENCES student_profiles(id) ON DELETE CASCADE,
  to_profile_id INTEGER NOT NULL CONSTRAINT ownership_transfers_to_profile_id_student_profiles_id_fk REFERENCES student_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'rejected', 'expired', 'cancelled')),
  retain_previous_admin BOOLEAN NOT NULL DEFAULT TRUE,
  note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  decided_at TIMESTAMP,
  decided_by INTEGER CONSTRAINT ownership_transfers_decided_by_student_profiles_id_fk REFERENCES student_profiles(id) ON DELETE SET NULL,
  CHECK (from_profile_id <> to_profile_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ownership_transfers_one_open ON ownership_transfers ((true)) WHERE status IN ('pending', 'accepted');

CREATE INDEX IF NOT EXISTS ownership_transfers_to_idx ON ownership_transfers (to_profile_id, status);

ALTER TABLE platform_ownership ENABLE ROW LEVEL SECURITY;

ALTER TABLE ownership_transfers ENABLE ROW LEVEL SECURITY
`;

export function ownershipStatements(): string[] {
  return OWNERSHIP_DDL.split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}
