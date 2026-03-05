import { test, expect } from '../../fixtures/live-preview';
import { openMarkdownFile, clickOnLine, clickAway } from '../../fixtures/live-preview';

const CONTENT = `# Blockquotes and Callouts

> Simple blockquote

>> Nested blockquote

>>> Triple nested

> [!note] Note Title
> This is a note callout.

> [!warning] Warning Title
> This is a warning callout.

> [!tip]+ Collapsible Tip
> This content is collapsible.

Plain text at the end.

`;

test.describe('Live Preview - Blockquotes', () => {
	test.beforeEach(async ({ lpPage: page }) => {
		await openMarkdownFile(page, 'test.md', CONTENT);
	});

	test('blockquote gets cm-lp-blockquote class', async ({ lpPage: page }) => {
		await expect(page.locator('.cm-lp-blockquote').first()).toBeVisible();
	});

	test('nested blockquote gets cm-lp-blockquote-2 class', async ({ lpPage: page }) => {
		await expect(page.locator('.cm-lp-blockquote-2')).toBeVisible();
	});

	test('triple nested blockquote gets cm-lp-blockquote-3 class', async ({ lpPage: page }) => {
		await expect(page.locator('.cm-lp-blockquote-3')).toBeVisible();
	});

	test('blockquote marks hidden when cursor away', async ({ lpPage: page }) => {
		await clickOnLine(page, 'Plain text at the end');

		const bqLine = page.locator('.cm-lp-blockquote').first();
		const marks = bqLine.locator('.cm-formatting-block');
		const count = await marks.count();
		if (count > 0) {
			await expect(marks.first()).not.toHaveClass(/cm-formatting-block-visible/);
		}
	});
});

test.describe('Live Preview - Callouts', () => {
	test.beforeEach(async ({ lpPage: page }) => {
		await openMarkdownFile(page, 'test.md', CONTENT);
	});

	test('callout renders with cm-lp-callout class', async ({ lpPage: page }) => {
		await expect(page.locator('.cm-lp-callout').first()).toBeVisible();
	});

	test('collapsible callout shows fold chevron', async ({ lpPage: page }) => {
		await expect(page.locator('.cm-lp-callout-fold').first()).toBeVisible();
	});

	test('multiple callout types render', async ({ lpPage: page }) => {
		const callouts = page.locator('.cm-lp-callout');
		const count = await callouts.count();
		expect(count).toBeGreaterThanOrEqual(2);
	});
});
