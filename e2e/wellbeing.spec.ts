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
  for (const name of ['Pracownik', 'Trend', 'Sygnały', 'Akcje']) {
    await expect(table.getByRole('columnheader', { name })).toHaveCount(1)
  }
  await expect(table.getByRole('columnheader')).toHaveCount(4)
  await expect(list.locator('.section__head')).toContainText(/\d+ os(oba|oby|ób)/)
  await expect(page.locator('main tr.is-link')).toHaveCount(0)
  const rows = table.getByRole('row')
  expect(await rows.count()).toBeGreaterThan(1)
  await expect(table.getByRole('link', { name: /^Zobacz kartę: / }).first()).toBeVisible()

  // Chart and averages sit in the shared cards; sections have the "Oceny zespołu" head.
  for (const region of ['Sygnały w zespole', 'Puls zespołu']) {
    const r = page.getByRole('region', { name: region })
    await expect(r.locator('.section__head')).toHaveCount(1)
  }
  const chartCard = page.getByRole('region', { name: 'Puls zespołu' }).locator('section').first()
  await expect(chartCard.getByRole('group', { name: /Średni indeks pulsu zespołu/ })).toBeVisible()

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

test('Karta pracownika w Dobrostanie: sygnały i wykres pulsu dopasowują się do szerokości, odstępy jak w „Oceny zespołu”', async ({ page }) => {
  await signIn(page, SUPERVISOR)
  await page.goto('/dobrostan')
  // Piotr Wójcik has two signals in the demo seed, so the grid has something to lay out side by side.
  await page.getByRole('link', { name: 'Zobacz kartę: Piotr Wójcik' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Sygnały wirtualnego asystenta HR' })).toBeVisible()

  const signals = page.getByRole('region', { name: 'Sygnały wirtualnego asystenta HR' }).locator('h3').locator('xpath=ancestor::section[1]')
  await expect(signals).toHaveCount(2)
  const chart = page.getByRole('region', { name: 'Puls: ogólny wskaźnik dobrostanu' }).getByRole('img', { name: /^Indeks pulsu: / })

  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `no horizontal scroll at ${width}px`).toBe(true)

    // Signal cards: inside the content, side by side only from 1024 px, never overlapping.
    const boxes = await signals.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON() as DOMRect))
    const main = (await page.locator('main .page').boundingBox())!
    for (const b of boxes) {
      expect(b.left).toBeGreaterThanOrEqual(main.x - 1)
      expect(b.right).toBeLessThanOrEqual(main.x + main.width + 1)
    }
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const [a, b] = [boxes[i], boxes[j]]
        const overlap = a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1
        expect(overlap, `signal cards ${i} and ${j} overlap at ${width}px`).toBe(false)
      }
    }
    expect(new Set(boxes.map((b) => Math.round(b.left))).size, `signal columns at ${width}px`).toBe(width >= 1024 ? 2 : 1)
    // Nothing in a signal card header sticks out of the card.
    for (const b of await signals.evaluateAll((els) =>
      els.map((card) => {
        const c = card.getBoundingClientRect()
        return [...card.querySelectorAll('h3, h3 ~ *')].every((el) => el.getBoundingClientRect().right <= c.right + 1)
      }),
    )) {
      expect(b).toBe(true)
    }

    // Pulse chart: as wide as its card's content, taller on desktop, axis 1 / 3 / 5 and dates.
    // Polled: the chart re-measures itself (ResizeObserver, media query) right after the viewport change.
    const measure = () =>
      chart.evaluate((svg) => {
        const content = svg.parentElement!.parentElement!
        const cs = getComputedStyle(content)
        const box = svg.getBoundingClientRect()
        const inner = content.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
        return { fills: Math.abs(box.width - inner) <= 2, height: Math.round(box.height) }
      })
    await expect.poll(measure, { message: `pulse chart at ${width}px` }).toEqual({ fills: true, height: width >= 768 ? 160 : 120 })
    await expect(chart.locator('text')).toContainText(['1', '3', '5'])
  }

  // Same left edge of the content as the person page in „Oceny zespołu” at 1440 px.
  await page.setViewportSize({ width: 1440, height: 900 })
  const left = () => page.locator('main .page-head h1').evaluate((h) => h.getBoundingClientRect().left)
  const wellbeingLeft = await left()
  await page.goto('/zespol')
  await page.locator('main a[href^="/zespol/"]').first().click()
  await expect(page).toHaveURL(/\/zespol\/[^/]+$/)
  await expect(page.locator('main .page-head h1')).toBeVisible()
  await expect.poll(async () => Math.abs((await left()) - wellbeingLeft)).toBeLessThanOrEqual(1)
})

test('Dobrostan: jedna kolumna „Trend” z wykresem i jedną linią: wskaźnik · trend · data, bez etykiety', async ({ page }) => {
  await signIn(page, SUPERVISOR)
  await page.goto('/dobrostan')
  const table = page.getByRole('table', { name: 'Puls pracowników' })
  const row = table.getByRole('row').filter({ hasText: 'Michał Lewandowski' })
  const trend = row.getByRole('cell').nth(1)
  // Only the sparkline and the small warning icon of a sudden drop; no coloured trend badge.
  await expect(trend.locator('svg')).toHaveCount(2)
  await expect(trend.locator('.status-badge, [class*="badge"]')).toHaveCount(0)
  const meta = trend.locator('[class*="trendMeta"]')
  await expect(meta).toHaveText(/^\d(,\d)? · nagły spadek · ostatni \d{2}\.\d{2}\.\d{4}$/)
  await expect(meta.locator('svg')).toHaveCount(1)
  // One text for a screen reader: name, trend, last index and date; the sparkline and the icon are hidden.
  await expect(trend.locator('.visually-hidden')).toHaveText(/^Puls: Michał Lewandowski, nagły spadek, ostatni wskaźnik \d(,\d)?, \d{2}\.\d{2}\.\d{4}$/)
  await expect(trend.getByRole('img')).toHaveCount(0)

  // Other trends: the name in the same line, no warning icon.
  const stable = table.getByRole('row').filter({ hasText: 'Anna Nowak' }).getByRole('cell').nth(1)
  await expect(stable.locator('[class*="trendMeta"]')).toHaveText(/^\d(,\d)? · stabilnie · ostatni \d{2}\.\d{2}\.\d{4}$/)
  await expect(stable.locator('svg')).toHaveCount(1)

  // No pulse: just the note, no chart and no label.
  const none = table.getByRole('row').filter({ hasText: 'Katarzyna Michalska' }).getByRole('cell').nth(1)
  await expect(none).toHaveText('Trend:nie wypełnia pulsu')
  await expect(none.locator('svg')).toHaveCount(0)
})

test('Dobrostan: w kolumnie „Sygnały” jeden najważniejszy sygnał zwykłym tekstem i „+N”', async ({ page }) => {
  await signIn(page, SUPERVISOR)
  await page.goto('/dobrostan')
  const table = page.getByRole('table', { name: 'Puls pracowników' })
  const cell = (name: string) => table.getByRole('row').filter({ hasText: name }).getByRole('cell').nth(2)

  // Two alerts: the first one in the order of kinds, the other as "+1" with a tooltip; a screen reader hears both.
  const piotr = cell('Piotr Wójcik')
  const visible = piotr.locator('[class*="signalTop"]')
  await expect(visible).toHaveText('Sygnał z pulsu+1')
  await expect(piotr.locator('[class*="badge"]')).toHaveCount(0)
  await expect(piotr.locator('svg')).toHaveCount(1)
  await expect(piotr.getByText('+1', { exact: true })).toHaveAttribute('title', 'Także: Spadek motywacji')
  await expect(piotr.locator('.visually-hidden')).toHaveText('Sygnały: Sygnał z pulsu (wymaga uwagi), Spadek motywacji (wymaga uwagi)')

  // An alert goes before a signal to watch.
  await expect(cell('Tomasz Kowalczyk').getByText('+1', { exact: true })).toHaveAttribute('title', 'Także: Przeciążenie')
  await expect(cell('Tomasz Kowalczyk').locator('.visually-hidden')).toHaveText('Sygnały: Sygnał z pulsu (wymaga uwagi), Przeciążenie (do obserwacji)')

  // One signal: no "+N"; none: "brak".
  await expect(cell('Anna Nowak').locator('[class*="signalTop"]')).toHaveText('Do docenienia')
  await expect(cell('Anna Nowak').locator('.visually-hidden')).toHaveText('Sygnały: Do docenienia (pozytywny)')
  await expect(cell('Paweł Szymański')).toHaveText('Sygnały:brak')
})

test('Dobrostan: wykres „Puls zespołu” liniowy na całą szerokość, wyróżniony ostatni punkt, tooltip', async ({ page }) => {
  await signIn(page, SUPERVISOR)
  await page.goto('/dobrostan')
  const card = page.getByRole('region', { name: 'Puls zespołu' }).locator('section').first()
  const chart = card.getByRole('group', { name: /Średni indeks pulsu zespołu/ })
  await expect(chart).toBeVisible()
  for (const width of [768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await expect
      .poll(async () => {
        const [c, b] = await Promise.all([chart.boundingBox(), card.boundingBox()])
        return c && b ? b.width - c.width : 999
      })
      .toBeLessThan(80)
  }
  expect(Math.round((await chart.boundingBox())!.height)).toBe(220)

  // A line (not bars), Y axis 1–5, the end of every period under the X axis.
  await expect(chart.locator('path')).toHaveCount(1)
  await expect(chart.locator('rect[class*="bar"]')).toHaveCount(0)
  await expect(chart.locator('> g').first().locator('text')).toHaveText(['1', '2', '3', '4', '5'])
  const points = chart.getByRole('img')
  const n = await points.count()
  expect(n).toBeGreaterThan(1)
  await expect(points.last()).toHaveAccessibleName(/^\d{2}\.\d{2}–\d{2}\.\d{2}: indeks \d(,\d)?, odpowiedzi: \d+$/)
  await expect(points.last()).toContainText(/^\d(,\d)?\d{2}\.\d{2}$/)

  // The latest point is bigger and in the accent colour; the line too.
  const tokens = await page.evaluate(() => {
    const probe = document.createElement('div')
    document.body.append(probe)
    probe.style.color = 'var(--accent)'
    const accent = getComputedStyle(probe).color
    probe.remove()
    return { accent }
  })
  const radii = await points.locator('circle').evaluateAll((els) => els.map((el) => Number(el.getAttribute('r'))))
  expect(radii.at(-1)).toBeGreaterThan(Math.max(...radii.slice(0, -1)))
  expect(await points.last().locator('circle').evaluate((el) => getComputedStyle(el).fill)).toBe(tokens.accent)
  expect(await chart.locator('path').evaluate((el) => getComputedStyle(el).stroke)).toBe(tokens.accent)

  // Keyboard focus shows the tooltip; hover on another point moves it.
  await points.last().focus()
  const tooltip = card.locator('[class*="tooltip"]')
  await expect(tooltip).toHaveText(/^\d{2}\.\d{2}–\d{2}\.\d{2}: indeks \d(,\d)?, odpowiedzi: \d+$/)
  const focused = await tooltip.textContent()
  await points.first().hover()
  await expect(tooltip).toHaveCount(1)
  await expect(tooltip).not.toHaveText(focused!)

  // Screen-reader list of values stays.
  await expect(card.locator('ul.visually-hidden li')).toHaveCount(n)

  // Phone: shorter, no horizontal scroll.
  await page.setViewportSize({ width: 375, height: 800 })
  await expect.poll(async () => Math.round((await chart.boundingBox())!.height)).toBe(160)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('Dobrostan: okres z za małą liczbą odpowiedzi to przerwa w linii „ukryte”', async ({ page }) => {
  // r.sikora's team is small, so every period is hidden.
  await signIn(page, 'r.sikora')
  await page.goto('/dobrostan')
  const chart = page.getByRole('group', { name: /Średni indeks pulsu zespołu/ })
  const points = chart.getByRole('img')
  await expect(points.first()).toHaveAccessibleName(/: za mało odpowiedzi \(min\. \d+ os(oba|oby|ób)\)$/)
  await expect(chart).toContainText('ukryte')
  // No value: no dot and no line drawn across the gap.
  await expect(chart.locator('circle')).toHaveCount(0)
  await expect(chart.locator('path')).toHaveCount(0)
  await points.first().focus()
  await expect(page.locator('[class*="tooltip"]')).toHaveText(/: za mało odpowiedzi \(min\. \d+ os(oba|oby|ób)\)$/)
})

test('Dobrostan: „Sygnały w zespole” to tabela z legendą, od alertów, z linkiem do karty', async ({ page }) => {
  await signIn(page, SUPERVISOR)
  await page.goto('/dobrostan')
  const region = page.getByRole('region', { name: 'Sygnały w zespole' })

  // Legend: every kind with its count and meaning; no tiles.
  const legend = region.getByRole('list', { name: 'Rodzaje sygnałów' }).getByRole('listitem')
  await expect(legend).toHaveCount(4)
  await expect(legend.filter({ hasText: /^Przeciążenie: \d+/ })).toContainText('Za dużo pracy')
  await expect(page.getByRole('list', { name: 'Liczba sygnałów według rodzaju' })).toHaveCount(0)

  const table = region.getByRole('table', { name: 'Sygnały w zespole' })
  for (const name of ['Pracownik', 'Sygnał', 'Poziom', 'Dlaczego']) {
    await expect(table.getByRole('columnheader', { name, exact: true })).toHaveCount(1)
  }
  const rows = table.getByRole('rowgroup').last().getByRole('row')
  const n = await rows.count()
  expect(n).toBeGreaterThan(1)

  // Sorted by level: Alert, then Do obserwacji, then Do docenienia.
  const order = { Alert: 0, 'Do obserwacji': 1, 'Do docenienia': 2 } as Record<string, number>
  const levels = (await rows.evaluateAll((els) => els.map((el) => el.children[2].textContent ?? ''))).map((t) =>
    t.replace(/^Poziom:/, '').trim(),
  )
  expect(levels.every((l) => l in order)).toBe(true)
  expect(levels.map((l) => order[l])).toEqual([...levels.map((l) => order[l])].sort((a, b) => a - b))
  await expect(rows.first().getByRole('cell').nth(3)).toContainText(/Puls|Zadania|Zakres obowiązków|Nieobecności|Obserwacje/)

  // The name leads to the person's card.
  const link = rows.first().getByRole('link')
  const name = await link.textContent()
  await link.click()
  await expect(page).toHaveURL(/\/dobrostan\/p-/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(name!)

  // Phone: no horizontal scroll.
  await page.goBack()
  await page.setViewportSize({ width: 375, height: 800 })
  await expect(table).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('Dobrostan: powody sygnałów z pulsu nie zdradzają odpowiedzi na pojedyncze pytania', async ({ page }) => {
  await signIn(page, SUPERVISOR)
  await page.goto('/dobrostan/p-lewandowski')

  const signals = page.getByRole('region', { name: 'Sygnały wirtualnego asystenta HR' })
  await expect(signals.getByText(/spadek wskaźnika dobrostanu|wskaźnik dobrostanu/).first()).toBeVisible()
  // Titles and the „Dlaczego” reasons (the suggested actions are a generic catalogue).
  const said = [
    ...(await signals.getByRole('heading', { level: 3 }).allInnerTexts()),
    ...(await signals.getByRole('listitem').filter({ hasText: /^Puls/ }).allInnerTexts()),
  ].join('\n')
  expect(said).toContain('sygnał z pulsu')
  expect(said).not.toMatch(/obciążeni|energi|wsparci|satysfakc|priorytet/i)
})

test('Dobrostan: przycisk na karcie osoby mówi, dokąd prowadzi („Prowadź ocenę” + etap i termin)', async ({ page }) => {
  await signIn(page, SUPERVISOR)
  await page.goto('/dobrostan/p-nowak')

  const head = page.locator('.page-head')
  await expect(head.getByRole('link', { name: 'Teczka oceny' })).toHaveCount(0)
  const run = head.getByRole('link', { name: 'Prowadź ocenę' })
  await expect(run).toBeVisible()
  // Secondary style: the wellbeing card is not the assessment itself.
  await expect(run).not.toHaveClass(/btn--primary/)
  await expect(head.getByText(/^Ocena okresowa · etap: Rozmowa oceniająca i ocena · termin \d{2}\.\d{2}\.\d{4}$/)).toBeVisible()

  // The „i” works from the keyboard.
  const info = head.getByRole('button', { name: 'Czy dane dobrostanu trafiają do oceny?' })
  await info.focus()
  await page.keyboard.press('Enter')
  await expect(head.getByText('Dane dobrostanu nie trafiają do oceny okresowej.')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(head.getByText('Dane dobrostanu nie trafiają do oceny okresowej.')).toHaveCount(0)

  await run.click()
  await expect(page).toHaveURL(/\/teczka\//)

  // Phone: no horizontal scroll.
  await page.goBack()
  await page.setViewportSize({ width: 375, height: 800 })
  await expect(head.getByRole('link', { name: 'Prowadź ocenę' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
