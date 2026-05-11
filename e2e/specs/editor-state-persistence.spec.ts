import { test, expect, TEST_VAULT_PATH } from '../fixtures/test-vault';
import { openTreeItem, saveCurrentFile } from '../fixtures/helpers';

test.describe('Editor view-state persistence', () => {
	test('cursor position survives a tab switch', async ({ vaultPage: page }) => {
		// Open Inbox, type a unique marker at the end of the file, save, then
		// switch away and back. The cursor should return to the marker line.
		await openTreeItem(page, 'Inbox.md');
		await page.locator('.cm-content').click();
		await page.keyboard.press('End');
		await page.keyboard.press('Enter');
		await page.keyboard.type('CURSOR_HERE');
		await saveCurrentFile(page);

		// Move cursor to a different line for context
		// then switch away and back
		await openTreeItem(page, 'Welcome.md');
		await openTreeItem(page, 'Inbox.md');
		await page.waitForTimeout(200);

		// After re-opening, the active line should contain the marker — that
		// proves the cursor was restored to (or near) where we left it.
		await expect(page.locator('.cm-activeLine')).toContainText('CURSOR_HERE');
	});

	test('scroll position survives a tab switch on a long file', async ({ vaultPage: page }) => {
		// Seed a long note (60+ lines) and trigger a tree refresh so it shows
		// up in the file explorer.
		const longContent =
			'# Long Note\n\n' +
			Array.from({ length: 60 }, (_, i) => `Line ${i + 1} — paragraph content here.`).join('\n\n') +
			'\n';
		await page.evaluate(
			({ files }) => window.__e2e.fs.populate(files),
			{ files: { [`${TEST_VAULT_PATH}/Long.md`]: longContent } },
		);
		await page.evaluate(
			({ paths }) => window.__e2e.events.emit('vault-files-changed', { paths }),
			{ paths: [`${TEST_VAULT_PATH}/Long.md`] },
		);
		await page.waitForTimeout(200);

		await openTreeItem(page, 'Long.md');
		await page.evaluate(() => {
			const sc = document.querySelector('.cm-scroller');
			if (sc) sc.scrollTop = 400;
		});
		const scrollBefore = await page.evaluate(
			() => document.querySelector('.cm-scroller')?.scrollTop ?? 0,
		);
		expect(scrollBefore).toBeGreaterThan(200);

		await openTreeItem(page, 'Welcome.md');
		await openTreeItem(page, 'Long.md');

		await page.waitForTimeout(200);
		const scrollAfter = await page.evaluate(
			() => document.querySelector('.cm-scroller')?.scrollTop ?? 0,
		);
		expect(scrollAfter).toBeGreaterThan(200);
	});
});
