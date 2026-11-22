import { expect, test } from '@playwright/test'
import { apiGet, resetDemo, sessionFor, signIn } from './helpers.ts'

/** "Oceny zespołu" (/zespol) of supervisor j.kaminska, against the backend demo seed. */
const SUPERVISOR = 'j.kaminska'
const HEADERS = ['Pracownik', 'Stanowisko', 'Etap', 'Termin', 'Status']
const NEXT_EVALUATION = 'Następna ocena okresowa (przewidywana)'

test.beforeEach(async ({ request }) => {
  await resetDemo(request)
})

test('Oceny zespołu: nagłówki kolumn bez „Ocena” i „Następna ocena”, status w ostatniej kolumnie', async ({ page }) => {
  await signIn(page, SUPERVISOR)
  await page.goto('/zespol')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Oceny zespołu')
  await expect(page).toHaveTitle(/^Oceny zespołu — /)

  const table = page.getByRole('table', { name: 'Pracownicy i ich oceny okresowe' })
  await expect(table.getByRole('columnheader')).toHaveText(HEADERS)

  await expect(table.getByRole('columnheader', { name: /^(Ocena|Następna ocena)$/ })).toHaveCount(0)

  const nowak = table.getByRole('row').filter({ has: page.getByRole('link', { name: 'Pokaż pracownika: Anna Nowak' }) })
  const nowakCells = nowak.getByRole('cell')
  await expect(nowakCells).toHaveCount(HEADERS.length)
  await expect(nowakCells.last()).toContainText(/w toku|po terminie/i)
  await expect(nowak).not.toContainText(/okresowa, arkusz/)

  // Header and cells share one grid: each header starts where its column starts.
  const headerBoxes = await table.getByRole('columnheader').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().left))
  const cellBoxes = await nowakCells.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().left))
  cellBoxes.forEach((left, i) => expect(Math.abs(left - headerBoxes[i])).toBeLessThan(2))

  // The row button says what the click does: the supervisor runs an assessment in progress, a closed one is only viewed.
  await expect(table.getByRole('link', { name: /^(Teczka|Otwórz teczkę)/ })).toHaveCount(0)
  const run = nowak.getByRole('link', { name: 'Prowadź ocenę: Anna Nowak' })
  await expect(run).toHaveText('Prowadź ocenę')
  await expect(run).toHaveClass(/btn--primary/)
  // Objection period (c-006) still counts as in progress: the supervisor has deadlines there.
  await expect(table.getByRole('link', { name: 'Prowadź ocenę: Ewa Dąbrowska' })).toBeVisible()
  await run.click()
  await expect(page).toHaveURL(/\/teczka\/c-001/)
  await expect(page.getByRole('navigation', { name: 'Nawigacja główna' }).getByRole('link', { name: 'Oceny zespołu' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('navigation', { name: 'Okruszki' }).getByRole('link', { name: 'Oceny zespołu' })).toBeVisible()
})

test('Oceny zespołu: wiersz otwiera stronę osoby z bieżącą oceną, historią, nieobecnościami i kartoteką', async ({ page }) => {
  await signIn(page, SUPERVISOR)
  await page.goto('/zespol')

  const table = page.getByRole('table', { name: 'Pracownicy i ich oceny okresowe' })
  await table.getByRole('link', { name: 'Pokaż pracownika: Anna Nowak' }).click()
  await expect(page).toHaveURL(/\/zespol\/p-nowak$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Anna Nowak')

  const sections = page.locator('main').getByRole('heading', { level: 2 })
  await expect(sections).toHaveText(['Bieżąca ocena', 'Historia ocen', 'Nieobecności', 'Dane w kartotece'])

  const crumbs = page.getByRole('navigation', { name: 'Okruszki' })
  await expect(crumbs.getByRole('link', { name: 'Oceny zespołu' })).toBeVisible()
  await expect(crumbs.locator('[aria-current="page"]')).toHaveText('Anna Nowak')
  await expect(page).toHaveTitle(/^Anna Nowak — Oceny zespołu/)
  await expect(page.getByRole('navigation', { name: 'Nawigacja główna' }).getByRole('link', { name: 'Oceny zespołu' })).toHaveAttribute('aria-current', 'page')

  await expect(page.getByRole('link', { name: 'Otwórz teczkę' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Podgląd arkusza C' })).toBeVisible()
  await page.getByRole('link', { name: 'Prowadź ocenę' }).click()
  await expect(page).toHaveURL(/\/teczka\/c-001$/)
})

test('Kierownik: bez pozycji „Pracownicy” w menu, /kartoteka prowadzi do Ocen zespołu', async ({ page }) => {
  await signIn(page, SUPERVISOR)
  await page.goto('/zespol')
  const nav = page.getByRole('navigation', { name: 'Nawigacja główna' })
  await expect(nav.getByRole('link', { name: 'Oceny zespołu' })).toBeVisible()
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
  await expect(bottom.getByRole('link', { name: 'Oceny', exact: true })).toBeVisible()
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

test('Oceny zespołu na telefonie: bez przewijania w poziomie, nagłówki ukryte, wartości z etykietami', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await signIn(page, SUPERVISOR)
  await page.goto('/zespol')

  const table = page.getByRole('table', { name: 'Pracownicy i ich oceny okresowe' })
  await expect(table.getByRole('columnheader').first()).toBeAttached()
  // Visually hidden header row (still announced by screen readers).
  const headerHeight = await table.getByRole('columnheader').first().evaluate((e) => e.closest('[role="rowgroup"]')!.getBoundingClientRect().height)
  expect(headerHeight).toBeLessThanOrEqual(1)

  const nowak = table.getByRole('row').filter({ has: page.getByRole('link', { name: 'Pokaż pracownika: Anna Nowak' }) })
  await expect(nowak.getByText('Etap:', { exact: true })).toBeVisible()
  await expect(nowak.getByText('Status:', { exact: true })).toBeVisible()
  await expect(nowak.getByText(/^(Ocena|Następna ocena):$/)).toHaveCount(0)

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})

/** Expected "DD.MM.RRRR": the signing date of the previous case + 24 months (rule from the backend, art. 81 ust. 1). */
function plusTwoYears(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${Number(y) + 2}`
}

test('Profil pracownika: przewidywana data następnej oceny w „Bieżąca ocena” (/zespol/:id i /kartoteka/:id)', async ({ page, request, browser }) => {
  // Anna Nowak (c-001 unsigned): from her previous, signed case c-000. Piotr Wójcik (c-002): none signed yet.
  const previous = await apiGet<{ signedByEvaluatorOn: string }>(request, 'a.lis', '/cases/c-000')
  const expected = plusTwoYears(previous.signedByEvaluatorOn)

  await signIn(page, SUPERVISOR)
  await page.goto('/zespol/p-nowak')
  const cycle = page.getByRole('region', { name: 'Bieżąca ocena' })
  await expect(cycle.getByRole('term').filter({ hasText: NEXT_EVALUATION })).toBeVisible()
  await expect(cycle.getByRole('term').filter({ hasText: NEXT_EVALUATION }).locator('xpath=following-sibling::dd[1]')).toHaveText(expected)

  await page.goto('/zespol')
  await page.getByRole('link', { name: 'Pokaż pracownika: Piotr Wójcik' }).click()
  await expect(page).toHaveURL(/\/zespol\/[^/]+$/)
  const wojcikCycle = page.getByRole('region', { name: 'Bieżąca ocena' })
  const term = wojcikCycle.getByRole('term').filter({ hasText: NEXT_EVALUATION })
  await expect(term).toBeVisible()
  await expect(term.locator('xpath=following-sibling::dd[1]')).toHaveText('—')

  const hr = await sessionFor(browser, 'a.lis')
  await hr.goto('/kartoteka/p-nowak')
  const hrCycle = hr.getByRole('region', { name: 'Bieżąca ocena' })
  await expect(hrCycle.getByRole('term').filter({ hasText: NEXT_EVALUATION })).toBeVisible()
  await expect(hrCycle.getByRole('term').filter({ hasText: NEXT_EVALUATION }).locator('xpath=following-sibling::dd[1]')).toHaveText(expected)
  await hr.context().close()
})
