import { expect, test, type Page } from '@playwright/test'
import { apiPost, resetDemo, signIn } from './helpers.ts'

/**
 * Criteria already set are a key–value table (like „Dane w kartotece”): the name as the row label, the first sentence
 * of the description as the value and the rest under „Pełny opis”. Demo case c-005 (Paweł Szymański, sheet C, no
 * additional criteria) waits at the opening talk for j.kaminska.
 */
const CASE = 'c-005'
const SUPERVISOR = 'j.kaminska'

test.beforeEach(async ({ request }) => {
  await resetDemo(request)
})

const noSideScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)

test('krok „Arkusz i kryteria”: kryteria jako tabela klucz–wartość z „Pełnym opisem”', async ({ page }) => {
  await signIn(page, SUPERVISOR)
  await page.goto(`/teczka/${CASE}/arkusz-i-kryteria`)

  const mandatory = page.getByRole('table', { name: /^Kryteria obowiązkowe \(\d+\)$/ })
  await expect(mandatory).toBeVisible()
  const rows = mandatory.getByRole('row')
  const count = await rows.count()
  expect(count).toBeGreaterThan(0)
  await expect(page.getByRole('heading', { name: `Kryteria obowiązkowe (${count})` })).toBeVisible()

  // Name as the row label, the first sentence as the value, the rest folded under „Pełny opis”.
  const row = mandatory.getByRole('row').filter({ has: page.getByRole('rowheader', { name: 'Rzetelność', exact: true }) })
  const more = row.locator('details').filter({ hasText: 'Pełny opis' })
  await expect(more).toHaveCount(1)
  await expect(more).not.toHaveAttribute('open')
  await more.locator('summary').click()
  await expect(more).toHaveAttribute('open')
  await expect(more.getByRole('listitem').first()).toBeVisible()

  // No additional criteria yet.
  await expect(page.getByRole('heading', { name: 'Kryteria dodatkowe (0/3)' })).toBeVisible()
  await expect(page.getByText('Nie wybrano kryteriów dodatkowych.', { exact: true })).toBeVisible()

  // 375 px: the label above its value, nothing scrolls sideways.
  await page.setViewportSize({ width: 375, height: 800 })
  const th = (await row.getByRole('rowheader').boundingBox())!
  const td = (await row.getByRole('cell').boundingBox())!
  expect(td.y).toBeGreaterThanOrEqual(th.y + th.height - 1)
  expect(await noSideScroll(page)).toBeTruthy()
})

test('część I: kryteria obowiązkowe zawsze tabelą, dodatkowe tabelą po potwierdzeniu', async ({ page, request }) => {
  await signIn(page, SUPERVISOR)
  await page.goto(`/teczka/${CASE}/rozmowa-rozpoczynajaca`)
  await expect(page.getByRole('table', { name: /^Kryteria obowiązkowe \(\d+\)$/ })).toBeVisible()
  // Editing mode: the checkbox picker, no table of additional criteria.
  await expect(page.getByRole('group', { name: 'Kryteria dodatkowe (0/3)' })).toBeVisible()
  await page.getByRole('group', { name: 'Kryteria dodatkowe (0/3)' }).getByRole('checkbox', { name: 'Kreatywność', exact: true }).click()
  await expect(page.getByRole('group', { name: 'Kryteria dodatkowe (1/3)' })).toBeVisible()
  await expect(page.getByRole('table', { name: /Kryteria dodatkowe/ })).toHaveCount(0)

  await apiPost(request, SUPERVISOR, `/cases/${CASE}/actions`, { action: 'CONFIRM_PART_I' })
  await page.reload()
  const extra = page.getByRole('table', { name: 'Kryteria dodatkowe wybrane przez oceniającego (1/3)' })
  await expect(extra.getByRole('rowheader', { name: 'Kreatywność', exact: true })).toBeVisible()
  await expect(extra.getByRole('cell')).toContainText('Proponowanie lub tworzenie nowych rozwiązań.')
  await expect(page.getByRole('group', { name: /Kryteria dodatkowe \(\d\/3\)/ })).toHaveCount(0)

  await page.setViewportSize({ width: 375, height: 800 })
  expect(await noSideScroll(page)).toBeTruthy()
})
