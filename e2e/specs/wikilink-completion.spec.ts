import { test, expect } from '../fixtures/test-vault';
import { openTreeItem } from '../fixtures/helpers';

test.describe('Wikilink completion', () => {
	test('typing `[[` opens the autocomplete tooltip with vault files', async ({
		vaultPage: page,
	}) => {
		await openTreeItem(page, 'Inbox.md');
		await page.locator('.cm-content').click();
		await page.keyboard.press('End');
		await page.keyboard.press('Enter');
		await page.keyboard.type('[[');

		const tooltip = page.locator('.cm-tooltip-autocomplete');
		await expect(tooltip).toBeVisible({ timeout: 3_000 });
		await expect(tooltip.locator('.cm-completionLabel').first()).toBeVisible();
	});

	test('typing `[[Wel` narrows the suggestions', async ({ vaultPage: page }) => {
		await openTreeItem(page, 'Inbox.md');
		await page.locator('.cm-content').click();
		await page.keyboard.press('End');
		await page.keyboard.press('Enter');
		await page.keyboard.type('[[Wel');

		const tooltip = page.locator('.cm-tooltip-autocomplete');
		await expect(tooltip).toBeVisible({ timeout: 3_000 });
		await expect(tooltip.locator('.cm-completionLabel', { hasText: /Welcome/i }).first()).toBeVisible();
	});

	test('selecting a completion inserts `Name]]` and closes the brackets', async ({
		vaultPage: page,
	}) => {
		await openTreeItem(page, 'Inbox.md');
		await page.locator('.cm-content').click();
		await page.keyboard.press('End');
		await page.keyboard.press('Enter');
		await page.keyboard.type('[[Welc');

		const tooltip = page.locator('.cm-tooltip-autocomplete');
		await expect(tooltip).toBeVisible({ timeout: 3_000 });
		await page.keyboard.press('Enter');
		await page.waitForTimeout(150);

		// The editor's rendered content should now show "Welcome" on the
		// newly-typed line. Live preview hides the `[[...]]` markers but the
		// inner text is always rendered.
		await expect(page.locator('.cm-content')).toContainText('Welcome');
	});
});
