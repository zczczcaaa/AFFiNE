import { test } from '@affine-test/kit/playwright';
import {
  createRandomUser,
  deleteUser,
  enableCloudWorkspace,
  loginUser,
} from '@affine-test/kit/utils/cloud';
import { clickSideBarAllPageButton } from '@affine-test/kit/utils/sidebar';
import { expect } from '@playwright/test';

let user: {
  id: string;
  name: string;
  email: string;
  password: string;
};

test.beforeEach(async ({ page }) => {
  user = await createRandomUser();
  await loginUser(page, user);
});

test.afterEach(async () => {
  // if you want to keep the user in the database for debugging,
  // comment this line
  await deleteUser(user.email);
});

test('should show blob management dialog', async ({ page }) => {
  await enableCloudWorkspace(page);

  await clickSideBarAllPageButton(page);

  // delete the welcome page ('Write, draw, plan all at once.')
  await page
    .getByTestId('page-list-item')
    .filter({
      has: page.getByText('Write, draw, plan all at once.'),
    })
    .getByTestId('page-list-operation-button')
    .click();
  const deleteBtn = page.getByTestId('move-to-trash');
  await deleteBtn.click();
  await expect(page.getByText('Delete doc?')).toBeVisible();
  await page.getByRole('button', { name: 'Delete' }).click();

  await page.getByTestId('slider-bar-workspace-setting-button').click();
  await expect(page.getByTestId('setting-modal')).toBeVisible();
  await page.getByTestId('workspace-setting:storage').click();
  await expect(page.getByTestId('blob-preview-card')).toHaveCount(3);
  await expect(page.getByText('Unused blobs (3)')).toBeVisible();

  await page.getByTestId('blob-preview-card').nth(0).click();
  await expect(page.getByText('1 Selected')).toBeVisible();

  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('Delete blob files')).toBeVisible();
  await page.getByRole('button', { name: 'Delete' }).click();

  await expect(page.getByText('Unused blobs (2)')).toBeVisible();
});
