import { test, expect } from '../fixtures/test-vault';

test.describe('Keyboard Shortcuts', () => {
	test('Cmd+S saves dirty file', async ({ vaultPage: page }) => {
		// Open a file
		await page.locator('[role="treeitem"]', { hasText: 'Welcome.md' }).click();
		await expect(page.locator('.cm-content')).toBeVisible();

		// Type to make file dirty
		await page.locator('.cm-content').click();
		await page.keyboard.type('Edit');

		// Dirty indicator should appear
		const tab = page.locator('[role="tab"]', { hasText: 'Welcome.md' });
		await expect(tab.locator('span.rounded-full')).toBeVisible();

		// Save with Cmd+S
		await page.keyboard.press('Meta+s');

		// Dirty indicator should disappear
		await expect(tab.locator('span.rounded-full')).not.toBeVisible({ timeout: 3_000 });
	});

	test('Cmd+W closes active tab', async ({ vaultPage: page }) => {
		// Open a file
		await page.locator('[role="treeitem"]', { hasText: 'Welcome.md' }).click();
		await expect(page.locator('[role="tab"]', { hasText: 'Welcome.md' })).toBeVisible();

		// Close with Cmd+W
		await page.keyboard.press('Meta+w');

		// Tab should be removed
		await expect(page.locator('[role="tab"]', { hasText: 'Welcome.md' })).not.toBeVisible();
	});

	test('Cmd+Shift+[ switches to previous tab', async ({ vaultPage: page }) => {
		// Open two files
		await page.locator('[role="treeitem"]', { hasText: 'Welcome.md' }).click();
		await expect(page.locator('[role="tab"]', { hasText: 'Welcome.md' })).toBeVisible();

		await page.locator('[role="treeitem"]', { hasText: 'Projects' }).first().click();
		await page.locator('[role="treeitem"]', { hasText: 'todo.md' }).click();
		await expect(page.locator('[role="tab"]', { hasText: 'todo.md' })).toHaveAttribute('aria-selected', 'true');

		// Switch to previous tab
		await page.keyboard.press('Meta+Shift+BracketLeft');

		// First tab should be active
		await expect(page.locator('[role="tab"]', { hasText: 'Welcome.md' })).toHaveAttribute('aria-selected', 'true');
	});

	test('Cmd+Shift+] switches to next tab', async ({ vaultPage: page }) => {
		// Open two files
		await page.locator('[role="treeitem"]', { hasText: 'Welcome.md' }).click();
		await page.locator('[role="treeitem"]', { hasText: 'Projects' }).first().click();
		await page.locator('[role="treeitem"]', { hasText: 'todo.md' }).click();

		// Go back to first tab
		await page.locator('[role="tab"]', { hasText: 'Welcome.md' }).click();
		await expect(page.locator('[role="tab"]', { hasText: 'Welcome.md' })).toHaveAttribute('aria-selected', 'true');

		// Switch to next tab
		await page.keyboard.press('Meta+Shift+BracketRight');

		// Second tab should be active
		await expect(page.locator('[role="tab"]', { hasText: 'todo.md' })).toHaveAttribute('aria-selected', 'true');
	});

	test('Cmd+B toggles right sidebar', async ({ vaultPage: page }) => {
		// Right sidebar should be visible by default (test vault settings enable it)
		await expect(page.getByText('Properties', { exact: true })).toBeVisible();

		// Hide with Cmd+B
		await page.keyboard.press('Meta+b');
		await expect(page.getByText('Properties', { exact: true })).not.toBeVisible({ timeout: 3_000 });

		// Show again with Cmd+B
		await page.keyboard.press('Meta+b');
		await expect(page.getByText('Properties', { exact: true })).toBeVisible({ timeout: 3_000 });
	});

	test('Cmd+, opens settings dialog', async ({ vaultPage: page }) => {
		await page.keyboard.press('Meta+Comma');

		// Settings dialog should be visible
		await expect(page.getByText('Sidebar', { exact: true }).first()).toBeVisible();
	});
});
