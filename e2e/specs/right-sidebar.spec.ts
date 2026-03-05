import { test, expect } from '../fixtures/test-vault';

test.describe('Right Sidebar', () => {
	test('sidebar panels visible on vault open', async ({ vaultPage: page }) => {
		// Default settings enable right sidebar with all panels
		await expect(page.getByText('Properties', { exact: true })).toBeVisible();
		await expect(page.getByText('Backlinks', { exact: true })).toBeVisible();
		await expect(page.getByText('Tags', { exact: true })).toBeVisible();
	});

	test('properties panel shows content for open file', async ({ vaultPage: page }) => {
		// Open a file with no frontmatter
		await page.locator('[role="treeitem"]', { hasText: 'Welcome.md' }).click();
		await expect(page.locator('.cm-content')).toContainText('Welcome');

		// Properties section should be visible
		await expect(page.getByText('Properties', { exact: true })).toBeVisible();
	});

	test('sidebar hides with Cmd+B', async ({ vaultPage: page }) => {
		// Sidebar panels should be visible
		await expect(page.getByText('Properties', { exact: true })).toBeVisible();

		// Toggle sidebar off
		await page.keyboard.press('Meta+b');
		await expect(page.getByText('Properties', { exact: true })).not.toBeVisible({ timeout: 3_000 });
		await expect(page.getByText('Backlinks', { exact: true })).not.toBeVisible();
		await expect(page.getByText('Tags', { exact: true })).not.toBeVisible();
	});

	test('sidebar shows again after re-toggling', async ({ vaultPage: page }) => {
		// Hide
		await page.keyboard.press('Meta+b');
		await expect(page.getByText('Properties', { exact: true })).not.toBeVisible({ timeout: 3_000 });

		// Show again
		await page.keyboard.press('Meta+b');
		await expect(page.getByText('Properties', { exact: true })).toBeVisible({ timeout: 3_000 });
		await expect(page.getByText('Backlinks', { exact: true })).toBeVisible();
		await expect(page.getByText('Tags', { exact: true })).toBeVisible();
	});
});
