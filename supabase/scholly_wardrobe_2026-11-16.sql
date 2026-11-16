-- Durable owned cosmetics. The recorded cost is the price at acquisition;
-- current catalog prices can change without rewriting a user's balance.
CREATE TABLE IF NOT EXISTS scholly_wardrobe_items (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL CHECK (source IN ('purchase', 'starter', 'achievement')),
  spent_points integer NOT NULL DEFAULT 0,
  CONSTRAINT scholly_wardrobe_purchase_cost CHECK (
    (source = 'purchase' AND spent_points > 0) OR (source <> 'purchase' AND spent_points = 0)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_scholly_wardrobe_owned_item
  ON scholly_wardrobe_items (user_id, item_key);

CREATE UNIQUE INDEX IF NOT EXISTS uq_scholly_wardrobe_starter
  ON scholly_wardrobe_items (user_id) WHERE source = 'starter';

ALTER TABLE scholly_wardrobe_items ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON TABLE scholly_wardrobe_items FROM %I', role_name);
    END IF;
  END LOOP;
END;
$$;
