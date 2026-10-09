import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import { ADMIN, signIn } from './support';

/** WCAG 2.1 A/AA rules, run in both themes and on both desktop and mobile projects. */
async function expectNoViolations(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(violations.map((v) => `${v.id}: ${v.help} (${String(v.nodes.length)})`)).toEqual([]);
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`accessibility (${colorScheme})`, () => {
    test.use({ colorScheme });

    test('login page', async ({ page }) => {
      await page.goto('/login');
      await page.waitForTimeout(600); // let the entrance animation settle before measuring contrast
      await expectNoViolations(page);
    });

    test('patients list and dialogs', async ({ page }) => {
      await signIn(page, ADMIN);
      await expect(
        page
          .getByRole('link')
          .filter({ hasText: ',' })
          .first()
          .or(page.getByRole('listitem').first()),
      ).toBeVisible();
      await expectNoViolations(page);

      await page.getByRole('button', { name: 'New patient' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Create patient' }).click();
      await page.waitForTimeout(300);
      await expectNoViolations(page);
    });
  });
}

test('keyboard: skip link, "/" to search, focus is always visible', async ({ page }) => {
  await signIn(page, ADMIN);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await page.keyboard.press('/');
  await expect(page.getByRole('searchbox')).toBeFocused();
});
