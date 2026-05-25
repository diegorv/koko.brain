import { test, expect } from '../fixtures/test-vault';
import { openTreeItem } from '../fixtures/helpers';

test.describe('Word count', () => {
	test('displays word count when a file is open', async ({ vaultPage: page }) => {
		await openTreeItem(page, 'Welcome.md');

		await expect(page.locator('text=/\\d+ words/')).toBeVisible({ timeout: 5_000 });
	});

	test('shows characters and reading time alongside words', async ({ vaultPage: page }) => {
		await openTreeItem(page, 'Welcome.md');

		await expect(page.locator('text=/\\d+ characters/')).toBeVisible({ timeout: 5_000 });
		await expect(page.locator('text=/\\d+ min read/')).toBeVisible({ timeout: 5_000 });
	});

	test('word count updates after typing', async ({ vaultPage: page }) => {
		await openTreeItem(page, 'Welcome.md');

		// Wait for initial count to appear
		const counter = page.locator('text=/\\d+ words/');
		await expect(counter).toBeVisible({ timeout: 5_000 });
		const before = await counter.textContent();

		// Type extra text
		await page.locator('.cm-content').click();
		await page.keyboard.type(' extra words added here');

		// Wait for debounced update (500ms + buffer)
		await page.waitForTimeout(800);

		const after = await counter.textContent();
		expect(after).not.toBe(before);
	});
});
