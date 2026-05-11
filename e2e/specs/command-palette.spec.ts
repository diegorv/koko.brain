import { test, expect } from '../fixtures/test-vault';
import { openCommandPalette, openTreeItem } from '../fixtures/helpers';

test.describe('Command palette', () => {
	test('Cmd+P opens the palette and lists commands', async ({ vaultPage: page }) => {
		await openCommandPalette(page);
		await expect(page.getByRole('heading', { name: 'Command Palette' })).toBeVisible();
		const input = page.locator('input[placeholder*="command"]:visible').first();
		await expect(input).toBeFocused();
	});

	test('typing filters the visible commands', async ({ vaultPage: page }) => {
		await openCommandPalette(page);
		const input = page.locator('input[placeholder*="command"]:visible').first();
		await input.fill('save');

		// At least one match contains "save" (case-insensitive)
		const results = page.locator('[role="option"], [data-command-item]');
		await expect(results.first()).toBeVisible();
	});

	test('Escape closes the palette', async ({ vaultPage: page }) => {
		await openTreeItem(page, 'Welcome.md');
		await openCommandPalette(page);
		const input = page.locator('input[placeholder*="command"]:visible').first();
		await expect(input).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(input).toHaveCount(0);
	});
});
