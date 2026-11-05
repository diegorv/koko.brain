import type { Page } from '@playwright/test';
import { parse as parseYaml } from 'yaml';
import { test, expect, TEST_FILES, TEST_VAULT_PATH } from '../fixtures/test-vault';

const SETTINGS_PATH = `${TEST_VAULT_PATH}/.kokobrain/settings.json`;

/** Prepends `_organized: false` to a note's frontmatter, creating the block when there is none. */
function unorganized(content: string): string {
	return content.startsWith('---\n')
		? `---\n_organized: false\n${content.slice(4)}`
		: `---\n_organized: false\n---\n${content}`;
}

/** The test vault with every note unorganized, so the Inbox lists them all. */
const RAIL_FILES: Record<string, string> = Object.fromEntries(
	Object.entries(TEST_FILES).map(([path, content]) => [path, path.endsWith('.md') ? unorganized(content) : content]),
);

test.use({ vaultFiles: RAIL_FILES });

function noteList(page: Page) {
	return page.locator('[data-rail-note-list]');
}

/** The note list row whose title is `title`. */
function listRowByTitle(page: Page, title: string) {
	return noteList(page).locator('[data-note-row]', { has: page.getByText(title, { exact: true }) });
}

/** Picks the Inbox rail item and waits until its rows have loaded, so a row count taken after this is not empty. */
async function openInbox(page: Page): Promise<void> {
	await page.locator('[data-rail-item="inbox"]').click();
	await expect(noteList(page).locator('[data-note-list-label]')).toHaveText('Inbox');
	await expect(listRowByTitle(page, 'Welcome')).toBeVisible();
}

/** The parsed frontmatter block of a note's text (its YAML between the leading `---` fences). */
function frontmatterOf(text: string): Record<string, unknown> {
	const match = /^---\n([\s\S]*?)\n---/.exec(text);
	if (!match) throw new Error('no frontmatter block');
	return parseYaml(match[1]) as Record<string, unknown>;
}

function savedFile(page: Page, path: string): Promise<string> {
	return page.evaluate((p) => window.__e2e.fs.readFile(p), path);
}

/** The note list's row titles, in display order. */
function listTitles(page: Page): Promise<string[]> {
	return noteList(page)
		.locator('[data-note-row]')
		.evaluateAll((rows) => rows.map((r) => r.querySelector('.truncate')?.textContent?.trim() ?? ''));
}

/** Restarts the app on the test vault with the given settings.json, as the rail spec does. */
async function restartWithSettings(page: Page, settingsJson: string, extraFiles: Record<string, string> = {}): Promise<void> {
	await page.reload({ waitUntil: 'networkidle' });
	await page.waitForFunction(() => window.__e2e?.fs !== undefined, { timeout: 10_000 });
	const files = { ...RAIL_FILES, ...extraFiles, [SETTINGS_PATH]: settingsJson };
	await page.evaluate((f) => window.__e2e.fs.populate(f), files);
	await page.evaluate((p) => window.__e2e.dialog.setOpenResponse(p), TEST_VAULT_PATH);
	await page.getByRole('button', { name: 'Open Vault' }).click();
	await expect(page.locator('[data-rail]')).toBeVisible({ timeout: 10_000 });
}

/** The test vault's settings.json with `layout` patched. */
async function railSettings(page: Page, layout: Record<string, unknown>): Promise<string> {
	const saved = JSON.parse(await savedFile(page, SETTINGS_PATH));
	return JSON.stringify({ ...saved, layout: { ...saved.layout, ...layout } }, null, 2);
}

/** A Project type with a folder, two live projects and an archived one. */
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

/** A view of the Project type, sorted by file name, newest letter first. */
const VIEW_PATH = `${TEST_VAULT_PATH}/Open projects.view`;
const VIEW_FILES: Record<string, string> = {
	...TYPE_FILES,
	[VIEW_PATH]:
		"filters: '_type == \"Project\"'\nviews:\n  - type: table\n    name: Open projects\n    sort:\n      - column: file.basename\n        direction: DESC\n",
};

function navigator(page: Page) {
	return page.locator('[data-types-navigator]');
}

function viewRow(page: Page, path: string) {
	return navigator(page).locator(`[data-types-navigator-view="${path}"]`);
}

test.describe('Note list toolbar', () => {
	test('Sort on Inbox: the trigger reads Modified, Title desc reorders the rows, the choice survives a reload, and Reset returns it', async ({ vaultPage: page }) => {
		await openInbox(page);
		const trigger = noteList(page).locator('[data-note-list-sort]');
		await expect(trigger).toHaveText('Modified');
		const before = await listTitles(page);
		expect(before.length).toBeGreaterThan(1);

		await trigger.click();
		await page.getByRole('button', { name: 'Title descending' }).click();
		await expect(trigger).toHaveText('Title');
		const sorted = ['Welcome', 'Roadmap', 'Inbox', '2026-Q2', '2026-05-01', '2025-Q4'];
		expect(before).not.toEqual(sorted);
		await expect.poll(() => listTitles(page)).toEqual(sorted);
		await expect
			.poll(async () => JSON.stringify(JSON.parse(await savedFile(page, SETTINGS_PATH)).layout?.railListPrefs))
			.toContain('title');

		await restartWithSettings(page, await savedFile(page, SETTINGS_PATH));
		await openInbox(page);
		await expect(trigger).toHaveText('Title');
		await expect.poll(() => listTitles(page)).toEqual(sorted);

		await trigger.click();
		await page.locator('[data-sort-reset]').click();
		await expect(trigger).toHaveText('Modified');
		await expect.poll(() => listTitles(page)).toEqual(before);
	});

	test('the sort menu takes the keyboard: ArrowDown moves focus, ArrowLeft picks ascending, Escape closes without a pick', async ({ vaultPage: page }) => {
		await openInbox(page);
		const trigger = noteList(page).locator('[data-note-list-sort]');
		const menu = page.getByRole('menu');

		await trigger.click();
		await expect(page.locator('[data-sort-option="modified"]')).toBeFocused();
		await page.keyboard.press('ArrowDown');
		await expect(page.locator('[data-sort-option="created"]')).toBeFocused();
		await page.keyboard.press('ArrowLeft');
		await expect(menu).toHaveCount(0);
		await expect(trigger).toHaveText('Created');

		await trigger.click();
		await expect(page.locator('[data-sort-option="created"]')).toHaveAttribute('aria-checked', 'true');
		await expect(page.getByRole('button', { name: 'Created ascending' })).toHaveAttribute('aria-pressed', 'true');
		await page.keyboard.press('ArrowDown');
		await expect(page.locator('[data-sort-option="title"]')).toBeFocused();
		await page.keyboard.press('Escape');
		await expect(menu).toHaveCount(0);
		await expect(trigger).toHaveText('Created');
	});

	test('the search toggle opens a focused input that narrows rows by title; Escape closes it and restores every row', async ({ vaultPage: page }) => {
		await openInbox(page);
		const before = await listTitles(page);
		const toggle = noteList(page).locator('[data-note-list-search-toggle]');
		const input = noteList(page).locator('[data-note-list-search] input');

		await toggle.click();
		await expect(input).toBeFocused();
		await page.keyboard.type('2025-Q4');
		await expect(input).toHaveValue('2025-Q4');
		await expect.poll(() => listTitles(page)).toEqual(['2025-Q4']);

		await page.keyboard.press('Escape');
		await expect(noteList(page).locator('[data-note-list-search]')).toHaveCount(0);
		await expect(toggle).toHaveAttribute('aria-pressed', 'false');
		await expect.poll(() => listTitles(page)).toEqual(before);
	});

	test('Show in note list: the search is focused, a tick adds a pill, a mouse drag reorders two properties, and the type file keeps the order', async ({ vaultPage: page }) => {
		const files: Record<string, string> = {
			...TYPE_FILES,
			[`${TEST_VAULT_PATH}/Work/Alpha.md`]: '---\n_type: Project\nstatus: active\npriority: 1\n---\nAlpha body\n',
			[`${TEST_VAULT_PATH}/Work/Beta.md`]: '---\n_type: Project\nstatus: paused\npriority: 2\n---\nBeta body\n',
		};
		await restartWithSettings(page, await railSettings(page, { railItem: 'types' }), files);
		await expect(noteList(page).locator('[data-note-list-label]')).toHaveText('Projects');

		await noteList(page).locator('[data-note-list-properties]').click();
		await expect(page.getByLabel('Search properties')).toBeFocused();

		await page.getByRole('checkbox', { name: 'status', exact: true }).check();
		await expect(listRowByTitle(page, 'Alpha')).toContainText('active');
		await page.getByRole('checkbox', { name: 'priority', exact: true }).check();
		await expect(listRowByTitle(page, 'Beta')).toContainText('paused');

		const selectedKeys = () =>
			page
				.locator('[data-note-list-property-row][data-selected="true"]')
				.evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.noteListPropertyRow));
		await expect.poll(selectedKeys).toEqual(['status', 'priority']);

		// Alt+Arrow moves a row and keeps focus on it.
		await page.getByRole('checkbox', { name: 'status', exact: true }).focus();
		await page.keyboard.press('Alt+ArrowDown');
		await expect.poll(selectedKeys).toEqual(['priority', 'status']);
		await expect(page.getByRole('checkbox', { name: 'status', exact: true })).toBeFocused();
		await page.keyboard.press('Alt+ArrowUp');
		await expect.poll(selectedKeys).toEqual(['status', 'priority']);

		// A real mouse drag: the grip of "priority" dropped on the "status" row.
		const grip = page.locator('[data-note-list-property-row="priority"] [data-note-list-property-handle]');
		const target = page.locator('[data-note-list-property-row="status"]');
		const g = (await grip.boundingBox())!;
		const t = (await target.boundingBox())!;
		const gx = g.x + g.width / 2;
		const gy = g.y + g.height / 2;
		await page.mouse.move(gx, gy);
		await page.mouse.down();
		await page.mouse.move(gx + 4, gy + 4, { steps: 3 });
		await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2, { steps: 12 });
		await page.mouse.up();
		await expect.poll(selectedKeys).toEqual(['priority', 'status']);

		const typeFile = `${TEST_VAULT_PATH}/Project.md`;
		await expect
			.poll(async () => frontmatterOf(await savedFile(page, typeFile))._list_properties_display)
			.toEqual(['priority', 'status']);
	});

	test('Multiple sort opens the sort panel, and the Filter button closes it and opens the filter panel', async ({ vaultPage: page }) => {
		await restartWithSettings(page, await railSettings(page, { railItem: 'types' }), VIEW_FILES);
		await expect(viewRow(page, VIEW_PATH)).toHaveAttribute('aria-current', 'true');

		await noteList(page).locator('[data-note-list-sort]').click();
		await page.locator('[data-sort-multiple]').click();
		const sortPanel = page.locator('[data-slot="popover-content"]', { hasText: 'Add sort' });
		await expect(sortPanel).toBeVisible();

		await noteList(page).locator('[data-note-list-filter]').click();
		await expect(sortPanel).toHaveCount(0);
		await expect(page.locator('[data-slot="popover-content"]', { hasText: 'Add filter' })).toBeVisible();
	});

	test('a narrow note list (about 220 px) keeps the title at least 4 characters, no header control overflows, and New is clickable', async ({ vaultPage: page }) => {
		await openInbox(page);
		const list = noteList(page);
		const width = async () => (await list.boundingBox())!.width;

		// The handle between the note list and the editor is the first one: no navigator sits left of the list here.
		const handle = page.locator('[data-slot="resizable-handle"]').first();
		const hb = (await handle.boundingBox())!;
		const listBox = (await list.boundingBox())!;
		expect(Math.abs(hb.x + hb.width / 2 - (listBox.x + listBox.width))).toBeLessThan(8);

		// Grab left of the handle's centre: the editor pane covers its right half, so a centre grab misses it.
		const startX = hb.x - 3;
		const y = hb.y + hb.height / 2;
		const current = await width();
		await page.mouse.move(startX, y);
		await page.mouse.down();
		await page.mouse.move(startX - (current - 220), y, { steps: 12 });
		await page.mouse.up();
		await expect.poll(width).toBeLessThan(240);
		expect(await width()).toBeGreaterThan(200);

		const paneBox = (await list.boundingBox())!;
		const title = (await list.locator('[data-note-list-label]').boundingBox())!;
		expect(title.width).toBeGreaterThanOrEqual(64);

		const headerRights = await list.evaluate((el) =>
			Array.from(el.firstElementChild?.children ?? []).map((child) => ({
				tag: child.tagName,
				right: child.getBoundingClientRect().right,
			})),
		);
		const paneRight = paneBox.x + paneBox.width;
		for (const { tag, right } of headerRights) {
			expect(right, `${tag} overflows the pane`).toBeLessThanOrEqual(paneRight + 1);
		}

		await expect(list.locator('[data-note-list-new]')).toBeVisible();
		await list.locator('[data-note-list-new]').click({ trial: true });
	});
});
