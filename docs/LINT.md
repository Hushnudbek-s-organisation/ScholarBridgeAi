# Lint baseline and CI behavior

## Status (2026-10)

`npm run lint` passes with **0 errors and 0 warnings**. The previous debt has
been repaired without disabling ESLint rules. `lint-baseline.json` is now an
empty reviewed baseline, so any new warning or error is treated as new debt and
fails the CI lint gate.

## CI gate

- `npm run lint:baseline` runs ESLint on the same repository-wide file set as
  `npm run lint` and checks both errors and warnings.
- The gate fails if a file introduces a lint finding, a per-file/per-rule count
  increases, or ESLint cannot run or parse its output.
- The gate reports all remaining findings; it does not use
  `continue-on-error` or hide output.
- After reviewing an intentional lint cleanup, regenerate the reviewed ceiling
  with `npm run lint:baseline -- --update`, then verify with both
  `npm run lint` and `npm run lint:baseline`.

Keep the baseline at zero by fixing findings rather than adding blanket rule
suppression. See `scripts/check-lint-baseline.ts` for the gate implementation.
