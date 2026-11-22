import { expect, test, type Page } from '@playwright/test'
import { resetDemo, signIn } from './helpers.ts'

/**
 * „Rozmowa rozpoczynająca”: the „Części arkusza” stepper (I · II · III). Part I is filled as before; parts II and III
 * are a read-only preview. c-005 (supervisor j.kaminska, demo seed) is at the opening talk with sheet C.
 */
const SUPERVISOR = 'j.kaminska'
const STAGE = '/teczka/c-005/rozmowa-rozpoczynajaca'

test.beforeEach(async ({ request }) => {
  await resetDemo(request)
})

const parts = (page: Page) => page.getByRole('list', { name: 'Części arkusza' })

test('Rozmowa rozpoczynająca: stepper części I · II · III z podglądem II i III tylko do odczytu', async ({ page }) => {
  await signIn(page, SUPERVISOR)
  await page.goto(STAGE)

  const links = parts(page).getByRole('link')
  await expect(links).toHaveCount(3)
  await expect(links.nth(0)).toHaveAttribute('aria-current', 'step')
  await expect(page.getByRole('heading', { name: /Część I – Arkusz C/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Zatwierdź część I' })).toBeVisible()

  // Part II from the keyboard: the selected part is in the URL and marked with aria-current.
  await links.nth(1).focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\?czesc=2$/)
  await expect(links.nth(1)).toHaveAttribute('aria-current', 'step')
  await expect(links.nth(0)).not.toHaveAttribute('aria-current', 'step')
  await expect(page.getByText('Tę część wypełnisz na etapie »Rozmowa oceniająca i ocena«.')).toBeVisible()
  const matrix = page.getByRole('table', { name: 'Oceny cząstkowe' })
  await expect(matrix.getByRole('radio').first()).toBeDisabled()
  await expect(page.getByLabel('Uzasadnienie przyznanej oceny okresowej')).toHaveAttribute('readonly', '')
  await expect(page.getByLabel('Wnioski dotyczące indywidualnego programu rozwoju zawodowego')).toHaveAttribute('readonly', '')
  await expect(page.getByRole('button', { name: 'Dalej' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Wstecz' })).toHaveCount(0)

  // A refresh keeps the part.
  await page.reload()
  await expect(parts(page).getByRole('link').nth(1)).toHaveAttribute('aria-current', 'step')

  // Part III: the fields are shown, locked, with nothing to save.
  await parts(page).getByRole('link').nth(2).click()
  await expect(page).toHaveURL(/\?czesc=3$/)
  await expect(page.getByRole('heading', { name: /Wniosek o przyznanie kolejnego stopnia służbowego/ })).toBeVisible()
  await expect(page.getByLabel('Umotywowanie wniosku')).toHaveAttribute('readonly', '')
  await expect(page.getByRole('button', { name: 'Dalej' })).toHaveCount(0)

  // Nothing was saved: no PATCH of the case while browsing the preview.
  const patches: string[] = []
  page.on('request', (r) => {
    if (r.method() === 'PATCH') patches.push(r.url())
  })
  await parts(page).getByRole('link').nth(1).click()
  await matrix.getByRole('radio').first().click({ force: true })
  await expect(matrix.getByRole('radio').first()).not.toBeChecked()
  expect(patches).toEqual([])

  // Back to part I: the form works as before.
  await parts(page).getByRole('link').nth(0).click()
  await expect(page).toHaveURL(/\?czesc=1$/)
  await expect(page.getByRole('button', { name: 'Zatwierdź część I' })).toBeVisible()
})

test('Rozmowa rozpoczynająca: „Podgląd całego arkusza” otwiera arkusz, a „Wróć” prowadzi do etapu', async ({ page }) => {
  await signIn(page, SUPERVISOR)
  await page.goto(`${STAGE}?czesc=2`)

  await page.getByRole('link', { name: 'Podgląd całego arkusza' }).click()
  await expect(page).toHaveURL(/\/teczka\/c-005\/arkusz$/)
  await expect(page.getByText('Podgląd arkusza', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Wróć' }).click()
  await expect(page).toHaveURL(new RegExp(`${STAGE}\\?czesc=2$`))
})

test('Rozmowa rozpoczynająca: przy 375 px stepper części nie przewija się w poziomie', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await signIn(page, SUPERVISOR)
  await page.goto(`${STAGE}?czesc=3`)
  await expect(parts(page)).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})
