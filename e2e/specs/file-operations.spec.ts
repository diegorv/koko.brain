import { test, expect, TEST_VAULT_PATH } from '../fixtures/test-vault';
import { folderButton, listRow, showFolder } from '../fixtures/helpers';

test.describe('File operations', () => {
	test('right-click on a folder offers New note and New folder', async ({ vaultPage: page }) => {
		await showFolder(page, TEST_VAULT_PATH);
		await folderButton(page, `${TEST_VAULT_PATH}/Projects`).click({ button: 'right' });

		await expect(page.getByRole('menuitem', { name: /New note/i }).first()).toBeVisible();
		await expect(page.getByRole('menuitem', { name: /New folder/i }).first()).toBeVisible();
		await expect(page.getByRole('menuitem', { name: /Move to Trash/i }).first()).toBeVisible();
		await expect(page.getByRole('menuitem', { name: /Rename/i }).first()).toBeVisible();
	});

	test('right-click on a file shows Move to Trash and triggers it', async ({ vaultPage: page }) => {
		await page.evaluate(() => window.__e2e.dialog.setAskResponse(true));
		await showFolder(page, TEST_VAULT_PATH);

		await listRow(page, 'Inbox').first().click({ button: 'right' });

		const trash = page.getByRole('menuitem', { name: /Move to Trash/i }).first();
		await expect(trash).toBeVisible();
		await trash.click();

		await expect(listRow(page, 'Inbox')).toHaveCount(0, { timeout: 5_000 });
		await expect(listRow(page, 'Welcome')).toBeVisible();
	});
});
