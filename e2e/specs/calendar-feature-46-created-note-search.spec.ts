import { test, expect } from '../fixtures/test-vault';
import { openCommandPalette, openSearch } from '../fixtures/helpers';
import type { Page } from '@playwright/test';

test.use({ clockTime: '2026-11-10T10:00:00+01:00', timezoneId: 'Europe/Berlin' });

/**
 * Opens the Calendar tab through the command palette once the auto-opened
 * daily note has landed, so that tab cannot take the selection later.
 */
async function openCalendar(page: Page): Promise<void> {
	await expect(page.locator('[role="tab"]', { hasText: '2026-11-10.md' })).toBeVisible({ timeout: 10_000 });
	await openCommandPalette(page);
	await page.locator('input[placeholder*="command"]:visible').first().fill('Toggle Calendar View');
	await page.getByRole('option', { name: /Toggle Calendar View/ }).click();
	await expect(page.locator('[data-event-calendar]')).toBeVisible();
}

test.describe('Created notes in text search', () => {
	test('a note created via "New Calendar Event" is found by text search before any edit', async ({ vaultPage: page }) => {
		// No Event type definition: the note lands at the vault root.
		const created = '/test-vault/Planning.md';
		await openCalendar(page);

		await openCommandPalette(page);
		await page.locator('input[placeholder*="command"]:visible').first().fill('New Calendar Event');
		await page.getByRole('option', { name: /New Calendar Event/ }).click();
		const dialog = page.locator('[data-event-dialog]');
		await expect(dialog).toBeVisible();
		await dialog.getByLabel('Title').fill('Planning');
		await dialog.getByLabel('Notes').fill('Zebracorn agenda');
		await dialog.getByRole('button', { name: 'Save' }).click();
		await expect(dialog).toHaveCount(0);
		await expect(page.locator(`[data-day-column="2026-11-10"] [data-event-path="${created}"]`)).toBeVisible();

		await openSearch(page);
		await page.locator('input[placeholder*="search" i]:visible').first().fill('Zebracorn');

		// The event note's result carries the calendar action, so this proves the hit is the created note.
		await expect(page.getByRole('button', { name: 'Show in Calendar' })).toHaveCount(1, { timeout: 10_000 });
		await expect(page.locator('p', { hasText: 'Zebracorn agenda' }).first()).toBeVisible();
		await expect(page.locator('text=/No results/i')).toHaveCount(0);
	});
});
