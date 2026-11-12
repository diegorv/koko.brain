import { test, expect } from '../fixtures/test-vault';
import { openFile, pressShortcut } from '../fixtures/helpers';

// Helper: closes every open tab. The auto-opened daily-note tab is dirty on
// first boot (template just applied); `closeTab` saves it through the fs mock
// and closes. It asks only when that save fails, so the mocked dialog is set
// to confirm to keep the loop emptying even then.
async function closeAllTabs(page: import('@playwright/test').Page) {
	await page.evaluate(() => window.__e2e.dialog.setAskResponse(true));
	let lastCount = -1;
	while (true) {
		const count = await page.locator('[role="tab"]').count();
		if (count === 0) return;
		if (count === lastCount) return; // safety: nothing closeable
		lastCount = count;
		await pressShortcut(page, 'Mod+W');
		await page.waitForTimeout(120);
	}
}

test.describe('Editor empty state', () => {
	test('shows placeholder text when no tab is open', async ({ vaultPage: page }) => {
		await closeAllTabs(page);
		await expect(page.locator('text=Select a file to view its contents')).toBeVisible();
	});

	test('opening a file restores the editor area', async ({ vaultPage: page }) => {
		await closeAllTabs(page);
		await expect(page.locator('text=Select a file to view its contents')).toBeVisible();

		await openFile(page, 'Welcome.md');
		await expect(page.locator('text=Select a file to view its contents')).toHaveCount(0);
		await expect(page.locator('.cm-content')).toContainText('Welcome');
	});
});
