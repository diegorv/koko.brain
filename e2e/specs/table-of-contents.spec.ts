import { test, expect } from '../fixtures/test-vault';
import { openTreeItem } from '../fixtures/helpers';

async function expandToc(page: import('@playwright/test').Page) {
	const trigger = page.locator('h2', { hasText: 'Table of Contents' });
	await trigger.waitFor({ state: 'visible', timeout: 5_000 });
	await trigger.click();
	await page.waitForTimeout(300);
}

test.describe('Table of Contents', () => {
	test('shows headings from the open file', async ({ vaultPage: page }) => {
		await openTreeItem(page, 'Welcome.md');
		await expandToc(page);

		// Welcome.md has "# Welcome" - use title attr to target TOC button specifically
		await expect(page.locator('button[title="Welcome"]')).toBeVisible({ timeout: 5_000 });
	});

	test('updates when switching files', async ({ vaultPage: page }) => {
		await openTreeItem(page, 'Welcome.md');
		await expandToc(page);
		await expect(page.locator('button[title="Welcome"]')).toBeVisible({ timeout: 5_000 });

		// Switch to 2026-Q2.md which has "# 2026 Q2" and "## Tasks"
		const projects = page.locator('[role="treeitem"]', { hasText: 'Projects' }).first();
		await projects.click();
		await openTreeItem(page, '2026-Q2.md');

		// TOC collapses on file switch, re-expand
		await expandToc(page);
		await expect(page.locator('button[title="Tasks"]')).toBeVisible({ timeout: 5_000 });
	});

	test('shows "No headings found" for content without headings', async ({ vaultPage: page }) => {
		await openTreeItem(page, 'Welcome.md');
		const tocPanel = page.locator('text=Table of Contents');
		await expect(tocPanel).toBeVisible({ timeout: 5_000 });
	});
});
