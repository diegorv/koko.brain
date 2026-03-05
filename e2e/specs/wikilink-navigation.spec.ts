import { test, expect } from '../fixtures/test-vault';

test.describe('Wikilink Navigation', () => {
	test('clicking wikilink opens linked file', async ({ vaultPage: page }) => {
		// Open Welcome.md which contains [[Projects/todo]]
		await page.locator('[role="treeitem"]', { hasText: 'Welcome.md' }).click();
		await expect(page.locator('.cm-content')).toContainText('Welcome');

		// Wait for the editor to render wikilink decorations
		// In live preview mode (default), wikilinks get the .cm-lp-wikilink class
		// In source mode, they get .cm-wikilink-target
		const wikilink = page.locator('.cm-lp-wikilink, .cm-wikilink-target').first();
		await expect(wikilink).toBeVisible({ timeout: 3_000 });

		// Click the wikilink to navigate
		await wikilink.click();

		// The linked file (todo.md) should open in a new tab
		await expect(page.locator('[role="tab"]', { hasText: 'todo.md' })).toBeVisible({ timeout: 5_000 });
		await expect(page.locator('.cm-content')).toContainText('Todo');
	});

	test('clicking wikilink in notes.md opens Welcome.md', async ({ vaultPage: page }) => {
		// Open notes.md which contains [[Welcome]]
		await page.locator('[role="treeitem"]', { hasText: 'Projects' }).first().click();
		await page.locator('[role="treeitem"]', { hasText: 'notes.md' }).click();
		await expect(page.locator('.cm-content')).toContainText('Notes');

		// Find and click the wikilink
		const wikilink = page.locator('.cm-lp-wikilink, .cm-wikilink-target').first();
		await expect(wikilink).toBeVisible({ timeout: 3_000 });
		await wikilink.click();

		// Welcome.md should open
		await expect(page.locator('[role="tab"]', { hasText: 'Welcome.md' })).toBeVisible({ timeout: 5_000 });
		await expect(page.locator('.cm-content')).toContainText('Welcome');
	});

	test('wikilink navigation preserves original tab', async ({ vaultPage: page }) => {
		// Open Welcome.md
		await page.locator('[role="treeitem"]', { hasText: 'Welcome.md' }).click();
		await expect(page.locator('[role="tab"]', { hasText: 'Welcome.md' })).toBeVisible();

		// Click the wikilink to open todo.md
		const wikilink = page.locator('.cm-lp-wikilink, .cm-wikilink-target').first();
		await expect(wikilink).toBeVisible({ timeout: 3_000 });
		await wikilink.click();

		// Both tabs should exist
		await expect(page.locator('[role="tab"]', { hasText: 'Welcome.md' })).toBeVisible({ timeout: 3_000 });
		await expect(page.locator('[role="tab"]', { hasText: 'todo.md' })).toBeVisible({ timeout: 3_000 });

		// The new tab (todo.md) should be active
		await expect(page.locator('[role="tab"]', { hasText: 'todo.md' })).toHaveAttribute('aria-selected', 'true');
	});
});
