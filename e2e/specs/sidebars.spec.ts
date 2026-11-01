import type { Page } from '@playwright/test';
import { test, expect, TEST_VAULT_PATH } from '../fixtures/test-vault';
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
	test.use({ viewport: { width: 1440, height: 900 } });

	test('at 1440 px with the navigator, note list and right sidebar open the editor stays at least 600 px wide', async ({ vaultPage: page }) => {
		// The test vault saves no pane sizes, so these are the defaults.
		await openNote(page, '', 'Welcome');
		await expect(page.locator('[data-files-navigator]')).toBeVisible();
		await expect(noteList(page)).toBeVisible();
		await expect(page.locator('[data-right-sidebar]')).toBeVisible();

		const width = (await page.locator('.cm-editor').boundingBox())!.width;
		expect(width).toBeGreaterThanOrEqual(600);
	});
});
