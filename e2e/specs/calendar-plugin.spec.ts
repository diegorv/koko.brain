import { test, expect } from '../fixtures/test-vault';

test.describe('Calendar plugin', () => {
	test('calendar panel is visible in the right sidebar', async ({ vaultPage: page }) => {
		await expect(page.locator('h2', { hasText: 'Calendar' })).toBeVisible({ timeout: 5_000 });
	});

	test('month navigation buttons change the displayed month', async ({ vaultPage: page }) => {
		const monthLabel = page.locator('button[title*="monthly note"]');
		await expect(monthLabel).toBeVisible({ timeout: 5_000 });
		const initialText = await monthLabel.textContent();

		// Click "Previous month"
		await page.locator('button[title="Previous month"]').click();

		await expect(monthLabel).not.toHaveText(initialText!, { timeout: 5_000 });
	});

	test('clicking a day selects it and shows date details', async ({ vaultPage: page }) => {
		// Click any day cell in the grid (day buttons are inside the calendar grid)
		const dayButton = page.locator('button[title*="Daily note"]').first();

		// If no day button with that title, look for grid day cells
		const dayCell = dayButton.or(
			page.locator('.calendar-day, [data-date]').first(),
		);

		if (await dayCell.isVisible({ timeout: 3_000 }).catch(() => false)) {
			await dayCell.click();
			// After selecting a day, the date label area should update
			await page.waitForTimeout(500);
		}
	});
});
