import { expect, test } from '@playwright/test'
import { apiPost, confirmDialog, resetDemo, sessionFor, signIn } from './helpers.ts'

/**
 * Sprzeciw after the assessment (art. 83 ustawy o służbie cywilnej), seed case c-301 (Tadeusz Jankowski, evaluator
 * r.sikora, objection waiting for the dyrektor generalny b.wisniewska). DEMO_TODAY = 21.11.2026.
 */
const CASE = 'c-301'

test.beforeEach(async ({ request }) => {
  await resetDemo(request)
})

test('DG oddala sprzeciw: walidacja daty doręczenia, termin do sądu w potwierdzeniu i u ocenianego', async ({ page, browser }) => {
  await signIn(page, 'b.wisniewska')
  await page.goto(`/sprzeciwy/${CASE}`)
  await page.getByText('Nie uwzględniam sprzeciwu (oddalenie)').click()
  const delivered = page.getByLabel('Data doręczenia rozstrzygnięcia ocenianemu')
  await page.getByLabel('Uzasadnienie rozstrzygnięcia').fill('Opóźnienia wynikały z organizacji pracy ocenianego.')

  // Garbage and a future date are refused at the field, before anything is sent.
  await delivered.fill('21.11.20263.11.2026')
  await page.getByRole('button', { name: 'Zapisz rozstrzygnięcie' }).click()
  await expect(page.getByText(/Wpisz datę doręczenia w formacie dd\.mm\.rrrr/)).toBeVisible()
  await delivered.fill('23.11.2026')
  await page.getByRole('button', { name: 'Zapisz rozstrzygnięcie' }).click()
  await expect(page.getByText('Data doręczenia nie może być późniejsza niż dziś (21.11.2026).')).toBeVisible()

  await delivered.fill('21.11.2026')
  await page.getByRole('button', { name: 'Zapisz rozstrzygnięcie' }).click()
  const dialog = page.getByRole('dialog', { name: 'Zatwierdzić rozstrzygnięcie sprzeciwu?' })
  await expect(dialog.getByText('Doręczenie ocenianemu')).toBeVisible()
  // 21.11 + 14 days = 05.12 (Saturday) → Monday 07.12.2026, computed by the API.
  await expect(dialog.getByText('07.12.2026')).toBeVisible()
  await expect(dialog.getByText(/osoba oceniająca/)).toBeVisible()
  await confirmDialog(page, 'Zatwierdzić rozstrzygnięcie sprzeciwu?', 'Tak, zatwierdzam')
  await expect(page.getByText(/Sprzeciw nieuwzględniony \(oddalony\)/)).toBeInViewport()

  // The assessed person: "Stan i terminy" shows the labour court term, not the old objection term.
  const employee = await sessionFor(browser, 't.jankowski')
  await employee.goto(`/moje-oceny/${CASE}`)
  const status = employee.getByRole('region', { name: 'Stan i terminy' })
  await expect(status.getByText('Termin na odwołanie do sądu pracy')).toBeVisible()
  await expect(status.getByText('07.12.2026')).toBeVisible()
  await expect(status.getByText(/Termin na (wniesienie )?sprzeciw/)).toHaveCount(0)
  await employee.context().close()
})

test('zmiana oceny przez DG: baner i blokada części II u oceniającego, brak kolejnego sprzeciwu u ocenianego', async ({ page, browser, request }) => {
  await apiPost(request, 'b.wisniewska', `/cases/${CASE}/objection/decision`, {
    outcome: 'CHANGE',
    reason: 'Opóźnienia wynikały z późnego przekazania opisów przedmiotu zamówienia.',
    decisions: { rzetelnosc: 5, organizacja_pracy: 5 },
  })

  // Evaluator: the decision is on the page, part II is locked, only signing and the hand-over are left.
  await signIn(page, 'r.sikora')
  await page.goto(`/teczka/${CASE}/podpis`)
  await expect(page.getByText(/uwzględnił sprzeciw i zmienił ocenę \(\d\d\./)).toBeVisible()
  await expect(page.getByText(/Opóźnienia wynikały z późnego przekazania/).first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Wróć do oceny, aby poprawić część II lub III' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Podpisz ocenę' }).click()
  await confirmDialog(page, 'Podpisać ocenę?', 'Podpisz ocenę')
  await page.getByRole('button', { name: 'Przekaż ocenianemu do zapoznania' }).click()
  const send = page.getByRole('dialog', { name: 'Przekazać ocenę ocenianemu?' })
  await expect(send.getByText(/nie przysługuje kolejny sprzeciw/)).toBeVisible()
  await confirmDialog(page, 'Przekazać ocenę ocenianemu?', 'Przekaż do zapoznania')

  // Assessed person: the acknowledgement is confirmed in a dialog; then the case is finished, no objection form.
  const employee = await sessionFor(browser, 't.jankowski')
  await employee.goto(`/moje-oceny/${CASE}`)
  await expect(employee.getByText(/Przeczytaj zmienioną ocenę/)).toBeVisible()
  await employee.getByRole('button', { name: 'Zapoznałem(-am) się z oceną' }).click()
  const ack = employee.getByRole('dialog', { name: 'Potwierdzić zapoznanie z oceną?' })
  await expect(ack.getByText(/nie przysługuje kolejny sprzeciw/)).toBeVisible()
  await confirmDialog(employee, 'Potwierdzić zapoznanie z oceną?', 'Potwierdzam zapoznanie')
  await expect(employee.locator('.page-head').getByText('Zakończona')).toBeVisible()
  await expect(employee.getByRole('button', { name: 'Wnieś sprzeciw' })).toHaveCount(0)
  await expect(employee.getByText(/Termin na wniesienie sprzeciwu/)).toHaveCount(0)
  await employee.context().close()
})
