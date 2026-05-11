import { test, expect } from '../fixtures/test-vault';
import { openTreeItem, saveCurrentFile } from '../fixtures/helpers';

test.describe('Wikilink create-on-click', () => {
	test('clicking `[[BrandNewNote]]` creates the file and opens it', async ({ vaultPage: page }) => {
		await openTreeItem(page, 'Inbox.md');

		await page.locator('.cm-content').click();
		await page.keyboard.press('End');
		await page.keyboard.press('Enter');
		await page.keyboard.type('[[BrandNewNote]]');
		await saveCurrentFile(page);

		// Move the cursor OFF the wikilink line so live-preview renders the
		// `.cm-lp-wikilink` decoration instead of showing the raw source.
		await page.locator('.cm-line').filter({ hasText: 'Inbox' }).first().click();
		await page.waitForTimeout(150);

		await page
			.locator('.cm-lp-wikilink, .cm-lp-wikilink-inner', { hasText: 'BrandNewNote' })
			.first()
			.click();

		await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('BrandNewNote');

		const filesAfter = await page.evaluate(() => Object.keys(window.__e2e.fs.dump()).sort());
		expect(filesAfter.some((p) => p.endsWith('/BrandNewNote.md'))).toBe(true);
	});
});
