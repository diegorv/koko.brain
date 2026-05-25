import { test, expect } from '../fixtures/test-vault';

test.describe('Bookmarks', () => {
	test('right-click on a file shows Bookmark option', async ({ vaultPage: page }) => {
		const item = page.locator('[role="treeitem"]', { hasText: 'Welcome.md' }).first();
		await item.click({ button: 'right' });

		await expect(
			page.getByRole('menuitem', { name: /^Bookmark$/i }).first(),
		).toBeVisible();
	});

	test('toggling bookmark changes context menu to Remove bookmark', async ({ vaultPage: page }) => {
		const item = page.locator('[role="treeitem"]', { hasText: 'Welcome.md' }).first();
		await item.click({ button: 'right' });

		const bookmarkItem = page.getByRole('menuitem', { name: /^Bookmark$/i }).first();
		await bookmarkItem.click();

		// Re-open context menu on same item
		await item.click({ button: 'right' });

		await expect(
			page.getByRole('menuitem', { name: /Remove bookmark/i }).first(),
		).toBeVisible({ timeout: 5_000 });
	});

	test('removing bookmark restores original context menu', async ({ vaultPage: page }) => {
		const item = page.locator('[role="treeitem"]', { hasText: 'Welcome.md' }).first();

		// Bookmark it
		await item.click({ button: 'right' });
		await page.getByRole('menuitem', { name: /^Bookmark$/i }).first().click();

		// Remove it
		await item.click({ button: 'right' });
		await page.getByRole('menuitem', { name: /Remove bookmark/i }).first().click();

		// Context menu should show Bookmark again
		await item.click({ button: 'right' });
		await expect(
			page.getByRole('menuitem', { name: /^Bookmark$/i }).first(),
		).toBeVisible({ timeout: 5_000 });
	});

	test('bookmarking a folder works via context menu', async ({ vaultPage: page }) => {
		const folder = page.locator('[role="treeitem"]', { hasText: 'Projects' }).first();
		await folder.click({ button: 'right' });

		const bookmarkItem = page.getByRole('menuitem', { name: /^Bookmark$/i }).first();
		await expect(bookmarkItem).toBeVisible();
		await bookmarkItem.click();

		// Verify it toggled
		await folder.click({ button: 'right' });
		await expect(
			page.getByRole('menuitem', { name: /Remove bookmark/i }).first(),
		).toBeVisible({ timeout: 5_000 });
	});
});
