import { test, expect } from '../fixtures/test-vault';
import { openTreeItem } from '../fixtures/helpers';

test.describe('Wikilink navigation', () => {
	test('clicking a wikilink decoration opens the target file', async ({ vaultPage: page }) => {
		await openTreeItem(page, 'Welcome.md');

		// Welcome contains [[Projects/Roadmap]] — find any rendered wikilink decoration.
		const wikilink = page.locator('.cm-lp-wikilink, .cm-lp-wikilink-inner').first();
		await wikilink.click();

		// New tab should be active for Roadmap
		await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('Roadmap');
	});

	test('navigating a wikilink preserves previously-open tabs', async ({ vaultPage: page }) => {
		await openTreeItem(page, 'Inbox.md');
		await openTreeItem(page, 'Welcome.md');
		const baseline = await page.locator('[role="tab"]').count();

		await page.locator('.cm-lp-wikilink, .cm-lp-wikilink-inner').first().click();

		await expect(page.locator('[role="tab"]')).toHaveCount(baseline + 1);
		await expect(page.locator('[role="tab"]', { hasText: 'Inbox' })).toBeVisible();
		await expect(page.locator('[role="tab"]', { hasText: 'Welcome' })).toBeVisible();
		await expect(page.locator('[role="tab"]', { hasText: 'Roadmap' })).toBeVisible();
	});
});
