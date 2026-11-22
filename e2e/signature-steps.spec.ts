import { expect, test, type Page } from '@playwright/test'
import { confirmDialog, resetDemo, signIn } from './helpers.ts'

/**
 * „Podpis i przekazanie”: the four steps (rozmowa → podpis → przekazanie → zapoznanie) are a vertical timeline and
 * the action of the current step is expanded inside that step, not in a separate panel next to it.
 * Seed: c-007 (j.kaminska) has the talk held and waits for the signature; c-006 (j.kaminska) is acknowledged.
 */
const SUPERVISOR = 'j.kaminska'

test.beforeEach(async ({ request }) => {
  await resetDemo(request)
})

const timeline = (page: Page) => page.getByRole('region', { name: /^(Krok \d z 4|Wszystkie 4 kroki)/ })
const step = (page: Page, n: number) => timeline(page).getByRole('listitem').filter({ hasText: `krok ${n} z 4` }).first()

test('podpis to krok 2 z 4, a każdy następny krok ma swoją akcję na osi', async ({ page }) => {
  await signIn(page, SUPERVISOR)
  await page.goto('/teczka/c-007/podpis')

  // Before signing: step 1 done with its date, step 2 current and expanded with the formal check, 3–4 collapsed.
  await expect(timeline(page).getByRole('heading', { name: 'Krok 2 z 4: Podpisz ocenę' })).toBeVisible()
  await expect(step(page, 1)).toContainText('krok 1 z 4, zakończono')
  await expect(step(page, 1)).toContainText(/\d{2}\.\d{2}\.\d{4}/)
  await expect(step(page, 2)).toHaveAttribute('aria-current', 'step')
  await expect(step(page, 2)).toContainText('krok 2 z 4, teraz')
  await expect(step(page, 2).getByText('Teraz', { exact: true })).toHaveCount(0)
  await expect(step(page, 2).getByRole('region', { name: 'Kontrola formalna' })).toBeVisible()
  const sign = step(page, 2).getByRole('button', { name: 'Podpisz ocenę' })
  await expect(sign).toBeVisible()
  await expect(step(page, 3)).toContainText('krok 3 z 4, nierozpoczęty')
  await expect(step(page, 3).getByRole('button')).toHaveCount(0)
  await expect(step(page, 4).getByRole('button')).toHaveCount(0)
  await expect(page.locator('.doc-flow__actions')).toHaveCount(0)

  // After signing: step 2 done, step 3 expanded with the hand-over, and the focus is on its button.
  await sign.click()
  await confirmDialog(page, 'Podpisać ocenę?', 'Podpisz ocenę')
  await expect(timeline(page).getByRole('heading', { name: 'Krok 3 z 4: Przekaż ocenianemu' })).toBeVisible()
  await expect(step(page, 2)).toContainText('krok 2 z 4, zakończono')
  await expect(step(page, 3)).toHaveAttribute('aria-current', 'step')
  const send = step(page, 3).getByRole('button', { name: 'Przekaż ocenianemu do zapoznania' })
  await expect(send).toBeFocused()
  await expect(page.getByRole('region', { name: 'Kontrola formalna' })).toHaveCount(0)

  // After the hand-over: step 4 expanded with the reminder and who confirms the acknowledgement.
  await send.click()
  await confirmDialog(page, 'Przekazać ocenę ocenianemu?', 'Przekaż do zapoznania')
  await expect(timeline(page).getByRole('heading', { name: 'Krok 4 z 4: Czeka na zapoznanie' })).toBeVisible()
  await expect(step(page, 4)).toHaveAttribute('aria-current', 'step')
  await expect(step(page, 4).getByRole('button', { name: /Przypomnij/ })).toBeVisible()
  await expect(step(page, 4)).toContainText('Potwierdzenie zapoznania należy do ocenianego')
})

test('po zapoznaniu wszystkie 4 kroki są zakończone i żaden nie jest rozwinięty', async ({ page }) => {
  await signIn(page, SUPERVISOR)
  await page.goto('/teczka/c-006/zapoznanie')

  await expect(timeline(page).getByRole('heading', { name: 'Wszystkie 4 kroki zakończone' })).toBeVisible()
  for (const n of [1, 2, 3, 4]) await expect(step(page, n)).toContainText(`krok ${n} z 4, zakończono`)
  await expect(timeline(page).locator('[aria-current="step"]')).toHaveCount(0)
  await expect(timeline(page).getByRole('button')).toHaveCount(0)
  await expect(page.getByText(/Oceniany zapoznał się z oceną \d/)).toBeVisible()
})

test('oś kroków mieści się na telefonie bez przewijania w poziomie', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await signIn(page, SUPERVISOR)
  await page.goto('/teczka/c-007/podpis')
  await expect(step(page, 2).getByRole('button', { name: 'Podpisz ocenę' })).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})
