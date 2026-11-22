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

test('Dobrostan: jedna kolumna „Trend” z wykresem, etykietą i ostatnim wskaźnikiem', async ({ page }) => {
  await signIn(page, SUPERVISOR)
  await page.goto('/dobrostan')
  const table = page.getByRole('table', { name: 'Puls pracowników' })
  const row = table.getByRole('row').filter({ hasText: 'Michał Lewandowski' })
  const trend = row.getByRole('cell').nth(1)
  await expect(trend.locator('svg')).toHaveCount(1)
  await expect(trend).toContainText('nagły spadek')
  await expect(trend).toContainText(/\d(,\d)? · ostatni \d{2}\.\d{2}\.\d{4}/)
  // One text for a screen reader: name, trend, last index and date; the sparkline and the badge are hidden.
  await expect(trend.locator('.visually-hidden')).toHaveText(/^Puls: Michał Lewandowski, nagły spadek, ostatni wskaźnik \d(,\d)?, \d{2}\.\d{2}\.\d{4}$/)
  await expect(trend.getByRole('img')).toHaveCount(0)

  // No pulse: just the note, no chart and no label.
  const none = table.getByRole('row').filter({ hasText: 'Katarzyna Michalska' }).getByRole('cell').nth(1)
  await expect(none).toHaveText('Trend:nie wypełnia pulsu')
  await expect(none.locator('svg')).toHaveCount(0)
})

test('Dobrostan: wykres „Puls zespołu” na całą szerokość, wartości, wyróżniony ostatni okres, tooltip', async ({ page }) => {
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

  const bars = chart.getByRole('img')
  const n = await bars.count()
  expect(n).toBeGreaterThan(1)
  // A value above every visible bar, the last period highlighted (accent), earlier ones in accent-border.
  await expect(bars.last()).toHaveAccessibleName(/^\d{2}\.\d{2}–\d{2}\.\d{2}: indeks \d(,\d)?, odpowiedzi: \d+$/)
  const fills = await bars.evaluateAll((els) => els.map((el) => getComputedStyle(el.querySelector('path')!).fill))
  const tokens = await page.evaluate(() => {
    const probe = document.createElement('div')
    document.body.append(probe)
    const read = (v: string) => ((probe.style.color = `var(${v})`), getComputedStyle(probe).color)
    const out = { accent: read('--accent'), border: read('--accent-border') }
    probe.remove()
    return out
  })
  expect(fills.at(-1)).toBe(tokens.accent)
  expect(fills.slice(0, -1).every((f) => f === tokens.border)).toBe(true)

  // Keyboard focus shows the tooltip.
  await bars.last().focus()
  const tooltip = card.locator('[class*="tooltip"]')
  await expect(tooltip).toHaveText(/^\d{2}\.\d{2}–\d{2}\.\d{2}: indeks \d(,\d)?, odpowiedzi: \d+$/)
  const focused = await tooltip.textContent()
  // Hover on another bar moves it.
  await bars.first().hover()
  await expect(tooltip).toHaveCount(1)
  await expect(tooltip).not.toHaveText(focused!)

  // Screen-reader list of values stays.
  await expect(card.locator('ul.visually-hidden li')).toHaveCount(n)

  // Phone: shorter, no horizontal scroll.
  await page.setViewportSize({ width: 375, height: 800 })
  await expect.poll(async () => Math.round((await chart.boundingBox())!.height)).toBe(160)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('Dobrostan: okres z za małą liczbą odpowiedzi to niski kreskowany słupek „ukryte”', async ({ page }) => {
  // r.sikora's team is small, so every period is hidden.
  await signIn(page, 'r.sikora')
  await page.goto('/dobrostan')
  const chart = page.getByRole('group', { name: /Średni indeks pulsu zespołu/ })
  const bars = chart.getByRole('img')
  await expect(bars.first()).toHaveAccessibleName(/: za mało odpowiedzi \(min\. \d+ os(oba|oby|ób)\)$/)
  await expect(bars.first()).toContainText('ukryte')
  expect(await bars.first().locator('path').getAttribute('fill')).toMatch(/^url\(#/)
})

test('Dobrostan: kafelki sygnałów mówią, co oznacza sygnał, kogo dotyczy i dlaczego', async ({ page }) => {
  await signIn(page, SUPERVISOR)
  await page.goto('/dobrostan')
  const tiles = page.getByRole('list', { name: 'Liczba sygnałów według rodzaju' })
  const overload = tiles.getByRole('listitem').filter({ has: page.getByRole('heading', { name: /^Przeciążenie\s*: \d+ os(oba|oby|ób)$/ }) })
  await expect(overload).toHaveCount(1)
  await expect(overload).toContainText('Za dużo pracy')
  const people = overload.getByRole('list', { name: 'Przeciążenie: kogo dotyczy' }).getByRole('listitem')
  expect(await people.count()).toBeGreaterThan(0)
  // Alert first, a level as text (not only colour), a reason with its source, a link to the card.
  await expect(people.first()).toContainText('Alert')
  await expect(people.first()).toContainText(/Puls|Zadania|Zakres obowiązków|Nieobecności|Obserwacje/)
  const link = people.first().getByRole('link')
  const name = await link.textContent()
  await link.click()
  await expect(page).toHaveURL(/\/dobrostan\/p-/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(name!)

  // Phone: one tile per row and no horizontal scroll.
  await page.goBack()
  await page.setViewportSize({ width: 375, height: 800 })
  const boxes = await tiles.locator('> li').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().left))
  expect(new Set(boxes.map(Math.round)).size).toBe(1)
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
