import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures/test-vault';
import { openSearch } from '../fixtures/helpers';

test.use({ shell: 'rail' });

function railSearch(page: Page) {
	return page.locator('[data-rail-search]');
}

function searchInput(page: Page) {
	return railSearch(page).locator('[data-rail-search-header] input');
}

test.describe('Search', () => {
	test('Cmd+Shift+F opens Search in the note list column', async ({ vaultPage: page }) => {
		await openSearch(page);
		await expect(page.locator('[data-rail-item="search"]')).toHaveAttribute('aria-current', 'page');
		await expect(searchInput(page)).toBeVisible();
		await expect(searchInput(page)).toBeFocused();
		await expect(page.locator('[data-rail-note-list]')).toHaveCount(0);
	});

	test('typing a query surfaces matches from the vault', async ({ vaultPage: page }) => {
		await openSearch(page);
		await searchInput(page).fill('Roadmap');

		// Search debounces 200ms; wait for a result row for the Roadmap note.
		await expect(railSearch(page).locator('[data-search-result]', { hasText: 'Roadmap' }).first()).toBeVisible({ timeout: 5_000 });
	});

	test('searching for non-existent text shows no results', async ({ vaultPage: page }) => {
		await openSearch(page);
		await searchInput(page).fill('xyznonexistent999');

		await expect(railSearch(page).getByText('No results found')).toBeVisible({ timeout: 5_000 });
		await expect(railSearch(page).locator('[data-search-result]')).toHaveCount(0);
	});

	test('Escape leaves the input and keeps the results; another rail item closes Search', async ({ vaultPage: page }) => {
		await openSearch(page);
		await searchInput(page).fill('Roadmap');
		const row = railSearch(page).locator('[data-search-result]', { hasText: 'Roadmap' }).first();
		await expect(row).toBeVisible({ timeout: 5_000 });

		await page.keyboard.press('Escape');
		await expect(searchInput(page)).not.toBeFocused();
		await expect(row).toBeVisible();

		await page.locator('[data-rail-item="inbox"]').click();
		await expect(railSearch(page)).toHaveCount(0);
		await expect(page.locator('[data-rail-note-list] [data-note-list-label]')).toHaveText('Inbox');
	});
});
