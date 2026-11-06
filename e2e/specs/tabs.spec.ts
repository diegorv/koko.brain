import { test, expect } from '../fixtures/test-vault';
import { openFile, pressShortcut } from '../fixtures/helpers';

// `vaultPage` may already have an auto-opened daily-note tab from
// `autoOpenDailyNote()` — assertions count files RELATIVE to that baseline.

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
				expect(t.x).toBeGreaterThanOrEqual(s.x);
				expect(t.x + t.width).toBeLessThanOrEqual(s.x + s.width);
			}).toPass({ timeout: 5_000 });
		};

		await expect(active).toContainText('Welcome');
		await expectActiveInsideStrip();

		const count = await page.locator('[role="tab"]').count();
		for (let i = 1; i < count; i++) await pressShortcut(page, 'Mod+Shift+BracketLeft');
		await expect(page.locator('[role="tab"]').first()).toHaveAttribute('aria-selected', 'true');
		await expectActiveInsideStrip();
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
});
