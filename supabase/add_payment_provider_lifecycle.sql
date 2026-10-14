-- ============================================================================
-- ScholarBridge — payment provider lifecycle fields and idempotency indexes
-- ============================================================================
-- Additive migration for the Payme Merchant API lifecycle/timestamp handling
-- and payment callback idempotency guards. This migration is safe to re-run.
--
-- BEFORE RUNNING ON A POPULATED DATABASE:
--   1. Back up the database and test this migration on staging.
--   2. Review the read-only duplicate reports below. Do not auto-delete or merge
--      payment/subscription rows: reconcile them against provider records and
--      product entitlement history with an authorized operator.
--   3. If duplicate records exist, resolve those manually before creating the
--      corresponding unique index. The CREATE INDEX will fail rather than
--      discard/modify data.
--
-- Rollback (only after reverting code that reads/writes these fields):
--   DROP INDEX IF EXISTS uq_payments_provider_transaction;
--   DROP INDEX IF EXISTS uq_subscriptions_payment_id;
--   ALTER TABLE payments DROP COLUMN IF EXISTS provider_created_at;
--   ALTER TABLE payments DROP COLUMN IF EXISTS performed_at;
--   ALTER TABLE payments DROP COLUMN IF EXISTS cancelled_at;
--   ALTER TABLE payments DROP COLUMN IF EXISTS cancel_reason;
-- Dropping the columns permanently discards any provider lifecycle timestamps
-- written after the migration. Do not run rollback casually.
-- ============================================================================

-- Read-only preflight: these queries should return no rows before the unique
-- indexes below are installed. Review duplicate rows against provider records.
SELECT provider, provider_transaction_id, count(*) AS row_count,
       array_agg(id ORDER BY id) AS payment_ids
FROM payments
WHERE provider_transaction_id <> ''
GROUP BY provider, provider_transaction_id
HAVING count(*) > 1;

SELECT payment_id, count(*) AS row_count,
       array_agg(id ORDER BY id) AS subscription_ids
FROM subscriptions
WHERE payment_id IS NOT NULL
GROUP BY payment_id
HAVING count(*) > 1;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS provider_created_at timestamp,
  ADD COLUMN IF NOT EXISTS performed_at timestamp,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamp,
  ADD COLUMN IF NOT EXISTS cancel_reason integer;

-- Payme's provider-side creation timestamp is stored as a database timestamp;
-- the JSON-RPC `time` field remains the Unix epoch in milliseconds.
COMMENT ON COLUMN payments.provider_created_at IS
  'Payme Merchant API provider-side transaction creation time (JSON-RPC milliseconds).';
COMMENT ON COLUMN payments.performed_at IS
  'Provider transaction completion time, when recorded.';
COMMENT ON COLUMN payments.cancelled_at IS
  'Provider transaction cancellation or refund time, when recorded.';
COMMENT ON COLUMN payments.cancel_reason IS
  'Payme Merchant API cancellation reason code; timeout reason is 4.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_provider_transaction
  ON payments (provider, provider_transaction_id)
  WHERE provider_transaction_id <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_payment_id
  ON subscriptions (payment_id)
  WHERE payment_id IS NOT NULL;
