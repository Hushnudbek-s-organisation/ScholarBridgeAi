-- ============================================================================
-- One figure per cost: align the legacy USD mirrors (2026-10-30)
--
-- Every university cost is stored twice:
--
--   canonical  annual_tuition      + tuition_currency      + tuition_period
--   mirror     annual_tuition_usd  (legacy column, "kept — DO NOT drop")
--
-- and the same pair exists for living costs and for accommodation. All 356
-- active rows are USD / year on every one of the three families, so the two
-- columns describe the SAME quantity in the SAME unit — and measured
-- 2026-10-30 they disagreed on:
--
--   annual_tuition      vs annual_tuition_usd        160 rows
--   annual_living_est   vs annual_living_est_usd     162 rows
--   accommodation_cost  vs accommodation_cost_usd    176 rows
--
-- The gaps are not rounding: MIT 64,310 vs 65,500 · Oxford 59,650 vs 48,500 ·
-- ETH Zurich 4,900 vs 1,650 · TUM 5,500 vs 3,000 · KAIST 18,000 vs 6,000 ·
-- UCL 45,000 vs 47,000.
--
-- What the double value cost the product: the explorer card reads the mirror,
-- the profile page reads the canonical amount, and the server-rendered
-- catalogue reads the canonical amount through `resolvedUsdUniversityCosts()`.
-- The same card therefore quoted $65,500 for MIT on first paint and $64,310
-- after any filter change — and the profile page agreed with the second one.
--
-- The rule, already encoded in `src/lib/usdCosts.ts` (`annualUsdAmount`): the
-- canonical amount + currency + period is authoritative when its currency is
-- USD, the mirror is only a fallback for rows without a canonical amount, and
-- an explicitly non-USD canonical value is never replaced by a USD mirror.
-- This migration makes the stored mirror agree with that rule, so any consumer
-- — including admin screens and exports that still read the mirror — states the
-- same number. The canonical columns are not touched: this is a copy, not a
-- re-derivation, and no exchange rate is invented.
--
-- Reversible: the mirror was a duplicate of a field that is still present, so
-- dropping this alignment only restores the inconsistency, never data.
-- ============================================================================
BEGIN;

UPDATE public.universities
SET annual_tuition_usd = annual_tuition
WHERE annual_tuition IS NOT NULL
  AND upper(coalesce(tuition_currency, 'USD')) = 'USD'
  AND (annual_tuition_usd IS NULL OR annual_tuition_usd <> annual_tuition);

UPDATE public.universities
SET annual_living_est_usd = annual_living_est
WHERE annual_living_est IS NOT NULL
  AND upper(coalesce(living_cost_currency, 'USD')) = 'USD'
  AND (annual_living_est_usd IS NULL OR annual_living_est_usd <> annual_living_est);

UPDATE public.universities
SET accommodation_cost_usd = accommodation_cost
WHERE accommodation_cost IS NOT NULL
  AND upper(coalesce(accommodation_cost_currency, 'USD')) = 'USD'
  AND (accommodation_cost_usd IS NULL OR accommodation_cost_usd <> accommodation_cost);

COMMIT;

-- Verification (expected after the run: 0 / 0 / 0)
--   SELECT count(*) FROM public.universities
--    WHERE annual_tuition IS NOT NULL AND upper(coalesce(tuition_currency,'USD')) = 'USD'
--      AND (annual_tuition_usd IS NULL OR annual_tuition_usd <> annual_tuition);
--   SELECT count(*) FROM public.universities
--    WHERE annual_living_est IS NOT NULL AND upper(coalesce(living_cost_currency,'USD')) = 'USD'
--      AND (annual_living_est_usd IS NULL OR annual_living_est_usd <> annual_living_est);
--   SELECT count(*) FROM public.universities
--    WHERE accommodation_cost IS NOT NULL AND upper(coalesce(accommodation_cost_currency,'USD')) = 'USD'
--      AND (accommodation_cost_usd IS NULL OR accommodation_cost_usd <> accommodation_cost);
