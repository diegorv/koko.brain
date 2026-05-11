import { test, expect } from '../fixtures/test-vault';
import { openTreeItem, pressShortcut } from '../fixtures/helpers';

test.describe('Right sidebar panels', () => {
	test('backlinks panel populates for a note with incoming links', async ({ vaultPage: page }) => {
		// Open Projects/Roadmap.md — it is referenced by Welcome.md and Projects/2026-Q2.md
		const projects = page.locator('[role="treeitem"]', { hasText: 'Projects' }).first();
		await projects.click();
		await openTreeItem(page, 'Roadmap.md');

		// Backlinks may be in a panel labelled "Backlinks" or "Linked mentions"
		await expect(page.locator('text=/backlinks|linked mentions/i').first()).toBeVisible({
			timeout: 10_000,
		});
		// At least one source link rendered
		await expect(page.locator('text=Welcome').first()).toBeVisible();
	});

	test('outgoing links panel shows wikilinks from the active note', async ({ vaultPage: page }) => {
		await openTreeItem(page, 'Welcome.md');

		await expect(page.locator('text=/outgoing/i').first()).toBeVisible();
		await expect(page.locator('text=Roadmap').first()).toBeVisible();
	});

	test('Cmd+B toggles the right sidebar', async ({ vaultPage: page }) => {
		// The right sidebar contains the Properties / Backlinks / etc. panels.
		// Tracking visibility via a known panel header is the most stable signal.
		const sidebarHeader = page.locator('text=/backlinks|outgoing|properties/i').first();
		const wasVisible = await sidebarHeader.isVisible().catch(() => false);

		await pressShortcut(page, 'Mod+B');
		// After toggle, visibility should have flipped
		const nowVisible = await sidebarHeader.isVisible().catch(() => false);
		expect(nowVisible).not.toBe(wasVisible);
	});
});
