import { test } from '@affine-test/kit/playwright';
import {
  clickEdgelessModeButton,
  createEdgelessNoteBlock,
  getEdgelessSelectedIds,
  getPageMode,
  locateEditorContainer,
  locateElementToolbar,
} from '@affine-test/kit/utils/editor';
import {
  pasteByKeyboard,
  selectAllByKeyboard,
} from '@affine-test/kit/utils/keyboard';
import { openHomePage } from '@affine-test/kit/utils/load-page';
import {
  clickNewPageButton,
  waitForEditorLoad,
} from '@affine-test/kit/utils/page-logic';
import { expect, type Page } from '@playwright/test';

const title = 'Edgeless Note Header Test';

test.beforeEach(async ({ page }) => {
  await openHomePage(page);
  await waitForEditorLoad(page);
  await clickNewPageButton(page, title);
  await page.keyboard.press('Enter');
  await page.keyboard.type('Hello');
  await page.keyboard.press('Enter');
  await page.keyboard.type('World');
  await clickEdgelessModeButton(page);
  const container = locateEditorContainer(page);
  await container.click();
});

test.describe('edgeless page header toolbar', () => {
  const locateHeaderToolbar = (page: Page) =>
    page.getByTestId('edgeless-page-block-header');

  test('only first note block has header toolbar and its element toolbar', async ({
    page,
  }) => {
    const toolbar = locateHeaderToolbar(page);
    await expect(toolbar).toHaveCount(1);
    await expect(toolbar).toBeVisible();

    await createEdgelessNoteBlock(page, [100, 100]);

    await expect(toolbar).toHaveCount(1);
    await expect(toolbar).toBeVisible();
  });

  test('should shrink note block when clicking on the toggle button', async ({
    page,
  }) => {
    const toolbar = locateHeaderToolbar(page);
    const toolBox = await toolbar.boundingBox();
    const noteBox = await page.locator('affine-edgeless-note').boundingBox();
    if (!noteBox || !toolBox) throw new Error('Bounding box not found');
    expect(noteBox.height).toBeGreaterThan(toolBox.height);

    const toggleButton = toolbar.getByTestId('edgeless-note-toggle-button');
    await toggleButton.click();

    const newNoteBox = await page.locator('affine-edgeless-note').boundingBox();
    if (!newNoteBox) throw new Error('Bounding box not found');
    expect(newNoteBox.height).toBe(toolBox.height);

    await toggleButton.click();
    const newNoteBox2 = await page
      .locator('affine-edgeless-note')
      .boundingBox();
    if (!newNoteBox2) throw new Error('Bounding box not found');
    expect(newNoteBox2).toEqual(noteBox);
  });

  test('page title should be displayed when page block is collapsed and hidden when page block is not collapsed', async ({
    page,
  }) => {
    const toolbar = locateHeaderToolbar(page);
    const toolbarTitle = toolbar.getByTestId('edgeless-note-title');
    await expect(toolbarTitle).toHaveText('');

    const toggleButton = toolbar.getByTestId('edgeless-note-toggle-button');
    await toggleButton.click();
    await expect(toolbarTitle).toHaveText(title);

    await toggleButton.click();
    await expect(toolbarTitle).toHaveText('');
  });

  test('should switch to page mode when expand button is clicked', async ({
    page,
  }) => {
    const toolbar = locateHeaderToolbar(page);
    const expandButton = toolbar.getByTestId('edgeless-note-expand-button');
    await expandButton.click();

    expect(await getPageMode(page)).toBe('page');
  });

  test('should open doc properties dialog when info button is clicked', async ({
    page,
  }) => {
    const toolbar = locateHeaderToolbar(page);
    const infoButton = toolbar.getByTestId('edgeless-note-info-button');
    await infoButton.click();
    const infoModal = page.getByTestId('info-modal');
    await expect(infoModal).toBeVisible();
  });

  test('should copy note edgeless link to clipboard when link button is clicked', async ({
    page,
  }) => {
    const toolbar = locateHeaderToolbar(page);
    await selectAllByKeyboard(page);
    const noteId = (await getEdgelessSelectedIds(page))[0];

    const linkButton = toolbar.getByTestId('edgeless-note-link-button');
    await linkButton.click();

    const url = page.url();
    const link = await page.evaluate(() => navigator.clipboard.readText());
    expect(link).toBe(`${url}&blockIds=${noteId}`);
  });

  test('info button should hidden in peek view', async ({ page }) => {
    const url = page.url();
    await page.evaluate(url => navigator.clipboard.writeText(url), url);

    await clickNewPageButton(page);
    await page.keyboard.press('Enter');
    await pasteByKeyboard(page);
    const reference = page.locator('affine-reference');
    await reference.click({ modifiers: ['Shift'] });

    const toolbar = locateHeaderToolbar(page);
    const infoButton = toolbar.getByTestId('edgeless-note-info-button');

    await expect(toolbar).toBeVisible();
    await expect(infoButton).toBeHidden();
  });
});

test.describe('edgeless note element toolbar', () => {
  test('the toolbar of page block should not contains auto-height', async ({
    page,
  }) => {
    await selectAllByKeyboard(page);
    const toolbar = locateElementToolbar(page);
    const autoHeight = toolbar.getByTestId('edgeless-note-auto-height');

    await expect(toolbar).toBeVisible();
    await expect(autoHeight).toHaveCount(0);
  });
});
