import { test, expect } from '../fixtures/test-vault';

async function switchToCalendarMode(page: import('@playwright/test').Page) {
	const calendarBtn = page.locator('button:has(svg.lucide-calendar)').first();
	await calendarBtn.waitFor({ state: 'visible', timeout: 5_000 });
	await calendarBtn.click();
	await page.waitForTimeout(300);
}

test.use({ clockTime: '2026-11-10T10:00:00+01:00', timezoneId: 'Europe/Berlin' });

test.describe('Calendar plugin', () => {
	test('calendar panel is visible after switching sidebar mode', async ({ vaultPage: page }) => {
		await switchToCalendarMode(page);
		await expect(page.locator('button[title="Previous month"]')).toBeVisible({ timeout: 5_000 });
	});

	test('month navigation buttons change the displayed month', async ({ vaultPage: page }) => {
		await switchToCalendarMode(page);
		const monthLabel = page.locator('button[title*="monthly note"]');
		await expect(monthLabel).toBeVisible({ timeout: 5_000 });
		const initialText = await monthLabel.textContent();

		// Click "Previous month"
		await page.locator('button[title="Previous month"]').click();

		await expect(monthLabel).not.toHaveText(initialText!, { timeout: 5_000 });
	});

	test('clicking a day selects it and shows its date label', async ({ vaultPage: page }) => {
		await switchToCalendarMode(page);
		// Today is preselected, so select another day first to prove the click moves the selection.
		await page.locator('[data-date="2026-11-03"]').click();
		await expect(page.getByText('3 Nov 2026', { exact: true })).toBeVisible({ timeout: 5_000 });
		await page.locator('[data-date="2026-11-10"]').click();
		await expect(page.getByText('10 Nov 2026', { exact: true })).toBeVisible({ timeout: 5_000 });
	});

	for (const mode of [{ name: 'files', icon: 'lucide-folder-tree' }, { name: 'types', icon: 'lucide-layout-grid' }]) {
		test(`the Open Calendar button is in the ${mode.name} sidebar header and opens the Calendar tab`, async ({ vaultPage: page }) => {
			// A day selected in calendar mode must not carry over: other modes open on today.
			await switchToCalendarMode(page);
			await page.locator('[data-date="2026-11-24"]').click();
			await page.locator(`button:has(svg.${mode.icon})`).first().click();
			const openCalendar = page.locator('button[aria-label="Open Calendar"]');
			await expect(openCalendar).toBeVisible({ timeout: 5_000 });
			await openCalendar.click();
			await expect(page.locator('[role="tab"][aria-selected="true"]', { hasText: 'Calendar' })).toBeVisible({ timeout: 5_000 });
			// Today is 2026-11-10.
			await expect(page.locator('[data-day-column="2026-11-10"]')).toBeVisible();
			await expect(page.locator('[data-day-column="2026-11-24"]')).toHaveCount(0);
		});
	}

	test('the Open Calendar button opens the Calendar tab at the selected date', async ({ vaultPage: page }) => {
		await switchToCalendarMode(page);
		// Today is 2026-11-10 (week 46); select a day in week 48.
		await page.locator('[data-date="2026-11-24"]').click();
		await page.locator('button[aria-label="Open Calendar"]').click();
		await expect(page.locator('[role="tab"][aria-selected="true"]', { hasText: 'Calendar' })).toBeVisible({ timeout: 5_000 });
		await expect(page.locator('[data-calendar-title]')).toHaveText('November, 2026');
		await expect(page.locator('[data-calendar-subtitle]')).toContainText('Week 48');
		await expect(page.locator('[data-day-column="2026-11-24"]')).toBeVisible();
	});

	test('double-clicking a day opens the Calendar tab in day view on that day', async ({ vaultPage: page }) => {
		await switchToCalendarMode(page);
		await page.locator('[data-date="2026-11-24"]').dblclick();
		await expect(page.locator('[role="tab"][aria-selected="true"]', { hasText: 'Calendar' })).toBeVisible({ timeout: 5_000 });
		await expect(page.locator('[data-day-column]')).toHaveCount(1);
		await expect(page.locator('[data-day-column="2026-11-24"]')).toBeVisible();
	});
});
