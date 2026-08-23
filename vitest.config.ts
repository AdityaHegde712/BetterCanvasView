/**
 * @fileoverview Configures isolated contract and integration test execution.
 */

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    clearMocks: true,
    environment: "jsdom",
    include: ["tests/**/*.spec.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
    },
  },
});
