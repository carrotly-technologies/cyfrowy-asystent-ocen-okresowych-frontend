import { expect, test, type Page } from '@playwright/test'
import { resetDemo, signIn } from './helpers.ts'

/** Case c-003 (Michał Lewandowski, sheet B) in the observation period, supervisor j.kaminska (backend demo seed). */
const CASE = 'c-003'
const SUPERVISOR = 'j.kaminska'

test.beforeEach(async ({ request }) => {
  await resetDemo(request)
})

const coverage = (page: Page) => page.getByRole('region', { name: 'Pokrycie kryteriów dowodami' })
const journal = (page: Page) => page.getByRole('region', { name: /^Dziennik obserwacji/ })
const cards = (page: Page) => journal(page).getByRole('list', { name: 'Obserwacje' }).getByRole('listitem')

async function noHorizontalScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
}

test('Okres obserwacji: jedna kolumna, kafelki pokrycia filtrują dziennik, S-D-R w 3 kolumnach', async ({ page }) => {
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

  // Tiles: name, count and bar; < 2 observations → warning colour and an icon.
  const tiles = coverage(page).getByRole('button')
  expect(await tiles.count()).toBeGreaterThan(0)
  // In the seed every criterion of c-003 has fewer than 2 observations.
  for (const t of await tiles.all()) {
    await expect(t).toContainText('mało dowodów')
    await expect(t.locator('svg')).toHaveCount(1)
    await expect(t).toHaveCSS('background-color', await page.evaluate(() => {
      const probe = document.createElement('div')
      probe.style.background = 'var(--warn-bg)'
      document.body.append(probe)
      const c = getComputedStyle(probe).backgroundColor
      probe.remove()
      return c
    }))
  }
  await expect(coverage(page).locator('.notice--warn')).toBeVisible()

  // Click filters the journal (aria-pressed), a second click removes the filter.
  const total = await cards(page).count()
  const tile = tiles.first()
  const name = (await tile.locator('span').first().textContent())!.trim()
  await expect(tile).toHaveAttribute('aria-pressed', 'false')
  await tile.click()
  await expect(tile).toHaveAttribute('aria-pressed', 'true')
  await expect(journal(page).getByLabel('Filtruj po kryterium')).toHaveValue(/.+/)
  const filtered = await cards(page).count()
  expect(filtered).toBeGreaterThan(0)
  expect(filtered).toBeLessThan(total)
  for (const card of await cards(page).all()) await expect(card).toContainText(name)
  await tile.click()
  await expect(tile).toHaveAttribute('aria-pressed', 'false')
  await expect(cards(page)).toHaveCount(total)

  // Desktop: Sytuacja, Działanie and Rezultat side by side.
  const parts = cards(page).first().locator('dl > div')
  await expect(parts).toHaveCount(3)
  const ys = await parts.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)))
  expect(new Set(ys).size).toBe(1)

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

for (const assistant of [false, true]) {
  test(`Okres obserwacji przy 375 px${assistant ? ' z panelem Asystenta' : ''}: bez poziomego przewijania, S-D-R jedna pod drugą`, async ({ page }) => {
    await page.addInitScript((on) => localStorage.setItem('ocena.assistant', on ? '1' : '0'), assistant)
    await page.setViewportSize({ width: 375, height: 800 })
    await signIn(page, SUPERVISOR)
    await page.goto(`/teczka/${CASE}/obserwacje`)
    await expect(coverage(page)).toBeVisible()
    await noHorizontalScroll(page)

    const tiles = coverage(page).getByRole('button')
    const xs = await tiles.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().left)))
    expect(new Set(xs).size).toBe(1)

    const parts = cards(page).first().locator('dl > div')
    const ys = await parts.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)))
    expect(new Set(ys).size).toBe(3)
  })
}

test('Okres obserwacji na desktopie z panelem Asystenta: bez poziomego przewijania', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ocena.assistant', '1'))
  await signIn(page, SUPERVISOR)
  await page.goto(`/teczka/${CASE}/obserwacje`)
  await expect(journal(page)).toBeVisible()
  await noHorizontalScroll(page)
})
