import { test as base, type Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { TEST_VAULT_PATH, TEST_FILES } from '../fixtures/test-vault';
import { expectTabActive } from '../fixtures/helpers';

const FOLDER_NOTE_FILES: Record<string, string> = {
	...TEST_FILES,
	[`${TEST_VAULT_PATH}/Projects/Projects.md`]: `# Projects\n\nIndex note for the Projects folder.\n`,
};

async function setupFolderNoteVault(page: Page) {
	await page.goto('/', { waitUntil: 'networkidle' });
	await page.waitForFunction(
		() => typeof window !== 'undefined' && window.__e2e?.fs !== undefined,
		{ timeout: 10_000 },
	);
	await page.evaluate(({ files }) => window.__e2e.fs.populate(files), { files: FOLDER_NOTE_FILES });
	await page.evaluate(({ vaultPath }) => window.__e2e.dialog.setOpenResponse(vaultPath), {
		vaultPath: TEST_VAULT_PATH,
	});
	await page.getByRole('button', { name: 'Open Vault' }).click();
	await page.locator('[role="tree"]').waitFor({ state: 'visible', timeout: 10_000 });
}

const test = base.extend<{ folderNotePage: Page }>({
	folderNotePage: async ({ page }, use) => {
		await setupFolderNoteVault(page);
		await use(page);
	},
});

test.describe('Folder notes', () => {
	test('clicking a folder with a matching note opens it', async ({ folderNotePage: page }) => {
		const folder = page.locator('[role="treeitem"]', { hasText: 'Projects' }).first();
		await folder.click();

		// Should open Projects.md in the editor
		await page.locator('.cm-content').waitFor({ state: 'visible', timeout: 10_000 });
		await expectTabActive(page, 'Projects');
	});

	test('clicking a folder without a matching note just expands it', async ({ folderNotePage: page }) => {
		const folder = page.locator('[role="treeitem"]', { hasText: 'Daily' }).first();
		await folder.click();

		// Daily folder has no Daily.md, so it should expand and show children
		await expect(
			page.locator('[role="treeitem"]', { hasText: '2026-05-01.md' }),
		).toBeVisible({ timeout: 5_000 });
	});
});
