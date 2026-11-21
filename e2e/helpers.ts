import { expect, type APIRequestContext, type Browser, type Page } from '@playwright/test'

/** Backend origin, the same as in playwright.config.ts. */
export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3000'

/** Shared password of the backend demo accounts (backend README, "Demo accounts"). */
export const DEMO_PASSWORD = 'Ocena2026!'

async function apiLogin(request: APIRequestContext, login: string): Promise<string> {
  const res = await request.post(`${API_URL}/api/auth/login`, { data: { login, password: DEMO_PASSWORD } })
  expect(res.ok(), `sign-in of ${login} against ${API_URL} (is the backend running?)`).toBeTruthy()
  return ((await res.json()) as { accessToken: string }).accessToken
}

/** Restores the backend demo seed (cases and journal), so every test starts from the same data. */
export async function resetDemo(request: APIRequestContext): Promise<void> {
  const token = await apiLogin(request, 'admin')
  const res = await request.post(`${API_URL}/api/demo/reset`, { headers: { Authorization: `Bearer ${token}` } })
  expect(res.ok(), 'POST /api/demo/reset').toBeTruthy()
}

/** Test setup through the API (not what the test checks): a PATCH of a case as `login`. */
export async function patchCase(request: APIRequestContext, login: string, caseId: string, body: object): Promise<void> {
  const token = await apiLogin(request, login)
  const res = await request.patch(`${API_URL}/api/cases/${caseId}`, { data: body, headers: { Authorization: `Bearer ${token}` } })
  expect(res.ok(), `PATCH /api/cases/${caseId}: ${await res.text()}`).toBeTruthy()
}

/** Signs in through the form on /logowanie, as a real user would. */
export async function signIn(page: Page, login: string): Promise<void> {
  await page.goto('/logowanie')
  await page.getByLabel('Login').fill(login)
  await page.getByLabel('Hasło').fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: 'Zaloguj się' }).click()
  await expect(page).not.toHaveURL(/\/logowanie/)
}

/** A separate browser session (own sessionStorage token) for a second person, e.g. the assessed employee. */
export async function sessionFor(browser: Browser, login: string): Promise<Page> {
  const context = await browser.newContext()
  const page = await context.newPage()
  await signIn(page, login)
  return page
}

/**
 * Confirms the shared ConfirmDialog (native <dialog>, role "dialog" named by its title): clicks its primary button
 * and waits until the dialog closes, i.e. until the action it confirms has been saved.
 */
export async function confirmDialog(page: Page, title: string | RegExp, confirmLabel: string): Promise<void> {
  const dialog = page.getByRole('dialog', { name: title })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: confirmLabel, exact: true }).click()
  await expect(dialog).toBeHidden({ timeout: 20_000 })
}
