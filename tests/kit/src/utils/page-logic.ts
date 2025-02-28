import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { openEditorInfoPanel } from './setting';

export function getAllPage(page: Page) {
  const newPageButton = page.getByTestId('new-page-button-trigger');
  const newPageDropdown = newPageButton.locator('svg');
  const edgelessBlockCard = page.getByTestId('new-edgeless-button-in-all-page');

  async function clickNewPageButton() {
    const newPageButton = page.getByTestId('new-page-button-trigger');
    return await newPageButton.click();
  }

  async function clickNewEdgelessDropdown() {
    await newPageDropdown.click();
    await edgelessBlockCard.click();
  }

  return { clickNewPageButton, clickNewEdgelessDropdown };
}

export async function waitForEditorLoad(page: Page) {
  await page.waitForSelector('v-line', {
    timeout: 20000,
  });
}

export async function waitForAllPagesLoad(page: Page) {
  // if filters tag is rendered, we believe all_pages is ready
  await page.waitForSelector('[data-testid="create-first-filter"]', {
    timeout: 20000,
  });
}

export async function clickNewPageButton(page: Page, title?: string) {
  // fixme(himself65): if too fast, the page will crash
  await page.getByTestId('sidebar-new-page-button').click({
    delay: 100,
  });
  await waitForEmptyEditor(page);
  if (title) {
    await getBlockSuiteEditorTitle(page).fill(title);
  }
}

export async function waitForEmptyEditor(page: Page) {
  await expect(page.locator('.doc-title-container-empty')).toBeVisible();
}

export function getBlockSuiteEditorTitle(page: Page) {
  return page.locator('doc-title .inline-editor').nth(0);
}

export async function type(page: Page, content: string, delay = 50) {
  await page.keyboard.type(content, { delay });
}

export const createLinkedPage = async (page: Page, pageName?: string) => {
  // fixme: workaround for @ popover not showing up when editor is not ready
  await page.waitForTimeout(500);
  await page.keyboard.type('@', { delay: 50 });
  const linkedPagePopover = page.locator('.linked-doc-popover');
  await expect(linkedPagePopover).toBeVisible();
  await type(page, pageName || 'Untitled');

  await linkedPagePopover
    .locator(`icon-button`)
    .filter({ hasText: `New "${pageName}" page` })
    .click();
};

export const createTodayPage = async (page: Page) => {
  // fixme: workaround for @ popover not showing up when editor is not ready
  await page.waitForTimeout(500);
  await page.keyboard.type('@', { delay: 50 });
  const linkedPagePopover = page.locator('.linked-doc-popover');
  await expect(linkedPagePopover).toBeVisible();
  await type(page, 'Today');

  await linkedPagePopover
    .locator(`icon-button`)
    .filter({ hasText: 'Today' })
    .nth(0)
    .click();
};

export async function clickPageMoreActions(page: Page) {
  return page
    .getByTestId('header')
    .getByTestId('header-dropDownButton')
    .click();
}

export const getPageOperationButton = (page: Page, id: string) => {
  return getPageItem(page, id).getByTestId('page-list-operation-button');
};

export const getPageItem = (page: Page, id: string) => {
  return page.locator(`[data-page-id="${id}"][data-testid="page-list-item"]`);
};

export const getPageByTitle = (page: Page, title: string) => {
  return page.getByTestId('page-list-item').getByText(title);
};

export type DragLocation =
  | 'top-left'
  | 'top'
  | 'bottom'
  | 'center'
  | 'left'
  | 'right';

export const toPosition = (
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  },
  location: DragLocation
) => {
  switch (location) {
    case 'center':
      return {
        x: rect.width / 2,
        y: rect.height / 2,
      };
    case 'top':
      return { x: rect.width / 2, y: 1 };
    case 'bottom':
      return { x: rect.width / 2, y: rect.height - 1 };

    case 'left':
      return { x: 1, y: rect.height / 2 };

    case 'right':
      return { x: rect.width - 1, y: rect.height / 2 };

    case 'top-left':
    default:
      return { x: 1, y: 1 };
  }
};

export const dragTo = async (
  page: Page,
  locator: Locator,
  target: Locator,
  location: DragLocation = 'center',
  willMoveOnDrag = false
) => {
  await locator.hover();
  const locatorElement = await locator.boundingBox();
  if (!locatorElement) {
    throw new Error('locator element not found');
  }
  const locatorCenter = toPosition(locatorElement, 'center');
  await page.mouse.move(
    locatorElement.x + locatorCenter.x,
    locatorElement.y + locatorCenter.y
  );
  await page.mouse.down();
  await page.waitForTimeout(100);
  await page.mouse.move(
    locatorElement.x + locatorCenter.x + 1,
    locatorElement.y + locatorCenter.y + 1
  );

  await page.mouse.move(1, 1, {
    steps: 10,
  });

  await target.hover();

  if (!willMoveOnDrag) {
    const targetElement = await target.boundingBox();
    if (!targetElement) {
      throw new Error('target element not found');
    }
    const targetPosition = toPosition(targetElement, location);
    await page.mouse.move(
      targetElement.x + targetPosition.x,
      targetElement.y + targetPosition.y,
      {
        steps: 10,
      }
    );
  }
  await page.waitForTimeout(100);
  await page.mouse.up();
};

// sometimes editor loses focus, this function is to focus the editor
// FIXME: this function is not usable since the placeholder is not unstable
export const focusInlineEditor = async (page: Page) => {
  await page
    .locator(
      `.affine-paragraph-rich-text-wrapper:has(.visible):has-text("Type '/' for commands")`
    )
    .locator('.inline-editor')
    .focus();
};

export const addDatabase = async (page: Page, title?: string) => {
  await page.keyboard.press('/');
  await expect(page.locator('affine-slash-menu .slash-menu')).toBeVisible();
  await page.keyboard.type('database');
  await page.getByTestId('Table View').click();

  if (title) {
    await page.locator('affine-database-title').click();
    await page
      .locator(
        'affine-database-title textarea[data-block-is-database-title="true"]'
      )
      .fill(title);
    await page
      .locator(
        'affine-database-title textarea[data-block-is-database-title="true"]'
      )
      .blur();
  }
};

export const addCodeBlock = async (page: Page) => {
  await page.keyboard.press('/');
  await expect(page.locator('affine-slash-menu .slash-menu')).toBeVisible();
  await page.keyboard.type('code');
  await page.getByTestId('Code Block').click();
};

export const addDatabaseRow = async (page: Page, databaseTitle: string) => {
  const db = page.locator(`affine-database-table`, {
    has: page.locator(`affine-database-title:has-text("${databaseTitle}")`),
  });
  await db.locator('.data-view-table-group-add-row-button').click();
};

export const switchEdgelessTheme = async (
  page: Page,
  type: 'system' | 'light' | 'dark'
) => {
  await openEditorInfoPanel(page);
  const panel = page.getByTestId('info-modal');
  await panel.locator(`button[value="${type}"]`).click();
  await page.keyboard.press('Escape');
};
