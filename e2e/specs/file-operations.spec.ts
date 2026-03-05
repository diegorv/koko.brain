import { test, expect } from '../fixtures/test-vault';

test.describe('File Operations', () => {
	test('create new file via context menu', async ({ vaultPage: page }) => {
		// Right-click on the tree area to open root context menu
		const tree = page.locator('[role="tree"]');
		await tree.click({ button: 'right' });

		// Click "New File" in context menu
		await page.getByRole('menuitem', { name: 'New File' }).click();

		// A rename input should appear for the new file
		const renameInput = page.locator('[role="tree"] input');
		await expect(renameInput).toBeVisible();

		// Type the file name and confirm
		await renameInput.fill('new-file.md');
		await renameInput.press('Enter');

		// New file should appear in tree
		await expect(page.locator('[role="treeitem"]', { hasText: 'new-file.md' })).toBeVisible();
	});

	test('create new folder via context menu', async ({ vaultPage: page }) => {
		// Right-click on the tree area
		const tree = page.locator('[role="tree"]');
		await tree.click({ button: 'right' });

		// Click "New Folder" in context menu
		await page.getByRole('menuitem', { name: 'New Folder' }).click();

		// A rename input should appear
		const renameInput = page.locator('[role="tree"] input');
		await expect(renameInput).toBeVisible();

		// Type the folder name and confirm
		await renameInput.fill('new-folder');
		await renameInput.press('Enter');

		// New folder should appear in tree
		await expect(page.locator('[role="treeitem"]', { hasText: 'new-folder' })).toBeVisible();
	});

	test('rename file via context menu', async ({ vaultPage: page }) => {
		// Right-click on "Welcome.md"
		const fileItem = page.locator('[role="treeitem"]', { hasText: 'Welcome.md' });
		await fileItem.click({ button: 'right' });

		// Click "Rename"
		await page.getByRole('menuitem', { name: 'Rename' }).click();

		// Input should appear with current name
		const renameInput = page.locator('[role="tree"] input');
		await expect(renameInput).toBeVisible();

		// Clear and type new name
		await renameInput.fill('renamed.md');
		await renameInput.press('Enter');

		// File tree should show updated name
		await expect(page.locator('[role="treeitem"]', { hasText: 'renamed.md' })).toBeVisible();
		await expect(page.locator('[role="treeitem"]', { hasText: 'Welcome.md' })).not.toBeVisible();
	});

	test('delete file via context menu', async ({ vaultPage: page }) => {
		// First open the file to have it in a tab
		await page.locator('[role="treeitem"]', { hasText: 'Welcome.md' }).click();
		await expect(page.locator('[role="tab"]', { hasText: 'Welcome.md' })).toBeVisible();

		// Right-click on "Welcome.md"
		const fileItem = page.locator('[role="treeitem"]', { hasText: 'Welcome.md' });
		await fileItem.click({ button: 'right' });

		// Click "Delete" (auto-confirmed by dialog mock)
		await page.getByRole('menuitem', { name: 'Delete' }).click();

		// File should be removed from tree
		await expect(page.locator('[role="treeitem"]', { hasText: 'Welcome.md' })).not.toBeVisible();

		// Tab should be closed
		await expect(page.locator('[role="tab"]', { hasText: 'Welcome.md' })).not.toBeVisible();
	});
});
