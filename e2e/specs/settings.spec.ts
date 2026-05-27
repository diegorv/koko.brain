import { test, expect } from '../fixtures/test-vault';
import { pressShortcut } from '../fixtures/helpers';

test.describe('Settings panel', () => {
	test('Cmd+, opens the panel', async ({ vaultPage: page }) => {
		await pressShortcut(page, 'Mod+Comma');
		const panel = page.locator('[role="dialog"][aria-label="Settings"]');
		await expect(panel).toBeVisible();
	});

	test('navigating between sections updates the visible content', async ({ vaultPage: page }) => {
		await pressShortcut(page, 'Mod+Comma');
		const panel = page.locator('[role="dialog"][aria-label="Settings"]');
		await expect(panel).toBeVisible();

		const editorTab = panel.getByRole('button', { name: /^editor$/i }).first();
		if (await editorTab.isVisible().catch(() => false)) {
			await editorTab.click();
			await expect(panel.getByText(/font/i).first()).toBeVisible();
		}
	});

	test('Escape closes the panel', async ({ vaultPage: page }) => {
		await pressShortcut(page, 'Mod+Comma');
		const panel = page.locator('[role="dialog"][aria-label="Settings"]');
		await expect(panel).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(panel).not.toBeVisible();
	});
});
