import { test } from '@affine-test/kit/playwright';
import { openHomePage } from '@affine-test/kit/utils/load-page';
import { waitForEditorLoad } from '@affine-test/kit/utils/page-logic';

import {
  initDatabaseWithRows,
  pasteExcelData,
  selectFirstCell,
  verifyCellContents,
} from './utils';

test.describe('Database Clipboard Operations', () => {
  test('paste tab-separated data from Excel into database', async ({
    page,
  }) => {
    // Open the home page and wait for the editor to load
    await openHomePage(page);
    await waitForEditorLoad(page);

    // Create a database block with two rows
    await initDatabaseWithRows(page, 2);

    // Select the first cell and paste data
    await selectFirstCell(page);
    const mockExcelData = 'Cell 1A\tCell 1B\nCell 2A\tCell 2B';
    await pasteExcelData(page, mockExcelData);

    // Verify cell contents
    await verifyCellContents(page, [
      'Cell 1A',
      'Cell 1B',
      'Cell 2A',
      'Cell 2B',
    ]);
  });

  test('handle empty cells when pasting tab-separated data', async ({
    page,
  }) => {
    // Open the home page and wait for the editor to load
    await openHomePage(page);
    await waitForEditorLoad(page);

    // Create a database block with two rows
    await initDatabaseWithRows(page, 2);

    // Select the first cell and paste data with empty cells
    await selectFirstCell(page);
    const mockExcelData = 'Cell 1A\t\nCell 2A\tCell 2B';
    await pasteExcelData(page, mockExcelData);

    // Verify cell contents including empty cells
    await verifyCellContents(page, ['Cell 1A', '', 'Cell 2A', 'Cell 2B']);
  });

  test('handle pasting data larger than selected area', async ({ page }) => {
    // Open the home page and wait for the editor to load
    await openHomePage(page);
    await waitForEditorLoad(page);

    // Create a database block with one row
    await initDatabaseWithRows(page, 1);

    // Select the first cell and paste data larger than table
    await selectFirstCell(page);
    const mockExcelData = 'Cell 1A\tCell 1B\nCell 2A\tCell 2B';
    await pasteExcelData(page, mockExcelData);

    // Verify only the cells that exist are filled
    await verifyCellContents(page, ['Cell 1A', 'Cell 1B']);
  });
});
