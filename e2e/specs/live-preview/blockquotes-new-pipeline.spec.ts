import { test, expect } from '../../fixtures/live-preview';
import { openMarkdownFile, clickOnLine } from '../../fixtures/live-preview';

const CONTENT = `> level one

> > level two

> > > level three

> > > > deep collapses to depth 3

> [!note] callout — handled by calloutField, not the plain blockquote

`;

test.describe('Live Preview - Blockquotes (new pipeline)', () => {
	test.beforeEach(async ({ lpPage: page }) => {
		await openMarkdownFile(page, 'blockquotes.md', CONTENT, {
			experimental: { newLivePreview: true },
		});
	});

	test('depth-1 blockquote emits cm-lp-blockquote', async ({ lpPage: page }) => {
		const line = page.locator('.cm-line').filter({ hasText: 'level one' });
		await expect(line).toHaveClass(/cm-lp-blockquote/);
	});

	test('depth-2 blockquote emits cm-lp-blockquote-2', async ({ lpPage: page }) => {
		const line = page.locator('.cm-line').filter({ hasText: 'level two' });
		await expect(line).toHaveClass(/cm-lp-blockquote-2/);
	});

	test('depth-3 blockquote emits cm-lp-blockquote-3', async ({ lpPage: page }) => {
		const line = page.locator('.cm-line').filter({ hasText: 'level three' });
		await expect(line).toHaveClass(/cm-lp-blockquote-3/);
	});

	test('depth-4+ collapses to cm-lp-blockquote-3', async ({ lpPage: page }) => {
		const line = page.locator('.cm-line').filter({ hasText: 'deep collapses' });
		await expect(line).toHaveClass(/cm-lp-blockquote-3/);
	});

	test('callout line is NOT decorated as a plain blockquote', async ({ lpPage: page }) => {
		// Callout is handled by calloutField — the line should NOT have cm-lp-blockquote
		const line = page.locator('.cm-line').filter({ hasText: 'callout — handled' });
		await expect(line).not.toHaveClass(/cm-lp-blockquote(?!\w)/);
	});

	test('> mark hidden when cursor is away', async ({ lpPage: page }) => {
		// Cursor on a non-blockquote line
		await clickOnLine(page, 'callout — handled');
		const line = page.locator('.cm-line').filter({ hasText: 'level one' });
		const marks = line.locator('.cm-formatting-block');
		const count = await marks.count();
		if (count > 0) {
			await expect(marks.first()).not.toHaveClass(/cm-formatting-block-visible/);
		}
	});

	test('> mark revealed when cursor is on the blockquote line', async ({ lpPage: page }) => {
		await clickOnLine(page, 'level one');
		const line = page.locator('.cm-line').filter({ hasText: 'level one' });
		const marks = line.locator('.cm-formatting-block');
		const count = await marks.count();
		expect(count).toBeGreaterThan(0);
		await expect(marks.first()).toHaveClass(/cm-formatting-block-visible/);
	});
});
