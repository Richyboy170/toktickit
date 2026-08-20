import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

const env = loadEnv("test", process.cwd(), "");
const sourceDatabaseUrl = env.TEST_DATABASE_URL ?? env.DATABASE_URL;

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
