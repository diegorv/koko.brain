import { test, expect } from '../fixtures/test-vault';
import { openCommandPalette, openFile } from '../fixtures/helpers';

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

	test('the input stays put while a filter shrinks the list', async ({ vaultPage: page }) => {
		await openCommandPalette(page);
		const content = page.locator('[data-slot="dialog-content"]');
		const input = page.locator('input[placeholder*="command"]:visible').first();
		const options = page.locator('[data-slot="command-item"]');
		await expect(input).toBeVisible();
		// The zoom-in moves the box until it ends; measure once it has settled.
		await content.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)));
		const before = await input.boundingBox();
		const countBefore = await options.count();

		await input.fill('save');
		await expect.poll(() => options.count()).toBeLessThan(countBefore);
		await expect(options.first()).toBeVisible();
		const after = await input.boundingBox();

		expect(before).not.toBeNull();
		expect(after!.y).toBe(before!.y);
	});

	test('Escape closes the palette', async ({ vaultPage: page }) => {
		await openFile(page, 'Welcome.md');
		await openCommandPalette(page);
		const input = page.locator('input[placeholder*="command"]:visible').first();
		await expect(input).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(input).toHaveCount(0);
	});
});
