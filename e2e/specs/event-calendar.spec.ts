import { test, expect } from '../fixtures/test-vault';
import { openCommandPalette } from '../fixtures/helpers';
import type { Page } from '@playwright/test';

const BROKEN = '/test-vault/Events/Broken start.md';
const SOMEDAY = '/test-vault/Events/Someday.md';

const EVENT_FILES: Record<string, string> = {
	'/test-vault/Events/': '',
	[BROKEN]: '---\n_type: Event\ndate: 2026-11-10\nstart: later\n---\nBroken start body text\n',
	[SOMEDAY]: '---\n_type: Event\n---\nSomeday body text\n',
};

test.use({ clockTime: '2026-11-10T10:00:00+01:00', timezoneId: 'Europe/Berlin' });

/** Seeds the event notes and announces them the way Rust does. */
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

/** Opens the Calendar tab through the command palette. */
async function openCalendar(page: Page): Promise<void> {
	await openCommandPalette(page);
	await page.locator('input[placeholder*="command"]:visible').first().fill('Toggle Calendar View');
	await page.getByRole('option', { name: /Toggle Calendar View/ }).click();
	await expect(page.locator('[data-event-calendar]')).toBeVisible();
}

test.describe('Event calendar', () => {
	test('the palette opens the Calendar tab with the range header', async ({ vaultPage: page }) => {
		await openCalendar(page);

		await expect(page.locator('[role="tab"][aria-selected="true"]', { hasText: 'Calendar' })).toBeVisible();
		await expect(page.locator('[data-calendar-title]')).toHaveText('November, 2026');
		await expect(page.locator('[data-calendar-subtitle]')).toContainText('Week 46');
		await expect(page.getByRole('tablist', { name: 'Calendar view' })).toBeVisible();
		await expect(page.getByRole('tab', { name: 'Week' })).toHaveAttribute('aria-selected', 'true');
	});

	test('invalid and dateless event notes land in Needs attention and Unscheduled', async ({ vaultPage: page }) => {
		await seedEvents(page);
		await openCalendar(page);

		await expect(page.locator('[data-attention-badge]')).toHaveText('1 event needs attention', { timeout: 10_000 });
		const attention = page.locator('[data-attention-list]');
		const brokenRow = attention.locator(`[data-issue-path="${BROKEN}"]`);
		await expect(brokenRow.locator('[data-issue-title]')).toHaveText('Broken start');
		await expect(brokenRow.locator('[data-issue-reason]')).toHaveText('start is not a valid time (HH:mm)');
		await expect(attention.locator(`[data-issue-path="${SOMEDAY}"]`)).toHaveCount(0);

		const unscheduled = page.locator('details[data-unscheduled]');
		await expect(unscheduled.locator('summary')).toHaveText('Unscheduled (1)');
		await unscheduled.locator('summary').click();
		await expect(unscheduled.locator(`[data-issue-path="${SOMEDAY}"] [data-issue-title]`)).toHaveText('Someday');
	});

	test('clicking a Needs-attention row opens that note', async ({ vaultPage: page }) => {
		await seedEvents(page);
		await openCalendar(page);

		const row = page.locator(`[data-attention-list] [data-issue-path="${BROKEN}"]`);
		await expect(row).toBeVisible({ timeout: 10_000 });
		await row.click();

		await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('Broken start');
		await expect(page.locator('.cm-content')).toContainText('Broken start body text');
	});
});
