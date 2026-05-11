import { test, expect, TEST_VAULT_PATH } from '../fixtures/test-vault';
import { openTreeItem } from '../fixtures/helpers';

const REFERENCE = `# Reference

## Section A

Paragraph in section A. ^block-a

## Section B

Paragraph in section B. ^block-b

## Section C

Final paragraph. ^block-c
`;

const SOURCE = `# Source

See [[Reference#Section B]] for context, or [[Reference#^block-c]] for the
specific block. The within-doc [[#Local Heading]] anchor lives here too.

## Local Heading

Anchored content for the same-note test.
`;

async function seedAnchorFiles(page: import('@playwright/test').Page) {
	await page.evaluate(
		({ files }) => window.__e2e.fs.populate(files),
		{
			files: {
				[`${TEST_VAULT_PATH}/Reference.md`]: REFERENCE,
				[`${TEST_VAULT_PATH}/Source.md`]: SOURCE,
			},
		},
	);
	// `populate()` mutates the virtual FS but the file-tree store doesn't
	// reactively rescan — emit the watcher event so `loadDirectoryTree`
	// re-runs and the new notes show up in `[role="tree"]`.
	await page.evaluate(
		({ paths }) => window.__e2e.events.emit('vault-files-changed', { paths }),
		{ paths: [`${TEST_VAULT_PATH}/Reference.md`, `${TEST_VAULT_PATH}/Source.md`] },
	);
	await page.waitForTimeout(200);
}

test.describe('Wikilink anchor navigation', () => {
	test('clicking `[[Reference#Section B]]` opens Reference and scrolls to the heading', async ({
		vaultPage: page,
	}) => {
		await seedAnchorFiles(page);
		await openTreeItem(page, 'Source.md');

		await page
			.locator('.cm-lp-wikilink, .cm-lp-wikilink-inner', { hasText: 'Section B' })
			.first()
			.click();

		await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('Reference');
		// CodeMirror scrolls the heading into view and places the cursor there.
		// `.cm-activeLine` is the line containing the caret, so its text proves
		// the navigation reached Section B.
		await expect(page.locator('.cm-activeLine')).toContainText('Section B');
	});

	test('clicking `[[Reference#^block-c]]` opens Reference and scrolls to the block', async ({
		vaultPage: page,
	}) => {
		await seedAnchorFiles(page);
		await openTreeItem(page, 'Source.md');

		await page
			.locator('.cm-lp-wikilink, .cm-lp-wikilink-inner', { hasText: 'block-c' })
			.first()
			.click();

		await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('Reference');
		await expect(page.locator('.cm-activeLine')).toContainText('block-c');
	});

	test('clicking `[[#Local Heading]]` scrolls within the current note', async ({
		vaultPage: page,
	}) => {
		await seedAnchorFiles(page);
		await openTreeItem(page, 'Source.md');

		const beforeTab = await page.locator('[role="tab"][aria-selected="true"]').textContent();

		await page
			.locator('.cm-lp-wikilink, .cm-lp-wikilink-inner', { hasText: 'Local Heading' })
			.first()
			.click();

		// Same-note anchors do not switch tabs
		const afterTab = await page.locator('[role="tab"][aria-selected="true"]').textContent();
		expect(afterTab).toBe(beforeTab);
		await expect(page.locator('.cm-activeLine')).toContainText('Local Heading');
	});
});
