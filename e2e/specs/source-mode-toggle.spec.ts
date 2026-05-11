import { test, expect } from '../fixtures/test-vault';
import { openTreeItem } from '../fixtures/helpers';

test.describe('Source mode toggle button', () => {
	test('Eye/Code button toggles live preview decorations', async ({ vaultPage: page }) => {
		await openTreeItem(page, 'Welcome.md');

		// Live-preview is on by default → heading line is decorated.
		await expect(page.locator('.cm-lp-h1').first()).toBeVisible();

		// Click the toolbar toggle button (rendered in EditorView.svelte, bottom-right).
		await page.getByRole('button', { name: /Switch to source mode/i }).click();
		await expect(page.locator('.cm-lp-h1')).toHaveCount(0);

		// And back again.
		await page.getByRole('button', { name: /Switch to live preview/i }).click();
		await expect(page.locator('.cm-lp-h1').first()).toBeVisible();
	});
});
