import { defineConfig, devices } from '@playwright/test'

/**
 * Browser e2e tests of the whole periodic assessment (`npm run test:e2e`, specs in `e2e/`).
 * They run against a local backend with its demo seed (cyfrowy-asystent-ocen-okresowych-backend, in-memory storage);
 * every test restores the seed first (`POST /api/demo/reset`). Playwright starts the Vite dev server itself, with the
 * `/api` proxy pointed at the backend.
 *
 * - `E2E_API_URL`  backend origin (default http://localhost:3000)
 * - `E2E_PORT`     port of the Vite dev server started for the tests (default 5174, so `npm run dev` on 5173 can keep running)
 */
const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3000'
const PORT = Number(process.env.E2E_PORT ?? 5174)
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  // The tests share one in-memory backend and reset its seed, so they never run in parallel.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // Generous limits so a loaded machine (dev server compiling on first visit, other builds) does not fail the run.
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results',
  use: {
    baseURL: BASE_URL,
    locale: 'pl-PL',
    timezoneId: 'Europe/Warsaw',
    viewport: { width: 1280, height: 900 },
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } }],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Same origin for the app and the API: VITE_API_URL empty, the dev proxy forwards /api to the backend.
    env: { API_PROXY_TARGET: API_URL, VITE_API_URL: '', VITE_DEMO_ACCOUNTS: 'true' },
  },
})
