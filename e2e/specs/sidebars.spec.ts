import type { Page } from '@playwright/test';
import { test, expect, TEST_FILES, TEST_VAULT_PATH } from '../fixtures/test-vault';
import { expectTabActive, pressShortcut } from '../fixtures/helpers';

/** Reads one persisted layout flag from settings.json on the mock FS. */
function readPersistedLayout(page: Page, key: 'rightSidebarVisible' | 'railPanelsVisible') {
	return page.evaluate(
		({ vaultPath, key }) => {
			const raw = window.__e2e.fs.readFile(`${vaultPath}/.kokobrain/settings.json`);
			return JSON.parse(raw).layout[key] as boolean | undefined;
		},
		{ vaultPath: TEST_VAULT_PATH, key },
	);
}

function noteList(page: Page) {
	return page.locator('[data-rail-note-list]');
}

function listRow(page: Page, title: string) {
	return noteList(page).locator('[data-note-row]', { has: page.getByText(title, { exact: true }) });
}

/** Opens a note through the Files navigator: `folder` is vault-relative, '' for the root. */
async function openNote(page: Page, folder: string, title: string): Promise<void> {
	await page.locator('[data-rail-item="files"]').click();
	const path = folder ? `${TEST_VAULT_PATH}/${folder}` : TEST_VAULT_PATH;
	await page.locator(`[data-files-navigator-folder="${path}"]`).click();
	await listRow(page, title).click();
	await expectTabActive(page, title);
	await page.locator('.cm-content').waitFor({ state: 'visible', timeout: 10_000 });
}

test.describe('Right sidebar panels', () => {
	test('backlinks panel populates for a note with incoming links', async ({ vaultPage: page }) => {
		// Projects/Roadmap.md is referenced by Welcome.md and Projects/2026-Q2.md
		await openNote(page, 'Projects', 'Roadmap');

		// The panel starts collapsed and fetches when expanded. Its header, or
		// the note list's Welcome row, would match a bare text check even when
		// no backlink renders, so assert on the entries under "Linked mentions".
		const sidebar = page.locator('[data-right-sidebar]');
		await sidebar.locator('button', { has: page.locator('h2', { hasText: 'Backlinks' }) }).click();
		const linked = sidebar.getByRole('button', { name: /^Linked mentions/ });
		await expect(linked.locator('span.ml-auto')).toHaveText('2', { timeout: 10_000 });
		const entries = linked.locator('xpath=following-sibling::*[1]');
		await expect(entries.getByRole('button', { name: /^Welcome/ })).toBeVisible();
		await expect(entries.getByRole('button', { name: /^2026-Q2/ })).toBeVisible();
	});

	test('outgoing links panel shows wikilinks from the active note', async ({ vaultPage: page }) => {
		await openNote(page, '', 'Welcome');

		// Welcome.md links [[Projects/Roadmap]]; the panel lists it once expanded.
		const sidebar = page.locator('[data-right-sidebar]');
		await sidebar.locator('button', { has: page.locator('h2', { hasText: 'Outgoing links' }) }).click();
		await expect(sidebar.getByRole('button', { name: 'Projects/Roadmap' })).toBeVisible({ timeout: 10_000 });
	});

	test('Cmd+B toggles the right sidebar and the toggle button persists it', async ({ vaultPage: page }) => {
		await openNote(page, '', 'Welcome');
		const sidebar = page.locator('[data-right-sidebar]');
		await expect(sidebar).toBeVisible();

		await pressShortcut(page, 'Mod+B');
		await expect(sidebar).toHaveCount(0);
		await pressShortcut(page, 'Mod+B');
		await expect(sidebar).toBeVisible();

		await page.locator('button[title="Hide right sidebar"]').click();
		await expect(sidebar).toHaveCount(0);
		await expect.poll(() => readPersistedLayout(page, 'rightSidebarVisible')).toBe(false);
	});

	test('the rail has no left sidebar toggle; Cmd+1 hides the panels beside it and persists', async ({ vaultPage: page }) => {
		await expect(page.locator('button[title="Hide left sidebar"]')).toHaveCount(0);
		await expect(noteList(page)).toBeVisible();

		await pressShortcut(page, 'Mod+1');
		await expect(noteList(page)).toHaveCount(0);
		await expect(page.locator('[data-rail]')).toBeVisible();
		await expect.poll(() => readPersistedLayout(page, 'railPanelsVisible')).toBe(false);
	});
});

test.describe('Default pane sizes', () => {
	const SETTINGS_PATH = `${TEST_VAULT_PATH}/.kokobrain/settings.json`;
	const settings = JSON.parse(TEST_FILES[SETTINGS_PATH]);
	for (const key of ['railWidth', 'navigatorSize', 'noteListSize', 'rightSidebarSize']) delete settings.layout[key];

	test.use({ viewport: { width: 1440, height: 900 }, vaultFiles: { ...TEST_FILES, [SETTINGS_PATH]: JSON.stringify(settings, null, 2) } });

	test('a vault with no saved sizes opens at the minimums, and a pane drags wider from there', async ({ vaultPage: page }) => {
		await page.locator('[data-rail-item="files"]').click();
		expect((await page.locator('[data-rail]').boundingBox())!.width).toBe(140);

		// 3 % of the 1300 px left of the rail.
		for (const pane of [page.locator('[data-files-navigator]'), noteList(page), page.locator('[data-right-sidebar]')]) {
			await expect(pane).toBeVisible();
			const width = (await pane.boundingBox())!.width;
			expect(Math.abs(width - 39)).toBeLessThanOrEqual(2);
		}

		// The handle is 1 px wide and the editor covers its right half, so grab its hit area on the list's side.
		const handle = (await page.locator('[data-slot="resizable-handle"]').nth(1).boundingBox())!;
		await page.mouse.move(handle.x - 1, 450);
		await page.mouse.down();
		await page.mouse.move(handle.x + 300, 450, { steps: 8 });
		await page.mouse.up();
		expect((await noteList(page).boundingBox())!.width).toBeGreaterThan(200);
	});
});
