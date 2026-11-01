import type { Page } from '@playwright/test';
import { test, expect, TEST_VAULT_PATH } from '../fixtures/test-vault';
import { expectTabActive, openTreeItem, pressShortcut } from '../fixtures/helpers';

const WELCOME_PATH = `${TEST_VAULT_PATH}/Welcome.md`;

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
		await openTreeItem(page, 'Welcome.md');

		await expect(bar(page).getByTestId('note-action-bar-type')).toHaveText('Note');
		await expect(bar(page).getByTestId('note-action-bar-file')).toHaveText('Welcome.md');

		await pressShortcut(page, 'Mod+Shift+T');
		await expectTabActive(page, 'Tasks');
		await expect(bar(page)).toHaveCount(0);
	});

	test('with the right sidebar hidden, clicking Favorite and pressing Cmd+E write the note on disk', async ({
		vaultPage: page,
	}) => {
		await openTreeItem(page, 'Welcome.md');
		await hideRightSidebar(page);

		await bar(page).getByRole('button', { name: 'Add to favorites' }).click();
		await expect.poll(() => savedFile(page, WELCOME_PATH)).toContain('_favorite: true');
		await expect(bar(page).getByRole('button', { name: 'Remove from favorites' })).toHaveAttribute('aria-pressed', 'true');

		// Cmd+E with the cursor in the editor.
		await page.locator('.cm-content').click();
		await pressShortcut(page, 'Mod+E');
		await expect.poll(() => savedFile(page, WELCOME_PATH)).toContain('_organized: true');
		await expect(bar(page).getByRole('button', { name: 'Set note as not organized' })).toBeVisible();

		const saved = await savedFile(page, WELCOME_PATH);
		expect(saved).toContain('_favorite: true');
		expect(saved).toContain('This is the test vault. Visit [[Projects/Roadmap]]');
	});

	test('Cmd+D in the editor toggles favorite instead of selecting the next occurrence', async ({
		vaultPage: page,
	}) => {
		await openTreeItem(page, 'Welcome.md');
		await hideRightSidebar(page);

		await page.locator('.cm-content').click();
		await pressShortcut(page, 'Mod+D');
		await expect.poll(() => savedFile(page, WELCOME_PATH)).toContain('_favorite: true');

		await pressShortcut(page, 'Mod+D');
		await expect.poll(() => savedFile(page, WELCOME_PATH)).toContain('_favorite: false');
		await expect(page.locator('.cm-selectionBackground')).toHaveCount(0);
	});

	test('the Properties panel no longer shows the lifecycle row', async ({ vaultPage: page }) => {
		await openTreeItem(page, 'Welcome.md');

		await expect(page.locator('button', { hasText: 'Add property' })).toBeVisible();
		for (const label of ['Organize', 'To Inbox', 'Archive', 'Unarchive', 'Favorite', 'Favorited']) {
			await expect(page.getByRole('button', { name: label, exact: true })).toHaveCount(0);
		}
	});
});
