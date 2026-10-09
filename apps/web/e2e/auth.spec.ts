import { expect, test } from '@playwright/test';

import { signIn, VIEWER } from './support';

test.describe('authentication', () => {
  test('protects routes and returns the user where they were going', async ({ page }) => {
    await page.goto('/patients?search=ada');
    await expect(page).toHaveURL(/\/login\?next=%2Fpatients%3Fsearch%3Dada/);
  });

  test('rejects invalid credentials with a clear message', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@northwind.test');
    await page.getByLabel('Password', { exact: true }).fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert').filter({ hasText: /\w/ })).toHaveText(
      'Invalid email or password.',
    );
  });

  test('viewers get a read-only experience', async ({ page }) => {
    await signIn(page, VIEWER);
    await expect(page.getByText('View only')).toBeVisible();
    await expect(page.getByRole('button', { name: 'New patient' })).toHaveCount(0);
  });

  test('signing out ends the session', async ({ page }) => {
    await signIn(page, VIEWER);
    await page.getByRole('button', { name: /Account/ }).click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto('/patients');
    await expect(page).toHaveURL(/\/login/);
  });

  test('a tampered session cookie is rejected by the API, not trusted by the UI', async ({
    page,
    context,
  }) => {
    await signIn(page, VIEWER);
    const [cookie] = (await context.cookies()).filter((c) => c.name === 'pm_session');
    if (!cookie) throw new Error('session cookie missing');
    const [header, payload] = cookie.value.split('.');
    // Same claims (still unexpired, so the edge lets it through), but an invalid signature.
    await context.addCookies([{ ...cookie, value: `${header ?? ''}.${payload ?? ''}.forged` }]);
    await page.reload();
    await expect(page).toHaveURL(/\/login\?.*reason=expired/);
  });
});
