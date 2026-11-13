import type { Page } from '@playwright/test';
import { test, expect, TEST_VAULT_PATH } from '../fixtures/test-vault';
import { expectTabActive, openFile, pressShortcut } from '../fixtures/helpers';

const WELCOME_PATH = `${TEST_VAULT_PATH}/Welcome.md`;
const SETTINGS_PATH = `${TEST_VAULT_PATH}/.kokobrain/settings.json`;

function savedFile(page: Page, path: string): Promise<string> {
	return page.evaluate((p) => window.__e2e.fs.readFile(p), path);
}

function bar(page: Page) {
	return page.getByTestId('note-action-bar');
}

/** Hides the right sidebar with the tab band's toggle, so nothing fills the Properties panel. */
async function hideRightSidebar(page: Page): Promise<void> {
	await page.locator('button[title="Hide right sidebar"]').click();
	await expect(page.locator('[data-right-sidebar]')).toHaveCount(0);
	await expect(page.locator('button[title="Show right sidebar"]')).toBeVisible();
}

/** Runs a bar action from the More menu, where the rarer actions start. */
async function moreAction(page: Page, name: string): Promise<void> {
	await bar(page).getByRole('button', { name: 'More note actions' }).click();
	await page.getByRole('menuitem', { name }).click();
}

test.describe('Note action bar', () => {
	test('shows the type and file name of the active markdown note, and only on markdown tabs', async ({
		vaultPage: page,
	}) => {
		await openFile(page, 'Welcome.md');

		await expect(bar(page).getByTestId('note-action-bar-type')).toHaveText('Note');
		await expect(bar(page).getByTestId('note-action-bar-file')).toHaveText('Welcome.md');

		await pressShortcut(page, 'Mod+Shift+T');
		await expectTabActive(page, 'Tasks');
		await expect(bar(page)).toHaveCount(0);
	});

	test('with the right sidebar hidden, clicking Favorite and pressing Cmd+E write the note on disk', async ({
		vaultPage: page,
	}) => {
		await openFile(page, 'Welcome.md');
		await hideRightSidebar(page);

		await bar(page).getByRole('button', { name: 'Add to favorites' }).click();
		await expect.poll(() => savedFile(page, WELCOME_PATH)).toContain('_favorite: true');
		await expect(bar(page).getByRole('button', { name: 'Remove from favorites' })).toHaveAttribute('aria-pressed', 'true');

		// Cmd+E with the cursor in the editor.
		await page.locator('.cm-content').click();
		await pressShortcut(page, 'Mod+E');
		// A missing _organized reads as organized, as in the Rust index, so Cmd+E turns it off.
		await expect.poll(() => savedFile(page, WELCOME_PATH)).toContain('_organized: false');
		await expect(bar(page).getByRole('button', { name: 'Set note as organized' })).toHaveAttribute('aria-pressed', 'false');

		const saved = await savedFile(page, WELCOME_PATH);
		expect(saved).toContain('_favorite: true');
		expect(saved).toContain('This is the test vault. Visit [[Projects/Roadmap]]');
	});

	test('Cmd+D in the editor toggles favorite instead of selecting the next occurrence', async ({
		vaultPage: page,
	}) => {
		await openFile(page, 'Welcome.md');
		await hideRightSidebar(page);

		await page.locator('.cm-content').click();
		await pressShortcut(page, 'Mod+D');
		await expect.poll(() => savedFile(page, WELCOME_PATH)).toContain('_favorite: true');

		await pressShortcut(page, 'Mod+D');
		await expect.poll(() => savedFile(page, WELCOME_PATH)).toContain('_favorite: false');
		await expect(page.locator('.cm-selectionBackground')).toHaveCount(0);
	});

	test('the Properties panel no longer shows the lifecycle row', async ({ vaultPage: page }) => {
		await openFile(page, 'Welcome.md');

		// Scoped to the right sidebar: the rail's own Archive item is a button too.
		const sidebar = page.locator('[data-right-sidebar]');
		await expect(sidebar.locator('button', { hasText: 'Add property' })).toBeVisible();
		for (const label of ['Organize', 'To Inbox', 'Archive', 'Unarchive', 'Favorite', 'Favorited']) {
			await expect(sidebar.getByRole('button', { name: label, exact: true })).toHaveCount(0);
		}
	});

	test('Raw toggles source mode from the button', async ({ vaultPage: page }) => {
		await openFile(page, 'Welcome.md');
		await expect(page.locator('.cm-lp-h1').first()).toBeVisible();

		await bar(page).getByRole('button', { name: 'Show raw Markdown' }).click();
		await expect(page.locator('.cm-lp-h1')).toHaveCount(0);
		await expect(bar(page).getByRole('button', { name: 'Back to live preview' })).toHaveAttribute('aria-pressed', 'true');

		await bar(page).getByRole('button', { name: 'Back to live preview' }).click();
		await expect(page.locator('.cm-lp-h1').first()).toBeVisible();
	});

	test('note width switches between the configured content width and full width, and is saved', async ({
		vaultPage: page,
	}) => {
		// Configure a content width in Settings > Editor.
		await pressShortcut(page, 'Mod+,');
		await page.getByRole('button', { name: 'Editor', exact: true }).click();
		const widthInput = page
			.locator('div.bg-setting-item-bg', { has: page.getByText('Content width', { exact: true }) })
			.locator('input');
		await widthInput.fill('600');
		await widthInput.press('Tab');
		await page.keyboard.press('Escape');

		await openFile(page, 'Welcome.md');
		const content = page.locator('.cm-content').first();
		await expect(content).toHaveCSS('max-width', '600px');

		await moreAction(page, 'Use the full note width');
		await expect(content).toHaveCSS('max-width', 'none');
		await expect.poll(async () => JSON.parse(await savedFile(page, SETTINGS_PATH)).editor.wideNotes).toBe(true);

		await moreAction(page, 'Use the normal note width');
		await expect(content).toHaveCSS('max-width', '600px');
		await expect.poll(async () => JSON.parse(await savedFile(page, SETTINGS_PATH)).editor.wideNotes).toBe(false);
	});

	test('TOC shows the right sidebar with the Table of Contents section open', async ({ vaultPage: page }) => {
		await openFile(page, 'Welcome.md');
		await hideRightSidebar(page);

		await moreAction(page, 'Show the table of contents');

		const sidebar = page.locator('[data-right-sidebar]');
		await expect(sidebar).toBeVisible();
		await expect(sidebar.getByRole('button', { name: 'Welcome' })).toBeVisible();
	});

	test('Copy path confirms with a toast', async ({ vaultPage: page }) => {
		await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
		await openFile(page, 'Welcome.md');

		await moreAction(page, 'Copy path');

		await expect(page.getByText('Path copied')).toBeVisible();
		expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(WELCOME_PATH);
	});

	test('the bar has no sidebar toggle of its own: the tab band has the only one', async ({ vaultPage: page }) => {
		await openFile(page, 'Welcome.md');

		await expect(bar(page).getByRole('button', { name: /right sidebar/ })).toHaveCount(0);
		await expect(page.locator('button[title$="right sidebar"]')).toHaveCount(1);
	});

	test('the path actions start in More and come inline only on a wide bar', async ({ vaultPage: page }) => {
		await openFile(page, 'Welcome.md');
		await expect(bar(page).getByRole('button', { name: 'Copy path' })).toHaveCount(0);
		await bar(page).getByRole('button', { name: 'More note actions' }).click();
		await expect(page.getByRole('menuitem', { name: 'Copy path' })).toBeVisible();
		await page.keyboard.press('Escape');

		await page.setViewportSize({ width: 3000, height: 800 });
		await expect(bar(page).getByRole('button', { name: 'Copy path' })).toBeVisible();
	});
});
