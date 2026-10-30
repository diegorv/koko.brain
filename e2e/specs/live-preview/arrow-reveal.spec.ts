import { test, expect, type Page, type Locator } from '../../fixtures/live-preview';
import { openMarkdownFile, clickOnLine } from '../../fixtures/live-preview';

/**
 * Keyboard reveal: moving the caret into a block with ArrowUp / ArrowDown
 * shows its source, and moving it out renders the block again. The caret
 * enters from the line above or below, never by a click, so this covers the
 * selection-only rebuild path that click-based specs do not.
 */
interface BlockCase {
	name: string;
	/** Block markdown, without surrounding blank lines */
	source: string;
	/** Element that only exists while the block is rendered */
	rendered: (page: Page) => Locator;
	/** Text of the block's first source line, visible only while revealed */
	rawFirstLine: string;
}

const CASES: BlockCase[] = [
	{
		name: 'table',
		source: '| A | B |\n|---|---|\n| 1 | 2 |',
		rendered: (page) => page.locator('table.cm-lp-table'),
		rawFirstLine: '| A | B |',
	},
	{
		name: 'fenced code block',
		source: '```js\nconst x = 1;\n```',
		rendered: (page) => page.locator('.cm-lp-codeblock'),
		rawFirstLine: '```js',
	},
	{
		name: 'callout',
		source: '> [!note] Title\n> body',
		// The fold chevron is drawn only while the callout is not revealed.
		rendered: (page) => page.locator('.cm-lp-callout-fold'),
		rawFirstLine: '[!note]',
	},
];

async function press(page: Page, key: 'ArrowUp' | 'ArrowDown', times: number): Promise<void> {
	for (let i = 0; i < times; i++) {
		await page.keyboard.press(key);
		await page.waitForTimeout(80);
	}
}

/** Asserts the block is rendered: its widget is present and its first source line is not. */
async function expectRendered(page: Page, c: BlockCase): Promise<void> {
	await expect(c.rendered(page)).toHaveCount(1);
	await expect(page.locator('.cm-line').filter({ hasText: c.rawFirstLine })).toHaveCount(0);
}

/** Asserts the block shows its source: the widget is gone and the first source line is a visible line. */
async function expectRevealed(page: Page, c: BlockCase): Promise<void> {
	await expect(c.rendered(page)).toHaveCount(0);
	await expect(page.locator('.cm-line').filter({ hasText: c.rawFirstLine })).toBeVisible();
}

test.describe('Live Preview - arrow keys reveal blocks', () => {
	for (const c of CASES) {
		const lineCount = c.source.split('\n').length;
		const content = `Above the block\n\n${c.source}\n\nBelow the block\n`;
		const fileName = `arrow-reveal-${c.name.replace(/\s+/g, '-')}.md`;

		test(`${c.name}: ArrowDown enters and reveals, ArrowDown out renders it again`, async ({ lpPage: page }) => {
			await openMarkdownFile(page, fileName, content);
			await clickOnLine(page, 'Above the block');
			await expectRendered(page, c);

			// Blank line, then the block's first line.
			await press(page, 'ArrowDown', 2);
			await expectRevealed(page, c);

			// Past every block line, onto the blank line or below it.
			await press(page, 'ArrowDown', lineCount + 1);
			await expectRendered(page, c);
		});

		test(`${c.name}: ArrowUp enters and reveals, ArrowUp out renders it again`, async ({ lpPage: page }) => {
			await openMarkdownFile(page, fileName, content);
			await clickOnLine(page, 'Below the block');
			await expectRendered(page, c);

			await press(page, 'ArrowUp', 2);
			await expectRevealed(page, c);

			await press(page, 'ArrowUp', lineCount + 1);
			await expectRendered(page, c);
		});
	}
});
