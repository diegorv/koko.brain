import { test, expect } from '../fixtures/test-vault';

test.describe('Settings Dialog', () => {
	test('opens via Cmd+,', async ({ vaultPage: page }) => {
		await page.keyboard.press('Meta+Comma');

		// Dialog should show with the default "Sidebar" section heading
		await expect(page.getByRole('heading', { name: 'Sidebar', exact: true })).toBeVisible();
	});

	test('closes on Escape', async ({ vaultPage: page }) => {
		await page.keyboard.press('Meta+Comma');
		await expect(page.getByRole('heading', { name: 'Sidebar', exact: true })).toBeVisible();

		await page.keyboard.press('Escape');
		await expect(page.getByRole('heading', { name: 'Sidebar', exact: true })).not.toBeVisible();
	});

	test('navigates between sections', async ({ vaultPage: page }) => {
		await page.keyboard.press('Meta+Comma');
		await expect(page.getByRole('heading', { name: 'Sidebar', exact: true })).toBeVisible();

		// Click "Editor" section in sidebar
		await page.getByRole('button', { name: 'Editor' }).click();

		// Editor section heading should be visible
		await expect(page.getByRole('heading', { name: 'Editor' })).toBeVisible();

		// Editor settings inputs should be visible
		await expect(page.getByText('Font family', { exact: true })).toBeVisible();
		await expect(page.getByText('Font size', { exact: true })).toBeVisible();
		await expect(page.getByText('Line height', { exact: true })).toBeVisible();
	});

	test('sidebar section shows layout toggles', async ({ vaultPage: page }) => {
		await page.keyboard.press('Meta+Comma');
		await expect(page.getByRole('heading', { name: 'Sidebar', exact: true })).toBeVisible();

		// Should show toggle labels within the settings dialog
		const dialog = page.getByLabel('Settings');
		await expect(dialog.getByText('Right sidebar', { exact: true })).toBeVisible();
		await expect(dialog.getByText('Calendar', { exact: true })).toBeVisible();
		await expect(dialog.getByText('Folder notes', { exact: true })).toBeVisible();
	});
});
