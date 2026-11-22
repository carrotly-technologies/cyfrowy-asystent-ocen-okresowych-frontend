import { expect, test, type Page } from '@playwright/test'
import { apiPost, resetDemo, signIn, openAssistant } from './helpers.ts'

/** Case c-003 (Michał Lewandowski, sheet B) in the observation period, supervisor j.kaminska (backend demo seed). */
const CASE = 'c-003'
const SUPERVISOR = 'j.kaminska'

test.beforeEach(async ({ request }) => {
  await resetDemo(request)
})

const coverage = (page: Page) => page.getByRole('region', { name: 'Pokrycie kryteriów dowodami' })
const journal = (page: Page) => page.getByRole('region', { name: /^Dziennik obserwacji/ })
const cards = (page: Page) => journal(page).getByRole('list', { name: 'Obserwacje' }).getByRole('listitem')

/** Journal as a timeline (like before #38): date on the left, then criterion + tag, then Sytuacja / Działanie / Rezultat one under another. */
async function expectTimeline(page: Page) {
  const item = cards(page).first()
  await expect(item).toHaveClass(/timeline__item/)
  const date = (await item.locator('.timeline__date').boundingBox())!
  const meta = (await item.locator('.timeline__meta').boundingBox())!
  expect(date.x + date.width).toBeLessThanOrEqual(meta.x)
  await expect(item.locator('.timeline__meta .tag')).toHaveText(/mocna strona|do rozwoju/)
  await expect(item.locator('dl dt')).toHaveText(['Sytuacja', 'Działanie', 'Rezultat'])
  const ys = await item.locator('dl dd').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)))
  expect(ys).toHaveLength(3)
  expect(ys[1]).toBeGreaterThan(ys[0])
  expect(ys[2]).toBeGreaterThan(ys[1])
}

async function noHorizontalScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
}

test('Okres obserwacji: jedna kolumna, tabela pokrycia filtruje dziennik, dziennik jako oś czasu', async ({ page }) => {
  await signIn(page, SUPERVISOR)
  await page.goto(`/teczka/${CASE}/obserwacje`)

  // Sections in one column, in order: coverage → journal → working notes → next step.
  const notes = page.locator('details').filter({ has: page.locator('summary', { hasText: 'Notatki robocze' }) })
  const next = page.getByRole('region', { name: 'Co dalej?' })
  const blocks = [coverage(page), journal(page), notes, next]
  const boxes = []
  for (const b of blocks) boxes.push((await b.boundingBox())!)
  for (let i = 1; i < boxes.length; i++) {
    expect(boxes[i].y).toBeGreaterThan(boxes[i - 1].y)
    expect(Math.abs(boxes[i].x - boxes[0].x)).toBeLessThan(2)
  }
  // Full width: no side panel next to the journal.
  expect(Math.abs(boxes[0].width - boxes[1].width)).toBeLessThan(2)
  await expect(notes).not.toHaveAttribute('open')

  // Coverage table: Kryterium | Obserwacje (bar + count) | Stan; no tiles, no filter dropdown in the journal head.
  const table = coverage(page).getByRole('table')
  await expect(table.getByRole('columnheader')).toHaveText(['Kryterium', 'Obserwacje', 'Stan'])
  const rows = table.getByRole('row').filter({ has: page.getByRole('rowheader') })
  expect(await rows.count()).toBeGreaterThan(0)
  await expect(journal(page).getByRole('combobox')).toHaveCount(0)
  // In the seed every criterion of c-003 has fewer than 2 observations.
  for (const r of await rows.all()) {
    await expect(r.locator('.tag--warn').filter({ visible: true })).toHaveText('Mało dowodów')
    await expect(r.getByRole('cell').first()).toContainText(/\d+ obserwac/)
  }
  await expect(coverage(page).locator('.notice--warn')).toBeVisible()

  // Click on a criterion name filters the journal (aria-pressed, highlighted row); a second click removes the filter.
  const total = await cards(page).count()
  const row = rows.first()
  const btn = row.getByRole('button')
  const name = (await btn.textContent())!.trim()
  const status = journal(page).getByText(/^Pokazano:/)
  await expect(btn).toHaveAttribute('aria-pressed', 'false')
  await expect(status).toHaveCount(0)
  const plainBg = await row.getByRole('cell').first().evaluate((e) => getComputedStyle(e).backgroundColor)
  await btn.click()
  await expect(btn).toHaveAttribute('aria-pressed', 'true')
  expect(await row.getByRole('cell').first().evaluate((e) => getComputedStyle(e).backgroundColor)).not.toBe(plainBg)
  await expect(status).toContainText(`Pokazano: ${name}`)
  const filtered = await cards(page).count()
  expect(filtered).toBeGreaterThan(0)
  expect(filtered).toBeLessThan(total)
  for (const card of await cards(page).all()) await expect(card).toContainText(name)
  await btn.click()
  await expect(btn).toHaveAttribute('aria-pressed', 'false')
  await expect(cards(page)).toHaveCount(total)
  await expect(status).toHaveCount(0)

  // „Pokaż wszystkie” removes the filter too (keyboard).
  await btn.focus()
  await page.keyboard.press('Enter')
  await expect(btn).toHaveAttribute('aria-pressed', 'true')
  await journal(page).getByRole('button', { name: 'Pokaż wszystkie' }).click()
  await expect(btn).toHaveAttribute('aria-pressed', 'false')
  await expect(cards(page)).toHaveCount(total)

  // A criterion without observations: empty state of the filtered journal.
  const emptyRow = rows.filter({ hasText: /(^|\D)0 obserwacji/ }).first()
  await emptyRow.getByRole('button').click()
  await expect(cards(page)).toHaveCount(0)
  await expect(journal(page).getByText('Brak obserwacji dla tego kryterium.')).toBeVisible()
  await emptyRow.getByRole('button').click()
  await expect(cards(page)).toHaveCount(total)

  // Journal: the timeline from before #38.
  await expectTimeline(page)

  // Adding an observation works as before.
  await journal(page).getByRole('button', { name: 'Dodaj obserwację' }).click()
  await page.getByLabel('Sytuacja').fill('Spotkanie z delegacją partnerską.')
  await page.getByLabel('Działanie').fill('Przygotował agendę i materiały.')
  await page.getByLabel('Rezultat').fill('Uzgodniono harmonogram współpracy.')
  await page.getByRole('button', { name: 'Zapisz obserwację' }).click()
  await expect(cards(page)).toHaveCount(total + 1)
  await expect(journal(page).getByText('Uzgodniono harmonogram współpracy.')).toBeVisible()

  // Working notes: collapsed disclosure, saved on blur.
  await notes.locator('summary').click()
  await notes.getByLabel('Notatki robocze').fill('Do omówienia: delegacje.')
  await notes.getByLabel('Notatki robocze').blur()
  await expect(notes.getByText('Zapisano.')).toBeVisible()

  await expect(next.getByRole('button', { name: 'Zakończ obserwacje i przejdź do oceny' })).toBeEnabled()
})

test('Dziennik obserwacji otwarty na etapie oceny, zamknięty po podpisaniu oceny', async ({ page, request }) => {
  await apiPost(request, SUPERVISOR, `/cases/${CASE}/actions`, { action: 'START_ASSESSMENT' })
  await signIn(page, SUPERVISOR)

  // From the assessment step a link leads back to the journal.
  await page.goto(`/teczka/${CASE}`)
  await page.getByRole('link', { name: 'Dodaj obserwację' }).click()
  await expect(page).toHaveURL(/\/obserwacje/)

  // The observation step is done, yet the evaluator still records evidence; no empty control in the journal head.
  await expect(journal(page).getByRole('combobox')).toHaveCount(0)
  const total = await cards(page).count()
  await journal(page).getByRole('button', { name: 'Dodaj obserwację' }).click()
  await page.getByLabel('Sytuacja').fill('Przygotowanie wizyty studyjnej.')
  await page.getByLabel('Działanie').fill('Ustalił program z partnerem.')
  await page.getByLabel('Rezultat').fill('Wizyta odbyła się zgodnie z planem.')
  await page.getByRole('button', { name: 'Zapisz obserwację' }).click()
  await expect(cards(page)).toHaveCount(total + 1)

  // A signed assessment (c-006): the journal is closed, with the reason instead of the button.
  await page.goto('/teczka/c-006/obserwacje')
  await expect(journal(page).getByText(/dziennik obserwacji jest zamknięty/)).toBeVisible()
  await expect(journal(page).getByRole('button', { name: 'Dodaj obserwację' })).toHaveCount(0)
})

for (const assistant of [false, true]) {
  test(`Okres obserwacji przy 375 px${assistant ? ' z panelem Asystenta' : ''}: bez poziomego przewijania, dziennik jako oś czasu`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await signIn(page, SUPERVISOR)
    await page.goto(`/teczka/${CASE}/obserwacje`)
    if (assistant) await openAssistant(page)
    await expect(coverage(page)).toBeVisible()
    await noHorizontalScroll(page)

    // Narrow stage: the „Stan” column is hidden, the tag sits under the criterion name.
    const table = coverage(page).getByRole('table')
    await expect(table.getByRole('columnheader', { name: 'Stan' })).toBeHidden()
    const row = table.getByRole('row').filter({ has: page.getByRole('rowheader') }).first()
    await expect(row.getByRole('rowheader').getByText('Mało dowodów')).toBeVisible()

    await expectTimeline(page)
  })
}

test('Okres obserwacji na desktopie z panelem Asystenta: bez poziomego przewijania', async ({ page }) => {
  await signIn(page, SUPERVISOR)
  await page.goto(`/teczka/${CASE}/obserwacje`)
  await openAssistant(page)
  await expect(journal(page)).toBeVisible()
  await noHorizontalScroll(page)
})
