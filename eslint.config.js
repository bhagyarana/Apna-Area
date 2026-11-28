/**
 * Feature: Workspace ESLint Configuration
 * Purpose: Enforces strict TypeScript safety, React hook rules, and zero console.log usage across shared, server, and web.
 * Inputs: TypeScript and TSX source files in shared/, server/, web/, and e2e/.
 * Outputs: Flat ESLint rule array evaluated with --max-warnings=0.
 * Deliberately excludes: Generated dist/, coverage/, playwright-report/, and static HTML mockups.
 */
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "docs/**",
      "video/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,mjs,js}"],
    languageOptions: {
      ecmaVersion: 2023,
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-console": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/explicit-function-return-type": "off",
    },
  },
);
