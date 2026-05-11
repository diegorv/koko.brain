import { test, expect } from '../fixtures/test-vault';
import { openSearch } from '../fixtures/helpers';

test.describe('Search', () => {
	test('Cmd+Shift+F opens the search panel', async ({ vaultPage: page }) => {
		await openSearch(page);
		const input = page.locator('input[placeholder*="search" i]:visible').first();
		await expect(input).toBeVisible();
	});

	test('typing a query surfaces matches from the vault', async ({ vaultPage: page }) => {
		await openSearch(page);
		const input = page.locator('input[placeholder*="search" i]:visible').first();
		await input.fill('Roadmap');

		// Search debounces 200ms; wait for at least one result row containing Roadmap.
		await expect(page.locator('text=Roadmap').first()).toBeVisible({ timeout: 5_000 });
	});
});
