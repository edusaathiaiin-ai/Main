import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Rule overrides — pre-existing patterns in the codebase
  {
    rules: {
      // Components defined inside render functions are pre-existing pattern in FacultyOnboardFlow
      "react-hooks/static-components": "warn",
      // fetchResources in useEffect is the intentional data-loading pattern in ExploreClient
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
