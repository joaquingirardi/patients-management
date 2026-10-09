import { expect, test } from '@playwright/test';

import { ADMIN, signIn } from './support';

test.describe('patients lifecycle (admin)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'The full CRUD journey runs on desktop; mobile is covered by a11y + layout checks.',
  );

  test('create → find → view → edit → delete', async ({ page }) => {
    // Unique per run, letters only (names reject digits by design).
    const lastName = `Zeta${Date.now()
      .toString(26)
      .replace(/\d/g, (d) => 'abcdefghij'[Number(d)] ?? '')}`;
    await signIn(page, ADMIN);

    // Create
    await page.getByRole('button', { name: 'New patient' }).click();
    const dialog = page.getByRole('dialog', { name: 'New patient' });
    await dialog.getByLabel('First name').fill('Hedy');
    await dialog.getByLabel('Last name').fill(lastName);
    await dialog.getByLabel('Email').fill('hedy@example.com');
    await dialog.getByLabel('Phone number').fill('+43 1 234 5678');
    await dialog.getByLabel('Date of birth').fill('1914-11-09');
    await dialog.getByRole('button', { name: 'Create patient' }).click();
    await expect(page.getByText(`Hedy ${lastName} was added`)).toBeVisible();

    // Find (URL-synced search)
    await page.getByRole('searchbox').fill(lastName);
    await expect(page).toHaveURL(new RegExp(`search=${lastName}`));
    const row = page.getByRole('row', { name: new RegExp(`${lastName}, Hedy`) });
    await expect(row).toBeVisible();

    // View (intercepted route → modal), then close back to the list with state intact
    await row.getByRole('link').click();
    const details = page.getByRole('dialog');
    await expect(details.getByRole('heading', { name: `Hedy ${lastName}` })).toBeVisible();
    await expect(details.getByText('+4312345678')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(new RegExp(`/patients\\?search=${lastName}`));

    // Edit
    await row.getByRole('button', { name: /Actions for/ }).click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();
    const edit = page.getByRole('dialog', { name: 'Edit patient' });
    await edit.getByLabel('First name').fill('Hedwig');
    await edit.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Changes saved')).toBeVisible();
    await expect(page.getByRole('row', { name: new RegExp(`${lastName}, Hedwig`) })).toBeVisible();

    // Delete
    await page
      .getByRole('row', { name: new RegExp(lastName) })
      .getByRole('button', { name: /Actions for/ })
      .click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Delete patient' }).click();
    await expect(page.getByText(`Hedwig ${lastName} was deleted`)).toBeVisible();
    await expect(page.getByText('No matching patients')).toBeVisible();
  });

  test('details are a real page on direct visit (deep link)', async ({ page }) => {
    await signIn(page, ADMIN);
    const href = await page.getByRole('table').getByRole('link').first().getAttribute('href');
    await page.goto(href ?? '/patients');
    await expect(page.getByRole('link', { name: 'All patients' })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});
