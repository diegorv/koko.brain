import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures/test-vault';
import { expectTabActive } from '../fixtures/helpers';

test.use({ clockTime: '2026-11-10T10:00:00+01:00', timezoneId: 'Europe/Berlin' });

function calendar(page: Page) {
	return page.locator('[data-calendar-navigator]');
}

function listLabel(page: Page) {
	return page.locator('[data-rail-note-list] [data-note-list-label]');
}

/** Picks the Calendar rail item, which opens the Calendar navigator on today's month. */
async function openCalendarNavigator(page: Page): Promise<void> {
	await page.locator('[data-rail-item="calendar"]').click();
	await expect(calendar(page)).toBeVisible({ timeout: 5_000 });
}

test.describe('Calendar plugin', () => {
	test('the Calendar rail item opens the navigator on today, listing today\'s notes', async ({ vaultPage: page }) => {
		await openCalendarNavigator(page);
		await expect(page.locator('[data-rail-item="calendar"]')).toHaveAttribute('aria-current', 'page');
		await expect(calendar(page).locator('[data-calendar-month-label]')).toHaveText('November 2026');
		await expect(listLabel(page)).toHaveText('10 Nov 2026');
		await expect(page.locator('[data-rail-note-list] [data-note-list-rule]')).toHaveText('note date is 2026-11-10');
	});

	test('month navigation buttons change the displayed month, and the month label goes back to today', async ({ vaultPage: page }) => {
		await openCalendarNavigator(page);
		const monthLabel = calendar(page).locator('[data-calendar-month-label]');

		await calendar(page).getByRole('button', { name: 'Previous month' }).click();
		await expect(monthLabel).toHaveText('October 2026');
		await calendar(page).getByRole('button', { name: 'Next year' }).click();
		await expect(monthLabel).toHaveText('October 2027');

		await monthLabel.click();
		await expect(monthLabel).toHaveText('November 2026');
	});

	test('clicking a day picks it and fills the note list with that day', async ({ vaultPage: page }) => {
		await openCalendarNavigator(page);
		await calendar(page).locator('button[data-date="2026-11-03"]').click();
		await expect(listLabel(page)).toHaveText('3 Nov 2026');
		await calendar(page).locator('button[data-date="2026-11-10"]').click();
		await expect(listLabel(page)).toHaveText('10 Nov 2026');
	});

	test('the periodic notes follow the picked day', async ({ vaultPage: page }) => {
		await openCalendarNavigator(page);
		const entries = calendar(page).locator('button[data-periodic-note]');
		await expect(entries).toHaveText(['Week 46', 'November 2026', 'Q4 2026', '2026']);

		await calendar(page).locator('button[data-date="2026-11-24"]').click();
		await expect(entries.first()).toHaveText('Week 48');
	});

	test('Open Calendar tab opens the Calendar tab at the picked day', async ({ vaultPage: page }) => {
		await openCalendarNavigator(page);
		// Today is 2026-11-10 (week 46); pick a day in week 48.
		await calendar(page).locator('button[data-date="2026-11-24"]').click();
		await calendar(page).getByRole('button', { name: 'Open Calendar tab' }).click();
		await expectTabActive(page, 'Calendar');
		await expect(page.locator('[data-calendar-title]')).toHaveText('November, 2026');
		await expect(page.locator('[data-calendar-subtitle]')).toContainText('Week 48');
		await expect(page.locator('[data-day-column="2026-11-24"]')).toBeVisible();
	});

	test('Open Calendar tab with no day picked opens on today', async ({ vaultPage: page }) => {
		await openCalendarNavigator(page);
		await calendar(page).getByRole('button', { name: 'Open Calendar tab' }).click();
		await expectTabActive(page, 'Calendar');
		await expect(page.locator('[data-day-column="2026-11-10"]')).toBeVisible();
		await expect(page.locator('[data-day-column="2026-11-24"]')).toHaveCount(0);
	});
});
