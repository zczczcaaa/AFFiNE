import { test } from '@affine-test/kit/mobile';
import { expect, type Page } from '@playwright/test';

const openSettings = async (page: Page) => {
  await page.getByTestId('settings-button').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('header:has-text("Settings")')).toBeVisible();
};

test('can open settings', async ({ page }) => {
  await openSettings(page);
});

test('can change theme', async ({ page }) => {
  await openSettings(page);
  await page
    .getByTestId('setting-row')
    .filter({
      hasText: 'Color mode',
    })
    .getByTestId('dropdown-select-trigger')
    .click();

  await expect(
    page.getByRole('dialog').filter({
      has: page.getByRole('menuitem', { name: 'Light' }),
    })
  ).toBeVisible();

  await page.getByRole('menuitem', { name: 'Dark' }).click();

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('can close change theme popover by clicking outside', async ({ page }) => {
  await openSettings(page);
  await page
    .getByTestId('setting-row')
    .filter({
      hasText: 'Color mode',
    })
    .getByTestId('dropdown-select-trigger')
    .click();

  const themePopover = page.getByRole('dialog').filter({
    has: page.getByRole('menuitem', { name: 'Light' }),
  });

  await expect(themePopover).toBeVisible();

  // get a mouse position that is 10px offset to the top of theme popover
  // and click
  const mousePosition = await themePopover.boundingBox();
  if (!mousePosition) {
    throw new Error('theme popover is not visible');
  }
  await page.mouse.click(mousePosition.x, mousePosition.y - 10);

  await expect(themePopover).not.toBeVisible();
});
