import { test, expect } from '../fixtures/test-vault';
import { openTreeItem, pressShortcut } from '../fixtures/helpers';

// `vaultPage` may already have an auto-opened daily-note tab from
// `autoOpenDailyNote()` — assertions count files RELATIVE to that baseline.

test.describe('Tabs', () => {
	test('opens multiple files as tabs', async ({ vaultPage: page }) => {
		const baseline = await page.locator('[role="tab"]').count();
		await openTreeItem(page, 'Welcome.md');
		await openTreeItem(page, 'Inbox.md');

		const tabs = page.locator('[role="tab"]');
		await expect(tabs).toHaveCount(baseline + 2);
		await expect(page.locator('[role="tab"]', { hasText: 'Welcome' })).toBeVisible();
		await expect(page.locator('[role="tab"]', { hasText: 'Inbox' })).toBeVisible();
	});

	test('Cmd+Shift+] and Cmd+Shift+[ cycle through tabs', async ({ vaultPage: page }) => {
		await openTreeItem(page, 'Welcome.md');
		await openTreeItem(page, 'Inbox.md');

		await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('Inbox');

		await pressShortcut(page, 'Mod+Shift+BracketLeft');
		await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('Welcome');

		await pressShortcut(page, 'Mod+Shift+BracketRight');
		await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('Inbox');
	});

	test('Cmd+W closes the active tab', async ({ vaultPage: page }) => {
		await openTreeItem(page, 'Welcome.md');
		await openTreeItem(page, 'Inbox.md');
		const before = await page.locator('[role="tab"]').count();

		await pressShortcut(page, 'Mod+W');
		await expect(page.locator('[role="tab"]')).toHaveCount(before - 1);
		await expect(page.locator('[role="tab"]', { hasText: 'Inbox' })).toHaveCount(0);
	});
});
