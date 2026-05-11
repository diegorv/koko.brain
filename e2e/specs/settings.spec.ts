import { test, expect } from '../fixtures/test-vault';
import { pressShortcut } from '../fixtures/helpers';

test.describe('Settings dialog', () => {
	test('Cmd+, opens the dialog', async ({ vaultPage: page }) => {
		await pressShortcut(page, 'Mod+Comma');
		const dialog = page.getByRole('dialog').filter({ hasText: /appearance|editor|search/i }).first();
		await expect(dialog).toBeVisible();
	});

	test('navigating between sections updates the visible content', async ({ vaultPage: page }) => {
		await pressShortcut(page, 'Mod+Comma');
		const dialog = page.getByRole('dialog').filter({ hasText: /appearance|editor|search/i }).first();
		await expect(dialog).toBeVisible();

		// Section navigation is rendered as buttons inside the dialog.
		const editorTab = dialog.getByRole('button', { name: /^editor$/i }).first();
		if (await editorTab.isVisible().catch(() => false)) {
			await editorTab.click();
			await expect(dialog.getByText(/font/i).first()).toBeVisible();
		}
	});

	test('Escape closes the dialog', async ({ vaultPage: page }) => {
		await pressShortcut(page, 'Mod+Comma');
		const dialog = page.getByRole('dialog').filter({ hasText: /appearance|editor|search/i }).first();
		await expect(dialog).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(dialog).not.toBeVisible();
	});
});
