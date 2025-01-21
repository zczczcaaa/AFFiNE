import { test } from '@affine-test/kit/playwright';
import {
  clickEdgelessModeButton,
  clickPageModeButton,
  clickView,
  createEdgelessNoteBlock,
  locateElementToolbar,
} from '@affine-test/kit/utils/editor';
import {
  pressBackspace,
  pressEnter,
  selectAllByKeyboard,
} from '@affine-test/kit/utils/keyboard';
import { openHomePage } from '@affine-test/kit/utils/load-page';
import {
  clickNewPageButton,
  type,
  waitForEditorLoad,
} from '@affine-test/kit/utils/page-logic';
import {
  closeSettingModal,
  confirmExperimentalPrompt,
  openExperimentalFeaturesPanel,
  openSettingModal,
} from '@affine-test/kit/utils/setting';
import { openRightSideBar } from '@affine-test/kit/utils/sidebar';
import { expect, type Locator, type Page } from '@playwright/test';

import {
  createHeadings,
  createTitle,
  getVerticalCenterFromLocator,
} from './utils';

async function openTocPanel(page: Page) {
  await openRightSideBar(page, 'outline');
  const toc = page.locator('affine-outline-panel');
  await toc.waitFor({ state: 'visible' });
  return toc;
}

function getTocHeading(panel: Locator, level: number) {
  return panel.locator(`.h${level} span`);
}

async function dragNoteCard(page: Page, fromCard: Locator, toCard: Locator) {
  const fromRect = await fromCard.boundingBox();
  const toRect = await toCard.boundingBox();

  await page.mouse.move(fromRect!.x + 10, fromRect!.y + 10);
  await page.mouse.down();
  await page.mouse.move(toRect!.x + 5, toRect!.y + 5, { steps: 20 });
  await page.mouse.up();
}

test.beforeEach(async ({ page }) => {
  await openHomePage(page);
  await clickNewPageButton(page);
  await waitForEditorLoad(page);
});

test('should display title and headings when there are non-empty headings in editor', async ({
  page,
}) => {
  await createTitle(page);
  await createHeadings(page);

  const toc = await openTocPanel(page);

  await expect(toc.locator('.title')).toBeVisible();
  for (let i = 1; i <= 6; i++) {
    await expect(getTocHeading(toc, i)).toBeVisible();
    await expect(getTocHeading(toc, i)).toContainText(`Heading ${i}`);
  }
});

test('should display placeholder when no headings', async ({ page }) => {
  const toc = await openTocPanel(page);
  const noHeadingPlaceholder = toc.locator('.note-placeholder');

  await createTitle(page);
  await pressEnter(page);
  await type(page, 'hello world');

  await expect(noHeadingPlaceholder).toBeVisible();
});

test('should not display headings when there are only empty headings', async ({
  page,
}) => {
  await createTitle(page);

  // create empty headings
  for (let i = 1; i <= 6; i++) {
    await type(page, `${'#'.repeat(i)} `);
    await pressEnter(page);
  }

  const toc = await openTocPanel(page);

  await expect(toc.locator('.title')).toBeHidden();
  for (let i = 1; i <= 6; i++) {
    await expect(getTocHeading(toc, i)).toBeHidden();
  }
});

test('should update panel when modify or clear title or headings', async ({
  page,
}) => {
  const title = await createTitle(page);
  const headings = await createHeadings(page);

  const toc = await openTocPanel(page);

  await title.scrollIntoViewIfNeeded();
  await title.click();
  await type(page, 'xxx');
  await expect(toc.locator('.title')).toContainText(['Titlexxx']);
  await selectAllByKeyboard(page);
  await pressBackspace(page);
  await expect(toc.locator('.title')).toBeHidden();

  for (let i = 1; i <= 6; i++) {
    await headings[i - 1].click();
    await type(page, 'xxx');
    await expect(getTocHeading(toc, i)).toContainText(`Heading ${i}xxx`);
    await selectAllByKeyboard(page);
    await pressBackspace(page);
    await expect(getTocHeading(toc, i)).toBeHidden();
  }
});

test('should add padding to sub-headings', async ({ page }) => {
  await createHeadings(page);

  const toc = await openTocPanel(page);

  let prev = getTocHeading(toc, 1);
  for (let i = 2; i <= 6; i++) {
    const curr = getTocHeading(toc, i);

    const prevRect = await prev.boundingBox();
    const currRect = await curr.boundingBox();

    expect(prevRect).not.toBeNull();
    expect(currRect).not.toBeNull();

    expect(prevRect!.x).toBeLessThan(currRect!.x);
    prev = curr;
  }
});

test('should highlight heading when scroll to area before viewport center', async ({
  page,
}) => {
  const title = await createTitle(page);
  for (let i = 0; i < 3; i++) {
    await pressEnter(page);
  }
  const headings = await createHeadings(page, 10);
  await title.scrollIntoViewIfNeeded();

  const toc = await openTocPanel(page);

  const viewportCenter = await getVerticalCenterFromLocator(
    page.locator('body')
  );

  const activeHeadingContainer = toc.locator(
    'affine-outline-panel-body .active'
  );

  await title.click();
  await expect(activeHeadingContainer).toContainText('Title');

  for (let i = 0; i < headings.length; i++) {
    const lastHeadingCenter = await getVerticalCenterFromLocator(headings[i]);
    await page.mouse.wheel(0, lastHeadingCenter - viewportCenter + 20);
    await page.waitForTimeout(10);

    await expect(activeHeadingContainer).toContainText(`Heading ${i + 1}`);
  }
});

test('should scroll to heading and highlight heading when click item in outline panel', async ({
  page,
}) => {
  const headings = await createHeadings(page, 10);
  const toc = await openTocPanel(page);

  const activeHeadingContainer = toc.locator(
    'affine-outline-panel-body .active'
  );

  const headingsInPanel = Array.from({ length: 6 }, (_, i) =>
    getTocHeading(toc, i + 1)
  );

  await headingsInPanel[2].click();
  await expect(headings[2]).toBeVisible();
  await expect(activeHeadingContainer).toContainText('Heading 3');
});

test('should scroll to title when click title in outline panel', async ({
  page,
}) => {
  const title = await createTitle(page);
  await pressEnter(page);
  await createHeadings(page, 10);

  const toc = await openTocPanel(page);

  const titleInPanel = toc.locator('.title');

  await expect(title).not.toBeInViewport();
  await titleInPanel.click();
  await expect(title).toBeVisible();
});

test('visibility sorting should be enabled in edgeless mode and disabled in page mode by default, and can be changed', async ({
  page,
}) => {
  await pressEnter(page);
  await type(page, '# Heading 1');

  const toc = await openTocPanel(page);

  const sortingButton = toc.locator('.note-sorting-button');
  await expect(sortingButton).not.toHaveClass(/active/);
  expect(toc.locator('[data-sortable="false"]')).toHaveCount(1);

  await clickEdgelessModeButton(page);
  await expect(sortingButton).toHaveClass(/active/);
  expect(toc.locator('[data-sortable="true"]')).toHaveCount(1);

  await sortingButton.click();
  await expect(sortingButton).not.toHaveClass(/active/);
  expect(toc.locator('[data-sortable="false"]')).toHaveCount(1);
});

test('should reorder notes when drag and drop note in outline panel', async ({
  page,
}) => {
  await clickEdgelessModeButton(page);
  await createEdgelessNoteBlock(page, [100, 100]);
  await type(page, 'hello');
  await createEdgelessNoteBlock(page, [200, 200]);
  await type(page, 'world');

  const toc = await openTocPanel(page);

  const docVisibleCards = toc.locator(
    '.card-container[data-invisible="false"]'
  );
  const docInvisibleCards = toc.locator(
    '.card-container[data-invisible="true"]'
  );

  await expect(docVisibleCards).toHaveCount(1);
  await expect(docInvisibleCards).toHaveCount(2);

  while ((await docInvisibleCards.count()) > 0) {
    const card = docInvisibleCards.first();
    await card.hover();
    await card.locator('.display-mode-button').click();
    await card.locator('note-display-mode-panel').locator('.item.both').click();
  }

  await expect(docVisibleCards).toHaveCount(3);
  const noteCard3 = docVisibleCards.nth(2);
  const noteCard1 = docVisibleCards.nth(0);

  await dragNoteCard(page, noteCard3, noteCard1);

  await clickPageModeButton(page);
  const paragraphs = page
    .locator('affine-paragraph')
    .locator('[data-v-text="true"]');
  await expect(paragraphs).toHaveCount(3);
  await expect(paragraphs.nth(0)).toContainText('world');
  await expect(paragraphs.nth(1)).toContainText('');
  await expect(paragraphs.nth(2)).toContainText('hello');

  // FIXME(@L-Sun): drag and drop is not working in page mode
  await dragNoteCard(page, noteCard3, noteCard1);

  await expect(paragraphs.nth(0)).toContainText('hello');
  await expect(paragraphs.nth(1)).toContainText('world');
  await expect(paragraphs.nth(2)).toContainText('');
});

test.describe('advanced visibility control', () => {
  test.beforeEach(async ({ page }) => {
    await openSettingModal(page);
    await openExperimentalFeaturesPanel(page);
    await confirmExperimentalPrompt(page);
    await page.getByTestId('enable_advanced_block_visibility').click();
    await closeSettingModal(page);
    await page.reload();
  });

  test('should update notes when change note display mode from note toolbar', async ({
    page,
  }) => {
    await clickEdgelessModeButton(page);
    await createEdgelessNoteBlock(page, [100, 100]);
    await type(page, 'hello');
    await clickView(page, [200, 200]);

    const toc = await openTocPanel(page);

    const docVisibleCard = toc.locator(
      '.card-container[data-invisible="false"]'
    );
    const docInvisibleCard = toc.locator(
      '.card-container[data-invisible="true"]'
    );

    await expect(docVisibleCard).toHaveCount(1);
    await expect(docInvisibleCard).toHaveCount(1);

    await clickView(page, [100, 100]);
    const noteButtons = locateElementToolbar(page).locator(
      'edgeless-change-note-button'
    );

    await noteButtons.getByRole('button', { name: 'Mode' }).click();
    await noteButtons.locator('note-display-mode-panel .item.both').click();

    await expect(docVisibleCard).toHaveCount(2);
    await expect(docInvisibleCard).toHaveCount(0);
  });

  test('should update notes after slicing note', async ({ page }) => {
    await clickEdgelessModeButton(page);
    await createEdgelessNoteBlock(page, [200, 100]);
    await type(page, 'hello');
    await pressEnter(page);
    await type(page, 'world');

    const toc = await openTocPanel(page);

    const docVisibleCard = toc.locator(
      '.card-container[data-invisible="false"]'
    );
    const docInvisibleCard = toc.locator(
      '.card-container[data-invisible="true"]'
    );

    await expect(docVisibleCard).toHaveCount(1);
    await expect(docInvisibleCard).toHaveCount(1);

    await docInvisibleCard.hover();
    await docInvisibleCard.locator('.display-mode-button').click();
    await docInvisibleCard
      .locator('note-display-mode-panel .item.both')
      .click();

    await expect(docVisibleCard).toHaveCount(2);

    await clickView(page, [200, 100]);
    const changeNoteButtons = locateElementToolbar(page).locator(
      'edgeless-change-note-button'
    );
    await changeNoteButtons.getByRole('button', { name: 'Slicer' }).click();
    await expect(page.locator('.note-slicer-button')).toBeVisible();
    await page.locator('.note-slicer-button').click();

    await expect(docVisibleCard).toHaveCount(3);
  });
});
