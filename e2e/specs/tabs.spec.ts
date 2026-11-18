import type { Page } from '@playwright/test';
import { test, expect, TEST_VAULT_PATH } from '../fixtures/test-vault';
import { activeTab, openFile, pressShortcut } from '../fixtures/helpers';

// `vaultPage` may already have an auto-opened daily-note tab from
// `autoOpenDailyNote()` — assertions count files RELATIVE to that baseline.

/** The open tabs' names (their `aria-label`, the full file name), in strip order. */
function tabNames(page: Page): Promise<(string | null)[]> {
	return page.locator('.editor-tabs-bar [role="tab"]').evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')));
}

/** Pins the active tab through its context menu. */
async function pinActiveTab(page: Page): Promise<void> {
	await activeTab(page).click({ button: 'right' });
	await page.getByRole('menuitem', { name: /Pin Tab/i }).click();
}

test.describe('Tabs', () => {
	test('opens multiple files as tabs', async ({ vaultPage: page }) => {
		const baseline = await page.locator('[role="tab"]').count();
		await openFile(page, 'Welcome.md');
		await openFile(page, 'Inbox.md');

		const tabs = page.locator('[role="tab"]');
		await expect(tabs).toHaveCount(baseline + 2);
		await expect(page.locator('[role="tab"]', { hasText: 'Welcome' })).toBeVisible();
		await expect(page.locator('[role="tab"]', { hasText: 'Inbox' })).toBeVisible();
	});

	test('Cmd+Shift+] and Cmd+Shift+[ cycle through tabs', async ({ vaultPage: page }) => {
		await openFile(page, 'Welcome.md');
		await openFile(page, 'Inbox.md');

		await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('Inbox');

		await pressShortcut(page, 'Mod+Shift+BracketLeft');
		await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('Welcome');

		await pressShortcut(page, 'Mod+Shift+BracketRight');
		await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('Inbox');
	});

	test('Cmd+W closes the active tab', async ({ vaultPage: page }) => {
		await openFile(page, 'Welcome.md');
		await openFile(page, 'Inbox.md');
		const before = await page.locator('[role="tab"]').count();

		await pressShortcut(page, 'Mod+W');
		await expect(page.locator('[role="tab"]')).toHaveCount(before - 1);
		await expect(page.locator('[role="tab"]', { hasText: 'Inbox' })).toHaveCount(0);
	});

	test('the active tab scrolls into view in an overflowing strip', async ({ vaultPage: page }) => {
		// At 640 px the navigator leaves `Projects/archive` no width to click, so only the
		// last tab, whose note sits at the vault root, opens in the narrow window.
		for (const name of ['Inbox.md', 'Roadmap.md', '2026-Q2.md', '2025-Q4.md', '2026-05-01.md']) {
			await openFile(page, name);
		}
		await page.setViewportSize({ width: 640, height: 800 });
		await openFile(page, 'Welcome.md');
		const strip = page.locator('.editor-tabs-bar');
		const active = page.locator('[role="tab"][aria-selected="true"]');
		// Without overflow the containment checks below would pass on any code.
		expect(await strip.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);

		const expectActiveInsideStrip = async () => {
			await expect(async () => {
				const s = (await strip.boundingBox())!;
				const t = (await active.boundingBox())!;
				// Tab widths are fractional (text layout), but Chromium snaps scrollLeft to
				// whole device pixels, so `scrollIntoView` can leave the tab less than 1 px past
				// the edge (measured: 0.1875 px at DPR 1). An off-strip tab misses by far more.
				const SUBPIXEL = 1;
				expect(t.x).toBeGreaterThanOrEqual(s.x - SUBPIXEL);
				expect(t.x + t.width).toBeLessThanOrEqual(s.x + s.width + SUBPIXEL);
			}).toPass({ timeout: 5_000 });
		};

		await expect(active).toContainText('Welcome');
		await expectActiveInsideStrip();

		const count = await page.locator('[role="tab"]').count();
		for (let i = 1; i < count; i++) await pressShortcut(page, 'Mod+Shift+BracketLeft');
		await expect(page.locator('[role="tab"]').first()).toHaveAttribute('aria-selected', 'true');
		await expectActiveInsideStrip();
	});

	test('unpinned tabs shrink from 220 px toward 100 px before the strip scrolls', async ({ vaultPage: page }) => {
		// Few enough tabs that the editor pane (about 40 % of the window) fits them at 100 px when wide.
		for (const name of ['Welcome.md', 'Inbox.md', 'Roadmap.md', '2026-Q2.md']) {
			await openFile(page, name);
		}
		const strip = page.locator('.editor-tabs-bar');
		// The width of every tab's flex item (the strip's direct children) and whether the strip scrolls.
		const measure = () =>
			strip.evaluate((el) => ({
				overflowing: el.scrollWidth > el.clientWidth,
				widths: [...el.children].map((child) => child.getBoundingClientRect().width),
			}));

		// Widest first: tabs sit at 220 px, then shrink as the window narrows, then the strip scrolls.
		const steps: Awaited<ReturnType<typeof measure>>[] = [];
		for (let width = 1600; width >= 560; width -= 80) {
			await page.setViewportSize({ width, height: 800 });
			steps.push(await measure());
		}

		// Tab widths are fractional (text and pane percentages); half a pixel absorbs it.
		const SUBPIXEL = 0.5;
		for (const step of steps) {
			for (const w of step.widths) {
				expect(w).toBeGreaterThanOrEqual(100 - SUBPIXEL);
				expect(w).toBeLessThanOrEqual(220 + SUBPIXEL);
			}
		}
		// Without these two the bounds above could pass on fixed-width tabs.
		expect(steps.some((s) => !s.overflowing && Math.max(...s.widths) < 220 - 10)).toBe(true);
		const overflowing = steps.filter((s) => s.overflowing);
		expect(overflowing.length).toBeGreaterThan(0);
		for (const step of overflowing) expect(Math.max(...step.widths)).toBeLessThanOrEqual(100 + SUBPIXEL);
	});

	test('pinned, inactive and active tabs share one height', async ({ vaultPage: page }) => {
		await page.evaluate(() => window.__e2e.dialog.setAskResponse(true));
		await openFile(page, 'Welcome.md');
		await page.locator('[role="tab"][aria-selected="true"]').click({ button: 'right' });
		await page.getByRole('menuitem', { name: /Pin Tab/i }).click();
		await openFile(page, 'Inbox.md');
		await openFile(page, 'Roadmap.md');

		const pinned = page.locator('[role="tab"]').first();
		const inactive = page.locator('[role="tab"]', { hasText: 'Inbox' });
		const active = page.locator('[role="tab"][aria-selected="true"]');
		await expect(active).toContainText('Roadmap');
		await expect(pinned.getByRole('button', { name: /Close/i })).toHaveCount(0);

		const heights = await Promise.all([pinned, inactive, active].map(async (l) => (await l.boundingBox())!.height));
		expect(heights[1]).toBe(heights[0]);
		expect(heights[2]).toBe(heights[0]);
	});

	test('a markdown tab shows its name without .md and its path on hover', async ({ vaultPage: page }) => {
		await openFile(page, 'Roadmap.md');

		await expect(activeTab(page)).toHaveText('Roadmap');
		await expect(activeTab(page)).toHaveAttribute('aria-label', 'Roadmap.md');
		await expect(activeTab(page)).toHaveAttribute('title', 'Roadmap.md\nProjects/Roadmap.md');
		await expect(activeTab(page).getByRole('button', { name: 'Close Roadmap.md' })).toHaveCount(1);
	});

	test('a short tab name leaves the close button at the tab end, so a click on the middle switches', async ({ vaultPage: page }) => {
		await openFile(page, 'Inbox.md');
		await openFile(page, 'Welcome.md');
		const inbox = page.locator('.editor-tabs-bar [role="tab"]', { hasText: 'Inbox' });
		const tab = (await inbox.boundingBox())!;
		const close = (await inbox.getByRole('button', { name: 'Close Inbox.md' }).boundingBox())!;
		// The button's right edge sits within the tab's right padding (px-3, 12 px).
		expect(tab.x + tab.width - (close.x + close.width)).toBeLessThanOrEqual(12 + 1);

		await inbox.click();

		await expect(activeTab(page)).toHaveText('Inbox');
	});

	test('dragging the last tab onto the first slot moves it there and keeps it active', async ({ vaultPage: page }) => {
		for (const name of ['Welcome.md', 'Inbox.md', 'Roadmap.md']) await openFile(page, name);
		const tabs = page.locator('.editor-tabs-bar [role="tab"]');
		const before = await tabNames(page);
		expect(before.at(-1)).toBe('Roadmap.md');

		// Left of the first tab's midpoint, so the slot is before it.
		await tabs.last().dragTo(tabs.first(), { targetPosition: { x: 4, y: 10 } });

		await expect.poll(() => tabNames(page)).toEqual(['Roadmap.md', ...before.slice(0, -1)]);
		await expect(activeTab(page)).toHaveAttribute('aria-label', 'Roadmap.md');
		await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
		await expect(page.locator('[data-tab-drop-marker]')).toHaveCount(0);
	});

	test('a pinned tab dragged past the unpinned tabs stays at the end of the pinned group', async ({ vaultPage: page }) => {
		await page.evaluate(() => window.__e2e.dialog.setAskResponse(true));
		for (const name of ['Welcome.md', 'Inbox.md']) {
			await openFile(page, name);
			await pinActiveTab(page);
		}
		await openFile(page, 'Roadmap.md');
		const tabs = page.locator('.editor-tabs-bar [role="tab"]');
		const before = await tabNames(page);
		expect(before.slice(0, 2)).toEqual(['Welcome.md', 'Inbox.md']);

		await tabs.first().dragTo(tabs.last());

		await expect.poll(() => tabNames(page)).toEqual(['Inbox.md', 'Welcome.md', ...before.slice(2)]);
		await expect(tabs.nth(1).getByRole('button', { name: /Close/i })).toHaveCount(0);
		await expect(activeTab(page)).toHaveAttribute('aria-label', 'Roadmap.md');
	});

	test('a tab dropped on a Files folder moves nothing on disk', async ({ vaultPage: page }) => {
		await openFile(page, 'Roadmap.md');
		await page.locator('[data-rail-item="files"]').click();
		const daily = page.locator(`[data-files-navigator-folder="${TEST_VAULT_PATH}/Daily"]`);
		await expect(daily).toBeVisible();

		await activeTab(page).dragTo(daily);

		// A note row dragged the same way moves the note into the folder (rail-shell.spec.ts).
		await daily.click();
		await expect(page.locator('[data-rail-note-list] [data-note-list-rule]')).toHaveText('in Daily/');
		await expect(page.locator('[data-rail-note-list] [data-note-row]', { hasText: 'Roadmap' })).toHaveCount(0);
		const exists = (path: string) => page.evaluate((p) => window.__e2e.fs.exists(p), path);
		expect(await exists(`${TEST_VAULT_PATH}/Projects/Roadmap.md`)).toBe(true);
		expect(await exists(`${TEST_VAULT_PATH}/Daily/Roadmap.md`)).toBe(false);
		await expect(activeTab(page)).toHaveAttribute('aria-label', 'Roadmap.md');
	});
});
