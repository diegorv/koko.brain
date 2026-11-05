import type { Page } from '@playwright/test';
import { test, expect, TEST_VAULT_PATH } from '../fixtures/test-vault';
import { openFile, saveCurrentFile } from '../fixtures/helpers';

const INBOX_PATH = `${TEST_VAULT_PATH}/Inbox.md`;
const LINE_TEXT = 'unlinked mentions panel has something to surface.';

/** Right-clicks the plain-text line of Inbox.md and picks `item` from the editor's context menu. */
async function pickFromLineMenu(page: Page, item: string): Promise<void> {
	await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
	await openFile(page, 'Inbox.md');
	await page.locator('.cm-line', { hasText: LINE_TEXT }).click({ button: 'right', position: { x: 5, y: 5 } });
	await page.getByRole('menuitem', { name: item }).click();
}

/** The clipboard text once it matches `pattern`, so the async write has landed. */
async function clipboardMatching(page: Page, pattern: RegExp): Promise<string> {
	await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toMatch(pattern);
	return page.evaluate(() => navigator.clipboard.readText());
}

/** Saves the note and expects the line on disk to end with the `^id` block marker. */
async function expectMarkerSaved(page: Page, id: string): Promise<void> {
	await expect(page.locator('.cm-content')).toContainText(`${LINE_TEXT} ^${id}`);
	await saveCurrentFile(page);
	await expect.poll(() => page.evaluate((p) => window.__e2e.fs.readFileSafe(p), INBOX_PATH)).toContain(`${LINE_TEXT} ^${id}\n`);
}

test.describe('Copy block link', () => {
	test('Copy block link copies [[note#^id]] and writes the marker into the note', async ({ vaultPage: page }) => {
		await pickFromLineMenu(page, 'Copy block link');

		const text = await clipboardMatching(page, /^\[\[Inbox#\^[\w-]+\]\]$/);
		const id = text.slice('[[Inbox#^'.length, -2);
		await expectMarkerSaved(page, id);
	});

	test('Copy block embed copies ![[note#^id]] and writes the marker into the note', async ({ vaultPage: page }) => {
		await pickFromLineMenu(page, 'Copy block embed');

		const text = await clipboardMatching(page, /^!\[\[Inbox#\^[\w-]+\]\]$/);
		const id = text.slice('![[Inbox#^'.length, -2);
		await expectMarkerSaved(page, id);
	});
});

test.describe('Editor context menu', () => {
	test('Copy copies the word a right-click landed inside of', async ({ vaultPage: page }) => {
		await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
		await openFile(page, 'Inbox.md');
		const line = page.locator('.cm-line', { hasText: LINE_TEXT });
		await line.dblclick({ position: { x: 5, y: 5 } });
		await line.click({ button: 'right', position: { x: 5, y: 5 } });
		// `exact`: "Copy block link" also matches a plain "Copy".
		await page.getByRole('menuitem', { name: 'Copy', exact: true }).click();

		expect(await clipboardMatching(page, /^unlinked$/)).toBe('unlinked');
	});
});
