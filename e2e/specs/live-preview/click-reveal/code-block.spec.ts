import { test, expect } from '../../../fixtures/live-preview';
import {
	END_LINE,
	activeLineText,
	clickAtOffset,
	clickLeftOfWidget,
	isRevealed,
	openAndSettle,
} from '../../../fixtures/click-reveal';

const CONTENT = 'Above line.\n\n```js\nconst x = 1;\n```\n\nAfter line.\n\nEnd line.\n';
const RAW_FENCE = '```js';
const CODE_TEXT = 'const x = 1;';

test.describe('Live Preview - click reveal: fenced code block', () => {
	test('blank band above the block keeps it rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		const block = page.locator('.cm-lp-codeblock').first();

		const click = await clickAtOffset(page, block, { from: 'top', dy: -12 });
		expect(click.inOwnLine, "the press must land in the widget's own line").toBe(true);
		expect(click.hit).toBe('DIV.cm-line');

		await expect(page.locator('.cm-lp-codeblock')).toHaveCount(1);
		expect(await isRevealed(page, RAW_FENCE)).toBe(false);
		// Any line of the block holding the cursor reveals it, so a rendered block means the cursor is on the blank line next to it.
		await expect.poll(() => activeLineText(page)).toBe('');
	});

	test('blank band below the block keeps it rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		const block = page.locator('.cm-lp-codeblock').first();

		const click = await clickAtOffset(page, block, { from: 'bottom', dy: 12 });
		expect(click.inOwnLine, "the press must land in the widget's own line").toBe(true);
		expect(click.hit).toBe('DIV.cm-line');

		await expect(page.locator('.cm-lp-codeblock')).toHaveCount(1);
		expect(await isRevealed(page, RAW_FENCE)).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe('');
	});

	test('margin right of the line box keeps it rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		const block = page.locator('.cm-lp-codeblock').first();

		await clickAtOffset(page, block, { from: 'right', dx: 20 });

		await expect(page.locator('.cm-lp-codeblock')).toHaveCount(1);
		expect(await isRevealed(page, RAW_FENCE)).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe('End line.');
	});

	test('rendered body reveals the source', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		const body = page.locator('.cm-lp-codeblock-pre').first();

		await clickAtOffset(page, body, { from: 'left', dx: 40 });

		await expect(page.locator('.cm-lp-codeblock')).toHaveCount(0);
		await expect.poll(() => isRevealed(page, RAW_FENCE)).toBe(true);
		await expect.poll(() => activeLineText(page)).toBe(RAW_FENCE);
	});

	// Owner decision: the header is widget chrome, so a blank header click counts as a body click.
	test('blank header area reveals the source', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		const header = page.locator('.cm-lp-codeblock-header').first();

		await clickAtOffset(page, header, { from: 'left', dx: 200 });

		await expect(page.locator('.cm-lp-codeblock')).toHaveCount(0);
		await expect.poll(() => isRevealed(page, RAW_FENCE)).toBe(true);
		await expect.poll(() => activeLineText(page)).toBe(RAW_FENCE);
	});

	test('line after the block takes the cursor and the block stays rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);

		await page.locator('.cm-line').filter({ hasText: 'After line.' }).first().click();

		await expect.poll(() => activeLineText(page)).toBe('After line.');
		await expect(page.locator('.cm-lp-codeblock')).toHaveCount(1);
		expect(await isRevealed(page, RAW_FENCE)).toBe(false);
	});

	test('clicking away after a reveal renders the block again', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		await clickAtOffset(page, page.locator('.cm-lp-codeblock-pre').first(), { from: 'left', dx: 40 });
		await expect.poll(() => isRevealed(page, RAW_FENCE)).toBe(true);

		await page.locator('.cm-line').filter({ hasText: END_LINE }).first().click();

		await expect.poll(() => activeLineText(page)).toBe(END_LINE);
		await expect(page.locator('.cm-lp-codeblock')).toHaveCount(1);
		expect(await isRevealed(page, RAW_FENCE)).toBe(false);
	});

	test('blank space left of the block, at its vertical center, keeps it rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		await clickLeftOfWidget(page, page.locator('.cm-lp-codeblock').first());

		await expect(page.locator('.cm-lp-codeblock')).toHaveCount(1);
		expect(await isRevealed(page, RAW_FENCE)).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe('End line.');
	});
});
