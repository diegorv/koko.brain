import type { Page } from '@playwright/test';
import { test as base, expect } from '../fixtures/console-guard';
import { TEST_FILES, TEST_VAULT_PATH } from '../fixtures/test-vault';
import { folderButton, listRow, showFolder } from '../fixtures/helpers';

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
		await page.locator('[data-rail]').waitFor({ state: 'visible', timeout: 10_000 });
		await use(page);
	},
});

test.describe('Folder notes', () => {
	test('picking a folder with a matching note opens it in the editor', async ({ fnPage: page }) => {
		// Projects/Projects.md is seeded before the vault opens, so findFolderNote matches.
		await showFolder(page, `${TEST_VAULT_PATH}/Projects`);

		await expect(page.locator('[role="tab"]', { hasText: 'Projects' })).toBeVisible({ timeout: 10_000 });
		await expect(page.locator('.cm-content')).toContainText('Index note for the Projects folder.');
	});

	test('picking a folder without a matching note only lists its files', async ({ fnPage: page }) => {
		await showFolder(page, `${TEST_VAULT_PATH}/Daily`);

		// Daily has no Daily.md: no folder-note tab opens, and the list shows the folder's notes.
		await expect(listRow(page, '2026-05-01')).toBeVisible({ timeout: 5_000 });
		await expect(page.locator('[role="tab"]', { hasText: /^Daily$/ })).toHaveCount(0);
		await expect(folderButton(page, `${TEST_VAULT_PATH}/Daily`)).toHaveAttribute('aria-current', 'true');
	});
});
