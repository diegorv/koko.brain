import { test, expect } from '../fixtures/test-vault';

test.describe('Tab Pinning', () => {
	test('pin tab via context menu', async ({ vaultPage: page }) => {
		// Open a file
		await page.locator('[role="treeitem"]', { hasText: 'Welcome.md' }).click();
		await expect(page.locator('[role="tab"]', { hasText: 'Welcome.md' })).toBeVisible();

		// Right-click the tab to open context menu
		const tab = page.locator('[role="tab"]', { hasText: 'Welcome.md' });
		await tab.click({ button: 'right' });

		// Click "Pin Tab" in context menu
		await page.getByText('Pin Tab').click();

		// After pinning, the tab name is hidden and replaced with a pin icon.
		// The first tab should exist but no longer contain the file name text.
		const firstTab = page.locator('[role="tab"]').first();
		await expect(firstTab).toBeVisible();
		// Verify the tab no longer shows the full filename (pinned tabs only show icon)
		await expect(firstTab).not.toHaveText('Welcome.md', { timeout: 3_000 });
	});

	test('unpin tab via context menu', async ({ vaultPage: page }) => {
		// Open and pin a file
		await page.locator('[role="treeitem"]', { hasText: 'Welcome.md' }).click();
		const tab = page.locator('[role="tab"]', { hasText: 'Welcome.md' });
		await expect(tab).toBeVisible();
		await tab.click({ button: 'right' });
		await page.getByText('Pin Tab').click();

		// Right-click pinned tab (first tab) and unpin
		const pinnedTab = page.locator('[role="tab"]').first();
		await pinnedTab.click({ button: 'right' });
		await page.getByText('Unpin Tab').click();

		// Tab should show file name again
		await expect(page.locator('[role="tab"]', { hasText: 'Welcome.md' })).toBeVisible({ timeout: 3_000 });
	});

	test('pinned tab does not show close button', async ({ vaultPage: page }) => {
		// Open a file
		await page.locator('[role="treeitem"]', { hasText: 'Welcome.md' }).click();
		const tab = page.locator('[role="tab"]', { hasText: 'Welcome.md' });
		await expect(tab).toBeVisible();

		// Before pinning, hover to see close button exists
		await tab.hover();
		await expect(tab.locator('button')).toBeVisible();

		// Pin the tab
		await tab.click({ button: 'right' });
		await page.getByText('Pin Tab').click();

		// Pinned tab should not have a close button (name and close button are hidden)
		const pinnedTab = page.locator('[role="tab"]').first();
		await pinnedTab.hover();
		await expect(pinnedTab.locator('button')).not.toBeVisible({ timeout: 2_000 });
	});

	test('pinned tabs stay on the left', async ({ vaultPage: page }) => {
		// Open two files
		await page.locator('[role="treeitem"]', { hasText: 'Welcome.md' }).click();
		await expect(page.locator('[role="tab"]', { hasText: 'Welcome.md' })).toBeVisible();

		await page.locator('[role="treeitem"]', { hasText: 'Projects' }).first().click();
		await page.locator('[role="treeitem"]', { hasText: 'todo.md' }).click();
		await expect(page.locator('[role="tab"]', { hasText: 'todo.md' })).toBeVisible();

		// Pin the second tab (todo.md) which is currently on the right
		const todoTab = page.locator('[role="tab"]', { hasText: 'todo.md' });
		await todoTab.click({ button: 'right' });
		await page.getByText('Pin Tab').click();

		// The pinned tab should now be the first tab (moved to left)
		// and the unpinned Welcome.md should be the second tab
		const secondTab = page.locator('[role="tab"]').nth(1);
		await expect(secondTab).toContainText('Welcome.md');
	});
});
