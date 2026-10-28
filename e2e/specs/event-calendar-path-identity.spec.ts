import { test, expect } from '../fixtures/test-vault';
import { openCommandPalette } from '../fixtures/helpers';
import type { Page } from '@playwright/test';

const STANDUP = '/test-vault/Events/Standup.md';
const RENAMED = '/test-vault/Events/Daily sync.md';

const EVENT_FILES: Record<string, string> = {
	'/test-vault/Events/': '',
	[STANDUP]: '---\n_type: Event\ndate: 2026-11-10\nstart: 09:00\nend: 10:00\n---\nDaily sync notes\n',
};

test.use({ clockTime: '2026-11-10T10:00:00+01:00', timezoneId: 'Europe/Berlin' });

/** Seeds the event note and announces it the way Rust does. */
async function seedEvents(page: Page): Promise<void> {
	await page.evaluate(({ files }) => {
		const e2e = (window as any).__e2e;
		e2e.fs.populate(files);
		e2e.events.emit('vault-index-updated', {
			changed: true,
			affected: Object.keys(files).filter((p) => !p.endsWith('/')),
			version: e2e.vaultIndex.version,
		});
	}, { files: EVENT_FILES });
}

/** Opens the Calendar tab through the palette once the auto-opened daily note has landed. */
async function openCalendar(page: Page): Promise<void> {
	await expect(page.locator('[role="tab"]', { hasText: '2026-11-10.md' })).toBeVisible({ timeout: 10_000 });
	await openCommandPalette(page);
	await page.locator('input[placeholder*="command"]:visible').first().fill('Toggle Calendar View');
	await page.getByRole('option', { name: /Toggle Calendar View/ }).click();
	await expect(page.locator('[data-event-calendar]')).toBeVisible();
}

/** Scrolls 09:00 clear of the sticky header, so a click on the block does not scroll and close the popover. */
async function scrollToNine(page: Page): Promise<void> {
	await page.locator('[data-time-grid]').evaluate(
		(el) =>
			new Promise<void>((resolve) => {
				el.addEventListener('scroll', () => requestAnimationFrame(() => resolve()), { once: true });
				el.scrollTop = 6 * 64;
			}),
	);
}

test.describe('Event calendar path identity', () => {
	test('renaming through the dialog title keeps the dialog, focus and popover on the renamed event', async ({ vaultPage: page }) => {
		await seedEvents(page);
		await openCalendar(page);
		const standup = page.locator(`[data-day-column="2026-11-10"] [data-event-path="${STANDUP}"]`);
		await expect(standup).toBeVisible({ timeout: 10_000 });
		await scrollToNine(page);
		await standup.click();
		await page.locator('[data-event-popover]').getByRole('button', { name: 'Edit' }).click();
		const dialog = page.locator('[data-event-dialog]');
		await expect(dialog).toBeVisible();

		await dialog.getByLabel('Title').fill('Daily sync');
		await dialog.getByRole('button', { name: 'Save' }).click();

		// The save closes the dialog itself and hands focus to the block at the new path.
		await expect(dialog).toHaveCount(0);
		const renamed = page.locator(`[data-day-column="2026-11-10"] [data-event-path="${RENAMED}"]`);
		await expect(renamed).toBeFocused();
		await expect(page.locator(`[data-event-path="${STANDUP}"]`)).toHaveCount(0);
		expect(await page.evaluate((path) => window.__e2e.fs.exists(path), RENAMED)).toBe(true);

		// The popover opens on the renamed event and stays on it once the index catches up.
		await page.keyboard.press('Enter');
		const popover = page.locator('[data-event-popover]');
		await expect(popover.locator('[data-popover-title]')).toHaveText('Daily sync');
		// The throttled vault-index refresh settles the overlay (2 s after the event, 10 s spacing).
		await expect(page.locator(`[data-event-path="${RENAMED}"][data-pending="false"]`)).toHaveCount(1, { timeout: 15_000 });
		await expect(popover.locator('[data-popover-title]')).toHaveText('Daily sync');
	});
});
