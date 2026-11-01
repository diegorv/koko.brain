import type { Page } from '@playwright/test';
import { test, expect, TEST_VAULT_PATH } from '../fixtures/test-vault';


const PROJECTS_PATH = `${TEST_VAULT_PATH}/Projects`;

function filesNavigator(page: Page) {
	return page.locator('[data-files-navigator]');
}

function folderButton(page: Page, path: string) {
	return filesNavigator(page).locator(`[data-files-navigator-folder="${path}"]`);
}

function noteList(page: Page) {
	return page.locator('[data-rail-note-list]');
}

function listRow(page: Page, title: string) {
	return noteList(page).locator('[data-note-row]', { has: page.getByText(title, { exact: true }) });
}

/** Picks the Files rail item, which opens the folder navigator on the vault root. */
async function openFiles(page: Page): Promise<void> {
	await page.locator('[data-rail-item="files"]').click();
	await expect(filesNavigator(page)).toBeVisible();
}

test.describe('File explorer', () => {
	test('the Files navigator shows top-level folders, hides .kokobrain, and the list shows the root notes', async ({ vaultPage: page }) => {
		await openFiles(page);
		await expect(folderButton(page, TEST_VAULT_PATH)).toHaveAttribute('aria-current', 'true');
		await expect(folderButton(page, PROJECTS_PATH)).toBeVisible();
		await expect(folderButton(page, `${TEST_VAULT_PATH}/Daily`)).toBeVisible();
		await expect(filesNavigator(page)).not.toContainText('.kokobrain');
		// Folders only: notes are listed in the note list, not in the navigator.
		await expect(filesNavigator(page)).not.toContainText('Welcome');
		await expect(listRow(page, 'Welcome')).toBeVisible();
		await expect(listRow(page, 'Inbox')).toBeVisible();
		await expect(listRow(page, 'Roadmap')).toHaveCount(0);
	});

	test('picking a folder lists its notes; its toggle expands it to show the subfolders', async ({ vaultPage: page }) => {
		await openFiles(page);
		await folderButton(page, PROJECTS_PATH).click();
		await expect(noteList(page).locator('[data-note-list-label]')).toHaveText('Projects');
		await expect(listRow(page, 'Roadmap')).toBeVisible();
		await expect(listRow(page, '2026-Q2')).toBeVisible();
		// Notes in subfolders stay out of the folder's list.
		await expect(listRow(page, '2025-Q4')).toHaveCount(0);

		await expect(folderButton(page, `${PROJECTS_PATH}/archive`)).toHaveCount(0);
		await filesNavigator(page).locator(`[data-files-navigator-toggle="${PROJECTS_PATH}"]`).click();
		await expect(folderButton(page, `${PROJECTS_PATH}/archive`)).toBeVisible();
	});

	test('folders are listed in name order, and a list row opens its note', async ({ vaultPage: page }) => {
		await openFiles(page);
		const folders = await filesNavigator(page)
			.locator('[data-files-navigator-folder]')
			.evaluateAll((els) => els.map((el) => el.getAttribute('data-files-navigator-folder')));
		// The vault root first; `_system` and `_templates` are created when the vault opens.
		expect(folders).toEqual([
			TEST_VAULT_PATH,
			`${TEST_VAULT_PATH}/_system`,
			`${TEST_VAULT_PATH}/_templates`,
			`${TEST_VAULT_PATH}/Daily`,
			PROJECTS_PATH,
		]);

		await listRow(page, 'Welcome').click();
		await expect(page.locator('.cm-content')).toContainText('This is the test vault');
	});
});
