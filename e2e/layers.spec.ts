import { expect, test, type Locator, type Page } from '@playwright/test'
import { resetDemo, signIn } from './helpers.ts'

/**
 * Layers (docs/DESIGN.md, "Layers"): the dropdowns of the top bar open over the sticky stage bar of the case file
 * /teczka/c-001 (supervisor j.kaminska, demo seed), with the bar stuck under the top bar and without scrolling.
 */
const SUPERVISOR = 'j.kaminska'

test.beforeEach(async ({ request }) => {
  await resetDemo(request)
})

function stepper(page: Page) {
  return page.getByRole('navigation', { name: 'Etapy oceny okresowej' })
}

/** Opens the user menu in the top bar and returns its panel. */
async function openUserMenu(page: Page): Promise<Locator> {
  const button = page.getByRole('button', { name: /menu użytkownika/ })
  await button.click()
  await expect(button).toHaveAttribute('aria-expanded', 'true')
  const panel = page.locator(`[id="${await button.getAttribute('aria-controls')}"]`)
  await expect(panel).toBeVisible()
  return panel
}

/** Scrolls the nearest scrolling ancestor of the stage bar (or the window) until the bar is stuck at its top. */
async function scrollUntilStuck(page: Page): Promise<void> {
  const before = (await stepper(page).boundingBox())!.y
  await stepper(page).evaluate((nav) => {
    let el: HTMLElement | null = nav.parentElement
    while (el && !(el.scrollHeight > el.clientHeight && /auto|scroll/.test(getComputedStyle(el).overflowY))) el = el.parentElement
    ;(el ?? document.scrollingElement!).scrollBy(0, 2000)
  })
  // Still on screen after a long scroll, and moved up: the bar is stuck.
  await expect.poll(async () => (await stepper(page).boundingBox())!.y).toBeLessThan(before)
  await expect(stepper(page)).toBeInViewport()
}

/** The element hit at the centre of `target` is `target` itself or one of its descendants. */
async function isOnTop(target: Locator): Promise<boolean> {
  return target.evaluate((el) => {
    const r = el.getBoundingClientRect()
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    return !!hit && el.contains(hit)
  })
}

for (const viewport of [
  { name: 'desktop', width: 1280, height: 900 },
  { name: '375 px', width: 375, height: 800 },
]) {
  test(`Teczka (${viewport.name}): menu użytkownika otwiera się nad paskiem etapów, też przyklejonym`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await signIn(page, SUPERVISOR)
    await page.goto('/teczka/c-001')
    await expect(stepper(page)).toBeVisible()

    // Without scrolling.
    let panel = await openUserMenu(page)
    let logout = panel.getByRole('button', { name: 'Wyloguj' })
    expect(await isOnTop(logout), 'Wyloguj is on top (no scroll)').toBe(true)
    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()

    // With the stage bar stuck right under the top bar: the open panel overlaps it and stays on top.
    await scrollUntilStuck(page)
    panel = await openUserMenu(page)
    logout = panel.getByRole('button', { name: 'Wyloguj' })
    const bar = (await stepper(page).boundingBox())!
    const box = (await panel.boundingBox())!
    expect(box.y + box.height, 'the open menu reaches over the stuck stage bar').toBeGreaterThan(bar.y)
    // The middle of the area where the menu and the stuck bar overlap belongs to the menu.
    const overlap = {
      x: (Math.max(box.x, bar.x) + Math.min(box.x + box.width, bar.x + bar.width)) / 2,
      y: (Math.max(box.y, bar.y) + Math.min(box.y + box.height, bar.y + bar.height)) / 2,
    }
    const hitInMenu = await panel.evaluate((el, p) => {
      const hit = document.elementFromPoint(p.x, p.y)
      return !!hit && el.contains(hit)
    }, overlap)
    expect(hitInMenu, 'the menu is on top where it overlaps the stuck bar').toBe(true)
    expect(await isOnTop(logout), 'Wyloguj is on top (stuck bar)').toBe(true)
    // A real click reaches the item (Playwright fails the click if another element would receive it).
    await logout.click({ trial: true })
  })
}
