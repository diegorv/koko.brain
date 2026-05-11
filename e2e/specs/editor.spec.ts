import { test, expect } from '../fixtures/test-vault';
import { openTreeItem, saveCurrentFile } from '../fixtures/helpers';

test.describe('Editor', () => {
	test('opens a file from the tree and shows its content', async ({ vaultPage: page }) => {
		await openTreeItem(page, 'Welcome.md');
		await expect(page.locator('.cm-content')).toContainText('Welcome');
	});

	test('typing marks the tab dirty and Cmd+S clears it', async ({ vaultPage: page }) => {
		await openTreeItem(page, 'Inbox.md');

		// Move cursor to end and type
		await page.locator('.cm-content').click();
		await page.keyboard.press('End');
		await page.keyboard.type(' new content');

		// Active tab should now show the dirty dot
		const activeTab = page.locator('[role="tab"][aria-selected="true"]');
		await expect(activeTab.locator('.bg-foreground.rounded-full').first()).toBeVisible();

		await saveCurrentFile(page);
		await expect(activeTab.locator('.bg-foreground.rounded-full')).toHaveCount(0);
	});

	test('content persists across tab switch and re-open', async ({ vaultPage: page }) => {
		await openTreeItem(page, 'Welcome.md');
		await page.locator('.cm-content').click();
		await page.keyboard.press('End');
		await page.keyboard.type(' MARKER');
		await saveCurrentFile(page);

		await openTreeItem(page, 'Inbox.md');
		await expect(page.locator('.cm-content')).toContainText('Inbox');

		await openTreeItem(page, 'Welcome.md');
		await expect(page.locator('.cm-content')).toContainText('MARKER');
	});
});
