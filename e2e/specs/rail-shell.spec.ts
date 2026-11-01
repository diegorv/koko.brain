import type { Page } from '@playwright/test';
import { test, expect, TEST_VAULT_PATH } from '../fixtures/test-vault';
import { expectTabActive, pressShortcut, tree } from '../fixtures/helpers';

const SETTINGS_PATH = `${TEST_VAULT_PATH}/.kokobrain/settings.json`;

/** Picks a shell in Settings > Sidebar > Layout and closes the panel. */
async function chooseLayout(page: Page, shell: 'classic' | 'rail'): Promise<void> {
	await pressShortcut(page, 'Mod+Comma');
	const panel = page.locator('[role="dialog"][aria-label="Settings"]');
	await panel.getByRole('button', { name: /^sidebar$/i }).click();
	await panel.getByLabel('Layout').selectOption(shell);
	await page.keyboard.press('Escape');
	await expect(panel).not.toBeVisible();
}

function noteList(page: Page) {
	return page.locator('[data-rail-note-list]');
}

function listRow(page: Page, title: string) {
	return noteList(page).locator('[data-note-row]', { has: page.getByText(title, { exact: true }) });
}

function exists(page: Page, path: string): Promise<boolean> {
	return page.evaluate((p) => window.__e2e.fs.exists(p), path);
}

function savedFile(page: Page, path: string): Promise<string> {
	return page.evaluate((p) => window.__e2e.fs.readFile(p), path);
}

test.describe('Rail shell', () => {
	test('switching to Rail shows the Inbox list, persists, and a row opens its note', async ({ vaultPage: page }) => {
		await chooseLayout(page, 'rail');

		await expect(page.locator('[data-rail]')).toBeVisible();
		await expect(tree(page)).toHaveCount(0);
		await expect(page.locator('[data-rail-item="inbox"]')).toHaveAttribute('aria-current', 'page');
		await expect(noteList(page).locator('[data-note-list-label]')).toHaveText('Inbox');
		await expect(noteList(page).locator('[data-note-list-rule]')).toHaveText('not organized, not archived');
		await expect(listRow(page, 'Welcome')).toBeVisible();
		await expect(listRow(page, 'Roadmap')).toContainText('Note');
		await expect(listRow(page, 'Roadmap')).toContainText('Projects');

		const count = await noteList(page).locator('[data-note-row]').count();
		await expect(page.locator('[data-rail-badge]')).toHaveText(String(count));

		await expect
			.poll(async () => JSON.parse(await savedFile(page, SETTINGS_PATH)).layout?.shell)
			.toBe('rail');

		await listRow(page, 'Welcome').click();
		await expectTabActive(page, 'Welcome');
		await expect(page.locator('.cm-content')).toContainText('This is the test vault');
		await expect(listRow(page, 'Welcome')).toHaveClass(/bg-primary\/25/);
	});

	test('the row menu renames, favorites and trashes notes on disk', async ({ vaultPage: page }) => {
		await chooseLayout(page, 'rail');

		await listRow(page, 'Roadmap').click({ button: 'right' });
		await page.getByRole('menuitem', { name: /^Rename/ }).click();
		const input = noteList(page).locator('input');
		await expect(input).toHaveValue('Roadmap');
		await input.fill('Roadmap 2');
		await input.press('Enter');
		await expect.poll(() => exists(page, `${TEST_VAULT_PATH}/Projects/Roadmap 2.md`)).toBe(true);
		expect(await exists(page, `${TEST_VAULT_PATH}/Projects/Roadmap.md`)).toBe(false);

		await listRow(page, '2026-Q2').click({ button: 'right' });
		await page.getByRole('menuitem', { name: /^Favorite/ }).click();
		await expect.poll(() => savedFile(page, `${TEST_VAULT_PATH}/Projects/2026-Q2.md`)).toContain('_favorite: true');

		await page.evaluate(() => window.__e2e.dialog.setAskResponse(true));
		await listRow(page, '2025-Q4').click({ button: 'right' });
		await page.getByRole('menuitem', { name: /^Move to Trash/ }).click();
		await expect.poll(() => exists(page, `${TEST_VAULT_PATH}/Projects/archive/2025-Q4.md`)).toBe(false);
	});

	test('the right sidebar still hides on the Tasks and Calendar tabs', async ({ vaultPage: page }) => {
		await chooseLayout(page, 'rail');
		await listRow(page, 'Welcome').click();
		await expect(page.locator('[data-right-sidebar]')).toBeVisible();

		await pressShortcut(page, 'Mod+Shift+T');
		await expectTabActive(page, 'Tasks');
		await expect(page.locator('[data-right-sidebar]')).toHaveCount(0);

		await listRow(page, 'Welcome').click();
		await expect(page.locator('[data-right-sidebar]')).toBeVisible();
		await pressShortcut(page, 'Mod+Shift+C');
		await expectTabActive(page, 'Calendar');
		await expect(page.locator('[data-right-sidebar]')).toHaveCount(0);
	});

	test('switching back to Classic shows the classic sidebar', async ({ vaultPage: page }) => {
		await chooseLayout(page, 'rail');
		await expect(page.locator('[data-rail]')).toBeVisible();

		await chooseLayout(page, 'classic');
		await expect(page.locator('[data-rail]')).toHaveCount(0);
		await expect(noteList(page)).toHaveCount(0);
		await expect(tree(page)).toBeVisible();
		await expect(page.locator('[role="treeitem"]', { hasText: 'Welcome.md' })).toBeVisible();
		await expect(page.locator('button[title="Hide left sidebar"]')).toBeVisible();
	});
});
