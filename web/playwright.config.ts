import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // Testnet confirms in ~5 s and onboarding chains Friendbot, a trustline and the faucet.
  timeout: 180_000,
  expect: { timeout: 30_000 },
  // One worker: the faucet allows one grant per minute per IP, and tests share live auctions.
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "https://artemi-arte.vercel.app",
    locale: "es-AR",
    timezoneId: "America/Argentina/Mendoza",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "celular", use: { ...devices["Pixel 7"] } }],
});
