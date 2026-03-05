import { test, expect } from '../fixtures/test-vault';

test.describe('Search', () => {
	test('opening search panel via keyboard shortcut', async ({ vaultPage: page }) => {
		// Trigger search with Cmd+Shift+F on mac
		await page.keyboard.press('Meta+Shift+f');

		// Search panel should appear with input
		await expect(page.locator('input[placeholder="Search vault..."]')).toBeVisible();
	});

	test('search returns matching results', async ({ vaultPage: page }) => {
		// Open search
		await page.keyboard.press('Meta+Shift+f');
		const searchInput = page.locator('input[placeholder="Search vault..."]');
		await expect(searchInput).toBeVisible();

		// Type search query
		await searchInput.fill('Welcome');

		// Wait for results to appear (debounced search)
		await expect(page.getByText(/\d+ results?/)).toBeVisible({ timeout: 5_000 });
	});

	test('clicking search result opens file', async ({ vaultPage: page }) => {
		// Open search
		await page.keyboard.press('Meta+Shift+f');
		const searchInput = page.locator('input[placeholder="Search vault..."]');
		await expect(searchInput).toBeVisible();

		// Type search query
		await searchInput.fill('productive');

		// Wait for results
		await expect(page.getByText(/\d+ results?/)).toBeVisible({ timeout: 5_000 });

		// Click on the first result button (file name row)
		await page.locator('button', { hasText: '2024-01-15' }).first().click();

		// File should open in editor with matching content
		await expect(page.locator('[role="tab"]', { hasText: '2024-01-15.md' })).toBeVisible();
		await expect(page.locator('.cm-content')).toContainText('productive');
	});
});
