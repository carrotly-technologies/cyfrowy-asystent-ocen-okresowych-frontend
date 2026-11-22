import { expect, test } from '@playwright/test'
import { resetDemo, signIn } from './helpers.ts'

/** "Mój zespół" (/zespol) of supervisor j.kaminska, against the backend demo seed. */
const SUPERVISOR = 'j.kaminska'
const HEADERS = ['Pracownik', 'Stanowisko', 'Ocena', 'Etap', 'Termin', 'Następna ocena', 'Status']

test.beforeEach(async ({ request }) => {
  await resetDemo(request)
})

test('Mój zespół: nagłówki kolumn, następna ocena i status w ostatniej kolumnie', async ({ page }) => {
  await signIn(page, SUPERVISOR)
  await page.goto('/zespol')

  const table = page.getByRole('table', { name: 'Pracownicy i ich oceny okresowe' })
  await expect(table.getByRole('columnheader')).toHaveText(HEADERS)

  // Visible text only (the per-cell labels show on phones). Anna Nowak (c-001): previous assessment signed, so a predicted date; Piotr Wójcik (c-002): none signed yet.
  const nowak = table.getByRole('row').filter({ has: page.getByRole('link', { name: 'Pokaż pracownika: Anna Nowak' }) })
  const nowakCells = nowak.getByRole('cell')
  await expect(nowakCells).toHaveCount(HEADERS.length)
  await expect(nowakCells.nth(5)).toHaveText(/^\d{2}\.\d{2}\.\d{4}$/, { useInnerText: true })
  await expect(nowakCells.last()).toContainText(/w toku|po terminie/i)

  const wojcik = table.getByRole('row').filter({ has: page.getByRole('link', { name: 'Pokaż pracownika: Piotr Wójcik' }) })
  await expect(wojcik.getByRole('cell').nth(5)).toHaveText('—', { useInnerText: true })

  // Header and cells share one grid: each header starts where its column starts.
  const headerBoxes = await table.getByRole('columnheader').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().left))
  const cellBoxes = await nowakCells.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().left))
  cellBoxes.forEach((left, i) => expect(Math.abs(left - headerBoxes[i])).toBeLessThan(2))

  // The „Teczka” shortcut in the row goes straight to the case.
  await nowak.getByRole('link', { name: 'Teczka oceny: Anna Nowak' }).click()
  await expect(page).toHaveURL(/\/teczka\/c-001/)
  await expect(page.getByRole('navigation', { name: 'Nawigacja główna' }).getByRole('link', { name: 'Mój zespół' })).toHaveAttribute('aria-current', 'page')
})

test('Mój zespół: wiersz otwiera stronę osoby z bieżącą oceną, historią, nieobecnościami i kartoteką', async ({ page }) => {
  await signIn(page, SUPERVISOR)
  await page.goto('/zespol')

  const table = page.getByRole('table', { name: 'Pracownicy i ich oceny okresowe' })
  await table.getByRole('link', { name: 'Pokaż pracownika: Anna Nowak' }).click()
  await expect(page).toHaveURL(/\/zespol\/p-nowak$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Anna Nowak')

  const sections = page.locator('main').getByRole('heading', { level: 2 })
  await expect(sections).toHaveText(['Bieżąca ocena', 'Historia ocen', 'Nieobecności', 'Dane w kartotece'])

  const crumbs = page.getByRole('navigation', { name: 'Okruszki' })
  await expect(crumbs.getByRole('link', { name: 'Mój zespół' })).toBeVisible()
  await expect(crumbs.locator('[aria-current="page"]')).toHaveText('Anna Nowak')
  await expect(page).toHaveTitle(/^Anna Nowak — Mój zespół/)
  await expect(page.getByRole('navigation', { name: 'Nawigacja główna' }).getByRole('link', { name: 'Mój zespół' })).toHaveAttribute('aria-current', 'page')

  await page.getByRole('link', { name: 'Otwórz teczkę' }).click()
  await expect(page).toHaveURL(/\/teczka\/c-001$/)
})

test('Kierownik: bez pozycji „Pracownicy” w menu, /kartoteka prowadzi do Mojego zespołu', async ({ page }) => {
  await signIn(page, SUPERVISOR)
  await page.goto('/zespol')
  const nav = page.getByRole('navigation', { name: 'Nawigacja główna' })
  await expect(nav.getByRole('link', { name: 'Mój zespół' })).toBeVisible()
  await expect(nav.getByRole('link', { name: /Pracownicy|Kartoteka/ })).toHaveCount(0)

  await page.goto('/kartoteka')
  await expect(page).toHaveURL(/\/zespol$/)
  await page.goto('/kartoteka/p-nowak')
  await expect(page).toHaveURL(/\/zespol\/p-nowak$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Anna Nowak')
})

test('Kierownik na telefonie: dolny pasek bez „Pracownicy”', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await signIn(page, SUPERVISOR)
  await page.goto('/zespol')
  const bottom = page.getByRole('navigation', { name: 'Nawigacja na telefonie' })
  await expect(bottom.getByRole('link', { name: 'Zespół' })).toBeVisible()
  await expect(bottom.getByRole('link', { name: /Pracownicy/ })).toHaveCount(0)
})

test('HR: Kartoteka w menu i /kartoteka/:id bez zmian', async ({ page }) => {
  await signIn(page, 'a.lis')
  const nav = page.getByRole('navigation', { name: 'Nawigacja główna' })
  await nav.getByRole('link', { name: 'Kartoteka' }).click()
  await expect(page).toHaveURL(/\/kartoteka$/)
  await page.goto('/kartoteka/p-nowak')
  await expect(page).toHaveURL(/\/kartoteka\/p-nowak$/)
  await expect(page.getByRole('navigation', { name: 'Okruszki' }).getByRole('link', { name: 'Kartoteka' })).toBeVisible()
  await expect(page.locator('main').getByRole('heading', { level: 2 }).first()).toHaveText('Dane w kartotece')
})

test('Mój zespół na telefonie: bez przewijania w poziomie, nagłówki ukryte, wartości z etykietami', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await signIn(page, SUPERVISOR)
  await page.goto('/zespol')

  const table = page.getByRole('table', { name: 'Pracownicy i ich oceny okresowe' })
  await expect(table.getByRole('columnheader').first()).toBeAttached()
  // Visually hidden header row (still announced by screen readers).
  const headerHeight = await table.getByRole('columnheader').first().evaluate((e) => e.closest('[role="rowgroup"]')!.getBoundingClientRect().height)
  expect(headerHeight).toBeLessThanOrEqual(1)

  const nowak = table.getByRole('row').filter({ has: page.getByRole('link', { name: 'Pokaż pracownika: Anna Nowak' }) })
  await expect(nowak.getByText('Następna ocena:', { exact: true })).toBeVisible()
  await expect(nowak.getByText('Status:', { exact: true })).toBeVisible()

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})
