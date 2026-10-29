import type { Page } from '@playwright/test';
import { test, expect, TEST_VAULT_PATH } from '../fixtures/test-vault';
import { openTreeItem, pressShortcut } from '../fixtures/helpers';

/** Reads the persisted visibility flag for one sidebar from settings.json on the mock FS. */
function readPersistedVisibility(page: Page, key: 'leftSidebarVisible' | 'rightSidebarVisible') {
	return page.evaluate(
		({ vaultPath, key }) => {
			const raw = window.__e2e.fs.readFile(`${vaultPath}/.kokobrain/settings.json`);
			return JSON.parse(raw).layout[key] as boolean | undefined;
		},
		{ vaultPath: TEST_VAULT_PATH, key },
	);
}

test.describe('Right sidebar panels', () => {
	test('backlinks panel populates for a note with incoming links', async ({ vaultPage: page }) => {
		// Open Projects/Roadmap.md — it is referenced by Welcome.md and Projects/2026-Q2.md
		const projects = page.locator('[role="treeitem"]', { hasText: 'Projects' }).first();
		await projects.click();
		await openTreeItem(page, 'Roadmap.md');

		// The panel starts collapsed and fetches when expanded. Its header, or
		// the file tree's Welcome.md, would match a bare text check even when
		// no backlink renders, so assert on the entries under "Linked mentions".
		await page.locator('button', { has: page.locator('h2', { hasText: 'Backlinks' }) }).click();
		const linked = page.getByRole('button', { name: /^Linked mentions/ });
		await expect(linked.locator('span.ml-auto')).toHaveText('2', { timeout: 10_000 });
		const entries = linked.locator('xpath=following-sibling::*[1]');
		await expect(entries.getByRole('button', { name: /^Welcome/ })).toBeVisible();
		await expect(entries.getByRole('button', { name: /^2026-Q2/ })).toBeVisible();
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

test.describe('Sidebar toggle buttons persist layout', () => {
	// Regression: the AppShell toggle buttons used to flip the pane without
	// writing settings.json, while the equivalent keybindings persisted it.
	// Hiding a sidebar can leak to disk indirectly (the surviving panes fire
	// onResize -> debouncedSave, which serializes the whole store), so a
	// single click is not a valid probe. Hiding BOTH sidebars removes every
	// pane with an onResize handler: the second flag only reaches disk if the
	// button itself saves.

	test('hiding both sidebars via the buttons persists both flags', async ({ vaultPage: page }) => {
		await page.locator('button[title="Hide right sidebar"]').click();
		await expect.poll(() => readPersistedVisibility(page, 'rightSidebarVisible')).toBe(false);

		await page.locator('button[title="Hide left sidebar"]').click();
		await expect.poll(() => readPersistedVisibility(page, 'leftSidebarVisible')).toBe(false);
	});

	test('hiding only the left sidebar keeps the tabs clear of the traffic lights', async ({ vaultPage: page }) => {
		await openTreeItem(page, 'Welcome.md');
		await page.locator('button[title="Hide left sidebar"]').click();
		await expect(page.locator('button[title="Hide right sidebar"]')).toBeVisible();

		const spacer = page.locator('[data-traffic-light-spacer]');
		await expect(spacer).toBeVisible();
		const spacerBox = (await spacer.boundingBox())!;
		expect(spacerBox.x).toBe(0);
		expect(spacerBox.width).toBe(116);

		const tab = page.locator('[role="tab"]', { hasText: 'Welcome' }).first();
		await expect(tab).toBeVisible();
		expect((await tab.boundingBox())!.x).toBeGreaterThanOrEqual(116);
	});
});
