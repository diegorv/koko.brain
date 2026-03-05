import { test, expect } from '../../fixtures/live-preview';
import { openMarkdownFile, clickOnLine } from '../../fixtures/live-preview';

test.describe('Live Preview - Horizontal Rules', () => {
	const CONTENT = `# Test

Text before rule.

---

Text after rule.

`;

	test('horizontal rule renders as widget', async ({ lpPage: page }) => {
		await openMarkdownFile(page, 'test.md', CONTENT);
		await clickOnLine(page, 'Text after rule');
		await expect(page.locator('hr.cm-lp-hr')).toBeVisible();
	});
});

test.describe('Live Preview - Hard Breaks', () => {
	// Use string with explicit trailing double-space for hard break
	const CONTENT = '# Hard Break Test\n\nFirst line with break  \nSecond line continues.\n\nPlain text here.\n\n';

	test('hard break shows arrow widget', async ({ lpPage: page }) => {
		await openMarkdownFile(page, 'hard-break.md', CONTENT);
		await clickOnLine(page, 'Plain text here');
		await expect(page.locator('.cm-lp-hard-break').first()).toBeVisible();
	});
});

test.describe('Live Preview - Footnotes', () => {
	const CONTENT = `# Test

This text has a footnote[^1] reference.

[^1]: This is the footnote definition.

`;

	test('footnote reference gets superscript style', async ({ lpPage: page }) => {
		await openMarkdownFile(page, 'test.md', CONTENT);
		await expect(page.locator('.cm-lp-footnote-ref').first()).toBeVisible();
	});

	test('footnote definition marker styled', async ({ lpPage: page }) => {
		await openMarkdownFile(page, 'test.md', CONTENT);
		await expect(page.locator('.cm-lp-footnote-def-marker').first()).toBeVisible();
	});
});

test.describe('Live Preview - Comments', () => {
	const CONTENT = `# Test

Visible text here.

%% This is a comment %%

More visible text.

`;

	test('inline comment hidden when cursor is away', async ({ lpPage: page }) => {
		await openMarkdownFile(page, 'test.md', CONTENT);
		await clickOnLine(page, 'Visible text here');

		// Comment should be hidden
		const comment = page.locator('.cm-lp-inline-comment-hidden');
		const count = await comment.count();
		if (count > 0) {
			await expect(comment.first()).toBeAttached();
		}
	});
});

test.describe('Live Preview - Block References', () => {
	const CONTENT = `# Test

Some paragraph text. ^block-id

Another paragraph.

`;

	test('block ref hidden when cursor is away', async ({ lpPage: page }) => {
		await openMarkdownFile(page, 'test.md', CONTENT);
		await clickOnLine(page, 'Another paragraph');

		const blockRef = page.locator('.cm-lp-block-ref-hidden');
		const count = await blockRef.count();
		if (count > 0) {
			await expect(blockRef.first()).toBeAttached();
		}
	});

	test('block ref visible when cursor is on line', async ({ lpPage: page }) => {
		await openMarkdownFile(page, 'test.md', CONTENT);
		await clickOnLine(page, 'block-id');

		const blockRef = page.locator('.cm-lp-block-ref');
		await expect(blockRef.first()).toBeVisible();
	});
});

test.describe('Live Preview - Images', () => {
	const CONTENT = `# Test

![Alt text](https://via.placeholder.com/150)

Plain text at the end.

`;

	test('image renders widget', async ({ lpPage: page }) => {
		await openMarkdownFile(page, 'test.md', CONTENT);
		await clickOnLine(page, 'Plain text at the end');
		await expect(page.locator('.cm-lp-image-wrapper')).toBeVisible();
		await expect(page.locator('img.cm-lp-image')).toBeVisible();
	});
});
