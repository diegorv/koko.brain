import type { Page } from '@playwright/test';
import dayjs from 'dayjs';
import { test, expect, TEST_FILES, TEST_VAULT_PATH } from '../fixtures/test-vault';
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

/**
 * Restarts the app on the test vault with the given settings.json: a fresh
 * page load (the in-memory fs is wiped), the vault files (plus `extraFiles`)
 * re-seeded, the vault reopened.
 */
async function restartWithSettings(page: Page, settingsJson: string, extraFiles: Record<string, string> = {}): Promise<void> {
	await page.reload({ waitUntil: 'networkidle' });
	await page.waitForFunction(() => window.__e2e?.fs !== undefined, { timeout: 10_000 });
	const files = { ...TEST_FILES, ...extraFiles, [SETTINGS_PATH]: settingsJson };
	await page.evaluate((f) => window.__e2e.fs.populate(f), files);
	await page.evaluate((p) => window.__e2e.dialog.setOpenResponse(p), TEST_VAULT_PATH);
	await page.getByRole('button', { name: 'Open Vault' }).click();
	await expect(page.locator('[data-rail]')).toBeVisible({ timeout: 10_000 });
}

/** A Project type with a folder and a template, two live projects and an archived one. */
const TYPE_FILES: Record<string, string> = {
	[`${TEST_VAULT_PATH}/Project.md`]: '---\n_type: Type\n_folder: Work\n_template: _system/templates/Project.md\n---\n',
	[`${TEST_VAULT_PATH}/_system/`]: '',
	[`${TEST_VAULT_PATH}/_system/templates/`]: '',
	[`${TEST_VAULT_PATH}/_system/templates/Project.md`]: '---\n_type: Project\nstatus: active\n---\n',
	[`${TEST_VAULT_PATH}/Work/`]: '',
	[`${TEST_VAULT_PATH}/Work/Alpha.md`]: '---\n_type: Project\n---\nAlpha body\n',
	[`${TEST_VAULT_PATH}/Work/Beta.md`]: '---\n_type: Project\n---\nBeta body\n',
	[`${TEST_VAULT_PATH}/Work/Shelved.md`]: '---\n_type: Project\n_archived: true\n---\n',
};

/** The test vault's settings.json with the rail shell on and `layout` patched. */
async function railSettings(page: Page, layout: Record<string, unknown>, rest: Record<string, unknown> = {}): Promise<string> {
	const saved = JSON.parse(await savedFile(page, SETTINGS_PATH));
	return JSON.stringify({ ...saved, ...rest, layout: { ...saved.layout, shell: 'rail', ...layout } }, null, 2);
}

function navigator(page: Page) {
	return page.locator('[data-types-navigator]');
}

function navRow(page: Page, key: string) {
	return navigator(page).locator(`[data-types-navigator-row="${key}"]`);
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

	test('New here in the Inbox creates an unorganized note in the Cmd+N folder, opens it and lists it', async ({ vaultPage: page }) => {
		await chooseLayout(page, 'rail');
		// The test vault's Cmd+N folder: periodicNotes.folder `Daily` + the default `YYYY/MM-MMM`.
		const created = `${TEST_VAULT_PATH}/Daily/${dayjs().format('YYYY/MM-MMM')}/Untitled.md`;

		await noteList(page).getByRole('button', { name: 'New here' }).click();

		await expect.poll(() => exists(page, created)).toBe(true);
		expect(await savedFile(page, created)).toBe('---\n_organized: false\n---\n');
		await expectTabActive(page, 'Untitled');
		await expect(listRow(page, 'Untitled')).toBeVisible({ timeout: 15_000 });
		await expect(listRow(page, 'Untitled')).toHaveClass(/bg-primary\/25/);
	});

	test('Favorites follows the action bar, and its New here creates a favorite note', async ({ vaultPage: page }) => {
		await chooseLayout(page, 'rail');
		await listRow(page, 'Welcome').click();
		await expectTabActive(page, 'Welcome');

		await page.locator('[data-rail-item="favorites"]').click();
		await expect(page.locator('[data-rail-item="favorites"]')).toHaveAttribute('aria-current', 'page');
		await expect(noteList(page).locator('[data-note-list-label]')).toHaveText('Favorites');
		await expect(noteList(page).locator('[data-note-list-rule]')).toHaveText('favorite, not archived');
		await expect(listRow(page, 'Welcome')).toHaveCount(0);

		await page.getByTestId('note-action-bar').getByRole('button', { name: 'Add to favorites' }).click();
		await expect(listRow(page, 'Welcome')).toBeVisible({ timeout: 15_000 });

		const created = `${TEST_VAULT_PATH}/Daily/${dayjs().format('YYYY/MM-MMM')}/Untitled.md`;
		await noteList(page).getByRole('button', { name: 'New here' }).click();
		await expect.poll(() => exists(page, created)).toBe(true);
		expect(await savedFile(page, created)).toBe('---\n_favorite: true\n---\n');
		await expect(listRow(page, 'Untitled')).toBeVisible({ timeout: 15_000 });
	});

	test('Archive sits at the bottom, has no New here, and a restore from the action bar drops the row', async ({ vaultPage: page }) => {
		await chooseLayout(page, 'rail');
		await listRow(page, 'Welcome').click();
		await expectTabActive(page, 'Welcome');
		const bar = page.getByTestId('note-action-bar');

		await bar.getByRole('button', { name: 'More note actions' }).click();
		await page.getByRole('menuitem', { name: 'Archive this note' }).click();

		const archive = page.locator('[data-rail-item="archive"]');
		const favorites = page.locator('[data-rail-item="favorites"]');
		expect((await archive.boundingBox())!.y).toBeGreaterThan((await favorites.boundingBox())!.y + 100);
		await archive.click();
		await expect(noteList(page).locator('[data-note-list-label]')).toHaveText('Archive');
		await expect(noteList(page).locator('[data-note-list-rule]')).toHaveText('archived');
		await expect(noteList(page).getByRole('button', { name: 'New here' })).toHaveCount(0);
		await expect(listRow(page, 'Welcome')).toBeVisible({ timeout: 15_000 });

		await bar.getByRole('button', { name: 'More note actions' }).click();
		await page.getByRole('menuitem', { name: 'Restore this archived note' }).click();
		await expect(listRow(page, 'Welcome')).toHaveCount(0, { timeout: 15_000 });
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

	test('Cmd+1 hides the note list, Cmd+2 shows it, Cmd+Shift+B toggles it; the rail stays and the state is saved', async ({ vaultPage: page }) => {
		await chooseLayout(page, 'rail');
		await listRow(page, 'Welcome').click();
		await expectTabActive(page, 'Welcome');
		const tab = page.locator('[role="tab"]', { hasText: 'Welcome' }).first();
		const spacer = page.locator('[data-rail-traffic-light-spacer]');

		await pressShortcut(page, 'Mod+1');
		await expect(noteList(page)).toHaveCount(0);
		await expect(page.locator('[data-rail]')).toBeVisible();
		await expect(spacer).toBeVisible();
		// Rail (48 px) + spacer (24 px): the tabs start clear of the macOS traffic lights.
		expect((await spacer.boundingBox())!.x).toBe(48);
		expect((await tab.boundingBox())!.x).toBeGreaterThanOrEqual(72);
		await expect
			.poll(async () => JSON.parse(await savedFile(page, SETTINGS_PATH)).layout?.railPanelsVisible)
			.toBe(false);

		await pressShortcut(page, 'Mod+2');
		await expect(listRow(page, 'Welcome')).toBeVisible();
		await expect(spacer).toHaveCount(0);
		await expect
			.poll(async () => JSON.parse(await savedFile(page, SETTINGS_PATH)).layout?.railPanelsVisible)
			.toBe(true);

		await pressShortcut(page, 'Mod+Shift+B');
		await expect(noteList(page)).toHaveCount(0);
		await expect(page.locator('[data-rail]')).toBeVisible();
		await pressShortcut(page, 'Mod+Shift+B');
		await expect(listRow(page, 'Welcome')).toBeVisible();
	});

	test('in the classic shell Cmd+1 and Cmd+2 do nothing and Cmd+Shift+B toggles the sidebar', async ({ vaultPage: page }) => {
		await expect(tree(page)).toBeVisible();

		await pressShortcut(page, 'Mod+1');
		await expect(tree(page)).toBeVisible();

		await pressShortcut(page, 'Mod+Shift+B');
		await expect(tree(page)).toHaveCount(0);
		await pressShortcut(page, 'Mod+2');
		await expect(tree(page)).toHaveCount(0);
		await pressShortcut(page, 'Mod+Shift+B');
		await expect(tree(page)).toBeVisible();
	});

	test('the active rail item is saved and restored after a restart', async ({ vaultPage: page }) => {
		await chooseLayout(page, 'rail');
		await page.locator('[data-rail-item="archive"]').click();
		await expect(page.locator('[data-rail-item="archive"]')).toHaveAttribute('aria-current', 'page');
		await expect
			.poll(async () => JSON.parse(await savedFile(page, SETTINGS_PATH)).layout?.railItem)
			.toBe('archive');

		await restartWithSettings(page, await savedFile(page, SETTINGS_PATH));

		await expect(page.locator('[data-rail-item="archive"]')).toHaveAttribute('aria-current', 'page');
		await expect(page.locator('[data-rail-item="inbox"]')).not.toHaveAttribute('aria-current', 'page');
		await expect(noteList(page).locator('[data-note-list-label]')).toHaveText('Archive');
		await expect(noteList(page).locator('[data-note-list-rule]')).toHaveText('archived');
	});

	test('a saved rail item the rail does not know opens on Inbox', async ({ vaultPage: page }) => {
		await chooseLayout(page, 'rail');
		await expect
			.poll(async () => JSON.parse(await savedFile(page, SETTINGS_PATH)).layout?.shell)
			.toBe('rail');
		const saved = JSON.parse(await savedFile(page, SETTINGS_PATH));
		saved.layout.railItem = 'no-such-item';

		await restartWithSettings(page, JSON.stringify(saved, null, 2));

		await expect(page.locator('[data-rail-item="inbox"]')).toHaveAttribute('aria-current', 'page');
		await expect(noteList(page).locator('[data-note-list-label]')).toHaveText('Inbox');
		await expect(listRow(page, 'Welcome')).toBeVisible();
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

	test('Types opens the navigator; a type fills the list, and its New here creates a note of the type', async ({ vaultPage: page }) => {
		await restartWithSettings(page, await railSettings(page, {}), TYPE_FILES);
		await expect(navigator(page)).toHaveCount(0);

		await page.locator('[data-rail-item="types"]').click();
		await expect(navigator(page)).toBeVisible();
		await expect(navRow(page, 'Project')).toContainText('Projects');
		await expect(navRow(page, 'Project').locator('[data-types-navigator-count]')).toHaveText('2');
		// Nothing picked yet: the first row.
		await expect(navRow(page, 'Project')).toHaveAttribute('aria-current', 'true');
		await expect(noteList(page).locator('[data-note-list-label]')).toHaveText('Projects');
		await expect(noteList(page).locator('[data-note-list-rule]')).toHaveText('type is Project, not archived');
		await expect(noteList(page).locator('[data-note-row]')).toHaveCount(2);
		await expect(listRow(page, 'Alpha')).toBeVisible();
		await expect(listRow(page, 'Shelved')).toHaveCount(0);

		await noteList(page).getByRole('button', { name: 'New here' }).click();
		const created = `${TEST_VAULT_PATH}/Work/Untitled Project.md`;
		await expect.poll(() => exists(page, created)).toBe(true);
		expect(await savedFile(page, created)).toBe('---\n_type: Project\nstatus: active\n---\n');
		await expectTabActive(page, 'Untitled Project');
		await expect(listRow(page, 'Untitled Project')).toBeVisible({ timeout: 15_000 });
		await expect(navRow(page, 'Project').locator('[data-types-navigator-count]')).toHaveText('3');
	});

	test('the Untyped row lists notes with no type, and its New here creates a plain note', async ({ vaultPage: page }) => {
		await restartWithSettings(page, await railSettings(page, { railItem: 'types' }, { showUntypedNotes: true }), TYPE_FILES);

		await navRow(page, 'untyped').click();
		await expect(noteList(page).locator('[data-note-list-label]')).toHaveText('Untyped');
		await expect(noteList(page).locator('[data-note-list-rule]')).toHaveText('no type, not archived');
		await expect(listRow(page, 'Welcome')).toBeVisible();
		await expect(listRow(page, 'Alpha')).toHaveCount(0);
		const rows = await noteList(page).locator('[data-note-row]').count();
		await expect(navRow(page, 'untyped').locator('[data-types-navigator-count]')).toHaveText(String(rows));

		await noteList(page).getByRole('button', { name: 'New here' }).click();
		const created = `${TEST_VAULT_PATH}/Daily/${dayjs().format('YYYY/MM-MMM')}/Untitled.md`;
		await expect.poll(() => exists(page, created)).toBe(true);
		expect(await savedFile(page, created)).toBe('');
		await expectTabActive(page, 'Untitled');
	});

	test('the picked type survives a restart', async ({ vaultPage: page }) => {
		const extra = { ...TYPE_FILES, [`${TEST_VAULT_PATH}/Area.md`]: '---\n_type: Type\n---\n' };
		await restartWithSettings(page, await railSettings(page, { railItem: 'types' }), extra);
		await navRow(page, 'Area').click();
		await expect(noteList(page).locator('[data-note-list-label]')).toHaveText('Areas');
		await expect
			.poll(async () => JSON.parse(await savedFile(page, SETTINGS_PATH)).layout?.railTypesLens)
			.toEqual({ kind: 'type', target: 'Area' });

		await restartWithSettings(page, await savedFile(page, SETTINGS_PATH), extra);

		await expect(page.locator('[data-rail-item="types"]')).toHaveAttribute('aria-current', 'page');
		await expect(navRow(page, 'Area')).toHaveAttribute('aria-current', 'true');
		await expect(noteList(page).locator('[data-note-list-label]')).toHaveText('Areas');
	});

	test('a saved type that no longer exists falls back to the default item', async ({ vaultPage: page }) => {
		await restartWithSettings(
			page,
			await railSettings(page, { railItem: 'types', railTypesLens: { kind: 'type', target: 'Gone' } }),
			TYPE_FILES,
		);

		await expect(page.locator('[data-rail-item="inbox"]')).toHaveAttribute('aria-current', 'page');
		await expect(navigator(page)).toHaveCount(0);
		await expect(noteList(page).locator('[data-note-list-label]')).toHaveText('Inbox');
		await expect
			.poll(async () => JSON.parse(await savedFile(page, SETTINGS_PATH)).layout?.railItem)
			.toBe('inbox');
		expect(JSON.parse(await savedFile(page, SETTINGS_PATH)).layout.railTypesLens).toBeNull();
	});

	test('the navigator pane keeps its own saved size, and Cmd+1 / Cmd+2 hide and show it with the list', async ({ vaultPage: page }) => {
		await restartWithSettings(page, await railSettings(page, { railItem: 'types', navigatorSize: 18 }), TYPE_FILES);
		await expect(navigator(page)).toBeVisible();
		const before = (await navigator(page).boundingBox())!.width;

		const handle = page.locator('[data-slot="resizable-handle"]').first();
		const box = (await handle.boundingBox())!;
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		await page.mouse.down();
		await page.mouse.move(box.x + 120, box.y + box.height / 2, { steps: 8 });
		await page.mouse.up();
		await expect.poll(async () => (await navigator(page).boundingBox())!.width).toBeGreaterThan(before + 60);
		await expect
			.poll(async () => JSON.parse(await savedFile(page, SETTINGS_PATH)).layout?.navigatorSize)
			.toBeGreaterThan(18);
		const saved = JSON.parse(await savedFile(page, SETTINGS_PATH)).layout;
		// The classic shell's panes keep their sizes.
		expect(saved.leftPaneSize).toBe(25);
		expect(saved.middlePanelSize).toBe(20);

		await pressShortcut(page, 'Mod+1');
		await expect(navigator(page)).toHaveCount(0);
		await expect(noteList(page)).toHaveCount(0);
		await pressShortcut(page, 'Mod+2');
		await expect(navigator(page)).toBeVisible();
		await expect(noteList(page)).toBeVisible();
		const resized = (await navigator(page).boundingBox())!.width;

		// The saved size is what the pane opens at after a restart.
		await restartWithSettings(page, await savedFile(page, SETTINGS_PATH), TYPE_FILES);
		await expect(navigator(page)).toBeVisible();
		await expect.poll(async () => Math.abs((await navigator(page).boundingBox())!.width - resized)).toBeLessThan(3);
	});
});
