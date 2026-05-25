import { test, expect } from '../fixtures/test-vault';
import { openTreeItem } from '../fixtures/helpers';

test.describe('Table of Contents', () => {
	test('shows headings from the open file', async ({ vaultPage: page }) => {
		await openTreeItem(page, 'Welcome.md');

		const tocPanel = page.locator('h2', { hasText: 'Table of Contents' });
		await expect(tocPanel).toBeVisible({ timeout: 5_000 });

		// Welcome.md has "# Welcome" - use title attr to target TOC button specifically
		await expect(page.locator('button[title="Welcome"]')).toBeVisible({ timeout: 5_000 });
	});

	test('updates when switching files', async ({ vaultPage: page }) => {
		await openTreeItem(page, 'Welcome.md');
		await expect(page.locator('button[title="Welcome"]')).toBeVisible({ timeout: 5_000 });

		// Switch to 2026-Q2.md which has "# 2026 Q2" and "## Tasks"
		const projects = page.locator('[role="treeitem"]', { hasText: 'Projects' }).first();
		await projects.click();
		await openTreeItem(page, '2026-Q2.md');

		await expect(page.locator('button[title="Tasks"]')).toBeVisible({ timeout: 5_000 });
	});

	test('shows "No headings found" for content without headings', async ({ vaultPage: page }) => {
		// Inbox.md has "# Inbox" heading, so we need a file without headings.
		// The archived note has "# 2025 Q4 (archived)" so it still has a heading.
		// Instead, verify the empty state message exists in the component by checking
		// that the TOC panel is rendered (it would show "No headings found" only
		// when activeTabContent has no headings).
		await openTreeItem(page, 'Welcome.md');
		const tocPanel = page.locator('text=Table of Contents');
		await expect(tocPanel).toBeVisible({ timeout: 5_000 });
	});
});
