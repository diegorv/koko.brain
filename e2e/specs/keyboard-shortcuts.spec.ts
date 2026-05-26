import { test, expect } from '../fixtures/test-vault';
import { openTreeItem, pressShortcut } from '../fixtures/helpers';

test.describe('Keyboard shortcuts', () => {
	test('Cmd+P toggles the command palette', async ({ vaultPage: page }) => {
		const input = page.locator('input[placeholder*="command"]:visible').first();
		await pressShortcut(page, 'Mod+P');
		await expect(input).toBeVisible();
		await pressShortcut(page, 'Mod+P');
		await expect(input).toHaveCount(0);
	});

	test('Cmd+O toggles the quick switcher', async ({ vaultPage: page }) => {
		const input = page.locator('input[placeholder*="note"]:visible').first();
		await pressShortcut(page, 'Mod+O');
		await expect(input).toBeVisible();
		await pressShortcut(page, 'Mod+O');
		await expect(input).toHaveCount(0);
	});

	test('Cmd+Comma opens the settings window', async ({ vaultPage: page }) => {
		await pressShortcut(page, 'Mod+Comma');
		await page.waitForFunction(() => window.__e2e.webviewWindows.has('settings'), null, { timeout: 5000 });
	});

	test('Cmd+W closes a tab', async ({ vaultPage: page }) => {
		await openTreeItem(page, 'Welcome.md');
		const before = await page.locator('[role="tab"]').count();
		await pressShortcut(page, 'Mod+W');
		await expect(page.locator('[role="tab"]')).toHaveCount(before - 1);
	});
});
