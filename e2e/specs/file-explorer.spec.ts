import { test, expect } from '../fixtures/test-vault';

test.describe('File explorer', () => {
	test('shows top-level files and folders, hides .kokobrain', async ({ vaultPage: page }) => {
		const tree = page.locator('[role="tree"]');
		await expect(tree).toBeVisible();
		await expect(tree.locator('[role="treeitem"]', { hasText: 'Welcome.md' })).toBeVisible();
		await expect(tree.locator('[role="treeitem"]', { hasText: 'Inbox.md' })).toBeVisible();
		await expect(tree.locator('[role="treeitem"]', { hasText: 'Projects' })).toBeVisible();
		await expect(tree.locator('[role="treeitem"]', { hasText: 'Daily' })).toBeVisible();
		await expect(tree.locator('[role="treeitem"]', { hasText: '.kokobrain' })).toHaveCount(0);
	});

	test('expanding a folder reveals its children', async ({ vaultPage: page }) => {
		const projects = page.locator('[role="treeitem"]', { hasText: 'Projects' }).first();
		await projects.click();

		await expect(page.locator('[role="treeitem"]', { hasText: 'Roadmap.md' })).toBeVisible();
		await expect(page.locator('[role="treeitem"]', { hasText: '2026-Q2.md' })).toBeVisible();
		await expect(page.locator('[role="treeitem"]', { hasText: 'archive' })).toBeVisible();
	});

	test('directories appear before files at root level', async ({ vaultPage: page }) => {
		const items = page.locator('[role="tree"] > [role="treeitem"]');
		const names = await items.allTextContents();
		// Find first .md file — every entry before it must be a folder (no .md suffix).
		const firstFileIdx = names.findIndex((n) => /\.md$/.test(n.trim().split('\n')[0]));
		expect(firstFileIdx).toBeGreaterThan(0);
		for (let i = 0; i < firstFileIdx; i++) {
			expect(names[i].trim().split('\n')[0]).not.toMatch(/\.md$/);
		}
	});
});
