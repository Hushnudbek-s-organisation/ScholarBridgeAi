# Lint: debt, baseline gate, and CI behavior

## Status (2026-10)

`npm run lint` currently reports **50 problems (45 errors, 5 warnings)** in 33
files. All of them **pre-date the 2026-10 re-audit work** — none are in files
added by that work. (5 safe issues — 4× `react/no-unescaped-entities`,
1× `react/no-children-prop` — were fixed in this pass, taking the count from
55 → 50.)

## What the debt is

| Count | Rule | Nature |
| --- | --- | --- |
| 34 | `react-hooks/set-state-in-effect` | React-Compiler advisory: `setState` called synchronously in an effect body (data-fetch-in-effect pattern). Behavior is correct; a proper fix is a per-component refactor (callbacks / state-derivation) with regression risk across 20+ screens. |
| 8 | `react-hooks/preserve-manual-memoization` | React-Compiler advisory about manual memo patterns the compiler cannot prove stable. |
| 3 | `react-hooks/exhaustive-deps` | Dependency-array warnings. |
| 2 | `react-hooks/purity` | Impure render advisories. |
| 1 | `react-hooks/immutability` | Immutability advisory. |
| 5 | `@next/next/no-img-element` (warnings) | `<img>` vs `next/image` on admin/preview surfaces. |

These are style/performance advisories, not security findings: every security
property (authorization, rate limits, quotas, input caps) is enforced server-
side and covered by `test:security`, `test:api-security`, `test:integration`.

## The baseline gate (how CI handles this)

- **`lint-baseline.json`** (committed) lists the exact per-file, per-rule
  counts of the pre-existing debt.
- **`npm run lint:baseline`** (run by CI as the "Lint" step) runs ESLint on
  the whole repo — the same file set as `npm run lint` — and **fails** when:
  1. a **new** file has any lint problem;
  2. any file's count for any rule **increases** (worsened debt);
  3. ESLint itself fails to run or crashes.

  It **passes** when debt is fixed (counts may only go down). It never uses
  `continue-on-error`, never disables rules, and prints the **full list of all
  50 remaining issues** on every run — nothing is hidden.
- After fixing some debt, shrink the baseline with
  `npm run lint:baseline -- --update` and commit the diff.

## Path to zero

1. Work through the table above, starting with the cheapest: the 5
   `no-img-element` warnings, then `exhaustive-deps` / `purity` /
   `immutability` (small, contained), then the two big React-Compiler families
   component-by-component with the relevant test suites in the red-light
   budget.
2. Each batch: fix → run suites → `npm run lint:baseline -- --update` → commit
   code + baseline together.
3. When the file is empty, delete `lint-baseline.json`, switch the CI step to
   plain `npm run lint`, and delete this document.

## Why not fix all 50 now

The 42 React-Compiler/react-hooks errors require restructuring how ~25
long-lived components fetch and memoize state. Doing that in one mechanical
pass would change runtime behavior of core student screens without a
behavior-preserving guarantee — higher regression risk than the debt itself.
The gate above makes that risk unnecessary: nobody can add to the debt, and
any cleanup is visible as the baseline shrinking.
