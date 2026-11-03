import { defineConfig, devices } from "@playwright/test";

// Les scénarios tournent sur le livrable unique, servi par vite preview.
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:4173/rogue-planner.html",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run build && npx vite preview --port 4173 --strictPort",
    url: "http://localhost:4173/rogue-planner.html",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "iphone-13", use: { ...devices["iPhone 13"] } },
    { name: "pixel-7", use: { ...devices["Pixel 7"] } },
  ],
});
