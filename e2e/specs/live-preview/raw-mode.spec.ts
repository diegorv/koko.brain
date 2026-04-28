import { test, expect } from '../../fixtures/live-preview';
import { openMarkdownFile, clickOnLine } from '../../fixtures/live-preview';

const CONTENT = `# Heading One

This has **bold text** here.

This has *italic text* here.

This has [link](https://example.com) here.

`;

/**
 * Cmd+K toggles `editor.rawMode`, which short-circuits `shouldShowSource`
 * to always return true. Every cursor-aware decoration then keeps its
 * markdown source visible regardless of where the caret sits.
 */
test.describe('Live Preview - Raw Mode (Cmd+K)', () => {
	test.beforeEach(async ({ lpPage: page }) => {
		await openMarkdownFile(page, 'raw-mode-test.md', CONTENT);
	});

	test('formatting marks hidden by default when cursor is away', async ({ lpPage: page }) => {
		await clickOnLine(page, 'Heading One');

		// On the bold line, the inline formatting marks should be hidden (no -visible)
		const boldLine = page.locator('.cm-line').filter({ hasText: 'bold text' });
		const marks = boldLine.locator('.cm-formatting-inline');
		const count = await marks.count();
		if (count > 0) {
			await expect(marks.first()).not.toHaveClass(/cm-formatting-inline-visible/);
		}
	});

	test('Cmd+K reveals every formatting mark even with cursor away', async ({ lpPage: page }) => {
		await clickOnLine(page, 'Heading One');

		// Engage raw mode
		await page.keyboard.press('Meta+K');
		await page.waitForTimeout(150);

		// Bold line: every cm-formatting-inline should now have the -visible modifier
		const boldLine = page.locator('.cm-line').filter({ hasText: 'bold text' });
		const boldMarks = boldLine.locator('.cm-formatting-inline');
		const boldCount = await boldMarks.count();
		expect(boldCount).toBeGreaterThan(0);
		for (let i = 0; i < boldCount; i++) {
			await expect(boldMarks.nth(i)).toHaveClass(/cm-formatting-inline-visible/);
		}

		// Italic line: same expectation
		const italicLine = page.locator('.cm-line').filter({ hasText: 'italic text' });
		const italicMarks = italicLine.locator('.cm-formatting-inline');
		const italicCount = await italicMarks.count();
		if (italicCount > 0) {
			await expect(italicMarks.first()).toHaveClass(/cm-formatting-inline-visible/);
		}

		// Heading line: HeaderMark uses the cm-formatting-block class — also revealed
		const headingLine = page.locator('.cm-line').filter({ hasText: 'Heading One' });
		const blockMarks = headingLine.locator('.cm-formatting-block');
		const blockCount = await blockMarks.count();
		if (blockCount > 0) {
			await expect(blockMarks.first()).toHaveClass(/cm-formatting-block-visible/);
		}
	});

	test('Cmd+K twice returns to default cursor-aware behaviour', async ({ lpPage: page }) => {
		await clickOnLine(page, 'Heading One');

		// Toggle on, then off
		await page.keyboard.press('Meta+K');
		await page.waitForTimeout(150);
		await page.keyboard.press('Meta+K');
		await page.waitForTimeout(150);

		// Bold line: marks should once again be hidden (no -visible)
		const boldLine = page.locator('.cm-line').filter({ hasText: 'bold text' });
		const marks = boldLine.locator('.cm-formatting-inline');
		const count = await marks.count();
		if (count > 0) {
			await expect(marks.first()).not.toHaveClass(/cm-formatting-inline-visible/);
		}
	});
});
