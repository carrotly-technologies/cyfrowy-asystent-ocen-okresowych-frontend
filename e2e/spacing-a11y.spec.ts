import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { resetDemo, signIn } from './helpers.ts'

/**
 * Spacing and target size on the key screens of the supervisor (docs/DESIGN.md, "Spacing"):
 * - WCAG 1.4.12 Text Spacing: with line height 1.5, paragraph spacing 2em, letter spacing 0.12em and word spacing
 *   0.16em nothing scrolls sideways and no text is cut off by a box with `overflow: hidden`;
 * - WCAG 2.5.8 Target Size (Minimum): axe `target-size` finds no target under 24 × 24 px without enough space around it;
 * - at 375, 768 and 1440 px nothing scrolls sideways.
 */
const SUPERVISOR = 'j.kaminska'
const VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
]

/** The WCAG 1.4.12 bookmarklet values, forced on every element. */
const TEXT_SPACING = `
  * { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
  p { margin-bottom: 2em !important; }
`

type Screen = { name: string; open: (page: Page) => Promise<void> }

const SCREENS: Screen[] = [
  { name: 'Oceny zespołu', open: (p) => goto(p, '/zespol') },
  { name: 'strona osoby', open: (p) => goto(p, '/zespol/p-nowak') },
  { name: 'teczka: obserwacje', open: (p) => goto(p, '/teczka/c-003/obserwacje') },
  { name: 'teczka: rozmowa oceniająca', open: (p) => goto(p, '/teczka/c-007/ocena?czesc=2') },
  { name: 'teczka: podpis', open: (p) => goto(p, '/teczka/c-007/podpis') },
  { name: 'Dobrostan zespołu', open: (p) => goto(p, '/dobrostan') },
  {
    name: 'Dobrostan: karta osoby',
    open: async (p) => {
      await goto(p, '/dobrostan')
      await p.getByRole('link', { name: /^Zobacz kartę: / }).first().click()
      await expect(p).toHaveURL(/\/dobrostan\/[^/]+$/)
      await waitForContent(p)
    },
  },
]

async function goto(page: Page, url: string) {
  await page.goto(url)
  await waitForContent(page)
}

async function waitForContent(page: Page) {
  await expect(page.locator('main h1').first()).toBeVisible()
  await expect(page.locator('main [aria-busy="true"], main .spinner')).toHaveCount(0)
}

/** Text boxes that hide part of their own text (scrollHeight > clientHeight with overflow hidden / clip). */
function clippedText(page: Page) {
  return page.evaluate(() => {
    const out: string[] = []
    for (const el of document.querySelectorAll<HTMLElement>('main *, header *, nav *')) {
      const s = getComputedStyle(el)
      if (s.display === 'none' || s.visibility === 'hidden') continue
      const hidesY = ['hidden', 'clip'].includes(s.overflowY)
      if (!hidesY) continue
      const r = el.getBoundingClientRect()
      // Visually hidden text for screen readers (1 × 1 px with clip) is meant to be invisible.
      if (r.width <= 1 || r.height <= 1) continue
      if (!el.innerText?.trim()) continue
      if (el.scrollHeight > el.clientHeight + 1) out.push(`${el.tagName.toLowerCase()}.${el.className}: "${el.innerText.trim().slice(0, 40)}"`)
    }
    return out
  })
}

function horizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
}

test.beforeEach(async ({ request, page }) => {
  await resetDemo(request)
  await signIn(page, SUPERVISOR)
})

for (const screen of SCREENS) {
  test(`WCAG 1.4.12 i 2.5.8: ${screen.name}`, async ({ page }) => {
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport)
      await screen.open(page)
      const at = `${screen.name} @ ${viewport.width}px`

      expect(await horizontalOverflow(page), `${at}: no sideways scroll`).toBeLessThanOrEqual(0)

      const axe = await new AxeBuilder({ page }).withRules(['target-size']).analyze()
      const targets = axe.violations.flatMap((v) => v.nodes.map((n) => `${n.target.join(' ')}: ${n.failureSummary}`))
      expect(targets, `${at}: targets ≥ 24 × 24 px (WCAG 2.5.8)`).toEqual([])

      await page.addStyleTag({ content: TEXT_SPACING })
      expect(await horizontalOverflow(page), `${at}, text spacing: no sideways scroll`).toBeLessThanOrEqual(0)
      expect(await clippedText(page), `${at}, text spacing: no clipped text (WCAG 1.4.12)`).toEqual([])
    }
  })
}
