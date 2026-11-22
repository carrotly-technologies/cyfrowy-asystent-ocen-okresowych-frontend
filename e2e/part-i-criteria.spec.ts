import { expect, test } from '@playwright/test'
import { apiGet, apiPost, confirmDialog, resetDemo, signIn } from './helpers.ts'

/**
 * Part I at the opening talk: the evaluator adds and removes additional criteria until part I is confirmed.
 * Demo case c-005 (Paweł Szymański, sheet C, no additional criteria yet) waits at the opening talk for j.kaminska.
 */
const CASE = 'c-005'
const SUPERVISOR = 'j.kaminska'

test.beforeEach(async ({ request }) => {
  await resetDemo(request)
})

test('przełożony zmienia kryteria dodatkowe w części I do jej potwierdzenia', async ({ page, request }) => {
  await signIn(page, SUPERVISOR)
  await page.goto(`/teczka/${CASE}/rozmowa-rozpoczynajaca`)
  const picker = page.getByRole('group', { name: /Kryteria dodatkowe \(\d\/3\)/ })
  await expect(picker).toHaveAccessibleName('Kryteria dodatkowe (0/3)')
  await expect(page.getByText('Kryteria dodatkowe możesz zmienić do potwierdzenia części I.')).toBeVisible()

  // Added: the criterion gets its expectations field at once.
  await picker.getByRole('checkbox', { name: 'Kreatywność', exact: true }).click()
  const kreatywnosc = page.getByRole('textbox', { name: 'Kreatywność', exact: true })
  await expect(kreatywnosc).toBeVisible()
  await kreatywnosc.fill('Nowe rozwiązania w procesie kontroli.')
  await picker.getByRole('checkbox', { name: 'Negocjowanie', exact: true }).click()
  await picker.getByRole('checkbox', { name: 'Myślenie analityczne', exact: true }).click()
  await expect(picker).toHaveAccessibleName('Kryteria dodatkowe (3/3)')
  // The limit reached: the other criteria are disabled.
  await expect(picker.getByRole('checkbox', { name: 'Orientacja na klienta/interesanta', exact: true })).toBeDisabled()

  // Removing a criterion with expectations asks first.
  await picker.getByRole('checkbox', { name: 'Kreatywność', exact: true }).click()
  await confirmDialog(page, 'Usunąć kryterium i wpisane oczekiwania?', 'Usuń kryterium')
  await expect(picker).toHaveAccessibleName('Kryteria dodatkowe (2/3)')
  await expect(kreatywnosc).toHaveCount(0)
  // Removing an empty one does not.
  await picker.getByRole('checkbox', { name: 'Negocjowanie', exact: true }).click()
  await expect(picker).toHaveAccessibleName('Kryteria dodatkowe (1/3)')
  await expect(page.getByRole('textbox', { name: 'Negocjowanie', exact: true })).toHaveCount(0)

  // Saved: after a reload and in step 1 („Arkusz i kryteria”).
  await page.reload()
  await expect(picker).toHaveAccessibleName('Kryteria dodatkowe (1/3)')
  await expect(picker.getByRole('checkbox', { name: 'Myślenie analityczne', exact: true })).toBeChecked()
  await page.goto(`/teczka/${CASE}/arkusz-i-kryteria`)
  await expect(page.getByText(/kryteria dodatkowe: Myślenie analityczne/)).toBeVisible()
  const detail = await apiGet<{ history: { text: string }[] }>(request, SUPERVISOR, `/cases/${CASE}`)
  expect(detail.history.map((h) => h.text)).toContainEqual(expect.stringContaining('Zmieniono kryteria dodatkowe: usunięto „Negocjowanie”'))

  // After the evaluator confirms part I the list is read only.
  await apiPost(request, SUPERVISOR, `/cases/${CASE}/actions`, { action: 'CONFIRM_PART_I' })
  await page.goto(`/teczka/${CASE}/rozmowa-rozpoczynajaca`)
  await expect(page.getByText('Kryteria dodatkowe wybrane przez oceniającego (nie więcej niż 3)')).toBeVisible()
  await expect(page.getByRole('group', { name: /Kryteria dodatkowe \(\d\/3\)/ })).toHaveCount(0)
})
