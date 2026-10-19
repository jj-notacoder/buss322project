import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import ts from "typescript-eslint";
import hooks from "eslint-plugin-react-hooks";
import a11y from "eslint-plugin-jsx-a11y";
import globals from "globals";
export default defineConfig([
  globalIgnores([
    ".next/**",
    "test-results/**",
    "playwright-report/**",
    "artifacts/**",
  ]),
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,mjs}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { "react-hooks": hooks, "jsx-a11y": a11y },
    rules: {
      ...hooks.configs.recommended.rules,
      ...a11y.flatConfigs.recommended.rules,
      "react-hooks/set-state-in-effect": "off",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "jsx-a11y/label-has-associated-control": [
        "error",
        { assert: "either", depth: 4 },
      ],
    },
  },
]);
