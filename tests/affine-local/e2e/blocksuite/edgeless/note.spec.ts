import { test } from '@affine-test/kit/playwright';
import {
  clickEdgelessModeButton,
  clickView,
  createEdgelessNoteBlock,
  getEdgelessSelectedIds,
  getPageMode,
  getSelectedXYWH,
  locateEditorContainer,
  locateElementToolbar,
  locateModeSwitchButton,
  moveToView,
  resizeElementByHandle,
  toViewCoord,
} from '@affine-test/kit/utils/editor';
import {
  pasteByKeyboard,
  pressBackspace,
  pressEnter,
  pressEscape,
  selectAllByKeyboard,
  undoByKeyboard,
} from '@affine-test/kit/utils/keyboard';
import { openHomePage } from '@affine-test/kit/utils/load-page';
import {
  clickNewPageButton,
  type,
  waitForEditorLoad,
} from '@affine-test/kit/utils/page-logic';
import type {
  EdgelessRootBlockComponent,
  NoteBlockModel,
} from '@blocksuite/blocks';
import type { IVec } from '@blocksuite/global/utils';
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

// the first note block is called page block
test.describe('edgeless page block', () => {
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

  test('page title in toolbar should be displayed when page block is collapsed and hidden when page block is not collapsed', async ({
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
    const viewInPageButton = toolbar.getByTestId(
      'edgeless-note-view-in-page-button'
    );
    await viewInPageButton.click();

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

  test('page title should be editable', async ({ page }) => {
    const note = page.locator('affine-edgeless-note');
    const docTitle = note.locator('edgeless-page-block-title');
    await expect(docTitle).toBeVisible();
    await expect(docTitle).toHaveText(title);

    await note.dblclick();
    await docTitle.click();

    // clear the title
    await selectAllByKeyboard(page);
    await pressBackspace(page);
    await expect(docTitle).toHaveText('');

    // type new title
    await type(page, 'New Title');
    await expect(docTitle).toHaveText('New Title');

    // cursor could move between doc title and note content
    await page.keyboard.press('ArrowDown');
    await type(page, 'xx');

    const paragraphs = note.locator('affine-paragraph v-line');
    const numParagraphs = await paragraphs.count();
    await expect(paragraphs.first()).toHaveText('xxHello');

    await page.keyboard.press('ArrowUp');
    await type(page, 'yy');
    await expect(docTitle).toHaveText('yyNew Title');

    await pressEnter(page);
    await expect(docTitle).toHaveText('yy');
    await expect(paragraphs).toHaveCount(numParagraphs + 1);
    await expect(paragraphs.nth(0)).toHaveText('New Title');
    await expect(paragraphs.nth(1)).toHaveText('xxHello');
  });
});

test.describe('edgeless note element toolbar', () => {
  test('the toolbar of page block should not contains auto-height button and display in page button', async ({
    page,
  }) => {
    await selectAllByKeyboard(page);
    const toolbar = locateElementToolbar(page);
    const autoHeight = toolbar.getByTestId('edgeless-note-auto-height');
    const displayInPage = toolbar.getByTestId('display-in-page');

    await expect(toolbar).toBeVisible();
    await expect(autoHeight).toHaveCount(0);
    await expect(displayInPage).toHaveCount(0);
  });

  test('the toolbar of note block should contains auto-height button and display in page button', async ({
    page,
  }) => {
    await createEdgelessNoteBlock(page, [100, 100]);
    await page.waitForSelector('.affine-paragraph-placeholder.visible');
    await clickView(page, [0, 0]);
    await clickView(page, [100, 100]);

    const toolbar = locateElementToolbar(page);
    const autoHeight = toolbar.getByTestId('edgeless-note-auto-height');
    const displayInPage = toolbar.getByTestId('display-in-page');

    await expect(toolbar).toBeVisible();
    await expect(autoHeight).toBeVisible();
    await expect(displayInPage).toBeVisible();
  });

  test('display in page button', async ({ page }) => {
    const editorContainer = locateEditorContainer(page);
    const notes = editorContainer.locator('affine-note');

    await createEdgelessNoteBlock(page, [100, 100]);
    await page.waitForSelector('.affine-paragraph-placeholder.visible');
    await page.keyboard.type('Note 2');
    await clickView(page, [0, 0]);
    await clickView(page, [100, 100]);

    const toolbar = locateElementToolbar(page);
    const displayInPage = toolbar.getByTestId('display-in-page');

    await displayInPage.click();
    await locateModeSwitchButton(page, 'page').click();
    expect(notes).toHaveCount(2);

    await clickEdgelessModeButton(page);
    await clickView(page, [100, 100]);
    await displayInPage.click();
    await locateModeSwitchButton(page, 'page').click();
    await waitForEditorLoad(page);
    expect(notes).toHaveCount(1);

    const undoButton = page.getByTestId('undo-display-in-page');
    const viewTocButton = page.getByTestId('view-in-toc');

    await clickEdgelessModeButton(page);
    await waitForEditorLoad(page);
    await clickView(page, [100, 100]);
    await displayInPage.click();
    expect(undoButton).toBeVisible();
    expect(viewTocButton).toBeVisible();

    await undoButton.click();
    await expect(undoButton).toBeHidden();
    await locateModeSwitchButton(page, 'page').click();
    await waitForEditorLoad(page);
    expect(notes).toHaveCount(1);

    await clickEdgelessModeButton(page);
    await waitForEditorLoad(page);
    await clickView(page, [100, 100]);
    await displayInPage.click();
    await undoByKeyboard(page);
    await page.waitForTimeout(500);
    expect(
      undoButton,
      'the toast should be hidden immediately when undo by keyboard'
    ).toBeHidden();

    await displayInPage.click();
    await viewTocButton.click();
    const toc = page.locator('affine-outline-panel');
    await toc.waitFor({ state: 'visible' });
    const highlightNoteCards = toc.locator(
      'affine-outline-note-card > [data-status="selected"]'
    );
    expect(highlightNoteCards).toHaveCount(1);
  });

  test('note edgeless styles', async ({ page }) => {
    const getNoteEdgelessProps = async (page: Page, noteId: string) => {
      const container = locateEditorContainer(page);
      return await container.evaluate((container: HTMLElement, noteId) => {
        const root = container.querySelector(
          'affine-edgeless-root'
        ) as EdgelessRootBlockComponent;
        const note = root.gfx.getElementById(noteId) as NoteBlockModel;
        return note.edgeless;
      }, noteId);
    };

    const toolbar = locateElementToolbar(page);

    await selectAllByKeyboard(page);
    const noteId = (await getEdgelessSelectedIds(page))[0];

    expect(await getNoteEdgelessProps(page, noteId)).toEqual({
      style: {
        borderRadius: 8,
        borderSize: 4,
        borderStyle: 'none',
        shadowType: '--affine-note-shadow-box',
      },
    });

    await toolbar.getByRole('button', { name: 'Shadow style' }).click();
    await toolbar.getByTestId('affine-note-shadow-film').click();

    expect(await getNoteEdgelessProps(page, noteId)).toEqual({
      style: {
        borderRadius: 8,
        borderSize: 4,
        borderStyle: 'none',
        shadowType: '--affine-note-shadow-film',
      },
    });

    await toolbar.getByRole('button', { name: 'Border style' }).click();
    await toolbar.locator('.mode-solid').click();
    await toolbar.getByRole('button', { name: 'Border style' }).click();
    await toolbar.locator('edgeless-line-width-panel').getByLabel('8').click();

    expect(await getNoteEdgelessProps(page, noteId)).toEqual({
      style: {
        borderRadius: 8,
        borderSize: 8,
        borderStyle: 'solid',
        shadowType: '--affine-note-shadow-film',
      },
    });

    await toolbar.getByRole('button', { name: 'Corners' }).click();
    await toolbar.locator('edgeless-size-panel').getByText('Large').click();

    expect(await getNoteEdgelessProps(page, noteId)).toEqual({
      style: {
        borderRadius: 24,
        borderSize: 8,
        borderStyle: 'solid',
        shadowType: '--affine-note-shadow-film',
      },
    });

    const headerToolbar = page.getByTestId('edgeless-page-block-header');
    const toggleButton = headerToolbar.getByTestId(
      'edgeless-note-toggle-button'
    );
    await toggleButton.click();

    expect(await getNoteEdgelessProps(page, noteId)).toEqual({
      collapse: true,
      collapsedHeight: 48,
      style: {
        borderRadius: 24,
        borderSize: 8,
        borderStyle: 'solid',
        shadowType: '--affine-note-shadow-film',
      },
    });
  });
});

test.describe('note block rendering', () => {
  test('collapsed content rendering', async ({ page }) => {
    await createEdgelessNoteBlock(page, [50, 50]);

    await type(page, 'paragraph 1');
    for (let i = 0; i < 5; i++) {
      await pressEnter(page);
    }
    await type(page, 'paragraph 2');
    await pressEscape(page, 3);
    await clickView(page, [50, 50]);
    await resizeElementByHandle(page, [0, -50], 'bottom-right');
    const xywh = await getSelectedXYWH(page);
    const center: IVec = [xywh[0] + xywh[2] / 2, xywh[1] + xywh[3] / 2];

    const note = page
      .locator('affine-edgeless-note')
      .getByTestId('edgeless-note-clip-container')
      .nth(1);

    await expect(note, 'should hide collapsed content').toHaveCSS(
      'overflow-y',
      'clip'
    );
    await moveToView(page, center);
    await expect(note, 'should show collapsed content when hover').toHaveCSS(
      'overflow-y',
      'visible'
    );

    const [x1, y1] = await toViewCoord(page, center);
    const [x2, y2] = await toViewCoord(page, [center[0], center[1] + 25]);
    const [x3, y3] = await toViewCoord(page, [center[0], center[1] + 50]);
    await page.mouse.move(x1, y1);
    await page.mouse.down();

    await page.mouse.move(x2, y2, { steps: 10 });
    await expect(
      note,
      'should hide collapsed content during dragging'
    ).toHaveCSS('overflow-y', 'clip');
    await page.mouse.move(x3, y3, { steps: 10 });
    await page.mouse.up();
    await page.mouse.move(x3, y3);
    await expect(
      note,
      'should show collapsed content when dragging is finished'
    ).toHaveCSS('overflow-y', 'visible');
  });
});
