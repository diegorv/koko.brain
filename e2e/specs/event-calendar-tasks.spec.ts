import { test, expect } from '../fixtures/test-vault';
import { openCommandPalette } from '../fixtures/helpers';
import type { Page } from '@playwright/test';

test.use({ clockTime: '2026-11-10T10:00:00+01:00', timezoneId: 'Europe/Berlin' });

const HOME = '/test-vault/Home.md';
const DUE_DAY = '2026-11-12';

/** A note with one dated task on line 3 and one undated task. */
const FILES: Record<string, string> = {
	[HOME]: `# Home\n\n- [ ] Pay rent 📅 ${DUE_DAY}\n- [ ] Water plants\n`,
};

/** Writes the note to the E2E disk and tells the app the index changed. */
async function seedTasks(page: Page): Promise<void> {
	await page.evaluate(({ files }) => {
		const e2e = (window as any).__e2e;
		e2e.fs.populate(files);
		e2e.events.emit('vault-index-updated', {
			changed: true,
			affected: Object.keys(files),
			version: e2e.vaultIndex.version,
		});
	}, { files: FILES });
}

/** Seeds the note and opens the Calendar tab once the auto-opened daily note has landed. */
async function openCalendar(page: Page): Promise<void> {
	await seedTasks(page);
	await expect(page.locator('[role="tab"]', { hasText: '2026-11-10.md' })).toBeVisible({ timeout: 10_000 });
	await openCommandPalette(page);
	await page.locator('input[placeholder*="command"]:visible').first().fill('Toggle Calendar View');
	await page.getByRole('option', { name: /Toggle Calendar View/ }).click();
	await expect(page.locator('[data-event-calendar]')).toBeVisible();
}

test.describe('Event calendar dated tasks', () => {
	test('a dated task renders on its due day in week, month and day view', async ({ vaultPage: page }) => {
		await openCalendar(page);

		const weekChip = page.locator(`[data-task-lane-cell="${DUE_DAY}"] [data-calendar-task]`);
		await expect(weekChip).toHaveText('Pay rent', { timeout: 10_000 });
		// The undated task and the other days stay empty.
		await expect(page.locator('[data-calendar-task]')).toHaveCount(1);
		await expect(page.locator('[data-calendar-task]', { hasText: 'Water plants' })).toHaveCount(0);

		await page.getByRole('tab', { name: 'Month' }).click();
		await expect(page.locator(`[data-month-cell="${DUE_DAY}"] [data-calendar-task]`)).toHaveText('Pay rent');
		await expect(page.locator('[data-month-cell="2026-11-11"] [data-calendar-task]')).toHaveCount(0);

		await page.getByRole('tab', { name: 'Day' }).click();
		await page.locator(`[data-week-strip-day="${DUE_DAY}"]`).click();
		await expect(page.locator(`[data-task-lane-cell="${DUE_DAY}"] [data-calendar-task]`)).toHaveText('Pay rent');
	});

	test('clicking a dated task opens its note at the task line', async ({ vaultPage: page }) => {
		await openCalendar(page);

		await page.locator(`[data-task-lane-cell="${DUE_DAY}"] [data-calendar-task]`).click({ timeout: 10_000 });

		await expect(page.locator('[role="tab"][aria-selected="true"]', { hasText: 'Home.md' })).toBeVisible();
		await expect(page.locator('.cm-activeLine')).toContainText('Pay rent');
	});
});
