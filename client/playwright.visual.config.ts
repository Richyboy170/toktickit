import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");

/**
 * The visual evidence run uses deterministic HTTP fixtures so the UI can be
 * inspected on a workstation without a PostgreSQL service. The normal
 * playwright.config.ts remains the database-backed acceptance suite.
 */
export default defineConfig({
  testDir: resolve(repositoryRoot, "e2e/lab-03"),
  testMatch: "visual-evidence.spec.ts",
  outputDir: resolve(repositoryRoot, "test-results/visual-evidence"),
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5173",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel: "chrome" } }],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --mode e2e",
    cwd: resolve(repositoryRoot, "client"),
    url: "http://127.0.0.1:5173",
    env: { VITE_API_URL: "http://127.0.0.1:3000", VITE_ENABLE_LEGACY_REQUESTER: "false" },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
