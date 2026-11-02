import { defineConfig } from "@playwright/test";
export default defineConfig({ testDir: "e2e", use: { baseURL: "http://localhost:3123" }, webServer: { command: "rm -rf .pglite-e2e && PGLITE_DIR=./.pglite-e2e PORT=3123 npm start", port: 3123, reuseExistingServer: true } });
