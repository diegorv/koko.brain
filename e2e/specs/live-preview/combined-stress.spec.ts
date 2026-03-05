import { test, expect } from '../../fixtures/live-preview';
import { openMarkdownFile, clickOnLine, clickAway } from '../../fixtures/live-preview';

const CONTENT = `---
title: Stress Test
tags:
  - test
---

# Combined Features

**Bold** and *italic* and ~~strike~~ and \`code\` and ==highlight== on one line.

## Lists with Formatting

- **Bold item** with *italic*
- ~~Strikethrough item~~
- [ ] Task with **bold** text
- [x] Done task with \`code\`

> Blockquote with **bold** and *italic*

> [!note] Callout with formatting
> This callout has **bold** and *italic* and \`code\`.

| Header 1 | Header 2 |
|----------|----------|
| **Bold** | *Italic* |
| Cell     | Cell     |

\`\`\`javascript
const x = 42;
\`\`\`

---

[[wikilink]] and [markdown link](https://example.com) together.

$E = mc^2$ inline math and text.

Plain text at the very end.

`;

test.describe('Live Preview - Combined Stress', () => {
	test.beforeEach(async ({ lpPage: page }) => {
		await openMarkdownFile(page, 'test.md', CONTENT);
	});

	test('frontmatter widget renders at top', async ({ lpPage: page }) => {
		await expect(page.locator('.cm-lp-frontmatter')).toBeVisible();
	});

	test('all inline formats render on same line', async ({ lpPage: page }) => {
		const line = page.locator('.cm-line').filter({ hasText: 'on one line' });
		await expect(line.locator('.cm-lp-bold')).toContainText('Bold');
		await expect(line.locator('.cm-lp-italic')).toContainText('italic');
		await expect(line.locator('.cm-lp-strikethrough')).toContainText('strike');
		await expect(line.locator('.cm-lp-code')).toContainText('code');
		await expect(line.locator('.cm-lp-highlight')).toContainText('highlight');
	});

	test('lists with inline formatting', async ({ lpPage: page }) => {
		const boldItem = page.locator('.cm-line').filter({ hasText: 'Bold item' });
		await expect(boldItem.locator('.cm-lp-bold')).toBeVisible();
	});

	test('task checkboxes present', async ({ lpPage: page }) => {
		const checkboxes = page.locator('input.cm-lp-task-checkbox');
		const count = await checkboxes.count();
		expect(count).toBeGreaterThanOrEqual(2);
	});

	test('blockquote renders', async ({ lpPage: page }) => {
		await expect(page.locator('.cm-lp-blockquote').first()).toBeVisible();
	});

	test('callout renders', async ({ lpPage: page }) => {
		await expect(page.locator('.cm-lp-callout').first()).toBeVisible();
	});

	test('table widget is in DOM', async ({ lpPage: page }) => {
		// Use toBeAttached since widget may be out of viewport
		await expect(page.locator('table.cm-lp-table')).toBeAttached();
	});

	test('code block widget is in DOM', async ({ lpPage: page }) => {
		await expect(page.locator('.cm-lp-codeblock')).toBeAttached();
	});

	test('horizontal rule widget is in DOM', async ({ lpPage: page }) => {
		await expect(page.locator('hr.cm-lp-hr')).toBeAttached();
	});

	test('links render together', async ({ lpPage: page }) => {
		const line = page.locator('.cm-line').filter({ hasText: 'together' });
		await expect(line.locator('.cm-lp-wikilink')).toBeVisible();
		await expect(line.locator('.cm-lp-link')).toBeVisible();
	});

	test('headings get correct classes', async ({ lpPage: page }) => {
		await expect(page.locator('.cm-lp-h1')).toBeVisible();
		await expect(page.locator('.cm-lp-h2')).toBeVisible();
	});
});
