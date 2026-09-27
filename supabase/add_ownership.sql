-- Platform ownership + transfer history (ScholarBridge).
-- Identical to src/lib/ownership/ddl.ts (the app also applies it lazily on
-- first use, so running this by hand is optional). Idempotent.
BEGIN;

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

ALTER TABLE ownership_transfers ENABLE ROW LEVEL SECURITY;

COMMIT;
