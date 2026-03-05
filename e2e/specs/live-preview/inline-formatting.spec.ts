import { test, expect } from '../../fixtures/live-preview';
import { openMarkdownFile, clickOnLine, clickAway } from '../../fixtures/live-preview';

const CONTENT = `# Heading

This has **bold text** here.

This has *italic text* here.

This has ~~strikethrough text~~ here.

This has \`inline code\` here.

This has ==highlighted text== here.

**bold** and *italic* and ~~strike~~ on same line.

***bold italic*** combined.

`;

test.describe('Live Preview - Inline Formatting', () => {
	test.beforeEach(async ({ lpPage: page }) => {
		await openMarkdownFile(page, 'test.md', CONTENT);
	});

	test('bold text renders with cm-lp-bold class', async ({ lpPage: page }) => {
		await expect(page.locator('.cm-lp-bold').first()).toContainText('bold');
	});

	test('italic text renders with cm-lp-italic class', async ({ lpPage: page }) => {
		await expect(page.locator('.cm-lp-italic').first()).toContainText('italic');
	});

	test('strikethrough text renders with cm-lp-strikethrough class', async ({ lpPage: page }) => {
		await expect(page.locator('.cm-lp-strikethrough').first()).toContainText('strikethrough');
	});

	test('inline code renders with cm-lp-code class', async ({ lpPage: page }) => {
		await expect(page.locator('.cm-lp-code').first()).toContainText('inline code');
	});

	test('highlight text renders with cm-lp-highlight class', async ({ lpPage: page }) => {
		await expect(page.locator('.cm-lp-highlight').first()).toContainText('highlighted text');
	});

	test('multiple inline formats on same line', async ({ lpPage: page }) => {
		const line = page.locator('.cm-line').filter({ hasText: 'on same line' });
		await expect(line.locator('.cm-lp-bold')).toContainText('bold');
		await expect(line.locator('.cm-lp-italic')).toContainText('italic');
		await expect(line.locator('.cm-lp-strikethrough')).toContainText('strike');
	});

	test('bold+italic combined renders both classes', async ({ lpPage: page }) => {
		const el = page.locator('.cm-line').filter({ hasText: 'bold italic' });
		await expect(el.locator('.cm-lp-bold')).toBeVisible();
		await expect(el.locator('.cm-lp-italic')).toBeVisible();
	});

	test('inline marks hidden when cursor is away', async ({ lpPage: page }) => {
		// Click on the heading to move cursor away from bold line
		await clickOnLine(page, 'Heading');

		// The bold line's formatting marks should not have -visible class
		const boldLine = page.locator('.cm-line').filter({ hasText: 'bold text' });
		const marks = boldLine.locator('.cm-formatting-inline');
		const count = await marks.count();
		if (count > 0) {
			await expect(marks.first()).not.toHaveClass(/cm-formatting-inline-visible/);
		}
	});
});
