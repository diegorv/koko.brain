import { test, expect } from '../fixtures/test-vault';

test.describe('File operations', () => {
	test('right-click on a folder offers New File and New Folder', async ({ vaultPage: page }) => {
		const projects = page.locator('[role="treeitem"]', { hasText: 'Projects' }).first();
		await projects.click({ button: 'right' });

		await expect(page.getByRole('menuitem', { name: /New File/i }).first()).toBeVisible();
		await expect(page.getByRole('menuitem', { name: /New Folder/i }).first()).toBeVisible();
		await expect(page.getByRole('menuitem', { name: /Move to Trash/i }).first()).toBeVisible();
		await expect(page.getByRole('menuitem', { name: /Rename/i }).first()).toBeVisible();
	});

	test('right-click on a file shows Move to Trash and triggers it', async ({ vaultPage: page }) => {
		await page.evaluate(() => window.__e2e.dialog.setAskResponse(true));

		const target = page.locator('[role="treeitem"]', { hasText: 'Inbox.md' }).first();
		await target.click({ button: 'right' });

		const trash = page.getByRole('menuitem', { name: /Move to Trash/i }).first();
		await expect(trash).toBeVisible();
		await trash.click();

		await expect(page.locator('[role="treeitem"]', { hasText: 'Inbox.md' })).toHaveCount(0, {
			timeout: 5_000,
		});
	});
});
