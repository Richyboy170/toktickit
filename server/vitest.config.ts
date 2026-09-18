import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

const env = loadEnv("test", process.cwd(), "");
const sourceDatabaseUrl = env.TEST_DATABASE_URL ?? env.DATABASE_URL;

// Vitest does not always populate NODE_ENV when it is launched through npm.
// Mark the process explicitly so Lab 2 compatibility fixtures can use their
// opt-in requester header while production processes stay gated.
process.env.NODE_ENV ??= "test";

if (sourceDatabaseUrl) {
  const testDatabaseUrl = new URL(sourceDatabaseUrl);
  if (!env.TEST_DATABASE_URL) testDatabaseUrl.pathname = "/toktickit_test";
  process.env.DATABASE_URL = testDatabaseUrl.toString();
}

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // API suites share one PostgreSQL test database. Running files serially
    // prevents one suite's temporary fixtures from changing another suite's
    // reference-data or ownership assertions.
    fileParallelism: false,
  },
});
