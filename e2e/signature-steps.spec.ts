import { expect, test, type Page } from '@playwright/test'
import { confirmDialog, resetDemo, signIn } from './helpers.ts'

/**
 * „Podpis i przekazanie” and „Zapoznanie z oceną”: the four steps (rozmowa → podpis → przekazanie → zapoznanie) are
 * a vertical axis in the style of the stage bar (circles on a line, ✓ for done steps, the date under each name),
 * without a box. Only the current step is expanded, with its action inside it; the other steps are collapsed.
 * Seed: c-007 (j.kaminska) has the talk held and waits for the signature; c-006 (j.kaminska) is acknowledged.
 */
const SUPERVISOR = 'j.kaminska'

test.beforeEach(async ({ request }) => {
  await resetDemo(request)
})

const axis = (page: Page) => page.getByRole('list', { name: 'Kroki podpisu i zapoznania' })
// direct children only: the expanded formal check has lists of its own
const steps = (page: Page) => axis(page).locator(':scope > li')
const step = (page: Page, n: number) => steps(page).nth(n - 1)
const current = (page: Page) => axis(page).locator('[aria-current="step"]')
const flow = (page: Page) => page.getByRole('region', { name: /^(Krok \d z 4|Wszystkie 4 kroki)/ })

/** Only step n holds buttons or links (its expanded action); every other step is collapsed and not clickable. */
async function onlyExpanded(page: Page, n: number) {
  for (const k of [1, 2, 3, 4]) {
    if (k === n) continue
    await expect(step(page, k).getByRole('button')).toHaveCount(0)
    await expect(step(page, k).getByRole('link')).toHaveCount(0)
  }
}

test('podpis to krok 2 z 4, a każdy następny krok rozwija się na osi ze swoją akcją', async ({ page }) => {
  await signIn(page, SUPERVISOR)
  await page.goto('/teczka/c-007/podpis')

  // Short names with the date (or „—”) under each, no box around the section and no „Teraz” tag.
  await expect(steps(page)).toHaveCount(4)
  for (const [n, name] of ['Rozmowa', 'Podpis', 'Przekazanie', 'Zapoznanie'].entries()) {
    await expect(step(page, n + 1)).toContainText(name)
  }
  await expect(step(page, 1)).toContainText(/\d{2}\.\d{2}\.\d{4}/)
  await expect(step(page, 3)).toContainText('—')
  await expect(flow(page)).toHaveCSS('border-top-width', '0px')
  await expect(flow(page)).toHaveCSS('padding-top', '0px')
  await expect(flow(page)).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(flow(page).getByText('Teraz', { exact: true })).toHaveCount(0)

  // Vertical: the circles are one under another, the date is under the name.
  const b1 = (await step(page, 1).boundingBox())!
  const b2 = (await step(page, 2).boundingBox())!
  expect(b2.y).toBeGreaterThanOrEqual(b1.y + b1.height - 1)
  expect(Math.abs(b2.x - b1.x)).toBeLessThanOrEqual(1)

  // Before signing: step 1 done, step 2 current and expanded with the formal check, steps 3–4 collapsed.
  await expect(flow(page).getByRole('heading', { name: 'Krok 2 z 4: Podpisz ocenę' })).toBeVisible()
  await expect(step(page, 1)).toContainText('krok 1 z 4, zakończono')
  await expect(current(page)).toHaveCount(1)
  await expect(current(page)).toContainText('krok 2 z 4, w toku')
  await expect(step(page, 3)).toContainText('krok 3 z 4, nierozpoczęty')
  await expect(step(page, 2).getByRole('region', { name: 'Kontrola formalna' })).toBeVisible()
  const sign = step(page, 2).getByRole('button', { name: 'Podpisz ocenę' })
  await expect(sign).toBeVisible()
  await expect(step(page, 2).getByRole('link', { name: 'Wróć do oceny, aby poprawić część II lub III' })).toBeVisible()
  await onlyExpanded(page, 2)

  // The expanded action is indented next to the line, right of the circles.
  const marker = (await current(page).locator('[aria-hidden="true"]').first().boundingBox())!
  const signBox = (await sign.boundingBox())!
  expect(signBox.x).toBeGreaterThan(marker.x + marker.width)

  // After signing: step 2 done, step 3 expanded with the hand-over, and the focus is on its button.
  await sign.click()
  await confirmDialog(page, 'Podpisać ocenę?', 'Podpisz ocenę')
  await expect(flow(page).getByRole('heading', { name: 'Krok 3 z 4: Przekaż ocenianemu' })).toBeVisible()
  await expect(step(page, 2)).toContainText('krok 2 z 4, zakończono')
  await expect(step(page, 2)).toContainText(/\d{2}\.\d{2}\.\d{4}/)
  await expect(current(page)).toContainText('krok 3 z 4, w toku')
  const send = step(page, 3).getByRole('button', { name: 'Przekaż ocenianemu do zapoznania' })
  await expect(send).toBeFocused()
  await expect(page.getByRole('region', { name: 'Kontrola formalna' })).toHaveCount(0)
  await onlyExpanded(page, 3)

  // After the hand-over („Zapoznanie z oceną”): step 4 expanded with the reminder and who confirms the acknowledgement.
  await send.click()
  await confirmDialog(page, 'Przekazać ocenę ocenianemu?', 'Przekaż do zapoznania')
  await expect(flow(page).getByRole('heading', { name: 'Krok 4 z 4: Czeka na zapoznanie' })).toBeVisible()
  await expect(current(page)).toContainText('krok 4 z 4, w toku')
  await expect(step(page, 4).getByRole('button', { name: /Przypomnij/ })).toBeVisible()
  await expect(step(page, 4)).toContainText('Potwierdzenie zapoznania należy do ocenianego')
  await onlyExpanded(page, 4)
})

test('po zapoznaniu wszystkie 4 kroki są zakończone i zwinięte', async ({ page }) => {
  await signIn(page, SUPERVISOR)
  await page.goto('/teczka/c-006/zapoznanie')

  await expect(flow(page).getByRole('heading', { name: 'Wszystkie 4 kroki zakończone' })).toBeVisible()
  for (const n of [1, 2, 3, 4]) await expect(step(page, n)).toContainText(`krok ${n} z 4, zakończono`)
  await expect(current(page)).toHaveCount(0)
  await expect(flow(page).getByRole('button')).toHaveCount(0)
  await expect(flow(page).getByRole('link')).toHaveCount(0)
  await expect(page.getByText(/Oceniany zapoznał się z oceną \d/)).toBeVisible()
})

for (const assistant of [false, true]) {
  test(`oś kroków mieści się na telefonie bez przewijania w poziomie${assistant ? ' (z panelem Asystenta)' : ''}`, async ({ page }) => {
    await page.addInitScript((on) => localStorage.setItem('ocena.assistant', on ? '1' : '0'), assistant)
    await page.setViewportSize({ width: 375, height: 800 })
    await signIn(page, SUPERVISOR)
    await page.goto('/teczka/c-007/podpis')
    await expect(step(page, 2).getByRole('button', { name: 'Podpisz ocenę' })).toBeVisible()
    // On a phone the names stay visible next to the circles.
    await expect(step(page, 3).getByText('Przekazanie', { exact: true })).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test(`oś kroków ma te same krawędzie co komunikat etapu nad nią (1440 px${assistant ? ', z panelem Asystenta' : ''})`, async ({ page }) => {
    await page.addInitScript((on) => localStorage.setItem('ocena.assistant', on ? '1' : '0'), assistant)
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page, SUPERVISOR)
    await page.goto('/teczka/c-006/zapoznanie')
    // The visible edges of the status are those of its alert; .stage-status itself also holds the side padding.
    const alert = page.locator('.stage-status > *').first()
    await expect(alert).toBeVisible()
    await expect(axis(page)).toBeVisible()
    await expect(step(page, 3).getByText('Przekazanie', { exact: true })).toBeVisible()
    const a = (await alert.boundingBox())!
    const f = (await flow(page).boundingBox())!
    expect(Math.abs(f.x - a.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(f.x + f.width - (a.x + a.width))).toBeLessThanOrEqual(1)
  })
}
