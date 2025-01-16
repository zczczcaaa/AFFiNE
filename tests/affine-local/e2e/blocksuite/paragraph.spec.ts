import { test } from '@affine-test/kit/playwright';
import { locateFormatBar } from '@affine-test/kit/utils/editor';
import { selectAllByKeyboard } from '@affine-test/kit/utils/keyboard';
import { openHomePage } from '@affine-test/kit/utils/load-page';
import {
  clickNewPageButton,
  waitForEditorLoad,
} from '@affine-test/kit/utils/page-logic';
import { expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await openHomePage(page);
  await clickNewPageButton(page, 'Paragraph Test');
  await waitForEditorLoad(page);
});

test('heading icon should be updated after change heading level', async ({
  page,
}) => {
  await page.keyboard.press('Enter');
  await page.keyboard.type('Hello');
  // Hello|
  // empty paragraph

  const paragraph = page.locator('affine-note affine-paragraph').nth(0);

  await selectAllByKeyboard(page);
  const formatBar = locateFormatBar(page);
  await formatBar.locator('.paragraph-button').hover();
  await formatBar.getByTestId('affine:paragraph/h1').click();

  await paragraph.hover();
  await expect(page.getByTestId('heading-icon-1')).toBeVisible();

  await selectAllByKeyboard(page);
  await formatBar.locator('.paragraph-button').hover();
  await formatBar.getByTestId('affine:paragraph/h2').click();

  await paragraph.hover();
  await expect(page.getByTestId('heading-icon-1')).toBeHidden();
  await expect(page.getByTestId('heading-icon-2')).toBeVisible();
});
