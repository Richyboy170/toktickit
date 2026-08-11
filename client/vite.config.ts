import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Bind IPv4 explicitly: on Windows, Vite's default "localhost" resolves to ::1
  // only, and Chrome then cannot open http://localhost:5173.
  server: { port: 5173, host: "127.0.0.1" },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./tests/setup.ts",
    include: ["tests/**/*.test.tsx"],
  },
});
