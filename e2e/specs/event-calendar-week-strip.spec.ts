import { test, expect } from '../fixtures/test-vault';
import { openCommandPalette } from '../fixtures/helpers';
import type { Page } from '@playwright/test';

test.use({ clockTime: '2026-11-10T10:00:00+01:00', timezoneId: 'Europe/Berlin' });

/**
 * Opens the Calendar tab through the command palette once the auto-opened
 * daily note has landed, so that tab cannot take the selection (or the
 * keystrokes) from the calendar.
 */
async function openCalendar(page: Page): Promise<void> {
	await expect(page.locator('[role="tab"]', { hasText: '2026-11-10.md' })).toBeVisible({ timeout: 10_000 });
	await openCommandPalette(page);
	await page.locator('input[placeholder*="command"]:visible').first().fill('Toggle Calendar View');
	await page.getByRole('option', { name: /Toggle Calendar View/ }).click();
	await expect(page.locator('[data-event-calendar]')).toBeVisible();
}

test.describe('Event calendar week strip', () => {
	test('shows in day view only and switches the day on click and on Enter', async ({ vaultPage: page }) => {
		await openCalendar(page);
		await expect(page.locator('[data-time-grid]')).toBeVisible();
		await expect(page.locator('[data-week-strip]')).toHaveCount(0);

		await page.keyboard.press('d');
		const strip = page.getByRole('group', { name: 'Days of the week' });
		await expect(strip).toBeVisible();
		await expect(strip.getByRole('button')).toHaveCount(7);
		await expect(page.locator('[data-week-strip-day="2026-11-10"]')).toHaveAttribute('aria-pressed', 'true');

		await page.locator('[data-week-strip-day="2026-11-12"]').click();
		await expect(page.locator('[data-week-strip-day="2026-11-12"]')).toHaveAttribute('aria-pressed', 'true');
		await expect(page.locator('[data-week-strip-day="2026-11-10"]')).toHaveAttribute('aria-pressed', 'false');
		await expect(page.locator('[data-day-column]')).toHaveCount(1);
		await expect(page.locator('[data-day-column="2026-11-12"]')).toBeVisible();
		await expect(page.locator('[data-calendar-subtitle]')).toContainText('Thursday');

		await page.locator('[data-week-strip-day="2026-11-09"]').focus();
		await page.keyboard.press('Enter');
		await expect(page.locator('[data-day-column="2026-11-09"]')).toBeVisible();
		await expect(page.locator('[data-week-strip-day="2026-11-09"]')).toHaveAttribute('aria-pressed', 'true');

		await page.keyboard.press('w');
		await expect(page.locator('[data-week-strip]')).toHaveCount(0);
	});
});
