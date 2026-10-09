import { expect, type Page } from '@playwright/test';

export const ADMIN = 'admin@northwind.test';
export const VIEWER = 'user@northwind.test';
const PASSWORD = 'Password123!';

export async function signIn(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/patients/);
  await expect(page.getByRole('heading', { name: 'Patients', level: 1 })).toBeVisible();
}
