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

	test('Sentry error monitoring is opt-in and asks for a DSN only when enabled', async ({ vaultPage: page }) => {
		await pressShortcut(page, 'Mod+Comma');
		const panel = page.locator('[role="dialog"][aria-label="Settings"]');
		await panel.getByRole('button', { name: /^sentry$/i }).click();

		const errorMonitoring = panel.getByRole('switch');
		await expect(errorMonitoring).toHaveAttribute('data-state', 'unchecked');
		await expect(panel.locator('input[type="url"]')).not.toBeVisible();

		await errorMonitoring.click();
		await expect(panel.locator('input[type="url"]')).toBeVisible();
		await expect(panel.getByRole('alert')).toContainText('valid Sentry Cloud DSN');
	});
});
