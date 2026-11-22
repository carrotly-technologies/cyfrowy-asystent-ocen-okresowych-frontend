import { expect, test, type Locator } from '@playwright/test'
import { apiGet, apiPost, confirmDialog, resetDemo, sessionFor, signIn } from './helpers.ts'

/** "Oceny zespołu" (/zespol) of supervisor j.kaminska, against the backend demo seed. */
const SUPERVISOR = 'j.kaminska'
// „Akcje” is read by screen readers only (the column of „Prowadź ocenę” / „Zobacz ocenę” buttons).
const HEADERS = ['Pracownik', 'Stanowisko', 'Etap', 'Termin', 'Status', 'Akcje']
const NEXT_EVALUATION = 'Następna ocena okresowa (przewidywana)'

/** The value cell of the key–value row labelled `label` in „Dane w kartotece”. */
const valueIn = (region: Locator, label: string) =>
  region.getByRole('row').filter({ has: region.page().getByRole('rowheader', { name: label, exact: true }) }).getByRole('cell')

test.beforeEach(async ({ request }) => {
  await resetDemo(request)
})

test('Oceny zespołu: nagłówki kolumn bez „Ocena” i „Następna ocena”, status przed przyciskiem oceny na końcu wiersza', async ({ page }) => {
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
  await expect(nowakCells.nth(4)).toContainText(/w toku|po terminie/i)
  await expect(nowakCells.last().getByRole('link', { name: 'Prowadź ocenę: Anna Nowak' })).toBeVisible()
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

test('Oceny zespołu: wiersz otwiera stronę osoby z kartoteką na górze, historią ocen i nieobecnościami, bez „Bieżąca ocena”', async ({ page }) => {
  await signIn(page, SUPERVISOR)
  await page.goto('/zespol')

  const table = page.getByRole('table', { name: 'Pracownicy i ich oceny okresowe' })
  await table.getByRole('link', { name: 'Pokaż pracownika: Anna Nowak' }).click()
  await expect(page).toHaveURL(/\/zespol\/p-nowak$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Anna Nowak')

  const sections = page.locator('main').getByRole('heading', { level: 2 })
  await expect(sections).toHaveText(['Dane w kartotece', 'Historia ocen', 'Nieobecności'])
  await expect(page.getByRole('region', { name: 'Bieżąca ocena' })).toHaveCount(0)

  const crumbs = page.getByRole('navigation', { name: 'Okruszki' })
  await expect(crumbs.getByRole('link', { name: 'Oceny zespołu' })).toBeVisible()
  await expect(crumbs.locator('[aria-current="page"]')).toHaveText('Anna Nowak')
  await expect(page).toHaveTitle(/^Anna Nowak — Oceny zespołu/)
  await expect(page.getByRole('navigation', { name: 'Nawigacja główna' }).getByRole('link', { name: 'Oceny zespołu' })).toHaveAttribute('aria-current', 'page')

  await expect(page.getByRole('link', { name: 'Otwórz teczkę' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Prowadź ocenę', exact: true })).toHaveCount(0)
  // Assessment in progress: „Przeprowadź ocenę” next to „Historia ocen” opens the case file.
  const history = page.getByRole('region', { name: 'Historia ocen' })
  await history.getByRole('link', { name: 'Przeprowadź ocenę' }).click()
  await expect(page).toHaveURL(/\/teczka\/c-001$/)
})

test('Oceny zespołu: imię to podkreślony link do profilu, status to kropka z nazwą, reszta wiersza nie jest linkiem', async ({ page }) => {
  await signIn(page, SUPERVISOR)
  await page.goto('/zespol')
  const table = page.getByRole('table', { name: 'Pracownicy i ich oceny okresowe' })
  const nameLink = table.getByRole('link', { name: 'Pokaż pracownika: Anna Nowak' })
  await expect(nameLink).toHaveText('Anna Nowak')
  expect(await nameLink.evaluate((e) => getComputedStyle(e).textDecorationLine)).toContain('underline')
  const nowak = table.getByRole('row').filter({ has: page.getByRole('link', { name: 'Pokaż pracownika: Anna Nowak' }) })

  // Status: plain text (no fill, no capitals) after a 10px round dot; never a link or a button.
  const status = nowak.getByRole('cell').nth(4)
  const look = await status.evaluate((cell) => {
    const shown = [...cell.querySelectorAll('*')].filter((e) => (e as HTMLElement).offsetParent !== null || e.tagName === 'svg')
    const dots = shown.filter((e) => getComputedStyle(e).borderRadius === '50%')
    return {
      dot: dots.map((d) => Math.round(d.getBoundingClientRect().width)),
      filled: shown.filter((e) => !dots.includes(e) && getComputedStyle(e).backgroundColor !== 'rgba(0, 0, 0, 0)').length,
      upper: shown.filter((e) => getComputedStyle(e).textTransform === 'uppercase').length,
    }
  })
  expect(look).toEqual({ dot: [10], filled: 0, upper: 0 })
  await expect(status.getByRole('link')).toHaveCount(0)
  await expect(status.getByRole('button')).toHaveCount(0)

  // Each row has exactly two links: the name (profile) and the assessment button (case).
  await expect(nowak.getByRole('link')).toHaveCount(2)
  // Clicking elsewhere in the row (the position cell) opens nothing.
  await nowak.getByRole('cell').nth(1).click()
  await expect(page).toHaveURL(/\/zespol$/)
  // Keyboard: the name link takes focus with a visible ring.
  await nameLink.focus()
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('Tab')
  await expect(nameLink).toBeFocused()
  expect(await nameLink.evaluate((e) => getComputedStyle(e).boxShadow)).not.toBe('none')
  await nameLink.click()
  await expect(page).toHaveURL(/\/zespol\/p-nowak$/)
})

test('Oceny zespołu: długi tekst w komórce ucięty do 3 linii, pełny tekst w title i w DOM', async ({ page }) => {
  const long = Array.from({ length: 25 }, (_, i) => `stanowisko${i}`).join(' ').slice(0, 200)
  await page.route('**/api/team', async (route) => {
    const res = await route.fetch()
    const body = await res.json()
    body.cases[0].person.position = long
    await route.fulfill({ response: res, json: body })
  })
  await signIn(page, SUPERVISOR)
  await page.goto('/zespol')
  const table = page.getByRole('table', { name: 'Pracownicy i ich oceny okresowe' })
  const cell = table.getByTitle(long)
  await expect(cell).toHaveText(long)
  const { height, lineHeight } = await cell.evaluate((e) => ({ height: e.getBoundingClientRect().height, lineHeight: parseFloat(getComputedStyle(e).lineHeight) }))
  expect(height).toBeLessThanOrEqual(3 * lineHeight + 1)
  expect(await cell.evaluate((e) => e.scrollHeight > e.clientHeight)).toBe(true)
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

test('Profil pracownika: przewidywana data następnej oceny w „Dane w kartotece” (/zespol/:id) i w „Bieżąca ocena” (/kartoteka/:id)', async ({ page, request, browser }) => {
  // Anna Nowak (c-001 unsigned): from her previous, signed case c-000. Piotr Wójcik (c-002): none signed yet.
  const previous = await apiGet<{ signedByEvaluatorOn: string }>(request, 'a.lis', '/cases/c-000')
  const expected = plusTwoYears(previous.signedByEvaluatorOn)

  await signIn(page, SUPERVISOR)
  await page.goto('/zespol/p-nowak')
  const data = page.getByRole('region', { name: 'Dane w kartotece' })
  await expect(data.getByRole('rowheader', { name: NEXT_EVALUATION })).toBeVisible()
  await expect(valueIn(data, NEXT_EVALUATION)).toHaveText(expected)

  await page.goto('/zespol')
  await page.getByRole('link', { name: 'Pokaż pracownika: Piotr Wójcik' }).click()
  await expect(page).toHaveURL(/\/zespol\/[^/]+$/)
  const wojcikData = page.getByRole('region', { name: 'Dane w kartotece' })
  await expect(wojcikData.getByRole('rowheader', { name: NEXT_EVALUATION })).toBeVisible()
  await expect(valueIn(wojcikData, NEXT_EVALUATION)).toHaveText('—')

  const hr = await sessionFor(browser, 'a.lis')
  await hr.goto('/kartoteka/p-nowak')
  const hrCycle = hr.getByRole('region', { name: 'Bieżąca ocena' })
  await expect(hrCycle.getByRole('term').filter({ hasText: NEXT_EVALUATION })).toBeVisible()
  await expect(hrCycle.getByRole('term').filter({ hasText: NEXT_EVALUATION }).locator('xpath=following-sibling::dd[1]')).toHaveText(expected)
  await hr.context().close()
})


test('Profil pracownika: „Bieżący termin” w „Dane w kartotece” (termin oceny w toku albo „—”)', async ({ page }) => {
  await signIn(page, SUPERVISOR)
  await page.goto('/zespol/p-nowak')
  const data = page.getByRole('region', { name: 'Dane w kartotece' })
  await expect(valueIn(data, 'Bieżący termin')).toContainText(/(Najbliższy termin|Termin): /)
  await expect(valueIn(data, 'Bieżący termin')).toContainText(/\d{2}\.\d{2}\.\d{4}/)

  await page.goto('/zespol/p-pietrzak')
  await expect(valueIn(page.getByRole('region', { name: 'Dane w kartotece' }), 'Bieżący termin')).toHaveText('—')
})

test('Profil pracownika: „Przeprowadź ocenę” bez oceny w toku rozpoczyna cykl i otwiera nową teczkę', async ({ page }) => {
  await signIn(page, SUPERVISOR)
  await page.goto('/zespol/p-pietrzak')
  const history = page.getByRole('region', { name: 'Historia ocen' })
  const start = history.getByRole('button', { name: 'Przeprowadź ocenę' })
  await expect(start).toBeEnabled()
  await start.click()
  await expect(page).toHaveURL(/\/teczka\/c-[0-9a-f]{8}(\/|$)/)
})

test('Profil pracownika: „Przeprowadź ocenę” po terminie rozmowy rozpoczynającej pyta o potwierdzenie', async ({ page }) => {
  await signIn(page, SUPERVISOR)
  await page.goto('/zespol/p-jasinska')
  await page.getByRole('region', { name: 'Historia ocen' }).getByRole('button', { name: 'Przeprowadź ocenę' }).click()
  await confirmDialog(page, 'Termin rozmowy rozpoczynającej już minął', 'Rozpocznij mimo to')
  await expect(page).toHaveURL(/\/teczka\/c-[0-9a-f]{8}(\/|$)/)
})

test('Profil pracownika: „Przeprowadź ocenę” jest wyłączony z powodem, gdy nie można rozpocząć cyklu', async ({ page, request }) => {
  // No date of indefinite employment: the backend cannot anchor a cycle.
  await apiPost(request, 'a.lis', '/employees', {
    firstName: 'Jan',
    lastName: 'Bezterminu',
    unit: 'Wydział Testów',
    position: 'Specjalista',
    employment: 'PRACOWNIK',
    officeHead: false,
    managesPeople: false,
    appointedYear: null,
    grade: null,
    gradeGrantedOn: null,
    indefiniteSince: null,
    evaluatorId: 'ev-kaminska',
  })
  const people = await apiGet<{ id: string; lastName: string }[]>(request, 'a.lis', '/employees')
  const person = people.find((p) => p.lastName === 'Bezterminu')!

  await signIn(page, SUPERVISOR)
  await page.goto(`/zespol/${person.id}`)
  const history = page.getByRole('region', { name: 'Historia ocen' })
  await expect(history.getByRole('button', { name: 'Przeprowadź ocenę' })).toBeDisabled()
  await expect(history.getByRole('note')).not.toBeEmpty()
})

test('Kartoteka HR (/kartoteka/:id) bez zmian: „Bieżąca ocena” obok danych, bez „Przeprowadź ocenę”', async ({ page }) => {
  await signIn(page, 'a.lis')
  await page.goto('/kartoteka/p-pietrzak')
  await expect(page.getByRole('region', { name: 'Bieżąca ocena' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Rozpocznij nowy cykl oceny' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Przeprowadź ocenę' })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Dane w kartotece' }).getByRole('rowheader', { name: 'Bieżący termin' })).toHaveCount(0)
})

test('Profil pracownika: „Dane w kartotece” jak „Historia ocen”: nagłówek i „Edytuj dane” nad tabelą klucz–wartość', async ({ page, browser }) => {
  await signIn(page, SUPERVISOR)
  await page.goto('/zespol/p-nowak')
  const data = page.getByRole('region', { name: 'Dane w kartotece' })
  const table = data.getByRole('table', { name: 'Dane w kartotece' })
  await expect(table).toHaveClass(/\btable\b/)
  await expect(table.getByRole('rowheader')).toHaveText([
    'Status',
    'Mianowanie / stopień',
    'Zatrudnienie na czas nieokreślony od',
    'Oceniający',
    'Arkusz',
    'Bieżący termin',
    NEXT_EVALUATION,
  ])
  // The supervisor does not edit register data.
  await expect(data.getByRole('button', { name: 'Edytuj dane' })).toHaveCount(0)

  const hr = await sessionFor(browser, 'a.lis')
  await hr.goto('/kartoteka/p-nowak')
  const hrData = hr.getByRole('region', { name: 'Dane w kartotece' })
  const hrTable = hrData.getByRole('table', { name: 'Dane w kartotece' })
  await expect(hrTable.getByRole('rowheader').first()).toHaveText('Status')
  const edit = hrData.getByRole('button', { name: 'Edytuj dane' })
  // Heading and button sit above the framed table, as in „Historia ocen” and „Nieobecności”.
  const [editBox, tableBox] = await Promise.all([edit.boundingBox(), hrTable.boundingBox()])
  expect(editBox!.y + editBox!.height).toBeLessThanOrEqual(tableBox!.y)

  await edit.click()
  await expect(hrTable).toHaveCount(0)
  await hrData.getByRole('button', { name: 'Anuluj' }).click()
  await expect(hrTable).toBeVisible()
  await hr.context().close()
})

test('Profil pracownika na telefonie: w „Dane w kartotece” etykieta nad wartością, bez przewijania w poziomie', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await signIn(page, SUPERVISOR)
  await page.goto('/zespol/p-nowak')
  const data = page.getByRole('region', { name: 'Dane w kartotece' })
  const label = data.getByRole('rowheader', { name: NEXT_EVALUATION })
  const [labelBox, valueBox] = await Promise.all([label.boundingBox(), valueIn(data, NEXT_EVALUATION).boundingBox()])
  expect(labelBox!.y + labelBox!.height).toBeLessThanOrEqual(valueBox!.y + 1)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})
