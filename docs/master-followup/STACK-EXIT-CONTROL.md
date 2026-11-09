# Stack cleanup original-exit control

Reproduced defect: `embedded-postgres` imports `async-exit-hook`. Its installed `beforeExit` handler explicitly selects code0, overriding a CLI's `process.exitCode`. Merely assigning the code after cleanup was insufficient: the real isolated-stack probe still observed0instead of7. `STACK-CLEANUP-EXIT-CONTROL-RED.log` retains that failure.

`run-stack-integration.ts` now awaits all server/PG cleanup, then explicitly exits with the original child status. This is **not** premature `process.exit` before asynchronous cleanup. The same genuine PostgreSQL/server control observes7after the fix: `STACK-CLEANUP-EXIT-CONTROL-GREEN.log`.

Reproduce after an isolated production build (no build/budget changes):

```bash
mkdir -p .cache
probe=$(mktemp -d "$PWD/.cache/stack-exit-XXXXXX")
trap 'rm -rf "$probe"' EXIT
cat > "$probe/npm" <<'SH'
#!/bin/sh
printf 'FIXTURE controlled child failure\n'
exit 7
SH
chmod 700 "$probe/npm"
set +e
PATH="$probe:$PATH" node_modules/.bin/tsx scripts/run-stack-integration.ts
code=$?
set -e
test "$code" -eq 7
```

The fake `npm` changes only the child test exit. Global setup still creates, seeds, starts and tears down its genuine disposable PG/Next stack, with provider credentials sanitized by the existing setup. No real provenance/publisher/Telegram operation is performed by this negative control. The positive stack run separately executes real local provenance and the existing mock-Telegram rehearsal. This control does not count as business-consumer parity or duplicate additional coverage.
