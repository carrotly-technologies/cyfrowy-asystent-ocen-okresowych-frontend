import { expect, test } from '@playwright/test'
import { resetDemo, signIn } from './helpers.ts'

/** "Dobrostan zespołu" (/dobrostan) of supervisor j.kaminska, against the backend demo seed. */
const SUPERVISOR = 'j.kaminska'

test.beforeEach(async ({ request }) => {
  await resetDemo(request)
})

test('Dobrostan: nagłówki nie powtarzają innych pozycji menu', async ({ page }) => {
  await signIn(page, SUPERVISOR)
  await page.goto('/dobrostan')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dobrostan zespołu')
  await expect(page).toHaveTitle(/^Dobrostan zespołu/)
  await expect(page.getByRole('region', { name: 'Puls pracowników' }).getByRole('table')).toBeVisible()

  const headings = await page.locator('main').getByRole('heading').allTextContents()
  // No heading starts with another menu item's label ("Mój zespół", "Pracownicy").
  expect(headings.filter((h) => /^(Mój zespół|Pracownicy)/.test(h.trim()))).toEqual([])

  // Breadcrumbs on a person's card lead back to the same name.
  await page.getByRole('link', { name: /^Karta: / }).first().click()
  await expect(page.getByRole('navigation', { name: 'Okruszki' }).getByRole('link', { name: 'Dobrostan zespołu' })).toBeVisible()
})
