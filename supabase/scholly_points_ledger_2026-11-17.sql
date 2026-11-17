-- Apply after scholly_wardrobe_2026-11-16.sql. Preserve prior awards and levels.
BEGIN;

ALTER TABLE public.points_ledger ADD COLUMN IF NOT EXISTS bucket text;
ALTER TABLE public.points_ledger ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE public.scholly_profile ADD COLUMN IF NOT EXISTS balance integer NOT NULL DEFAULT 0;
ALTER TABLE public.scholly_profile ADD COLUMN IF NOT EXISTS lifetime_points integer NOT NULL DEFAULT 0;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.points_ledger'::regclass AND conname = 'points_ledger_bucket_check') THEN
    ALTER TABLE public.points_ledger ADD CONSTRAINT points_ledger_bucket_check
      CHECK (bucket IS NULL OR bucket IN ('main', 'small', 'bonus', 'spend'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_points_ledger_idempotency_key ON public.points_ledger (idempotency_key);
CREATE INDEX IF NOT EXISTS idx_points_ledger_profile_bucket_time ON public.points_ledger (profile_id, bucket, created_at);

INSERT INTO public.points_ledger (profile_id, points, reason, bucket, idempotency_key, created_at)
SELECT user_id, -spent_points, 'scholly_cosmetic_purchase', 'spend',
  'scholly:' || user_id || ':outfit:' || item_key, timezone('UTC', acquired_at)
FROM public.scholly_wardrobe_items
WHERE source = 'purchase' AND spent_points > 0
ON CONFLICT (idempotency_key) DO NOTHING;

UPDATE public.scholly_profile AS profile
SET lifetime_points = earned.total_points,
    balance = greatest(0, earned.total_points - coalesce(spent.total, 0))
FROM public.user_points AS earned
LEFT JOIN (
  SELECT user_id, sum(spent_points)::integer AS total FROM public.scholly_wardrobe_items GROUP BY user_id
) AS spent ON spent.user_id = earned.profile_id
WHERE profile.user_id = earned.profile_id;

COMMIT;
