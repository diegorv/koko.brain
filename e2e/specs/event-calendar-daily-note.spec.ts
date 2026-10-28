import { test, expect } from '../fixtures/test-vault';
import { openCommandPalette } from '../fixtures/helpers';
import type { Page } from '@playwright/test';

test.use({ clockTime: '2026-11-10T10:00:00+01:00', timezoneId: 'Europe/Berlin' });

/**
 * Opens the Calendar tab once the auto-opened daily note has landed, so that
 * tab cannot take the selection from the calendar.
 */
async function openCalendar(page: Page): Promise<void> {
	await expect(page.locator('[role="tab"]', { hasText: '2026-11-10.md' })).toBeVisible({ timeout: 10_000 });
	await openCommandPalette(page);
	await page.locator('input[placeholder*="command"]:visible').first().fill('Toggle Calendar View');
	await page.getByRole('option', { name: /Toggle Calendar View/ }).click();
	await expect(page.locator('[data-event-calendar]')).toBeVisible();
}

test.describe('Event calendar daily note action', () => {
	test('a day header action opens that day\'s daily note', async ({ vaultPage: page }) => {
		await openCalendar(page);

		const action = page.locator('[data-daily-note="2026-11-12"]');
		await expect(action).toHaveAttribute('aria-label', 'Open daily note for November 12, 2026');
		await action.click();

		await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('2026-11-12.md', { timeout: 10_000 });
	});

	test('the month grid day number has the same action', async ({ vaultPage: page }) => {
		await openCalendar(page);
		await page.getByRole('tab', { name: 'Month' }).click();

		await page.locator('[data-month-cell="2026-11-20"] [data-daily-note]').click();

		await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('2026-11-20.md', { timeout: 10_000 });
	});

	test('a click in the gap between the day number and the action selects the day', async ({ vaultPage: page }) => {
		await openCalendar(page);
		await page.getByRole('tab', { name: 'Month' }).click();

		const dayNumber = page.locator('[data-month-cell="2026-11-20"] [data-month-day]');
		await expect(dayNumber).toHaveAttribute('aria-pressed', 'false');

		// The row is pointer-events-none, so a mouse click at its centre lands on the cell.
		const row = await dayNumber.locator('..').boundingBox();
		expect(row).not.toBeNull();
		await page.mouse.click(row!.x + row!.width / 2, row!.y + row!.height / 2);

		await expect(dayNumber).toHaveAttribute('aria-pressed', 'true');
	});
});
