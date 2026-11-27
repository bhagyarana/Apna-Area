/**
 * Feature: Root Vitest Configuration
 * Purpose: Runs fast unit and Fastify route contract tests across shared/, server/, and web/.
 * Inputs: *.test.ts and *.test.tsx files under workspace packages.
 * Outputs: Test pass/fail report for npm run check.
 * Deliberately excludes: Playwright e2e/ live browser smoke specs.
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "shared/src/**/*.test.ts",
      "server/src/**/*.test.ts",
      "web/src/**/*.test.{ts,tsx}",
    ],
    exclude: ["**/node_modules/**", "**/dist/**", "e2e/**"],
    environment: "node",
  },
});
