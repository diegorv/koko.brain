import { test, expect } from '../fixtures/test-vault';

test.describe('Editor', () => {
	test('opening a file shows content in editor', async ({ vaultPage: page }) => {
		// Click file in explorer
		await page.locator('[role="treeitem"]', { hasText: 'Welcome.md' }).click();

		// Editor pane shows file content
		await expect(page.locator('.cm-content')).toContainText('Welcome');

		// Tab bar shows file name
		await expect(page.locator('[role="tab"]', { hasText: 'Welcome.md' })).toBeVisible();
	});

	test('opening multiple files creates tabs', async ({ vaultPage: page }) => {
		// Click "Welcome.md"
		await page.locator('[role="treeitem"]', { hasText: 'Welcome.md' }).click();
		await expect(page.locator('[role="tab"]', { hasText: 'Welcome.md' })).toBeVisible();

		// Expand Projects folder and click "todo.md"
		await page.locator('[role="treeitem"]', { hasText: 'Projects' }).first().click();
		await page.locator('[role="treeitem"]', { hasText: 'todo.md' }).click();

		// Both tabs should be visible
		await expect(page.locator('[role="tab"]', { hasText: 'Welcome.md' })).toBeVisible();
		await expect(page.locator('[role="tab"]', { hasText: 'todo.md' })).toBeVisible();

		// Second tab should be active
		await expect(page.locator('[role="tab"]', { hasText: 'todo.md' })).toHaveAttribute('aria-selected', 'true');
	});

	test('switching tabs changes editor content', async ({ vaultPage: page }) => {
		// Open Welcome.md
		await page.locator('[role="treeitem"]', { hasText: 'Welcome.md' }).click();
		await expect(page.locator('.cm-content')).toContainText('Welcome');

		// Expand Projects and open todo.md
		await page.locator('[role="treeitem"]', { hasText: 'Projects' }).first().click();
		await page.locator('[role="treeitem"]', { hasText: 'todo.md' }).click();
		await expect(page.locator('.cm-content')).toContainText('Todo');

		// Switch back to Welcome.md tab
		await page.locator('[role="tab"]', { hasText: 'Welcome.md' }).click();
		await expect(page.locator('.cm-content')).toContainText('Welcome');

		// Switch back to todo.md tab
		await page.locator('[role="tab"]', { hasText: 'todo.md' }).click();
		await expect(page.locator('.cm-content')).toContainText('Todo');
	});

	test('closing a tab removes it', async ({ vaultPage: page }) => {
		// Open a file
		await page.locator('[role="treeitem"]', { hasText: 'Welcome.md' }).click();
		await expect(page.locator('[role="tab"]', { hasText: 'Welcome.md' })).toBeVisible();

		// Hover over the tab to reveal close button, then click it
		const tab = page.locator('[role="tab"]', { hasText: 'Welcome.md' });
		await tab.hover();

		// The close button (X icon) inside the tab
		const closeBtn = tab.locator('button');
		await closeBtn.click();

		// Tab should be removed
		await expect(page.locator('[role="tab"]', { hasText: 'Welcome.md' })).not.toBeVisible();

		// Editor should show empty state
		await expect(page.getByText('Select a file to view its contents')).toBeVisible();
	});

	test('editing content shows dirty indicator', async ({ vaultPage: page }) => {
		// Open a file
		await page.locator('[role="treeitem"]', { hasText: 'Welcome.md' }).click();
		await expect(page.locator('.cm-content')).toBeVisible();

		// Type in the CodeMirror editor
		await page.locator('.cm-content').click();
		await page.keyboard.type('New text here');

		// The dirty indicator dot should appear in the tab
		const tab = page.locator('[role="tab"]', { hasText: 'Welcome.md' });
		await expect(tab.locator('span.rounded-full')).toBeVisible();
	});
});
