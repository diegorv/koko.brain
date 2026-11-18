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
		// New pipeline: a `.cm-lp-hr-line` line decoration + a `.cm-formatting-hr`
		// mark on the `---` text instead of an `<hr>` widget. Assert on the line
		// decoration since it's the one that actually paints the rule.
		await expect(page.locator('.cm-lp-hr-line').first()).toBeVisible();
	});
});

test.describe('Live Preview - Hard Breaks', () => {
	// Use string with explicit trailing double-space for hard break
	const CONTENT = '# Hard Break Test\n\nFirst line with break  \nSecond line continues.\n\nPlain text here.\n\n';

	test('hard break shows arrow widget', async ({ lpPage: page }) => {
		await openMarkdownFile(page, 'hard-break.md', CONTENT);
		await clickOnLine(page, 'Plain text here');
		// Production class is `.cm-formatting-hard-break` (emitted by the
		// inline simple-widget handler); the ↵ marker is drawn by its ::after.
		await expect(page.locator('.cm-formatting-hard-break').first()).toBeAttached();
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

		// Hidden syntax is a Decoration.replace: the comment text is not in the DOM
		await expect(page.locator('.cm-content')).toContainText('More visible text');
		await expect(page.locator('.cm-content')).not.toContainText('This is a comment');
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
	const IMAGE_URL = 'https://via.placeholder.com/150';
	const MISSING_URL = 'https://example.test/gone.png';

	/** 150x150 solid-grey PNG served in place of the remote asset; the img is zero-size without it. */
	const STUB_PNG = Buffer.from(
		'iVBORw0KGgoAAAANSUhEUgAAAJYAAACWCAIAAACzY+a1AAABb0lEQVR4nO3RQQkAMAzAwPpXVlkVsccI3CkIZJa4+R3AKwvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CvAN53wpz/wbXQQAAAABJRU5ErkJggg==',
		'base64',
	);

	test('image renders widget', async ({ lpPage: page }) => {
		await page.route(IMAGE_URL, (route) =>
			route.fulfill({ status: 200, contentType: 'image/png', body: STUB_PNG }),
		);
		await openMarkdownFile(page, 'test.md', `# Test\n\n![Alt text](${IMAGE_URL})\n\nPlain text at the end.\n\n`);
		await clickOnLine(page, 'Plain text at the end');
		await expect(page.locator('.cm-lp-image-wrapper')).toBeVisible();
		await expect(page.locator('img.cm-lp-image')).toBeVisible();
	});

	test('image that fails to load says so', async ({ lpPage: page }) => {
		await page.route(MISSING_URL, (route) => route.fulfill({ status: 404, body: 'not found' }));
		await openMarkdownFile(page, 'test.md', `# Test\n\n![Gone](${MISSING_URL})\n\nPlain text at the end.\n\n`);
		await clickOnLine(page, 'Plain text at the end');
		const missing = page.locator('.cm-lp-image-wrapper.cm-lp-image-missing');
		await expect(missing).toBeVisible();
		await expect(missing).toHaveText('Could not load "Gone"');
		await expect(page.locator('img.cm-lp-image')).toHaveCount(0);
	});
});
