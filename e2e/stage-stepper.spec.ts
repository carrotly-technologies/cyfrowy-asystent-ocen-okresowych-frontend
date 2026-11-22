import { expect, test, type Page } from '@playwright/test'
import { resetDemo, signIn } from './helpers.ts'

/** The stage stepper (circles on a line) of the case file /teczka/c-001 (supervisor j.kaminska, demo seed: steps 1–4 done, step 5 in progress). */
const SUPERVISOR = 'j.kaminska'

test.beforeEach(async ({ request }) => {
  await resetDemo(request)
})

function stepper(page: Page) {
  return page.getByRole('navigation', { name: 'Etapy oceny okresowej' })
}

/** Rendered height of every visible step name, in lines (0 when the name is hidden). */
async function labelLines(page: Page): Promise<number[]> {
  return stepper(page)
    .getByRole('listitem')
    .evaluateAll((items) =>
      items.map((li) => {
        const label = li.querySelector('a > span:nth-child(2)') as HTMLElement
        const lh = parseFloat(getComputedStyle(label).lineHeight)
        return label.getBoundingClientRect().height <= 1 ? 0 : Math.round(label.getBoundingClientRect().height / lh)
      }),
    )
}

test('Teczka: pasek etapów to okręgi na linii z nazwami pod spodem, dostępny z klawiatury', async ({ page }) => {
  await signIn(page, SUPERVISOR)
  await page.goto('/teczka/c-001')

  const nav = stepper(page)
  const links = nav.getByRole('link')
  await expect(links).toHaveCount(7)
  // Screen readers hear „krok X z Y, <stan>”.
  await expect(links.nth(0)).toHaveAccessibleName(/, krok 1 z 7, zakończono$/)
  await expect(links.nth(4)).toHaveAccessibleName(/, krok 5 z 7, w toku$/)
  await expect(links.nth(6)).toHaveAccessibleName(/, krok 7 z 7, nierozpoczęty$/)
  await expect(nav.locator('[aria-current="step"]')).toHaveCount(1)
  await expect(links.nth(4)).toHaveAttribute('aria-current', 'step')

  // Names under the circles, at most two lines, never split mid-word.
  const lines = await labelLines(page)
  expect(lines.every((n) => n >= 1 && n <= 2), `lines per step name: ${lines}`).toBeTruthy()
  const dot = await links.nth(0).locator('span').first().boundingBox()
  const name = await links.nth(0).locator('span').nth(1).boundingBox()
  expect(name!.y).toBeGreaterThan(dot!.y + dot!.height - 1)

  // Tab + Enter opens a step; it becomes the shown one.
  await links.nth(1).focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/teczka\/c-001\/rozmowa-rozpoczynajaca$/)
  await expect(links.nth(1)).toHaveAttribute('aria-current', 'step')
})

test('Teczka przy 375 px: same okręgi i nazwa pokazanego etapu, bez przewijania w poziomie', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await signIn(page, SUPERVISOR)
  await page.goto('/teczka/c-001')

  const nav = stepper(page)
  await expect(nav.getByRole('link')).toHaveCount(7)
  await expect(nav.getByText('Krok 5 z 7: Rozmowa oceniająca i ocena')).toBeVisible()
  expect(await labelLines(page)).toEqual([0, 0, 0, 0, 0, 0, 0])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy()
})

test('Teczka z otwartym asystentem: nazwy etapów nie łamią się litera po literze', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.addInitScript(() => localStorage.setItem('ocena.assistant', '1'))
  await signIn(page, SUPERVISOR)
  await page.goto('/teczka/c-001')

  await expect(stepper(page).getByRole('link')).toHaveCount(7)
  // Either the names fit in two lines, or (a narrow stepper) only the shown step's name is visible under the circles.
  const lines = await labelLines(page)
  expect(lines.every((n) => n <= 2), `lines per step name: ${lines}`).toBeTruthy()
  // The sticky stepper's height is passed on, so it does not cover the content under it.
  const sticky = await page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="Etapy oceny okresowej"]')!.parentElement!
    return { h: nav.offsetHeight, v: getComputedStyle(nav).getPropertyValue('--case-sticky-h') }
  })
  expect(sticky.v).toBe(`${sticky.h}px`)
})

test('Teczka: hover i fokus na etapie przyciemniają okrąg i podkreślają nazwę, bez szarego tła', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await signIn(page, SUPERVISOR)
  await page.goto('/teczka/c-001')

  const links = stepper(page).getByRole('link')
  await expect(links).toHaveCount(7)
  const look = (i: number) =>
    links.nth(i).evaluate((a) => {
      const marker = getComputedStyle(a.querySelector('span:nth-child(1)')!)
      const label = getComputedStyle(a.querySelector('span:nth-child(2)')!)
      return {
        bg: getComputedStyle(a).backgroundColor,
        cursor: getComputedStyle(a).cursor,
        markerBg: marker.backgroundColor,
        markerBorder: marker.borderTopColor,
        markerColor: marker.color,
        underline: label.textDecorationLine,
      }
    })
  const token = (name: string) =>
    page.evaluate((n) => {
      const probe = document.createElement('i')
      probe.style.color = `var(${n})`
      document.body.append(probe)
      const c = getComputedStyle(probe).color
      probe.remove()
      return c
    }, name)
  const [okHover, accentHover, textSecondary, text] = await Promise.all(
    ['--ok-hover', '--accent-hover', '--text-secondary', '--text'].map(token),
  )

  // At rest: no underline.
  expect((await look(0)).underline).toBe('none')

  // Done step (1): the green circle darkens.
  await links.nth(0).hover()
  let st = await look(0)
  expect(st).toMatchObject({ bg: 'rgba(0, 0, 0, 0)', cursor: 'pointer', markerBg: okHover, markerBorder: okHover, underline: 'underline' })

  // Current step (5): accent-hover outline and number.
  await links.nth(4).hover()
  st = await look(4)
  expect(st).toMatchObject({ bg: 'rgba(0, 0, 0, 0)', markerBorder: accentHover, markerColor: accentHover, underline: 'underline' })
  expect((await look(0)).underline).toBe('none')

  // Future step (7): darker grey outline, number in the text colour.
  await links.nth(6).hover()
  st = await look(6)
  expect(st).toMatchObject({ markerBorder: textSecondary, markerColor: text, underline: 'underline' })

  // Keyboard focus looks the same as hover, plus the focus ring.
  await page.mouse.move(0, 0)
  await links.nth(3).focus()
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('Tab')
  await expect(links.nth(3)).toBeFocused()
  st = await look(3)
  expect(st).toMatchObject({ markerBg: okHover, underline: 'underline' })
  expect(await links.nth(3).evaluate((a) => getComputedStyle(a).boxShadow)).not.toBe('none')
})
