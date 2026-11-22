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
  // No heading starts with another menu item's label ("Oceny zespołu", "Pracownicy").
  expect(headings.filter((h) => /^(Oceny zespołu|Pracownicy)/.test(h.trim()))).toEqual([])

  // Breadcrumbs on a person's card lead back to the same name.
  await page.getByRole('link', { name: /^Zobacz kartę: / }).first().click()
  await expect(page.getByRole('navigation', { name: 'Okruszki' }).getByRole('link', { name: 'Dobrostan zespołu' })).toBeVisible()
})

test('Dobrostan: lista jak w „Oceny zespołu”, karty, wyjaśnienie, że wirtualny asystent HR to funkcja aplikacji', async ({ page }) => {
  await signIn(page, SUPERVISOR)
  await page.goto('/dobrostan')

  // The explanation under the heading, and no "HR partner" anywhere.
  await expect(page.locator('main')).toContainText('Wirtualny asystent HR to funkcja aplikacji, nie osoba.')
  await expect(page.locator('main')).toContainText('Nic tutaj nie wpływa na ocenę okresową.')
  await expect(page.locator('main')).not.toContainText(/HR partner/)

  // Employees: ResultTable with column headers, a "Zobacz kartę" action and no click handler on table rows.
  const list = page.getByRole('region', { name: 'Puls pracowników' })
  const table = list.getByRole('table', { name: 'Puls pracowników' })
  for (const name of ['Pracownik', 'Wskaźnik dobrostanu (1–5)', 'Trend', 'Sygnały', 'Akcje']) {
    await expect(table.getByRole('columnheader', { name })).toHaveCount(1)
  }
  await expect(list.locator('.section__head')).toContainText(/\d+ os(oba|oby|ób)/)
  await expect(page.locator('main tr.is-link')).toHaveCount(0)
  const rows = table.getByRole('row')
  expect(await rows.count()).toBeGreaterThan(1)
  await expect(table.getByRole('link', { name: /^Zobacz kartę: / }).first()).toBeVisible()

  // Counters, chart and averages sit in the shared cards; sections have the "Oceny zespołu" head.
  for (const region of ['Sygnały w zespole', 'Puls zespołu']) {
    const r = page.getByRole('region', { name: region })
    await expect(r.locator('.section__head')).toHaveCount(1)
  }
  const cardLook = (el: Element) => {
    const d = getComputedStyle(el)
    return [d.borderTopColor, d.borderRadius, d.backgroundColor].join('|')
  }
  const counter = page.getByRole('list', { name: 'Liczba sygnałów według rodzaju' }).getByRole('listitem').first().locator('> *')
  const chartCard = page.getByRole('region', { name: 'Puls zespołu' }).locator('section').first()
  expect(await counter.evaluate(cardLook)).toBe(await chartCard.evaluate(cardLook))
  await expect(chartCard.getByRole('img', { name: /Średni indeks pulsu zespołu/ })).toBeVisible()

  // Phone: no horizontal scroll.
  await page.setViewportSize({ width: 375, height: 800 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

  // Person card: BackLink, page head with name and position, sections in cards.
  await page.setViewportSize({ width: 1280, height: 900 })
  await table.getByRole('link', { name: /^Zobacz kartę: / }).first().click()
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('Dobrostan zespołu')
  await expect(page.locator('.page-head__meta')).not.toBeEmpty()
  await expect(page.getByRole('heading', { level: 2, name: 'Sygnały wirtualnego asystenta HR' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Zapytaj wirtualnego asystenta HR' })).toBeVisible()
  await expect(page.locator('main')).not.toContainText(/HR partner/)
  await page.setViewportSize({ width: 375, height: 800 })
  await expect(page.getByRole('link', { name: /Powrót|Dobrostan zespołu/ }).first()).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
