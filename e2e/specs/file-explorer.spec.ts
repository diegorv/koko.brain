import { test, expect } from '../fixtures/test-vault';

test.describe('File Explorer', () => {
	test('file tree shows vault contents', async ({ vaultPage: page }) => {
		// Root files should be visible
		await expect(page.locator('[role="treeitem"]', { hasText: 'Welcome.md' })).toBeVisible();

		// Folders should be visible
		await expect(page.locator('[role="treeitem"]', { hasText: 'Projects' })).toBeVisible();
		await expect(page.locator('[role="treeitem"]', { hasText: 'Daily' })).toBeVisible();
	});

	test('clicking a folder expands it', async ({ vaultPage: page }) => {
		// Click on "Projects" folder
		const projectsFolder = page.locator('[role="treeitem"]', { hasText: 'Projects' }).first();
		await projectsFolder.click();

		// Children should be visible
		await expect(page.locator('[role="treeitem"]', { hasText: 'todo.md' })).toBeVisible();
		await expect(page.locator('[role="treeitem"]', { hasText: 'notes.md' })).toBeVisible();
	});

	test('clicking a file opens it in the editor', async ({ vaultPage: page }) => {
		// Click "Welcome.md" in file tree
		await page.locator('[role="treeitem"]', { hasText: 'Welcome.md' }).click();

		// Editor tab should appear with "Welcome.md" label
		await expect(page.locator('[role="tab"]', { hasText: 'Welcome.md' })).toBeVisible();

		// Editor content should contain "Welcome"
		await expect(page.locator('.cm-content')).toContainText('Welcome');
	});

	test('file tree hides .kokobrain directory', async ({ vaultPage: page }) => {
		// .kokobrain folder should NOT be visible in file tree
		const kokobrainItem = page.locator('[role="treeitem"]', { hasText: '.kokobrain' });
		await expect(kokobrainItem).not.toBeVisible();
	});
});
