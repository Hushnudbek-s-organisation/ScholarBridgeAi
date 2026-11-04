// One command for a production-mode, disposable, repeatable browser benchmark.
process.env.PERF_STAGE ??= "after";
process.env.E2E_NEXT_MODE ??= "start";
if (!["before", "after"].includes(process.env.PERF_STAGE)) throw new Error("PERF_STAGE must be before or after");
process.argv.splice(2, 0, "e2e/performance.spec.ts");
await import("./run-e2e.mjs");
