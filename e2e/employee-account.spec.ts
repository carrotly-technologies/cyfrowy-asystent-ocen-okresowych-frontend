import { expect, test } from '@playwright/test'
import { resetDemo, signIn } from './helpers.ts'

/** HR creates an account for a person from the kartoteka; the person signs in with the temporary password. */
test.beforeEach(async ({ request }) => {
  await resetDemo(request)
})

test('Kartoteka: HR tworzy konto pracownika, pracownik loguje się hasłem tymczasowym i widzi swoją ocenę', async ({ page, browser }) => {
  await signIn(page, 'a.lis')
  await page.goto('/kartoteka/p-lewandowski')
  const panel = page.getByRole('region', { name: 'Konto w systemie' })
  await expect(panel.getByLabel('Login pracownika')).toHaveValue('m.lewandowski')
  await panel.getByRole('button', { name: 'Utwórz konto dla pracownika' }).click()
  await expect(panel.getByRole('status')).toContainText('Hasło tymczasowe jest pokazywane tylko teraz')
  await expect(panel.getByRole('button', { name: 'Skopiuj' })).toBeVisible()
  const login = (await panel.getByTestId('account-login').textContent())!.trim()
  const password = (await panel.getByTestId('account-password').textContent())!.trim()
  expect(login).toBe('m.lewandowski')
  expect(password).toHaveLength(12)

  // After a reload only the login is shown, never the password.
  await page.reload()
  await expect(page.getByRole('region', { name: 'Konto w systemie' })).toContainText('Konto: m.lewandowski')
  await expect(page.getByText(password)).toHaveCount(0)

  const context = await browser.newContext()
  const employee = await context.newPage()
  await employee.goto('/logowanie')
  await employee.getByLabel('Login').fill(login)
  await employee.getByLabel('Hasło').fill(password)
  await employee.getByRole('button', { name: 'Zaloguj się' }).click()
  await expect(employee).not.toHaveURL(/\/logowanie/)
  await employee.goto('/moje-oceny')
  await expect(employee.getByRole('main')).toContainText(/ocen/i)
  await expect(employee.locator('a[href*="/moje-oceny/c-003"]').first()).toBeVisible()
  await context.close()
})

test('Kartoteka: pracownik z kontem pokazuje „Konto: <login>”', async ({ page }) => {
  await signIn(page, 'a.lis')
  await page.goto('/kartoteka/p-nowak')
  await expect(page.getByRole('region', { name: 'Konto w systemie' })).toContainText('Konto: a.nowak')
  await expect(page.getByRole('button', { name: 'Utwórz konto dla pracownika' })).toHaveCount(0)
})
