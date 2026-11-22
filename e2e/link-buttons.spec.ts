import { expect, test, type Locator, type Page } from '@playwright/test'
import { resetDemo, signIn } from './helpers.ts'

/**
 * Links styled as buttons (`a.btn`, e.g. „Prowadź ocenę” / „Zobacz ocenę” from CaseActionLink) keep their variant's
 * text colour on hover and focus instead of the text-link colour (`a:hover` → --link-hover), are never underlined,
 * and stay readable (WCAG AA, ≥ 4.5:1) in the light, dark and high-contrast themes.
 */
const SUPERVISOR = 'j.kaminska'

test.beforeEach(async ({ request }) => {
  await resetDemo(request)
})

type Look = { color: string; background: string; decoration: string; boxShadow: string }

async function look(link: Locator): Promise<Look> {
  return link.evaluate((el) => {
    const s = getComputedStyle(el)
    return { color: s.color, background: s.backgroundColor, decoration: s.textDecorationLine, boxShadow: s.boxShadow }
  })
}

/** sRGB channels of a computed colour (`rgb(…)`, `rgba(…)` or `color(srgb …)`). */
function rgb(css: string): [number, number, number] {
  const srgb = css.match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)/)
  if (srgb) return [Number(srgb[1]) * 255, Number(srgb[2]) * 255, Number(srgb[3]) * 255]
  const m = css.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/)
  if (!m) throw new Error(`unsupported colour: ${css}`)
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

/** WCAG 2.1 contrast ratio of two opaque colours. */
function contrast(a: string, b: string): number {
  const lum = (css: string) => {
    const [r, g, bl] = rgb(css).map((v) => {
      const c = v / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** Value of a design token on <html>, resolved to a computed colour. */
async function token(page: Page, name: string): Promise<string> {
  return page.evaluate((n) => {
    const probe = document.createElement('span')
    probe.style.color = `var(${n})`
    document.body.append(probe)
    const c = getComputedStyle(probe).color
    probe.remove()
    return c
  }, name)
}

async function setTheme(page: Page, theme: 'light' | 'dark', highContrast: boolean) {
  await page.evaluate(
    ([t, hc]) => {
      const root = document.documentElement
      root.setAttribute('data-theme', t as string)
      if (hc) root.setAttribute('data-contrast', 'high')
      else root.removeAttribute('data-contrast')
    },
    [theme, highContrast] as const,
  )
}

const THEMES = [
  { theme: 'light', highContrast: false },
  { theme: 'dark', highContrast: false },
  { theme: 'light', highContrast: true },
  { theme: 'dark', highContrast: true },
] as const

test('Przyciski-linki: „Prowadź ocenę” na hover i fokus zachowuje kolor tekstu, bez podkreślenia, kontrast ≥ 4.5:1', async ({ page }) => {
  await signIn(page, SUPERVISOR)
  await page.goto('/zespol')
  const table = page.getByRole('table', { name: 'Pracownicy i ich oceny okresowe' })
  const run = table.getByRole('link', { name: 'Prowadź ocenę: Anna Nowak' })
  await expect(run).toHaveClass(/btn--primary/)

  for (const { theme, highContrast } of THEMES) {
    const where = `${theme}${highContrast ? ', high contrast' : ''}`
    await setTheme(page, theme, highContrast)
    await page.mouse.move(0, 0)
    const rest = await look(run)

    await run.hover()
    // The background darkens to --accent-hover; the text and icon stay --on-accent.
    await expect.poll(async () => (await look(run)).background, where).toBe(await token(page, '--accent-hover'))
    const hover = await look(run)
    expect(hover.color, where).toBe(await token(page, '--on-accent'))
    expect(hover.color, where).toBe(rest.color)
    expect(hover.decoration, where).toBe('none')
    expect(contrast(hover.color, hover.background), where).toBeGreaterThanOrEqual(4.5)
    const icon = await run.locator('svg').evaluate((el) => getComputedStyle(el).color)
    expect(icon, where).toBe(hover.color)

    await page.mouse.move(0, 0)
    await run.focus()
    await page.keyboard.press('Shift')
    // Keyboard focus keeps the variant's text colour and still shows the focus ring.
    expect(await run.evaluate((el) => el.matches(':focus-visible')), where).toBe(true)
    const f = await look(run)
    expect(f.color, where).toBe(rest.color)
    expect(f.decoration, where).toBe('none')
    expect(f.boxShadow, where).not.toBe('none')
    expect(contrast(f.color, f.background), where).toBeGreaterThanOrEqual(4.5)
    await run.blur()
  }
})

test('Przyciski-linki: zwykły przycisk-link i link tekstowy na hover', async ({ page }) => {
  await signIn(page, SUPERVISOR)
  // A secondary link-button (plain .btn, „Podgląd arkusza” in the case header): its text keeps --accent, only the background changes.
  await page.goto('/teczka/c-001')
  await setTheme(page, 'light', false)
  const linkButton = page.getByRole('link', { name: 'Podgląd arkusza' })
  await expect(linkButton).toHaveClass(/\bbtn\b/)
  await page.mouse.move(0, 0)
  const rest = await look(linkButton)
  await linkButton.hover()
  await expect.poll(async () => (await look(linkButton)).background).toBe(await token(page, '--accent-faint'))
  const hover = await look(linkButton)
  expect(hover.color).toBe(rest.color)
  expect(hover.color).toBe(await token(page, '--accent'))
  expect(hover.decoration).toBe('none')
  expect(contrast(hover.color, hover.background)).toBeGreaterThanOrEqual(4.5)

  // Text links are unchanged: --link-hover on hover, underlined.
  const textLink = page.locator('main a:not(.btn)').first()
  await expect(textLink).toBeVisible()
  await textLink.hover()
  await expect.poll(async () => (await look(textLink)).color).toBe(await token(page, '--link-hover'))
  expect((await look(textLink)).decoration).toContain('underline')
})
