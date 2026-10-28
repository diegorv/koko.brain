import { test, expect } from '../fixtures/test-vault';
import { openSearch, openTreeItem } from '../fixtures/helpers';
import type { Page } from '@playwright/test';

const KICKOFF = '/test-vault/Events/Kickoff.md';
const LUNCH = '/test-vault/Events/Lunch.md';

// Two weeks after the test clock's day, so opening it proves the date moved.
const EVENT_FILES: Record<string, string> = {
	'/test-vault/Events/': '',
	[KICKOFF]: '---\n_type: Event\ndate: 2026-11-24\nstart: 09:00\nend: 10:00\n---\nKickoff planning, see [[Welcome]]\n',
	[LUNCH]: '---\n_type: Event\ndate: 2026-11-24\nstart: 12:00\nend: 13:00\n---\nTeam lunch\n',
};

test.use({ clockTime: '2026-11-10T10:00:00+01:00', timezoneId: 'Europe/Berlin' });

/**
 * Seeds the event notes and announces them the way Rust does, once the
 * auto-opened daily note has landed, so that tab cannot take the selection
 * from the Calendar later.
 */
async function seedEvents(page: Page): Promise<void> {
	await expect(page.locator('[role="tab"]', { hasText: '2026-11-10.md' })).toBeVisible({ timeout: 10_000 });
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

/** Asserts the Calendar is the active tab on the Kickoff week, with the Kickoff block focused and pulsing once. */
async function expectKickoffFocused(page: Page): Promise<void> {
	await expect(page.locator('[role="tab"][aria-selected="true"]', { hasText: 'Calendar' })).toBeVisible();
	await expect(page.locator('[data-calendar-title]')).toHaveText('November, 2026');
	await expect(page.locator('[data-calendar-subtitle]')).toContainText('Week 48');

	const block = page.locator(`[data-day-column="2026-11-24"] [data-event-path="${KICKOFF}"]`);
	await expect(block).toBeFocused({ timeout: 10_000 });
	await expect(block).toHaveAttribute('data-event-pulse', '');
	await expect(page.locator('[data-event-pulse]')).toHaveCount(1);
	// One pulse: the marker goes once the animation is over.
	await expect(block).not.toHaveAttribute('data-event-pulse', { timeout: 5_000 });
	await expect(block).toBeFocused();
}

test.describe('Event calendar: focus an event from search and backlinks', () => {
	test('a search result for an event note opens the Calendar on its day with the block focused and pulsing', async ({ vaultPage: page }) => {
		await seedEvents(page);
		await openSearch(page);
		await page.locator('input[placeholder*="search" i]:visible').first().fill('Kickoff planning');

		const action = page.getByRole('button', { name: 'Show in Calendar' });
		await expect(action).toHaveCount(1, { timeout: 10_000 });
		await action.click();

		await expectKickoffFocused(page);
		await expect(page.locator(`[data-event-path="${LUNCH}"]`)).toBeVisible();
		await expect(page.locator(`[data-event-path="${LUNCH}"]`)).not.toHaveAttribute('data-event-pulse');
	});

	test('a search result for a plain note offers no calendar action', async ({ vaultPage: page }) => {
		await seedEvents(page);
		await openSearch(page);
		await page.locator('input[placeholder*="search" i]:visible').first().fill('Roadmap');

		await expect(page.locator('text=Roadmap').first()).toBeVisible({ timeout: 5_000 });
		await expect(page.getByRole('button', { name: 'Show in Calendar' })).toHaveCount(0);
	});

	test('a backlink from an event note opens the Calendar on its day with the block focused and pulsing', async ({ vaultPage: page }) => {
		await seedEvents(page);
		await openTreeItem(page, 'Welcome.md');
		await page.locator('button', { has: page.locator('h2', { hasText: 'Backlinks' }) }).click();

		const action = page.getByRole('button', { name: 'Show in Calendar' });
		await expect(action).toHaveCount(1, { timeout: 10_000 });
		await action.click();

		await expectKickoffFocused(page);
	});
});
