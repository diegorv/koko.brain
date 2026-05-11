import { test, expect } from '../fixtures/test-vault';
import { openQuickSwitcher } from '../fixtures/helpers';

test.describe('Quick switcher', () => {
	test('Cmd+O opens the switcher', async ({ vaultPage: page }) => {
		await openQuickSwitcher(page);
		await expect(page.getByRole('heading', { name: 'Quick Switcher' })).toBeVisible();
		const input = page.locator('input[placeholder*="note"]:visible').first();
		await expect(input).toBeFocused();
	});

	test('typing filters to matching files', async ({ vaultPage: page }) => {
		await openQuickSwitcher(page);
		const input = page.locator('input[placeholder*="note"]:visible').first();
		await input.fill('Welcome');

		await expect(page.getByRole('option', { name: /Welcome/i }).first()).toBeVisible();
	});

	test('Escape closes the switcher', async ({ vaultPage: page }) => {
		await openQuickSwitcher(page);
		const input = page.locator('input[placeholder*="note"]:visible').first();
		await expect(input).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(input).toHaveCount(0);
	});
});
