import {
  addDatabase,
  clickNewPageButton,
} from '@affine-test/kit/utils/page-logic';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Create a new database block in the current page
 */
export async function createDatabaseBlock(page: Page) {
  await clickNewPageButton(page);
  await page.waitForTimeout(500);
  await page.keyboard.press('Enter');
  await addDatabase(page);
}

/**
 * Initialize a database with specified number of rows
 */
export async function initDatabaseWithRows(page: Page, rowCount: number) {
  await createDatabaseBlock(page);
  for (let i = 0; i < rowCount; i++) {
    await addDatabaseRow(page);
  }
}

/**
 * Add a new row to the database
 */
export async function addDatabaseRow(page: Page) {
  const addButton = page.locator('.data-view-table-group-add-row');
  await addButton.waitFor();
  await addButton.click();
}

/**
 * Simulate pasting Excel data into database
 * @param page Playwright page object
 * @param data Tab-separated text data with newlines for rows
 */
export async function pasteExcelData(page: Page, data: string) {
  await page.evaluate(data => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', data);
    const pasteEvent = new ClipboardEvent('paste', {
      clipboardData,
      bubbles: true,
      cancelable: true,
    });
    document.activeElement?.dispatchEvent(pasteEvent);
  }, data);
}

/**
 * Select the first cell in the database
 */
export async function selectFirstCell(page: Page) {
  const firstCell = page.locator('affine-database-cell-container').first();
  await firstCell.waitFor();
  await firstCell.click();
}

/**
 * Verify the contents of multiple cells in sequence
 * @param page Playwright page object
 * @param expectedContents Array of expected cell contents in order
 */
export async function verifyCellContents(
  page: Page,
  expectedContents: string[]
) {
  const cells = page.locator('affine-database-cell-container');
  for (let i = 0; i < expectedContents.length; i++) {
    const cell = cells.nth(i);
    await expect(cell.locator('uni-lit > *:first-child')).toHaveText(
      expectedContents[i]
    );
  }
}
