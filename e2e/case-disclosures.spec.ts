import { expect, test } from '@playwright/test'
import { resetDemo, signIn } from './helpers.ts'

/** Case c-004 (Julia Mazur) at step 1, opened by its supervisor j.kaminska (backend demo seed). */
const CASE = 'c-004'
const SUPERVISOR = 'j.kaminska'

test.beforeEach(async ({ request }) => {
  await resetDemo(request)
})

test('Teczka: akordeony pod paskiem etapów wyglądają tak samo i otwierają się klawiaturą', async ({ page }) => {
  await signIn(page, SUPERVISOR)
  await page.goto(`/teczka/${CASE}/arkusz-i-kryteria`)

  const panels = page.locator('details').filter({ has: page.locator('summary', { hasText: 'Termin oceny, zaproszenia i wnioski' }) })
  const history = page.locator('details').filter({ has: page.locator('summary', { hasText: /^Historia sprawy/ }) })
  await expect(panels).toHaveCount(1)
  await expect(history).toHaveCount(1)

  // One shared look: the same frame, background, radius, padding and title font.
  const look = (el: HTMLElement) => {
    const d = getComputedStyle(el)
    const s = getComputedStyle(el.querySelector('summary')!)
    return [d.borderColor, d.borderRadius, d.backgroundColor, s.padding, s.fontWeight, s.fontSize, s.listStyleType].join('|')
  }
  expect(await panels.evaluate(look)).toBe(await history.evaluate(look))

  // Chevron on the left of the title, no native marker.
  const summary = history.locator('summary')
  const chevron = summary.locator('svg')
  const title = summary.locator('span').first()
  expect((await chevron.boundingBox())!.x).toBeLessThan((await title.boundingBox())!.x)
  await expect(summary).toHaveCSS('list-style-type', 'none')

  // Keyboard: focus the title, Enter opens, Space closes; the chevron turns.
  await expect(history).not.toHaveAttribute('open')
  await summary.focus()
  await page.keyboard.press('Enter')
  await expect(history).toHaveAttribute('open')
  await expect(chevron).not.toHaveCSS('transform', 'none')
  await page.keyboard.press('Space')
  await expect(history).not.toHaveAttribute('open')
})
