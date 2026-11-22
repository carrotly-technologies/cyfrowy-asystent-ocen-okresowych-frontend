import { expect, test } from '@playwright/test'
import { resetDemo, signIn } from './helpers.ts'

/**
 * The criteria table of part II (RadioMatrix, table layout ≥ 768px) shows full-size radios in its cells,
 * not collapsed dots, and the whole cell selects its radio.
 * c-007 (Monika Zielińska, supervisor j.kaminska) waits for the signature with part II still editable.
 */
test.beforeEach(async ({ request }) => {
  await resetDemo(request)
})

test('tabela kryteriów pokazuje pełnowymiarowe radiobuttony, a kliknięcie komórki zaznacza ocenę', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await signIn(page, 'j.kaminska')
  await page.goto('/teczka/c-007/ocena?czesc=2')

  const table = page.getByRole('table', { name: 'Oceny cząstkowe' })
  const radios = table.getByRole('radio')
  await expect(radios.first()).toBeVisible()

  // Every radio in the table is a real 20px (1.25rem) circle, not a collapsed border.
  const n = await radios.count()
  expect(n).toBeGreaterThan(0)
  for (let i = 0; i < n; i++) {
    const box = await radios.nth(i).boundingBox()
    expect(box, `radio ${i} has a box`).not.toBeNull()
    expect(box!.width).toBeGreaterThanOrEqual(18)
    expect(box!.height).toBeGreaterThanOrEqual(18)
  }

  // Clicking the cell (not the radio itself) selects its radio; the choice saves at once.
  const row = table.getByRole('row').filter({ has: page.getByRole('radio') }).first()
  const free = row.locator('td').filter({ has: page.locator('input[type="radio"]:not(:checked)') }).first()
  // Pin the cell by its radio id: the filter above would move on to another cell once this one is checked.
  const radioId = await free.getByRole('radio').getAttribute('id')
  const radio = page.locator(`[id="${radioId}"]`)
  const cell = page.locator('td').filter({ has: radio })
  await expect(radio).not.toBeChecked()
  // Near the cell's corner, away from the radio in its centre.
  await cell.click({ position: { x: 6, y: 6 } })
  await expect(radio).toBeChecked()
})
