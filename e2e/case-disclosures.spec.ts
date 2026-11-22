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

test('Rozmowa oceniająca: „Podpowiedzi wirtualnego asystenta HR” w tym samym akordeonie i kartach co reszta teczki', async ({ page }) => {
  // c-001 is at the assessment stage of supervisor j.kaminska, with observations quoted as feedback.
  await signIn(page, SUPERVISOR)
  await page.goto('/teczka/c-001/ocena?czesc=2')

  const hints = page.locator('details').filter({ has: page.locator('summary', { hasText: 'Podpowiedzi wirtualnego asystenta HR' }) })
  const history = page.locator('details').filter({ has: page.locator('summary', { hasText: /^Historia sprawy/ }) })
  await expect(hints).toHaveCount(1)
  const look = (el: HTMLElement) => {
    const d = getComputedStyle(el)
    const s = getComputedStyle(el.querySelector('summary')!)
    return [d.borderColor, d.borderRadius, d.backgroundColor, s.padding, s.fontWeight, s.fontSize, s.listStyleType].join('|')
  }
  expect(await hints.evaluate(look)).toBe(await history.evaluate(look))

  await hints.locator('summary').click()
  await expect(hints).toHaveAttribute('open')
  for (const name of ['Mocne strony', 'Obszary do rozwoju', 'Jak sformułować informację zwrotną (sytuacja – zachowanie – rezultat)']) {
    await expect(hints.locator('h4.h-sub', { hasText: name })).toBeVisible()
  }
  // Quotes carry the same tags as the observation log.
  const tags = hints.locator('blockquote .tag')
  expect(await tags.count()).toBeGreaterThan(0)
  for (const tag of await tags.all()) await expect(tag).toHaveClass(/tag--(ok|warn)/)
  await expect(hints.getByRole('heading', { name: 'Zapytaj wirtualnego asystenta HR' })).toBeVisible()

  // The "i" next to the title explains, from the keyboard, that the assistant is a feature of the app.
  const info = page.getByRole('button', { name: 'Co to jest wirtualny asystent HR?' })
  await info.focus()
  await page.keyboard.press('Enter')
  await expect(info).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByText('Wirtualny asystent HR to funkcja aplikacji, nie osoba.')).toBeVisible()
  await expect(hints).toHaveAttribute('open')
  await page.keyboard.press('Escape')
  await expect(info).toHaveAttribute('aria-expanded', 'false')
  await expect(info).toBeFocused()

  // No horizontal scroll on a phone, also with the explanation open.
  await page.setViewportSize({ width: 375, height: 800 })
  await info.click()
  await expect(page.getByText('Wirtualny asystent HR to funkcja aplikacji, nie osoba.')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
