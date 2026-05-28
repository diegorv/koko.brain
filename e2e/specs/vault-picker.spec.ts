import { test, expect, TEST_VAULT_PATH, TEST_FILES } from '../fixtures/test-vault';

test.describe('Vault picker', () => {
	test('opens the vault and renders the file tree', async ({ vaultPage: page }) => {
		await expect(page.locator('[role="tree"]')).toBeVisible();
		await expect(page.locator('[role="treeitem"]', { hasText: 'Welcome.md' })).toBeVisible();
		await expect(page.locator('[role="treeitem"]', { hasText: 'Projects' })).toBeVisible();
	});

	test('picker accepts a selected vault path on first launch', async ({ page }) => {
		await page.goto('/', { waitUntil: 'networkidle' });
		await page.waitForFunction(() => window.__e2e?.fs !== undefined);
		await page.evaluate(({ files }) => window.__e2e.fs.populate(files), { files: TEST_FILES });
		await page.evaluate(({ vaultPath }) => window.__e2e.dialog.setOpenResponse(vaultPath), {
			vaultPath: TEST_VAULT_PATH,
		});

		const openVaultButton = page.getByRole('button', { name: 'Open Vault' });
		await expect(openVaultButton).toBeVisible();
		await openVaultButton.click();

		await expect(page.locator('[role="tree"]')).toBeVisible({ timeout: 10_000 });
	});

	test('X button removes a vault from the recent list', async ({ page }) => {
		await page.goto('/', { waitUntil: 'networkidle' });
		await page.evaluate(() => {
			localStorage.setItem(
				'kokobrain:recent-vaults',
				JSON.stringify([
					{ path: '/vaults/alpha', name: 'alpha', openedAt: 2 },
					{ path: '/vaults/beta', name: 'beta', openedAt: 1 },
				]),
			);
		});
		await page.reload({ waitUntil: 'networkidle' });

		await expect(page.getByText('alpha', { exact: true })).toBeVisible();
		await expect(page.getByText('beta', { exact: true })).toBeVisible();

		await page.getByRole('button', { name: 'Remove alpha from recent vaults' }).click();

		await expect(page.getByText('alpha', { exact: true })).toHaveCount(0);
		await expect(page.getByText('beta', { exact: true })).toBeVisible();

		const stored = await page.evaluate(() =>
			localStorage.getItem('kokobrain:recent-vaults'),
		);
		expect(stored).not.toContain('/vaults/alpha');
		expect(stored).toContain('/vaults/beta');
	});
});
