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

/** Hides the right sidebar with the bar's own toggle, so nothing fills the Properties panel. */
async function hideRightSidebar(page: Page): Promise<void> {
	await bar(page).getByRole('button', { name: 'Close the right sidebar' }).click();
	await expect(page.locator('button[title="Hide right sidebar"]')).toHaveCount(0);
	await expect(bar(page).getByRole('button', { name: 'Open the right sidebar' })).toBeVisible();
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

		await bar(page).getByRole('button', { name: 'Use the full note width' }).click();
		await expect(content).toHaveCSS('max-width', 'none');
		await expect(bar(page).getByRole('button', { name: 'Use the normal note width' })).toHaveAttribute('aria-pressed', 'true');
		await expect.poll(async () => JSON.parse(await savedFile(page, SETTINGS_PATH)).editor.wideNotes).toBe(true);

		await bar(page).getByRole('button', { name: 'Use the normal note width' }).click();
		await expect(content).toHaveCSS('max-width', '600px');
		await expect.poll(async () => JSON.parse(await savedFile(page, SETTINGS_PATH)).editor.wideNotes).toBe(false);
	});

	test('TOC shows the right sidebar with the Table of Contents section open', async ({ vaultPage: page }) => {
		await openFile(page, 'Welcome.md');
		await hideRightSidebar(page);

		await bar(page).getByRole('button', { name: 'Show the table of contents' }).click();

		const sidebar = page.locator('[data-right-sidebar]');
		await expect(sidebar).toBeVisible();
		await expect(sidebar.getByRole('button', { name: 'Welcome' })).toBeVisible();
	});

	test('Copy path confirms with a toast', async ({ vaultPage: page }) => {
		await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
		await openFile(page, 'Welcome.md');

		await bar(page).getByRole('button', { name: 'Copy path' }).click();

		await expect(page.getByText('Path copied')).toBeVisible();
		expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(WELCOME_PATH);
	});

	test('a narrow bar folds the path actions into More', async ({ vaultPage: page }) => {
		await openFile(page, 'Welcome.md');
		await expect(bar(page).getByRole('button', { name: 'Copy path' })).toBeVisible();

		await page.setViewportSize({ width: 800, height: 800 });
		await expect(bar(page).getByRole('button', { name: 'Copy path' })).toHaveCount(0);
		await bar(page).getByRole('button', { name: 'More note actions' }).click();
		await expect(page.getByRole('menuitem', { name: 'Copy path' })).toBeVisible();
		await page.keyboard.press('Escape');

		await page.setViewportSize({ width: 1800, height: 800 });
		await expect(bar(page).getByRole('button', { name: 'Copy path' })).toBeVisible();
	});
});
