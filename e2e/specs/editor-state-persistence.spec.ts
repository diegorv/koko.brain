import { test, expect, TEST_VAULT_PATH } from '../fixtures/test-vault';
import { openFile, saveCurrentFile } from '../fixtures/helpers';

test.describe('Editor view-state persistence', () => {
	test('cursor position survives a tab switch', async ({ vaultPage: page }) => {
		// Open Inbox, type a unique marker at the end of the file, save, then
		// switch away and back. The cursor should return to the marker line.
		await openFile(page, 'Inbox.md');
		await page.locator('.cm-content').click();
		await page.keyboard.press('End');
		await page.keyboard.press('Enter');
		await page.keyboard.type('CURSOR_HERE');
		await saveCurrentFile(page);

		// Move cursor to a different line for context
		// then switch away and back
		await openFile(page, 'Welcome.md');
		await openFile(page, 'Inbox.md');
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

		await openFile(page, 'Long.md');
		// openFile returns once .cm-content is visible, which it already is on a
		// tab switch. Wait for the switch to land and for its frame-1 scroll
		// restore (a fresh tab is pinned to 0), or that restore wipes the scroll
		// set below and the tab is saved at 0.
		await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('Long');
		await page.evaluate(
			() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))),
		);
		await page.evaluate(() => {
			const sc = document.querySelector('.cm-scroller');
			if (sc) sc.scrollTop = 400;
		});
		const scrollBefore = await page.evaluate(
			() => document.querySelector('.cm-scroller')?.scrollTop ?? 0,
		);
		expect(scrollBefore).toBeGreaterThan(200);

		await openFile(page, 'Welcome.md');
		await openFile(page, 'Long.md');

		await page.waitForTimeout(200);
		const scrollAfter = await page.evaluate(
			() => document.querySelector('.cm-scroller')?.scrollTop ?? 0,
		);
		expect(scrollAfter).toBeGreaterThan(200);
	});
});
