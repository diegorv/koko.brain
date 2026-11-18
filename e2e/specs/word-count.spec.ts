import { test, expect } from '../fixtures/test-vault';
import { openFile } from '../fixtures/helpers';
import { openMarkdownFile } from '../fixtures/live-preview';

test.describe('Word count', () => {
	test('displays word count when a file is open', async ({ vaultPage: page }) => {
		await openFile(page, 'Welcome.md');

		await expect(page.locator('text=/\\d+ words/')).toBeVisible({ timeout: 5_000 });
	});

	test('shows characters and reading time alongside words', async ({ vaultPage: page }) => {
		await openFile(page, 'Welcome.md');

		await expect(page.locator('text=/\\d+ characters/')).toBeVisible({ timeout: 5_000 });
		await expect(page.locator('text=/\\d+ min read/')).toBeVisible({ timeout: 5_000 });
	});

	test('word count updates after typing', async ({ vaultPage: page }) => {
		await openFile(page, 'Welcome.md');

		// Wait for initial count to appear
		const counter = page.locator('text=/\\d+ words/');
		await expect(counter).toBeVisible({ timeout: 5_000 });
		const before = await counter.textContent();

		// Type extra text
		await page.locator('.cm-content').click();
		await page.keyboard.type(' extra words added here');

		// Wait for debounced update (500ms + buffer)
		await page.waitForTimeout(800);

		const after = await counter.textContent();
		expect(after).not.toBe(before);
	});
});

test.describe('Status bar', () => {
	test('is 24px tall and the save slot does not move between Saved and Modified', async ({ page }) => {
		// Todoist sync's status item renders on the setting alone; with no API
		// token the sync returns before any network call. It puts an item before
		// the slot, so the slot carries the group divider.
		await openMarkdownFile(page, 'Note.md', '# Note\n\nSome words here', {
			todoist: { syncEnabled: true },
		});

		const bar = page.locator('[data-status-bar]');
		const todoist = page.locator('[data-todoist-sync-status]');
		const slot = page.locator('[data-save-status]');
		const counter = page.locator('.word-count-stats');
		await expect(todoist).toBeVisible();
		await expect(slot).toHaveAttribute('data-state', 'saved');
		await expect(counter).toBeVisible({ timeout: 5_000 });

		const barBox = await bar.boundingBox();
		expect(barBox).not.toBeNull();
		expect(Math.abs(barBox!.height - 24)).toBeLessThanOrEqual(0.5);

		// The word count right of the slot changes width with the text and, the
		// group being right-aligned, shifts everything left of it. The gaps on
		// either side of the slot do not depend on it, so they are compared.
		const measure = async () => {
			const [t, s, c] = await Promise.all([todoist.boundingBox(), slot.boundingBox(), counter.boundingBox()]);
			return { width: s!.width, before: s!.x - (t!.x + t!.width), after: c!.x - (s!.x + s!.width) };
		};
		const saved = await measure();

		await page.locator('.cm-content').click();
		await page.keyboard.press('End');
		await page.keyboard.type(' extra');
		await expect(slot).toHaveAttribute('data-state', 'modified');
		const modified = await measure();

		// Autosave fires 2 s after the last keystroke.
		await expect.poll(() => slot.getAttribute('data-state'), { timeout: 6_000 }).toBe('saved');
		const resaved = await measure();

		for (const state of [modified, resaved]) {
			expect(state.width).toBeCloseTo(saved.width, 1);
			expect(state.before).toBeCloseTo(saved.before, 1);
			expect(state.after).toBeCloseTo(saved.after, 1);
		}
	});
});
