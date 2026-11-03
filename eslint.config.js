import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "coverage", "reference", "playwright-report", "test-results", ".tmp"] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  { files: ["scripts/**/*.mjs"], languageOptions: { globals: globals.node } },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // La spec fournie (non modifiable) utilise l'assertion non nulle.
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
);
