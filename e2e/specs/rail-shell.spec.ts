import type { Page } from '@playwright/test';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek.js';
import quarterOfYear from 'dayjs/plugin/quarterOfYear.js';
import { parse as parseYaml } from 'yaml';
import { test, expect, TEST_FILES, TEST_VAULT_PATH } from '../fixtures/test-vault';
import { expectTabActive, openCommandPalette, pressShortcut } from '../fixtures/helpers';

dayjs.extend(isoWeek);
dayjs.extend(quarterOfYear);

const SETTINGS_PATH = `${TEST_VAULT_PATH}/.kokobrain/settings.json`;

/** Prepends `_organized: false` to a note's frontmatter, creating the block when there is none. */
function unorganized(content: string): string {
	return content.startsWith('---\n')
		? `---\n_organized: false\n${content.slice(4)}`
		: `---\n_organized: false\n---\n${content}`;
}

/**
 * The test vault with every note unorganized. A note without `_organized`
 * counts as organized (Rust `entry.rs`), so the Inbox would be empty.
 */
const RAIL_FILES: Record<string, string> = Object.fromEntries(
	Object.entries(TEST_FILES).map(([path, content]) => [path, path.endsWith('.md') ? unorganized(content) : content]),
);

test.use({ vaultFiles: RAIL_FILES });

function noteList(page: Page) {
	return page.locator('[data-rail-note-list]');
}

/** Picks the Inbox rail item: a fresh vault opens on Today. */
async function openInbox(page: Page): Promise<void> {
	await page.locator('[data-rail-item="inbox"]').click();
	await expect(noteList(page).locator('[data-note-list-label]')).toHaveText('Inbox');
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
	const files = { ...RAIL_FILES, ...extraFiles, [SETTINGS_PATH]: settingsJson };
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

/** The test vault's settings.json with `layout` patched. */
async function railSettings(page: Page, layout: Record<string, unknown>, rest: Record<string, unknown> = {}): Promise<string> {
	const saved = JSON.parse(await savedFile(page, SETTINGS_PATH));
	return JSON.stringify({ ...saved, ...rest, layout: { ...saved.layout, ...layout } }, null, 2);
}

/** A view of the Project type, sorted by file name, newest letter first. */
const VIEW_PATH = `${TEST_VAULT_PATH}/Open projects.view`;
const VIEW_FILES: Record<string, string> = {
	...TYPE_FILES,
	[VIEW_PATH]:
		"filters: '_type == \"Project\"'\nviews:\n  - type: table\n    name: Open projects\n    sort:\n      - column: file.basename\n        direction: DESC\n",
};
/** A second view that lists above `VIEW_PATH`, so picking `VIEW_PATH` is not the shell's default row. */
const FIRST_VIEW_PATH = `${TEST_VAULT_PATH}/Active projects.view`;
const TWO_VIEW_FILES: Record<string, string> = {
	...VIEW_FILES,
	[FIRST_VIEW_PATH]: "filters: '_type == \"Project\"'\nviews:\n  - type: table\n    name: Active projects\n",
};

function navigator(page: Page) {
	return page.locator('[data-types-navigator]');
}

function navRow(page: Page, key: string) {
	return navigator(page).locator(`[data-types-navigator-row="${key}"]`);
}

function viewRow(page: Page, path: string) {
	return navigator(page).locator(`[data-types-navigator-view="${path}"]`);
}

function filesNavigator(page: Page) {
	return page.locator('[data-files-navigator]');
}

function folderButton(page: Page, path: string) {
	return filesNavigator(page).locator(`[data-files-navigator-folder="${path}"]`);
}

const PROJECTS_PATH = `${TEST_VAULT_PATH}/Projects`;
const ARCHIVE_PATH = `${PROJECTS_PATH}/archive`;
const CANVAS_PATH = `${PROJECTS_PATH}/Board.canvas`;
/** A canvas next to the Projects notes of the test vault. */
const FOLDER_FILES: Record<string, string> = {
	[CANVAS_PATH]: JSON.stringify({
		nodes: [{ id: 'n1', type: 'text', text: 'Hello canvas', x: 0, y: 0, width: 200, height: 100 }],
		edges: [],
	}),
};

/** The note list's row titles, in display order. */
function listTitles(page: Page): Promise<string[]> {
	return noteList(page)
		.locator('[data-note-row]')
		.evaluateAll((rows) => rows.map((r) => r.querySelector('.truncate')?.textContent?.trim() ?? ''));
}

test.describe('Rail shell', () => {
	test('the vault opens on Today; Inbox lists its notes, persists, and a row opens its note', async ({ vaultPage: page }) => {
		await expect(page.locator('[data-rail]')).toBeVisible();
		await expect(page.locator('[role="tree"]')).toHaveCount(0);
		await expect(page.locator('button[title="Hide left sidebar"]')).toHaveCount(0);
		await expect(page.locator('[data-rail-item="today"]')).toHaveAttribute('aria-current', 'page');
		await expect(noteList(page).locator('[data-note-list-label]')).toHaveText('Today');

		await openInbox(page);
		await expect(page.locator('[data-rail-item="inbox"]')).toHaveAttribute('aria-current', 'page');
		await expect(noteList(page).locator('[data-note-list-label]')).toHaveText('Inbox');
		await expect(noteList(page).locator('[data-note-list-rule]')).toHaveText('not organized, not archived');
		await expect(listRow(page, 'Welcome')).toBeVisible();
		await expect(listRow(page, 'Roadmap')).toContainText('Note');
		await expect(listRow(page, 'Roadmap')).toContainText('Projects');

		const count = await noteList(page).locator('[data-note-row]').count();
		await expect(page.locator('[data-rail-badge]')).toHaveText(String(count));

		await expect
			.poll(async () => JSON.parse(await savedFile(page, SETTINGS_PATH)).layout?.railItem)
			.toBe('inbox');

		await listRow(page, 'Welcome').click();
		await expectTabActive(page, 'Welcome');
		await expect(page.locator('.cm-content')).toContainText('This is the test vault');
		await expect(listRow(page, 'Welcome')).toHaveClass(/bg-primary\/25/);
	});

	test('the row menu renames, favorites and trashes notes on disk', async ({ vaultPage: page }) => {
		await openInbox(page);

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
		await openInbox(page);
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
		await openInbox(page);
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
		await openInbox(page);
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

	test('the right sidebar still hides on the Tasks, Calendar, Tags and Graph tabs', async ({ vaultPage: page }) => {
		await openInbox(page);
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

		await listRow(page, 'Welcome').click();
		await expect(page.locator('[data-right-sidebar]')).toBeVisible();
		await openCommandPalette(page);
		await page.locator('input[placeholder*="command"]:visible').first().fill('Toggle Tags View');
		await page.keyboard.press('Enter');
		await expectTabActive(page, 'Tags');
		await expect(page.locator('[data-right-sidebar]')).toHaveCount(0);

		await listRow(page, 'Welcome').click();
		await expect(page.locator('[data-right-sidebar]')).toBeVisible();
		await pressShortcut(page, 'Mod+G');
		await expectTabActive(page, 'Graph View');
		await expect(page.locator('[data-right-sidebar]')).toHaveCount(0);
	});

	test('Cmd+1 hides the note list, Cmd+2 shows it, Cmd+Shift+B toggles it; the rail stays and the state is saved', async ({ vaultPage: page }) => {
		await openInbox(page);
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

	test('the active rail item is saved and restored after a restart', async ({ vaultPage: page }) => {
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

	test('a saved rail item the rail does not know opens on Today', async ({ vaultPage: page }) => {
		const saved = JSON.parse(await savedFile(page, SETTINGS_PATH));
		saved.layout.railItem = 'no-such-item';

		await restartWithSettings(page, JSON.stringify(saved, null, 2));

		await expect(page.locator('[data-rail-item="today"]')).toHaveAttribute('aria-current', 'page');
		await expect(noteList(page).locator('[data-note-list-label]')).toHaveText('Today');
		await expect(noteList(page).locator('[data-note-list-group="today"]')).toBeVisible();
	});

	test('old settings with the classic shell keys open the rail, and the keys are not written back', async ({ vaultPage: page }) => {
		const saved = JSON.parse(await savedFile(page, SETTINGS_PATH));
		const old = {
			...saved,
			layout: {
				...saved.layout,
				shell: 'classic',
				railMigrated: true,
				sidebarMode: 'types',
				leftSidebarVisible: false,
				leftPaneSize: 30,
				middlePanelSize: 25,
				railItem: 'inbox',
			},
			keybindings: { cycleSidebarView: { key: 'e', meta: true, shift: true, alt: false, ctrl: false } },
		};
		const errors: string[] = [];
		page.on('pageerror', (e) => errors.push(e.message));

		await restartWithSettings(page, JSON.stringify(old, null, 2));

		await expect(page.locator('[data-rail-item="inbox"]')).toHaveAttribute('aria-current', 'page');
		await expect(listRow(page, 'Welcome')).toBeVisible();
		await expect
			.poll(async () => {
				const written = JSON.parse(await savedFile(page, SETTINGS_PATH));
				return [
					'keybindings' in written,
					...['shell', 'railMigrated', 'sidebarMode', 'leftSidebarVisible', 'leftPaneSize', 'middlePanelSize'].map((k) => k in written.layout),
				];
			})
			.toEqual([false, false, false, false, false, false, false]);
		expect(JSON.parse(await savedFile(page, SETTINGS_PATH)).layout.railItem).toBe('inbox');
		expect(errors).toEqual([]);

		// Cmd+Shift+E is unbound: the rail item stays and no mode switch happens.
		await pressShortcut(page, 'Mod+Shift+E');
		await expect(page.locator('[data-rail-item="inbox"]')).toHaveAttribute('aria-current', 'page');
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

		await expect(page.locator('[data-rail-item="today"]')).toHaveAttribute('aria-current', 'page');
		await expect(navigator(page)).toHaveCount(0);
		await expect(noteList(page).locator('[data-note-list-label]')).toHaveText('Today');
		await expect
			.poll(async () => JSON.parse(await savedFile(page, SETTINGS_PATH)).layout?.railItem)
			.toBe('today');
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

	test('a view lists its query in its Sort order, Sort persists to the .view, and New here creates a note of its type', async ({ vaultPage: page }) => {
		await restartWithSettings(page, await railSettings(page, { railItem: 'types' }), VIEW_FILES);

		// Views sit above Types; with nothing picked the first row, the view, fills the list.
		await expect(viewRow(page, VIEW_PATH)).toContainText('Open projects');
		await expect(viewRow(page, VIEW_PATH)).toHaveAttribute('aria-current', 'true');
		const top = (await viewRow(page, VIEW_PATH).boundingBox())!.y;
		expect(top).toBeLessThan((await navRow(page, 'Project').boundingBox())!.y);
		await expect(noteList(page).locator('[data-note-list-label]')).toHaveText('Open projects');
		await expect(noteList(page).locator('[data-note-list-rule]')).toHaveText("_type == 'Project', not archived");
		await expect.poll(() => listTitles(page)).toEqual(['Beta', 'Alpha']);
		await expect(viewRow(page, VIEW_PATH).locator('[data-types-navigator-count]')).toHaveText('2', { timeout: 10_000 });

		// Flip the sort to A -> Z: the list follows and the .view keeps it.
		await noteList(page).locator('[data-note-list-sort]').click();
		await page.getByRole('button', { name: 'Z → A' }).first().click();
		await page.getByRole('menuitem', { name: 'A → Z' }).click();
		await expect.poll(() => listTitles(page)).toEqual(['Alpha', 'Beta']);
		await expect.poll(() => savedFile(page, VIEW_PATH)).toContain('direction: ASC');
		await page.keyboard.press('Escape');

		await noteList(page).getByRole('button', { name: 'New here' }).click();
		const created = `${TEST_VAULT_PATH}/Work/Untitled Project.md`;
		await expect.poll(() => exists(page, created)).toBe(true);
		expect(await savedFile(page, created)).toBe('---\n_type: Project\nstatus: active\n---\n');
		await expectTabActive(page, 'Untitled Project');
	});

	test('the picked view survives a restart; a deleted view falls back to the default item', async ({ vaultPage: page }) => {
		await restartWithSettings(page, await railSettings(page, { railItem: 'types' }), TWO_VIEW_FILES);
		// With nothing picked the shell shows the first row, so pick the second view.
		await expect(viewRow(page, FIRST_VIEW_PATH)).toHaveAttribute('aria-current', 'true');
		await viewRow(page, VIEW_PATH).click();
		await expect
			.poll(async () => JSON.parse(await savedFile(page, SETTINGS_PATH)).layout?.railTypesLens)
			.toEqual({ kind: 'view', target: VIEW_PATH });
		const saved = await savedFile(page, SETTINGS_PATH);

		await restartWithSettings(page, saved, TWO_VIEW_FILES);
		await expect(viewRow(page, VIEW_PATH)).toHaveAttribute('aria-current', 'true');
		await expect(viewRow(page, FIRST_VIEW_PATH)).not.toHaveAttribute('aria-current', 'true');
		await expect(noteList(page).locator('[data-note-list-label]')).toHaveText('Open projects');
		await expect.poll(() => listTitles(page)).toEqual(['Beta', 'Alpha']);

		await restartWithSettings(page, saved, TYPE_FILES);
		await expect(page.locator('[data-rail-item="today"]')).toHaveAttribute('aria-current', 'page');
		await expect(noteList(page).locator('[data-note-list-label]')).toHaveText('Today');
		await expect
			.poll(async () => JSON.parse(await savedFile(page, SETTINGS_PATH)).layout?.railTypesLens)
			.toBeNull();
	});

	test('New view asks for a name, creates the .view under it at the vault root and picks it', async ({ vaultPage: page }) => {
		await restartWithSettings(page, await railSettings(page, { railItem: 'types' }), VIEW_FILES);
		await expect(viewRow(page, VIEW_PATH)).toHaveAttribute('aria-current', 'true');

		await navigator(page).locator('[data-types-navigator-new-view]').click();
		const dialog = page.getByRole('dialog', { name: 'New view' });
		await expect(dialog).toBeVisible();
		await dialog.getByPlaceholder('View name').fill('Reading list');
		await dialog.getByRole('button', { name: 'Create' }).click();
		await expect(dialog).toHaveCount(0);

		const created = `${TEST_VAULT_PATH}/Reading list.view`;
		await expect(viewRow(page, created)).toContainText('Reading list');
		await expect(viewRow(page, created)).toHaveAttribute('aria-current', 'true');
		await expect(viewRow(page, VIEW_PATH)).not.toHaveAttribute('aria-current', 'true');
		await expect(noteList(page).locator('[data-note-list-label]')).toHaveText('Reading list');
		expect(await savedFile(page, created)).toContain('_sidebar_label: Reading list');
	});

	test('New view with a filter lists only the matching notes and saves the filter under its first view', async ({ vaultPage: page }) => {
		await restartWithSettings(page, await railSettings(page, { railItem: 'types' }), VIEW_FILES);
		await expect(viewRow(page, VIEW_PATH)).toHaveAttribute('aria-current', 'true');

		await navigator(page).locator('[data-types-navigator-new-view]').click();
		const dialog = page.getByRole('dialog', { name: 'New view' });
		await dialog.getByPlaceholder('View name').fill('Project list');
		await dialog.getByRole('button', { name: 'Add filter' }).click();

		// The field and operator menus are portaled out of the dialog: a pick must not close it.
		await dialog.getByRole('button', { name: 'file.name', exact: true }).first().click();
		await page.getByRole('menuitem', { name: '_type', exact: true }).click();
		await expect(dialog).toBeVisible();
		await expect(dialog.getByRole('button', { name: '_type', exact: true }).first()).toBeVisible();

		// Escape with a menu open closes only the menu.
		await dialog.getByRole('button', { name: 'is', exact: true }).first().click();
		await expect(page.getByRole('menuitem', { name: 'contains', exact: true })).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(page.getByRole('menuitem', { name: 'contains', exact: true })).toHaveCount(0);
		await expect(dialog).toBeVisible();

		await dialog.getByRole('button', { name: 'is', exact: true }).first().click();
		await page.getByRole('menuitem', { name: 'is', exact: true }).click();
		await expect(dialog).toBeVisible();
		await expect(dialog.getByRole('button', { name: 'Create' })).toBeDisabled();
		await dialog.getByPlaceholder('Value...').fill('Project');
		await expect(dialog.getByPlaceholder('Value...')).toHaveValue('Project');
		await dialog.getByRole('button', { name: 'Create' }).click();
		await expect(dialog).toHaveCount(0);

		const created = `${TEST_VAULT_PATH}/Project list.view`;
		await expect(viewRow(page, created)).toHaveAttribute('aria-current', 'true');
		await expect(noteList(page).locator('[data-note-list-label]')).toHaveText('Project list');
		// Not the archived Shelved, not the template under _system.
		await expect.poll(() => listTitles(page)).toEqual(['Alpha', 'Beta']);
		const saved = parseYaml(await savedFile(page, created)) as { filters?: unknown; views: { filters?: unknown }[] };
		expect(saved.views[0].filters).toBe("_type == 'Project'");
		expect(saved).not.toHaveProperty('filters');
	});

	test('Edit view from the row menu saves a new name and filter under the same file, and a re-pick lists the new matches', async ({ vaultPage: page }) => {
		await restartWithSettings(page, await railSettings(page, { railItem: 'types' }), TWO_VIEW_FILES);
		await expect(viewRow(page, FIRST_VIEW_PATH)).toHaveAttribute('aria-current', 'true');
		await viewRow(page, VIEW_PATH).click();
		await expect.poll(() => listTitles(page)).toEqual(['Beta', 'Alpha']);

		await viewRow(page, VIEW_PATH).click({ button: 'right' });
		await page.getByRole('menuitem', { name: 'Edit view' }).click();
		const dialog = page.getByRole('dialog', { name: 'Edit view' });
		await expect(dialog).toBeVisible();
		await expect(dialog.getByPlaceholder('View name')).toHaveValue('Open projects');
		// The top-level type filter shows under All views.
		await expect(dialog.getByText('All views')).toBeVisible();
		await expect(dialog.getByPlaceholder('Value...')).toHaveValue('Project');

		await dialog.getByPlaceholder('View name').fill('Alpha project');
		// The last Add filter belongs to This view.
		await dialog.getByRole('button', { name: 'Add filter' }).last().click();
		await dialog.getByPlaceholder('Value...').last().fill('Alpha.md');
		await dialog.getByRole('button', { name: 'Save' }).click();
		await expect(dialog).toHaveCount(0);

		const saved = parseYaml(await savedFile(page, VIEW_PATH)) as {
			_sidebar_label?: unknown;
			filters?: unknown;
			views: { name?: unknown; filters?: unknown; sort?: unknown }[];
		};
		expect(saved._sidebar_label).toBe('Alpha project');
		expect(saved.views[0].name).toBe('Alpha project');
		expect(saved.views[0].filters).toBe("file.name == 'Alpha.md'");
		expect(saved.filters).toBe("_type == 'Project'");
		expect(saved.views[0].sort).toEqual([{ column: 'file.basename', direction: 'DESC' }]);
		expect(await exists(page, `${TEST_VAULT_PATH}/Alpha project.view`)).toBe(false);

		// The E2E index mock sends no update for a .view: re-pick the row to re-run its query.
		await viewRow(page, FIRST_VIEW_PATH).click();
		await viewRow(page, VIEW_PATH).click();
		await expect.poll(() => listTitles(page)).toEqual(['Alpha']);
	});

	test('Files opens the folder navigator; a folder lists its notes and a canvas, and the canvas opens', async ({ vaultPage: page }) => {
		await restartWithSettings(page, await railSettings(page, {}), FOLDER_FILES);
		await page.locator('[data-rail-item="files"]').click();
		await expect(filesNavigator(page)).toBeVisible();
		// Nothing picked yet: the vault root, listing its own files only.
		await expect(folderButton(page, TEST_VAULT_PATH)).toHaveAttribute('aria-current', 'true');
		await expect(noteList(page).locator('[data-note-list-rule]')).toHaveText('in the vault root');
		await expect(listRow(page, 'Welcome')).toBeVisible();
		await expect(listRow(page, 'Roadmap')).toHaveCount(0);
		// Folders only, hidden ones out.
		await expect(folderButton(page, PROJECTS_PATH)).toBeVisible();
		await expect(filesNavigator(page)).not.toContainText('.kokobrain');
		await expect(filesNavigator(page)).not.toContainText('Welcome');

		await folderButton(page, PROJECTS_PATH).click();
		await expect(noteList(page).locator('[data-note-list-label]')).toHaveText('Projects');
		await expect(noteList(page).locator('[data-note-list-rule]')).toHaveText('in Projects/');
		await expect(listRow(page, 'Roadmap')).toBeVisible();
		await expect(listRow(page, '2026-Q2')).toBeVisible();
		await expect(listRow(page, 'Board')).toContainText('Canvas');
		await expect(listRow(page, '2025-Q4')).toHaveCount(0);

		await listRow(page, 'Board').click();
		await expectTabActive(page, 'Board');
		await expect(page.locator('.cm-content')).toHaveCount(0);
		await expect(page.getByText('Hello canvas')).toBeVisible();
	});

	test("New here on a folder creates the note in that folder and the list shows it", async ({ vaultPage: page }) => {
		await restartWithSettings(page, await railSettings(page, { railItem: 'files', railFolder: PROJECTS_PATH }));
		await expect(noteList(page).locator('[data-note-list-label]')).toHaveText('Projects');

		await noteList(page).getByRole('button', { name: 'New here' }).click();
		const created = `${PROJECTS_PATH}/Untitled.md`;
		await expect.poll(() => exists(page, created)).toBe(true);
		expect(await savedFile(page, created)).toBe('');
		await expectTabActive(page, 'Untitled');
		await expect(listRow(page, 'Untitled')).toBeVisible();
	});

	test('the picked folder and the expanded folders survive a restart', async ({ vaultPage: page }) => {
		await restartWithSettings(page, await railSettings(page, { railItem: 'files' }));
		await expect(folderButton(page, ARCHIVE_PATH)).toHaveCount(0);
		await filesNavigator(page).locator(`[data-files-navigator-toggle="${PROJECTS_PATH}"]`).click();
		await folderButton(page, ARCHIVE_PATH).click();
		await expect(noteList(page).locator('[data-note-list-label]')).toHaveText('archive');
		await expect
			.poll(async () => {
				const layout = JSON.parse(await savedFile(page, SETTINGS_PATH)).layout;
				return [layout?.railFolder, layout?.railExpandedFolders];
			})
			.toEqual([ARCHIVE_PATH, [PROJECTS_PATH]]);

		await restartWithSettings(page, await savedFile(page, SETTINGS_PATH));

		await expect(page.locator('[data-rail-item="files"]')).toHaveAttribute('aria-current', 'page');
		await expect(folderButton(page, ARCHIVE_PATH)).toHaveAttribute('aria-current', 'true');
		await expect(noteList(page).locator('[data-note-list-rule]')).toHaveText('in Projects/archive/');
		await expect(listRow(page, '2025-Q4')).toBeVisible();
	});

	test('a saved folder that no longer exists falls back to the default item', async ({ vaultPage: page }) => {
		const gone = `${TEST_VAULT_PATH}/Gone`;
		await restartWithSettings(
			page,
			await railSettings(page, { railItem: 'files', railFolder: gone, railExpandedFolders: [gone, PROJECTS_PATH] }),
		);

		await expect(page.locator('[data-rail-item="today"]')).toHaveAttribute('aria-current', 'page');
		await expect(filesNavigator(page)).toHaveCount(0);
		await expect(noteList(page).locator('[data-note-list-label]')).toHaveText('Today');
		await expect
			.poll(async () => {
				const layout = JSON.parse(await savedFile(page, SETTINGS_PATH)).layout;
				return [layout?.railItem, layout?.railFolder, layout?.railExpandedFolders];
			})
			.toEqual(['today', null, [PROJECTS_PATH]]);
	});

	test('renaming the picked folder from its menu keeps it picked under the new path, with its expanded state', async ({ vaultPage: page }) => {
		await restartWithSettings(
			page,
			await railSettings(page, { railItem: 'files', railFolder: PROJECTS_PATH, railExpandedFolders: [PROJECTS_PATH] }),
		);
		await expect(folderButton(page, ARCHIVE_PATH)).toBeVisible();

		await folderButton(page, PROJECTS_PATH).click({ button: 'right' });
		await page.getByRole('menuitem', { name: 'Rename', exact: true }).click();
		const input = filesNavigator(page).locator(`[data-files-navigator-rename="${PROJECTS_PATH}"]`);
		await expect(input).toHaveValue('Projects');
		await input.fill('Plans');
		await input.press('Enter');

		const plans = `${TEST_VAULT_PATH}/Plans`;
		await expect.poll(() => exists(page, `${plans}/Roadmap.md`)).toBe(true);
		await expect(folderButton(page, plans)).toHaveAttribute('aria-current', 'true');
		await expect(folderButton(page, `${plans}/archive`)).toBeVisible();
		await expect(noteList(page).locator('[data-note-list-rule]')).toHaveText('in Plans/');
		await expect(listRow(page, 'Roadmap')).toBeVisible();
		await expect
			.poll(async () => {
				const layout = JSON.parse(await savedFile(page, SETTINGS_PATH)).layout;
				return [layout?.railFolder, layout?.railExpandedFolders];
			})
			.toEqual([plans, [plans]]);
	});

	test('the folder menu creates a note in the folder, toasts a taken name, and trashes the picked folder', async ({ vaultPage: page }) => {
		await restartWithSettings(page, await railSettings(page, { railItem: 'files' }));

		await folderButton(page, PROJECTS_PATH).click({ button: 'right' });
		await page.getByRole('menuitem', { name: 'New note', exact: true }).click();
		await expect.poll(() => exists(page, `${PROJECTS_PATH}/Untitled.md`)).toBe(true);
		await expectTabActive(page, 'Untitled');
		await expect(folderButton(page, PROJECTS_PATH)).toHaveAttribute('aria-current', 'true');
		await expect(listRow(page, 'Untitled')).toBeVisible();

		await folderButton(page, PROJECTS_PATH).click({ button: 'right' });
		await page.getByRole('menuitem', { name: 'Rename', exact: true }).click();
		const input = filesNavigator(page).locator(`[data-files-navigator-rename="${PROJECTS_PATH}"]`);
		await input.fill('Daily');
		await input.press('Enter');
		await expect(
			page.locator('[data-sonner-toast]', { hasText: 'Could not rename "Projects": "Daily" already exists in this folder' }),
		).toBeVisible();
		await expect(folderButton(page, PROJECTS_PATH)).toHaveAttribute('aria-current', 'true');

		await page.evaluate(() => window.__e2e.dialog.setAskResponse(true));
		await folderButton(page, PROJECTS_PATH).click({ button: 'right' });
		await page.getByRole('menuitem', { name: 'Move to Trash', exact: true }).click();
		await expect.poll(() => exists(page, `${PROJECTS_PATH}/Roadmap.md`)).toBe(false);
		await expect(folderButton(page, PROJECTS_PATH)).toHaveCount(0);
		await expect(folderButton(page, TEST_VAULT_PATH)).toHaveAttribute('aria-current', 'true');
		await expect(noteList(page).locator('[data-note-list-rule]')).toHaveText('in the vault root');
	});

	test('dragging a note from the list onto another folder moves it there', async ({ vaultPage: page }) => {
		await restartWithSettings(page, await railSettings(page, { railItem: 'files', railFolder: PROJECTS_PATH }));
		const daily = `${TEST_VAULT_PATH}/Daily`;
		await expect(listRow(page, 'Roadmap')).toBeVisible();

		await listRow(page, 'Roadmap').dragTo(folderButton(page, daily));

		await expect.poll(() => exists(page, `${daily}/Roadmap.md`)).toBe(true);
		expect(await exists(page, `${PROJECTS_PATH}/Roadmap.md`)).toBe(false);
		await expect(listRow(page, 'Roadmap')).toHaveCount(0);
		await expect(folderButton(page, PROJECTS_PATH)).toHaveAttribute('aria-current', 'true');

		await folderButton(page, daily).click();
		await expect(noteList(page).locator('[data-note-list-rule]')).toHaveText('in Daily/');
		await expect(listRow(page, 'Roadmap')).toBeVisible();
		await expect(listRow(page, '2026-05-01')).toBeVisible();
	});

	test('Today lists the note dated today, not a favorite of another day; New here and Daily note create today\'s notes', async ({ vaultPage: page }) => {
		const today = dayjs().format('YYYY-MM-DD');
		// Dated last month, so only its favorite flag could put it on Today (the seeded notes' disk times are now).
		const lastMonth = dayjs().subtract(1, 'month').date(15).format('YYYY-MM-DD');
		const extra = {
			[`${TEST_VAULT_PATH}/Favorite.md`]: `---\n_favorite: true\ndate: ${lastMonth}\n---\nFavorite body\n`,
			[`${TEST_VAULT_PATH}/Dated today.md`]: `---\ndate: ${today}\n---\nDated body\n`,
			[`${TEST_VAULT_PATH}/Old.md`]: `---\ndate: ${lastMonth}\n---\nOld body\n`,
		};
		await restartWithSettings(page, await railSettings(page, {}), extra);

		await page.locator('[data-rail-item="today"]').click();
		await expect(page.locator('[data-rail-item="today"]')).toHaveAttribute('aria-current', 'page');
		await expect(noteList(page).locator('[data-note-list-label]')).toHaveText('Today');
		await expect(noteList(page).locator('[data-note-list-rule]')).toHaveText('note date is today');
		const todayHeader = noteList(page).locator('[data-note-list-group="today"]');
		await expect(todayHeader).toBeVisible();
		await expect(listRow(page, 'Dated today')).toBeVisible();
		await expect(listRow(page, 'Favorite')).toHaveCount(0);
		await expect(listRow(page, 'Old')).toHaveCount(0);

		await noteList(page).getByRole('button', { name: 'New here' }).click();
		const created = `${TEST_VAULT_PATH}/Daily/${dayjs().format('YYYY/MM-MMM')}/Untitled.md`;
		await expect.poll(() => exists(page, created)).toBe(true);
		expect(await savedFile(page, created)).toBe(`---\ndate: ${today}\n---\n`);
		await expect(listRow(page, 'Untitled')).toBeVisible({ timeout: 15_000 });

		const saved = JSON.parse(await savedFile(page, SETTINGS_PATH));
		const daily = `${TEST_VAULT_PATH}/${saved.periodicNotes.folder}/${dayjs().format(saved.periodicNotes.daily.format)}.md`;
		await expectTabActive(page, 'Untitled');
		await noteList(page).getByRole('button', { name: 'Daily note' }).click();
		await expectTabActive(page, dayjs().format(saved.periodicNotes.daily.format));
		await expect.poll(() => exists(page, daily)).toBe(true);
	});

	test('Calendar: a picked day lists its notes, New here adds a dated note, and the pick survives a restart', async ({ vaultPage: page }) => {
		// A day last month: the seeded notes' disk times are now, so only the dated note is on it.
		const day = dayjs().subtract(1, 'month').date(15);
		const dayKey = day.format('YYYY-MM-DD');
		const extra = { [`${TEST_VAULT_PATH}/Dated.md`]: `---\ndate: ${dayKey}\n---\nDated body\n` };
		const calendar = page.locator('[data-calendar-navigator]');
		const monthLabel = calendar.locator('[data-calendar-month-label]');
		const dayCell = calendar.locator(`button[data-date="${dayKey}"]`);
		await restartWithSettings(page, await railSettings(page, {}), extra);

		await page.locator('[data-rail-item="calendar"]').click();
		await expect(calendar).toBeVisible();
		await expect(monthLabel).toHaveText(dayjs().format('MMMM YYYY'));
		await calendar.getByRole('button', { name: 'Previous month' }).click();
		await expect(monthLabel).toHaveText(day.format('MMMM YYYY'));
		await dayCell.click();
		await expect(noteList(page).locator('[data-note-list-label]')).toHaveText(day.format('D MMM YYYY'));
		await expect(noteList(page).locator('[data-note-list-rule]')).toHaveText(`note date is ${dayKey}`);
		await expect.poll(() => listTitles(page)).toEqual(['Dated']);

		await noteList(page).getByRole('button', { name: 'New here' }).click();
		const created = `${TEST_VAULT_PATH}/Daily/${dayjs().format('YYYY/MM-MMM')}/Untitled.md`;
		await expect.poll(() => exists(page, created)).toBe(true);
		expect(await savedFile(page, created)).toBe(`---\ndate: ${dayKey}\n---\n`);
		await expect(listRow(page, 'Untitled')).toBeVisible({ timeout: 15_000 });
		await expect.poll(async () => JSON.parse(await savedFile(page, SETTINGS_PATH)).layout?.railDay).toBe(dayKey);

		await restartWithSettings(page, await savedFile(page, SETTINGS_PATH), extra);

		await expect(page.locator('[data-rail-item="calendar"]')).toHaveAttribute('aria-current', 'page');
		await expect(monthLabel).toHaveText(day.format('MMMM YYYY'));
		await expect(dayCell).toHaveClass(/bg-file-explorer-primary/);
		await expect(noteList(page).locator('[data-note-list-label]')).toHaveText(day.format('D MMM YYYY'));
		await expect(listRow(page, 'Dated')).toBeVisible();
	});

	test('Calendar: the yearly entry creates the note in the yearly format, and Open Calendar tab opens the Calendar', async ({ vaultPage: page }) => {
		const saved = JSON.parse(await savedFile(page, SETTINGS_PATH));
		const periodicNotes = { ...saved.periodicNotes, yearly: { format: '[Year-]YYYY', templatePath: '' } };
		// Monday-first, so the week entry's label is the ISO week of today.
		const eventCalendar = { ...saved.eventCalendar, weekStartsOn: 1 };
		await restartWithSettings(page, await railSettings(page, {}, { periodicNotes, eventCalendar }));
		const calendar = page.locator('[data-calendar-navigator]');
		const yearly = calendar.locator('button[data-periodic-note="yearly"]');
		const nextYear = dayjs().add(1, 'year').year();

		await page.locator('[data-rail-item="calendar"]').click();
		await expect(calendar.locator('button[data-periodic-note]')).toHaveText([
			`Week ${dayjs().isoWeek()}`,
			dayjs().format('MMMM YYYY'),
			`Q${dayjs().quarter()} ${dayjs().year()}`,
			String(dayjs().year()),
		]);

		await calendar.getByRole('button', { name: 'Next year' }).click();
		await expect(yearly).toHaveText(String(nextYear));
		expect(await exists(page, `${TEST_VAULT_PATH}/Daily/Year-${nextYear}.md`)).toBe(false);
		await yearly.click();
		await expect.poll(() => exists(page, `${TEST_VAULT_PATH}/Daily/Year-${nextYear}.md`)).toBe(true);
		await expectTabActive(page, `Year-${nextYear}`);

		await calendar.getByRole('button', { name: 'Open Calendar tab' }).click();
		await expectTabActive(page, 'Calendar');
	});

	test("Neighbourhood fills the list with the note and its groups, and follows a new link", async ({ vaultPage: page }) => {
		const launch = `${PROJECTS_PATH}/Launch.md`;
		await restartWithSettings(page, await railSettings(page, {}), {
			[launch]: '---\n_belongs_to: "[[Roadmap]]"\n_related_to: "[[Welcome]]"\nclient: "[[Inbox]]"\n---\n# Launch\n',
		});
		await page.locator('[data-rail-item="files"]').click();
		await folderButton(page, PROJECTS_PATH).click();
		await listRow(page, 'Launch').click();
		await expectTabActive(page, 'Launch');

		const label = "Show this note's neighbourhood in the note list";
		// Neighbourhood starts in the action bar's More menu.
		await page.getByTestId('note-action-bar').getByRole('button', { name: 'More note actions' }).click();
		await page.getByRole('menuitem', { name: label }).click();
		const headers = () =>
			noteList(page)
				.locator('[data-note-list-group]')
				.evaluateAll((els) => els.map((el) => el.textContent?.replace(/\s+/g, ' ').trim() ?? ''));
		await expect(noteList(page).locator('[data-note-list-label]')).toHaveText('Launch');
		await expect(noteList(page).locator('[data-note-list-rule]')).toHaveText('Launch and everything linked to it');
		await expect.poll(headers).toEqual([
			'This note 1',
			'Outgoing links 3',
			'Backlinks 0',
			'Belongs to 1',
			'Related to 1',
			'Has many 0',
			'Other relationships 1',
		]);
		await expect(noteList(page).getByRole('button', { name: 'New here' })).toHaveCount(0);
		await expect(page.locator('[data-rail] [aria-current="page"]')).toHaveCount(0);

		// A note that links here shows under Backlinks once the vault index refreshes.
		await listRow(page, 'Roadmap').first().click();
		await expectTabActive(page, 'Roadmap');
		await page.locator('.cm-content').click();
		await pressShortcut(page, 'Mod+ArrowDown');
		await page.keyboard.type('\nSee [[Launch]]\n');
		await expect.poll(headers, { timeout: 15_000 }).toContain('Backlinks 1');
		await expect(noteList(page).locator('[data-note-list-label]')).toHaveText('Launch');
	});
});

test.describe('Search on the rail', () => {
	function railSearch(page: Page) {
		return page.locator('[data-rail-search]');
	}

	function searchInput(page: Page) {
		return railSearch(page).locator('[data-rail-search-header] input');
	}

	test('"/" opens Search and focuses the input; a query lists the matching note with its snippet; Escape leaves the input', async ({ vaultPage: page }) => {
		await expect(page.locator('[data-rail-item="today"]')).toHaveAttribute('aria-current', 'page');
		// The daily note opens with the editor focused; "/" there is text, so focus the rail first.
		await page.locator('[data-rail-item="today"]').click();

		await page.keyboard.press('/');
		await expect(page.locator('[data-rail-item="search"]')).toHaveAttribute('aria-current', 'page');
		await expect(searchInput(page)).toBeFocused();
		await expect(noteList(page)).toHaveCount(0);
		await expect(railSearch(page).locator('[data-note-list-new]')).toHaveCount(0);

		await page.keyboard.type('milestone');
		await expect(searchInput(page)).toHaveValue('milestone');
		const row = railSearch(page).locator('.h-20', { hasText: 'Roadmap' });
		await expect(row).toBeVisible({ timeout: 5_000 });
		await expect(row).toContainText('for the next milestone.');
		await expect(railSearch(page)).toContainText('1 result');

		await page.keyboard.press('Escape');
		await expect(searchInput(page)).not.toBeFocused();
		await expect(row).toBeVisible();

		await row.getByRole('button').first().click();
		await expectTabActive(page, 'Roadmap');
	});

	test('"/" typed in the editor stays text', async ({ vaultPage: page }) => {
		await page.locator('[data-rail-item="inbox"]').click();
		await listRow(page, 'Welcome').click();
		await expectTabActive(page, 'Welcome');
		// The note opens with its `_organized` frontmatter first, so click the heading line itself.
		await page.locator('.cm-line', { hasText: 'Welcome' }).first().click();
		await page.keyboard.press('End');
		await page.keyboard.press('/');

		await expect(page.locator('.cm-content')).toContainText('Welcome/');
		await expect(page.locator('[data-rail-item="inbox"]')).toHaveAttribute('aria-current', 'page');
		await expect(railSearch(page)).toHaveCount(0);
	});

	test('Cmd+Shift+F and the palette command open rail Search, keeping the query', async ({ vaultPage: page }) => {
		await page.locator('[data-rail-item="inbox"]').click();

		await pressShortcut(page, 'Mod+Shift+F');
		await expect(page.locator('[data-rail-item="search"]')).toHaveAttribute('aria-current', 'page');
		await expect(searchInput(page)).toBeFocused();
		await searchInput(page).fill('Roadmap');

		await page.locator('[data-rail-item="inbox"]').click();
		await expect(railSearch(page)).toHaveCount(0);
		await openCommandPalette(page);
		const palette = page.locator('input[placeholder*="command"]:visible').first();
		await palette.fill('Search in Vault');
		await page.keyboard.press('Enter');

		await expect(page.locator('[data-rail-item="search"]')).toHaveAttribute('aria-current', 'page');
		await expect(searchInput(page)).toHaveValue('Roadmap');
		await expect(railSearch(page).locator('.h-20', { hasText: 'Roadmap' }).first()).toBeVisible({ timeout: 5_000 });
	});
});
