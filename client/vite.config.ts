import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Vitest sets VITEST in its Node process, but that marker is not always
  // reflected in import.meta.env across Vitest versions. Expose it only to
  // test transforms so Lab 2 compatibility fixtures stay unavailable in the
  // production build. Playwright uses the explicit e2e mode for its legacy
  // Lab 2 browser fixtures.
  define: {
    "import.meta.env.VITEST": JSON.stringify(process.env.VITEST === "true"),
    "import.meta.env.VITE_ENABLE_LEGACY_REQUESTER": JSON.stringify(
      mode === "e2e" || process.env.VITE_ENABLE_LEGACY_REQUESTER === "true",
    ),
  },
  // Bind IPv4 explicitly: on Windows, Vite's default "localhost" resolves to ::1
  // only, and Chrome then cannot open http://localhost:5173.
  server: { port: 5173, host: "127.0.0.1" },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./tests/setup.ts",
    include: ["tests/**/*.test.tsx"],
    testTimeout: 10_000,
  },
}));
