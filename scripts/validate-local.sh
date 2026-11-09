#!/usr/bin/env bash
# Full local acceptance sweep — §11.
#
# Order is deliberate: cheap static/typecheck guards first, then real
# disposable-PostgreSQL runtime proofs, then the production-mode build is a
# SEPARATE step (scripts/validate-build.sh / CI) because it needs dummy env and
# must not be conflated with the guard sweep.
#
# Run from anywhere:  bash scripts/validate-local.sh
# CI:                 npm run validate:local
# Requires:           npm ci (node_modules), PostgreSQL binaries for
#                     embedded-postgres (three disposable clusters self-clean).
# NEVER connects to production and NEVER applies a migration to production.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

FAILS=0
run() {
  local label="$1"; shift
  local out rc passes fails
  out=$("$@" 2>&1); rc=$?
  passes=$(printf '%s' "$out" | grep -oE '[0-9]+ passed|[0-9]+/[0-9]+|PASS' | tail -1)
  fails=$(printf '%s' "$out" | grep -oE '[0-9]+ failed|[0-9]+ problem\(s\)' | tail -1)
  if [ "$rc" -ne 0 ]; then
    FAILS=$((FAILS+1))
    printf 'FAIL %-34s rc=%s %s\n' "$label" "$rc" "${fails:-}"
    printf '%s\n' "$out" | tail -12
  else
    printf 'OK   %-34s %s %s\n' "$label" "${passes:-}" "${fails:-}"
  fi
}

echo "== 1. Static / type / copy guards =="
run typecheck              npm run typecheck
run lint:baseline           npm run lint:baseline
run i18n                    node scripts/check-i18n.mjs
run localization            npm run test:localization
run dark                    npm run test:dark
run source-recheck          npm run test:source-recheck
run typed-evidence          npm run test:typed-evidence
run admission-probability   npm run test:admission-probability
run evidence-render         npm run test:evidence-render
run finance-unified         npm run test:finance-unified
run cache-revision          npm run test:cache-revision
run snapshot-recovery       npm run test:snapshot-recovery
run exam-boundaries         npm run test:exam-boundaries
run subject-identities      npm run test:subject-identities
run verify-summary          npm run test:verify-summary
run scoped-award-coverage   npm run test:scoped-award-coverage
run channel                 npm run test:channel
run profile-recompute       npm run test:profile-recompute
run chunk-recovery          npm run test:chunk-recovery
run observability           npm run test:observability
run deploy                  npm run test:deploy
run official-source         npm run test:official-source-adapter
run security                npm run test:security
run audit-safety            npm run test:audit-safety
run build-gates             npm run test:build-gates
run feature-inventory       npm run test:feature-inventory:verify
run design-system           npm run test:design-system
run audit:ui                npm run audit:ui
run catalogue-query-load npm run test:catalogue-query-load
run continuation            npm run test:continuation
run master-regressions      npm run test:master-regressions
run master-database         npm run test:master-database

echo "== 2. Migration: forward vs recovery (NOT one apply chain) =="
run migration-runner        npm run test:migration-runner
run migration-dry-run       npm run test:migration-dry-run
run migration-recovery      npm run test:migration-recovery

echo "== 3. Real disposable-PostgreSQL runtime proofs =="
run research-worker         npm run test:research-worker
run research-runtime        npm run test:research-runtime
run review-queue            npm run test:review-queue
run review-queue-runtime    npm run test:review-queue-runtime
run backend-audit           npm run test:backend-audit
run api-security:isolated   npm run test:api-security:isolated

echo "== 4. Dependency state (no --force, no forced downgrade) =="
run prod-audit              npm audit --omit=dev --audit-level=moderate

printf 'TOTAL_FAILS=%s\n' "$FAILS"
exit "$FAILS"
