import { expect, test } from '@playwright/test'
import { resetDemo, signIn } from './helpers.ts'

/** "Mój zespół" (/zespol) of supervisor j.kaminska, against the backend demo seed. */
const SUPERVISOR = 'j.kaminska'
const HEADERS = ['Pracownik', 'Stanowisko', 'Ocena', 'Etap', 'Termin', 'Następna ocena', 'Status']

test.beforeEach(async ({ request }) => {
  await resetDemo(request)
})

test('Mój zespół: nagłówki kolumn, następna ocena i status w ostatniej kolumnie', async ({ page }) => {
  await signIn(page, SUPERVISOR)
  await page.goto('/zespol')

  const table = page.getByRole('table', { name: 'Pracownicy i ich oceny okresowe' })
  await expect(table.getByRole('columnheader')).toHaveText(HEADERS)

  // Visible text only (the per-cell labels show on phones). Anna Nowak (c-001): previous assessment signed, so a predicted date; Piotr Wójcik (c-002): none signed yet.
  const nowak = table.getByRole('row').filter({ has: page.getByRole('link', { name: 'Otwórz teczkę: Anna Nowak' }) })
  const nowakCells = nowak.getByRole('cell')
  await expect(nowakCells).toHaveCount(HEADERS.length)
  await expect(nowakCells.nth(5)).toHaveText(/^\d{2}\.\d{2}\.\d{4}$/, { useInnerText: true })
  await expect(nowakCells.last()).toContainText(/w toku|po terminie/i)

  const wojcik = table.getByRole('row').filter({ has: page.getByRole('link', { name: 'Otwórz teczkę: Piotr Wójcik' }) })
  await expect(wojcik.getByRole('cell').nth(5)).toHaveText('—', { useInnerText: true })

  // Header and cells share one grid: each header starts where its column starts.
  const headerBoxes = await table.getByRole('columnheader').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().left))
  const cellBoxes = await nowakCells.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().left))
  cellBoxes.forEach((left, i) => expect(Math.abs(left - headerBoxes[i])).toBeLessThan(2))

  // The whole row opens the case.
  await nowak.getByRole('link', { name: 'Otwórz teczkę: Anna Nowak' }).click()
  await expect(page).toHaveURL(/\/teczka\/c-001/)
})

test('Mój zespół na telefonie: bez przewijania w poziomie, nagłówki ukryte, wartości z etykietami', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await signIn(page, SUPERVISOR)
  await page.goto('/zespol')

  const table = page.getByRole('table', { name: 'Pracownicy i ich oceny okresowe' })
  await expect(table.getByRole('columnheader').first()).toBeAttached()
  // Visually hidden header row (still announced by screen readers).
  const headerHeight = await table.getByRole('columnheader').first().evaluate((e) => e.closest('[role="rowgroup"]')!.getBoundingClientRect().height)
  expect(headerHeight).toBeLessThanOrEqual(1)

  const nowak = table.getByRole('row').filter({ has: page.getByRole('link', { name: 'Otwórz teczkę: Anna Nowak' }) })
  await expect(nowak.getByText('Następna ocena:', { exact: true })).toBeVisible()
  await expect(nowak.getByText('Status:', { exact: true })).toBeVisible()

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})
