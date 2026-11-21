import { expect, test, type Page } from '@playwright/test'
import { patchCase, resetDemo, sessionFor, signIn } from './helpers.ts'

/**
 * The whole periodic assessment in the browser, against the backend demo seed:
 * case c-004 (Julia Mazur, account j.mazur) waits at step 1 for its supervisor j.kaminska.
 */
const CASE = 'c-004'
const SUPERVISOR = 'j.kaminska'
const EMPLOYEE = 'j.mazur'

test.beforeEach(async ({ request }) => {
  await resetDemo(request)
})

/** Every partial score of part II set to `points` (one radio per criterion row; the choice saves at once). */
async function scoreAll(page: Page, points: number) {
  const radios = page.locator(`input[type="radio"][name^="decision-"][value="${points}"]`)
  await expect(radios.first()).toBeVisible()
  const n = await radios.count()
  expect(n).toBeGreaterThan(0)
  for (let i = 0; i < n; i++) {
    // Controlled by the saved case: the radio is checked once the PATCH answers.
    await radios.nth(i).click()
    await expect(radios.nth(i)).toBeChecked()
  }
}

test('przełożony i oceniany przechodzą całą ocenę okresową', async ({ page, browser }) => {
  await signIn(page, SUPERVISOR)

  // Krok 1: arkusz i kryteria dodatkowe.
  await page.goto(`/teczka/${CASE}/arkusz-i-kryteria`)
  await expect(page.getByText('Propozycja systemu: arkusz C', { exact: true })).toBeVisible()
  await page.getByRole('radio', { name: /Arkusz C/ }).check()
  await page.getByRole('checkbox', { name: 'Kreatywność', exact: true }).check()
  await page.getByRole('checkbox', { name: 'Myślenie analityczne', exact: true }).check()
  await expect(page.getByText('Kryteria dodatkowe (2/3)', { exact: true })).toBeVisible()
  await page.getByLabel('Termin sporządzenia oceny').fill('2028-11-20')
  await page.getByRole('button', { name: 'Zatwierdź arkusz i kryteria' }).click()

  // Krok 2: rozmowa rozpoczynająca, część I potwierdzona przez oceniającego.
  await expect(page).toHaveURL(new RegExp(`/teczka/${CASE}/rozmowa-rozpoczynajaca`))
  await expect(page.getByRole('heading', { name: /Część I – Arkusz C/ })).toBeVisible()
  // Submitting empty part I shows what is missing and does not move on.
  await page.getByRole('button', { name: 'Zatwierdź część I' }).click()
  await expect(page.getByRole('link', { name: /Wpisz notatkę do zagadnienia/ }).first()).toBeVisible()
  await expect(page).toHaveURL(/rozmowa-rozpoczynajaca/)
  const notes = page.locator('form textarea:not([readonly])')
  const count = await notes.count()
  for (let i = 0; i < count; i++) await notes.nth(i).fill(`Notatka z rozmowy rozpoczynającej ${i + 1}.`)
  await page.locator('#confirm-part-i-0').check()
  await page.locator('#confirm-part-i-1').check()
  await page.getByRole('button', { name: 'Zatwierdź część I' }).click()

  // Krok 3: czeka na ocenianego.
  await expect(page).toHaveURL(new RegExp(`/teczka/${CASE}/potwierdzenie-czesci-i`))
  await expect(page.getByText('Czeka na potwierdzenie ocenianego', { exact: true })).toBeVisible()

  // Oceniany potwierdza część I na swoim koncie.
  const employee = await sessionFor(browser, EMPLOYEE)
  await expect(employee).toHaveURL(/\/moje-oceny/)
  // j.mazur has one assessment: the c-004 cycle.
  await employee.getByRole('table').getByRole('link').first().click()
  await expect(employee).toHaveURL(new RegExp(`/moje-oceny/${CASE}`))
  await expect(employee.getByText('Potwierdź rozmowę rozpoczynającą', { exact: true })).toBeVisible()
  await employee.getByRole('button', { name: 'Potwierdzam' }).click()
  await expect(employee.getByText('Nie masz teraz nic do potwierdzenia')).toBeVisible()

  // Krok 4–5: przełożony kończy obserwacje i ocenia (część II i III).
  await page.goto(`/teczka/${CASE}`)
  await expect(page).toHaveURL(new RegExp(`/teczka/${CASE}/obserwacje`))
  await page.getByRole('button', { name: 'Zakończ obserwacje i przejdź do oceny' }).click()
  await expect(page).toHaveURL(new RegExp(`/teczka/${CASE}/ocena\\?czesc=2`))
  await scoreAll(page, 7)
  await expect(page.getByText('Pozytywna', { exact: true })).toBeVisible()
  await page.getByLabel('Wnioski dotyczące indywidualnego programu rozwoju zawodowego').fill('Szkolenie z analizy danych do końca 2027 r.')
  await page.getByRole('button', { name: 'Dalej' }).click()
  await expect(page).toHaveURL(/czesc=3/)
  await page.getByRole('button', { name: 'Rozmowa oceniająca przeprowadzona' }).click()

  // Krok 6: kontrola formalna, podpis, przekazanie do zapoznania.
  await expect(page).toHaveURL(new RegExp(`/teczka/${CASE}/podpis`))
  await expect(page.getByText('bez uwag', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Podpisz ocenę' }).click()
  await page.getByRole('button', { name: 'Przekaż ocenianemu do zapoznania' }).click()
  await expect(page.getByText('Czeka na zapoznanie ocenianego', { exact: true })).toBeVisible()

  // Krok 7: oceniany zapoznaje się z oceną.
  await employee.reload()
  await expect(employee.getByText('Zapoznaj się z oceną', { exact: true })).toBeVisible()
  await employee.getByRole('button', { name: 'Zapoznałem(-am) się z oceną' }).click()
  await expect(employee.getByText(/Zapoznałeś\(-aś\) się z oceną/)).toBeVisible()

  await page.reload()
  await expect(page.getByText(/Oceniany zapoznał się z oceną \d/)).toBeVisible()
  await employee.context().close()
})

test('ocena negatywna blokuje podpis bez uzasadnienia', async ({ page, request }) => {
  // c-007 (Monika Zielińska): negative scores, the talk held, waiting for the signature. Setup: drop the justification.
  await patchCase(request, SUPERVISOR, 'c-007', { justification: '' })
  await signIn(page, SUPERVISOR)

  await page.goto('/teczka/c-007/podpis')
  await expect(page.getByText('1 do poprawy', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Podpisz ocenę' })).toBeDisabled()
  await expect(page.getByText(/Zatwierdzenie jest zablokowane/)).toBeVisible()

  // Part II does not let the evaluator go on without the justification either.
  await page.goto('/teczka/c-007/ocena?czesc=2')
  await expect(page.getByText('Negatywna', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Dalej' }).click()
  await expect(page.getByRole('link', { name: 'Wpisz uzasadnienie: przy ocenie negatywnej jest obowiązkowe' })).toBeVisible()
  await expect(page).toHaveURL(/czesc=2/)

  // With the justification the formal check passes and the signature goes through.
  await page.getByLabel(/Uzasadnienie przyznanej oceny okresowej/).fill(
    'Rzetelność 1 pkt: trzykrotnie nie przekazano pism w terminie ustawowym mimo planu naprawczego.',
  )
  await page.getByRole('button', { name: 'Dalej' }).click()
  await expect(page).toHaveURL(/czesc=3/)
  await page.getByRole('button', { name: 'Dalej' }).click()
  await expect(page).toHaveURL(/\/teczka\/c-007\/podpis/)
  await expect(page.getByText('bez uwag', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Podpisz ocenę' }).click()
  await expect(page.getByRole('button', { name: 'Przekaż ocenianemu do zapoznania' })).toBeEnabled()
})
