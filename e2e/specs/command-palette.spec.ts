import { test, expect } from '../fixtures/test-vault';

test.describe('Command Palette', () => {
	test('opens via Cmd+P', async ({ vaultPage: page }) => {
		await page.keyboard.press('Meta+p');
		await expect(page.locator('input[placeholder="Type a command..."]')).toBeVisible();
	});

	test('closes on Escape', async ({ vaultPage: page }) => {
		await page.keyboard.press('Meta+p');
		const input = page.locator('input[placeholder="Type a command..."]');
		await expect(input).toBeVisible();

		await page.keyboard.press('Escape');
		await expect(input).not.toBeVisible();
	});

	test('filters commands by typing', async ({ vaultPage: page }) => {
		await page.keyboard.press('Meta+p');
		const input = page.locator('input[placeholder="Type a command..."]');
		await input.fill('save');

		// "Save File" command should appear
		await expect(page.getByText('Save File')).toBeVisible();
	});

	test('no results shows empty state', async ({ vaultPage: page }) => {
		await page.keyboard.press('Meta+p');
		const input = page.locator('input[placeholder="Type a command..."]');
		await input.fill('zzzzzzzzzzz');

		await expect(page.getByText('No commands found.')).toBeVisible();
	});

	test('executing command closes palette and performs action', async ({ vaultPage: page }) => {
		await page.keyboard.press('Meta+p');
		const input = page.locator('input[placeholder="Type a command..."]');
		await input.fill('search');

		// Click the "Search in Vault" command
		await page.getByText('Search in Vault').click();

		// Palette should close
		await expect(input).not.toBeVisible();

		// Search panel should open (as a result of the command)
		await expect(page.locator('input[placeholder="Search vault..."]')).toBeVisible();
	});
});
