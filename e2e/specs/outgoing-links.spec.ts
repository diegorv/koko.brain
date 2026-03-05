import { test, expect } from '../fixtures/test-vault';

test.describe('Outgoing Links Panel', () => {
	test('shows outgoing links for file with wikilinks', async ({ vaultPage: page }) => {
		// Welcome.md contains [[Projects/todo]]
		await page.locator('[role="treeitem"]', { hasText: 'Welcome.md' }).click();
		await expect(page.locator('.cm-content')).toContainText('Welcome');

		// Outgoing links panel "Links" trigger (not "Linked mentions")
		const linksTrigger = page.locator('button', { hasText: /Links/ });
		await expect(linksTrigger).toBeVisible({ timeout: 10_000 });

		// Should show Projects/todo as outgoing link (scoped to avoid calendar matches)
		const linksGroup = linksTrigger.locator('..');
		await expect(linksGroup.locator('button', { hasText: 'Projects/todo' })).toBeVisible({ timeout: 10_000 });
	});

	test('shows outgoing links count', async ({ vaultPage: page }) => {
		// Welcome.md has 1 outgoing wikilink: [[Projects/todo]]
		await page.locator('[role="treeitem"]', { hasText: 'Welcome.md' }).click();
		await expect(page.locator('.cm-content')).toContainText('Welcome');

		// The Links section trigger should show count 1
		const linksTrigger = page.locator('button', { hasText: /Links/ });
		await expect(linksTrigger).toBeVisible({ timeout: 10_000 });
		await expect(linksTrigger).toContainText('1');
	});

	test('shows outgoing links for notes.md', async ({ vaultPage: page }) => {
		// Expand Projects folder and open notes.md
		await page.locator('[role="treeitem"]', { hasText: 'Projects' }).first().click();
		await page.locator('[role="treeitem"]', { hasText: 'notes.md' }).click();
		await expect(page.locator('.cm-content')).toContainText('Notes');

		// notes.md contains [[Welcome]], so Welcome should appear as outgoing link
		const linksTrigger = page.locator('button', { hasText: /Links/ });
		await expect(linksTrigger).toBeVisible({ timeout: 10_000 });

		// Scope to outgoing links group to avoid matching calendar's "Welcome" button
		const linksGroup = linksTrigger.locator('..');
		await expect(linksGroup.locator('button', { hasText: 'Welcome' })).toBeVisible({ timeout: 10_000 });
	});

	test('shows no outgoing links for file without wikilinks', async ({ vaultPage: page }) => {
		// Open Daily/2024-01-15.md which has no wikilinks
		await page.locator('[role="treeitem"]', { hasText: 'Daily' }).first().click();
		await page.locator('[role="treeitem"]', { hasText: '2024-01-15.md' }).click();
		await expect(page.locator('.cm-content')).toContainText('Daily Note');

		// Should show "No outgoing links"
		await expect(page.getByText('No outgoing links')).toBeVisible({ timeout: 10_000 });
	});

	test('clicking outgoing link opens the target file', async ({ vaultPage: page }) => {
		// Open notes.md which has [[Welcome]]
		await page.locator('[role="treeitem"]', { hasText: 'Projects' }).first().click();
		await page.locator('[role="treeitem"]', { hasText: 'notes.md' }).click();
		await expect(page.locator('.cm-content')).toContainText('Notes');

		// Wait for outgoing links and click the Welcome link (scoped to links group)
		const linksTrigger = page.locator('button', { hasText: /Links/ });
		await expect(linksTrigger).toBeVisible({ timeout: 10_000 });

		const linksGroup = linksTrigger.locator('..');
		const linkItem = linksGroup.locator('button', { hasText: 'Welcome' });
		await expect(linkItem).toBeVisible({ timeout: 10_000 });
		await linkItem.click();

		// Welcome.md should open in a new tab
		await expect(page.locator('[role="tab"]', { hasText: 'Welcome.md' })).toBeVisible();
		await expect(page.locator('.cm-content')).toContainText('Welcome');
	});
});
