import { test as base, expect, type Page } from '@playwright/test';
import { TEST_FILES, TEST_VAULT_PATH } from '../fixtures/test-vault';

const FILES: Record<string, string> = {
	...TEST_FILES,
	[`${TEST_VAULT_PATH}/Projects/Projects.md`]: '# Projects\n\nIndex note for the Projects folder.\n',
};

const test = base.extend<{ fnPage: Page }>({
	fnPage: async ({ page }, use) => {
		await page.goto('/', { waitUntil: 'networkidle' });
		await page.waitForFunction(() => (window as any).__e2e?.fs !== undefined, { timeout: 10_000 });
		await page.evaluate(({ files }) => (window as any).__e2e.fs.populate(files), { files: FILES });
		await page.evaluate(({ vaultPath }) => (window as any).__e2e.dialog.setOpenResponse(vaultPath), {
			vaultPath: TEST_VAULT_PATH,
		});
		await page.getByRole('button', { name: 'Open Vault' }).click();
		await page.locator('[role="tree"]').waitFor({ state: 'visible', timeout: 10_000 });
		await use(page);
	},
});

test.describe('Folder notes', () => {
	test('clicking a folder with a matching note opens it in the editor', async ({ fnPage: page }) => {
		// Projects folder has Projects/Projects.md seeded before vault open.
		// scanVault includes it in node.children, so findFolderNote matches.
		const folder = page.locator('[role="treeitem"]', { hasText: 'Projects' }).first();
		await folder.click();

		// handleClick expands the folder AND calls openFileInEditor(folderNotePath)
		await expect(
			page.locator('[role="tab"]', { hasText: 'Projects' }),
		).toBeVisible({ timeout: 10_000 });
	});

	test('clicking a folder without a matching note just expands it', async ({ fnPage: page }) => {
		const folder = page.locator('[role="treeitem"]', { hasText: 'Daily' }).first();
		await folder.click();

		// Daily folder has no Daily.md, so it should expand and show children
		await expect(
			page.locator('[role="treeitem"]', { hasText: '2026-05-01.md' }),
		).toBeVisible({ timeout: 5_000 });
	});
});
