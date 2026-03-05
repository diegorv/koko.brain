import { test, expect } from '@playwright/test';
import { TEST_FILES, TEST_VAULT_PATH } from '../fixtures/test-vault';

async function waitForE2eApi(page: import('@playwright/test').Page) {
	await page.waitForFunction(
		() => typeof window !== 'undefined' && window.__e2e?.fs !== undefined,
		{ timeout: 10_000 },
	);
}

test.describe('Vault Picker', () => {
	test('shows vault picker on launch', async ({ page }) => {
		await page.goto('/', { waitUntil: 'networkidle' });
		await expect(page.getByRole('heading', { name: 'KokoBrain' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Open Vault' })).toBeVisible();
		await expect(page.locator('[role="tree"]')).not.toBeVisible();
	});

	test('opening a vault shows the editor layout', async ({ page }) => {
		await page.goto('/', { waitUntil: 'networkidle' });
		await waitForE2eApi(page);

		// Populate FS and configure dialog
		await page.evaluate(
			({ files, vaultPath }) => {
				window.__e2e.fs.populate(files);
				window.__e2e.dialog.setOpenResponse(vaultPath);
			},
			{ files: TEST_FILES, vaultPath: TEST_VAULT_PATH },
		);

		await page.getByRole('button', { name: 'Open Vault' }).click();

		// Wait for file explorer tree (3-pane layout)
		await expect(page.locator('[role="tree"]')).toBeVisible({ timeout: 10_000 });

		// Empty state editor should show "Select a file"
		await expect(page.getByText('Select a file to view its contents')).toBeVisible();
	});

	test('recent vaults appear after opening', async ({ page }) => {
		await page.goto('/', { waitUntil: 'networkidle' });
		await waitForE2eApi(page);

		// Populate FS and configure dialog
		await page.evaluate(
			({ files, vaultPath }) => {
				window.__e2e.fs.populate(files);
				window.__e2e.dialog.setOpenResponse(vaultPath);
			},
			{ files: TEST_FILES, vaultPath: TEST_VAULT_PATH },
		);

		// Open the vault
		await page.getByRole('button', { name: 'Open Vault' }).click();
		await page.locator('[role="tree"]').waitFor({ state: 'visible', timeout: 10_000 });

		// Reload — recent vaults should be persisted in localStorage
		await page.goto('/', { waitUntil: 'networkidle' });

		// Recent vaults should show
		await expect(page.getByText('Recent Vaults')).toBeVisible();
		await expect(page.getByText('test-vault', { exact: true })).toBeVisible();
	});
});
