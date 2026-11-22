import { expect, test, type Page } from '@playwright/test'
import { confirmDialog, resetDemo, signIn } from './helpers.ts'

/**
 * „Podpis i przekazanie”: the four steps (rozmowa → podpis → przekazanie → zapoznanie) are a horizontal stepper like
 * the stage bar of the case file (circles on a line, ✓ for done steps, the date under each name), without a box,
 * and the action of the current step is right under it.
 * Seed: c-007 (j.kaminska) has the talk held and waits for the signature; c-006 (j.kaminska) is acknowledged.
 */
const SUPERVISOR = 'j.kaminska'

test.beforeEach(async ({ request }) => {
  await resetDemo(request)
})

const stepper = (page: Page) => page.getByRole('navigation', { name: 'Kroki podpisu i przekazania' })
const step = (page: Page, n: number) => stepper(page).getByRole('listitem').nth(n - 1)
const current = (page: Page) => stepper(page).locator('[aria-current="step"]')
const action = (page: Page) => page.getByRole('region', { name: /^Krok \d z 4/ })

test('podpis to krok 2 z 4, a każdy następny krok ma swoją akcję pod paskiem', async ({ page }) => {
  await signIn(page, SUPERVISOR)
  await page.goto('/teczka/c-007/podpis')

  // Short names with the date (or „—”) under each, no box around the section.
  await expect(stepper(page).getByRole('listitem')).toHaveCount(4)
  for (const [n, name] of ['Rozmowa', 'Podpis', 'Przekazanie', 'Zapoznanie'].entries()) {
    await expect(step(page, n + 1)).toContainText(name)
  }
  await expect(step(page, 1)).toContainText(/\d{2}\.\d{2}\.\d{4}/)
  await expect(step(page, 2)).toContainText('—')
  const flow = page.locator('.doc-flow')
  await expect(flow).toHaveCSS('border-top-width', '0px')
  await expect(flow).toHaveCSS('padding-top', '0px')
  await expect(flow).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')

  // Before signing: step 1 done, step 2 current, its formal check and button under the stepper.
  await expect(action(page).getByRole('heading', { name: 'Krok 2 z 4: Podpisz ocenę' })).toBeVisible()
  await expect(step(page, 1)).toContainText('krok 1 z 4, zakończono')
  await expect(current(page)).toHaveCount(1)
  await expect(current(page)).toContainText('krok 2 z 4, w toku')
  await expect(step(page, 3)).toContainText('krok 3 z 4, nierozpoczęty')
  await expect(stepper(page).getByRole('button')).toHaveCount(0)
  await expect(action(page).getByRole('region', { name: 'Kontrola formalna' })).toBeVisible()
  const sign = action(page).getByRole('button', { name: 'Podpisz ocenę' })
  await expect(sign).toBeVisible()
  await expect(action(page).getByRole('link', { name: 'Wróć do oceny, aby poprawić część II lub III' })).toBeVisible()

  // After signing: step 2 done, the hand-over of step 3 under the stepper, and the focus is on its button.
  await sign.click()
  await confirmDialog(page, 'Podpisać ocenę?', 'Podpisz ocenę')
  await expect(action(page).getByRole('heading', { name: 'Krok 3 z 4: Przekaż ocenianemu' })).toBeVisible()
  await expect(step(page, 2)).toContainText('krok 2 z 4, zakończono')
  await expect(step(page, 2)).toContainText(/\d{2}\.\d{2}\.\d{4}/)
  await expect(current(page)).toContainText('krok 3 z 4, w toku')
  const send = action(page).getByRole('button', { name: 'Przekaż ocenianemu do zapoznania' })
  await expect(send).toBeFocused()
  await expect(page.getByRole('region', { name: 'Kontrola formalna' })).toHaveCount(0)

  // After the hand-over: step 4 with the reminder and who confirms the acknowledgement.
  await send.click()
  await confirmDialog(page, 'Przekazać ocenę ocenianemu?', 'Przekaż do zapoznania')
  await expect(action(page).getByRole('heading', { name: 'Krok 4 z 4: Czeka na zapoznanie' })).toBeVisible()
  await expect(current(page)).toContainText('krok 4 z 4, w toku')
  await expect(action(page).getByRole('button', { name: /Przypomnij/ })).toBeVisible()
  await expect(action(page)).toContainText('Potwierdzenie zapoznania należy do ocenianego')
})

test('po zapoznaniu wszystkie 4 kroki są zakończone i nie ma żadnej akcji', async ({ page }) => {
  await signIn(page, SUPERVISOR)
  await page.goto('/teczka/c-006/zapoznanie')

  await expect(stepper(page)).toBeVisible()
  for (const n of [1, 2, 3, 4]) await expect(step(page, n)).toContainText(`krok ${n} z 4, zakończono`)
  await expect(current(page)).toHaveCount(0)
  await expect(action(page)).toHaveCount(0)
  await expect(page.locator('.doc-flow').getByRole('button')).toHaveCount(0)
  await expect(page.getByText(/Oceniany zapoznał się z oceną \d/)).toBeVisible()
})

for (const assistant of [false, true]) {
  test(`pasek kroków mieści się na telefonie bez przewijania w poziomie${assistant ? ' (z panelem Asystenta)' : ''}`, async ({ page }) => {
    await page.addInitScript((on) => localStorage.setItem('ocena.assistant', on ? '1' : '0'), assistant)
    await page.setViewportSize({ width: 375, height: 800 })
    await signIn(page, SUPERVISOR)
    await page.goto('/teczka/c-007/podpis')
    await expect(action(page).getByRole('button', { name: 'Podpisz ocenę' })).toBeVisible()
    await expect(stepper(page)).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test(`pasek kroków ma te same krawędzie co komunikat etapu nad nim (1440 px${assistant ? ', z panelem Asystenta' : ''})`, async ({ page }) => {
    await page.addInitScript((on) => localStorage.setItem('ocena.assistant', on ? '1' : '0'), assistant)
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page, SUPERVISOR)
    await page.goto('/teczka/c-006/zapoznanie')

    // The visible edges of the status are those of its alert; .stage-status itself also holds the side padding.
    const alert = page.locator('.stage-status > *').first()
    await expect(alert).toBeVisible()
    await expect(stepper(page)).toBeVisible()
    // On desktop the names stay visible under the circles.
    await expect(step(page, 3).getByText('Przekazanie', { exact: true })).toBeVisible()
    const a = (await alert.boundingBox())!
    const f = (await stepper(page).boundingBox())!
    expect(Math.abs(f.x - a.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(f.x + f.width - (a.x + a.width))).toBeLessThanOrEqual(1)
  })
}
