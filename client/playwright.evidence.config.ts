import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");

export default defineConfig({
  testDir: resolve(repositoryRoot, "e2e/lab-02"),
  testMatch: "rubric-evidence.spec.ts",
  outputDir: resolve(repositoryRoot, "test-results/evidence"),
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
    command: "npm run dev -- --host 127.0.0.1",
    cwd: import.meta.dirname,
    url: "http://127.0.0.1:5173",
    env: { VITE_API_URL: "http://127.0.0.1:3000" },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
