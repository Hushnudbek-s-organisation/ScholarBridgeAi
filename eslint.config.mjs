import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  // Keep the starter on the flat config export that actually runs under the pinned ESLint/Next toolchain.
  ...nextCoreWebVitals,
  // `desktop/build-resources/` is the staged copy of the compiled server that
  // the desktop installer is packaged from (generated, git-ignored) — not
  // source code.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "desktop/build-resources/**"]),
]);
