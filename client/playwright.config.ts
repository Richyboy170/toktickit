import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";
import { loadEnv } from "vite";

const repositoryRoot = resolve(import.meta.dirname, "..");
const serverDirectory = resolve(repositoryRoot, "server");
const serverEnv = loadEnv("e2e", serverDirectory, "");
const databaseUrl = process.env.E2E_DATABASE_URL
  ?? serverEnv.TEST_DATABASE_URL
  ?? "postgresql://toktickit:toktickit@127.0.0.1:5432/toktickit_test?schema=public";

export default defineConfig({
  testDir: resolve(repositoryRoot, "e2e"),
  outputDir: resolve(repositoryRoot, "test-results"),
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { outputFolder: resolve(repositoryRoot, "playwright-report"), open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: process.env.CI ? "retain-on-failure" : "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], ...(process.env.CI ? {} : { channel: "chrome" }) } }],
  webServer: [
    {
      command: "npm run e2e:serve",
      cwd: serverDirectory,
      url: "http://127.0.0.1:3000/api/health",
      env: { DATABASE_URL: databaseUrl, PORT: "3000" },
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: "npm run dev -- --host 127.0.0.1",
      cwd: import.meta.dirname,
      url: "http://127.0.0.1:5173",
      env: { VITE_API_URL: "http://127.0.0.1:3000" },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
