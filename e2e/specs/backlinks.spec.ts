import { test, expect } from '../fixtures/test-vault';

test.describe('Backlinks Panel', () => {
	test('shows linked mentions for file that is linked to', async ({ vaultPage: page }) => {
		// Welcome.md is linked by Projects/notes.md (which contains [[Welcome]])
		await page.locator('[role="treeitem"]', { hasText: 'Welcome.md' }).click();
		await expect(page.locator('.cm-content')).toContainText('Welcome');

		// Wait for backlinks panel to show linked mentions (getNoteName strips .md extension)
		// Use .first() because "Unlinked mentions" also contains "Linked mentions" (case-insensitive)
		const linkedBtn = page.locator('button', { hasText: 'Linked mentions' }).first();
		await expect(linkedBtn).toBeVisible({ timeout: 10_000 });

		// Should show "notes" as a linked mention (button contains snippet text too)
		await expect(page.locator('button', { hasText: /notes.*Welcome/ })).toBeVisible({ timeout: 10_000 });
	});

	test('shows linked mentions count', async ({ vaultPage: page }) => {
		// Open Welcome.md which is linked by notes.md
		await page.locator('[role="treeitem"]', { hasText: 'Welcome.md' }).click();
		await expect(page.locator('.cm-content')).toContainText('Welcome');

		// The linked mentions section should show count 1
		const linkedTrigger = page.locator('button', { hasText: 'Linked mentions' }).first();
		await expect(linkedTrigger).toBeVisible({ timeout: 10_000 });
		await expect(linkedTrigger).toContainText('1');
	});

	test('shows backlinks for todo.md', async ({ vaultPage: page }) => {
		// Expand Projects folder and open todo.md
		await page.locator('[role="treeitem"]', { hasText: 'Projects' }).first().click();
		await page.locator('[role="treeitem"]', { hasText: 'todo.md' }).click();
		await expect(page.locator('.cm-content')).toContainText('Todo');

		// Welcome.md contains [[Projects/todo]], so "Welcome" should appear as a backlink
		await expect(page.locator('button', { hasText: 'Linked mentions' }).first()).toBeVisible({ timeout: 10_000 });
		await expect(page.locator('button', { hasText: /Welcome.*todo/ })).toBeVisible({ timeout: 10_000 });
	});

	test('shows no backlinks for file with no incoming links', async ({ vaultPage: page }) => {
		// Open Daily/2024-01-15.md which has no links pointing to it
		await page.locator('[role="treeitem"]', { hasText: 'Daily' }).first().click();
		await page.locator('[role="treeitem"]', { hasText: '2024-01-15.md' }).click();
		await expect(page.locator('.cm-content')).toContainText('Daily Note');

		// Should show "No backlinks found"
		await expect(page.getByText('No backlinks found')).toBeVisible({ timeout: 10_000 });
	});

	test('clicking backlink opens the source file', async ({ vaultPage: page }) => {
		// Open Welcome.md
		await page.locator('[role="treeitem"]', { hasText: 'Welcome.md' }).click();
		await expect(page.locator('.cm-content')).toContainText('Welcome');

		// Wait for backlinks to load and click the notes backlink (contains snippet)
		const backlinkItem = page.locator('button', { hasText: /notes.*Welcome/ });
		await expect(backlinkItem).toBeVisible({ timeout: 10_000 });
		await backlinkItem.click();

		// notes.md should now be open in the editor
		await expect(page.locator('[role="tab"]', { hasText: 'notes.md' })).toBeVisible();
		await expect(page.locator('.cm-content')).toContainText('Notes');
	});
});
