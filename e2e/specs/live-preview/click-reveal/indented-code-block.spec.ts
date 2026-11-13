import type { Page } from '@playwright/test';
import { test, expect } from '../../../fixtures/live-preview';
import { activeLineText, clickAtOffset, clickLeftOfWidget, isRevealed, openAndSettle } from '../../../fixtures/click-reveal';

/**
 * Click behavior around the indented (4-space) code block widget. The first
 * line of the block is replaced by a block-level widget; the rest of its
 * lines are hidden. Blank bands the widget's line box adds above and below
 * the box must not reveal the source. Clicks on the rendered body must.
 */
const CONTENT = 'Above line.\n\n    indented code\n\nAfter line.\n\nEnd line.\n';

/** Raw markdown of the block: the leading spaces make it unique to the source. */
const RAW_SNIPPET = '    indented';
const CODE_LINE = '    indented code';
const BLANK_ABOVE = '';
const BLANK_BELOW = '';

const block = (page: Page) => page.locator('.cm-lp-codeblock').first();

async function expectRendered(page: Page): Promise<void> {
	await expect(page.locator('.cm-lp-codeblock')).toHaveCount(1);
	await expect.poll(() => isRevealed(page, RAW_SNIPPET)).toBe(false);
}

test.describe('Live Preview - click reveal: indented code block', () => {
	test('blank band above the block stays rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);

		const hit = await clickAtOffset(page, block(page), { from: 'top', dy: -12 });
		expect(hit.inOwnLine, "the press must land in the widget's own line").toBe(true);

		expect(hit.hit).not.toMatch(/BUTTON/);
		await expectRendered(page);
		await expect.poll(() => activeLineText(page)).toBe(BLANK_ABOVE);
	});

	test('blank band below the block stays rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);

		const hit = await clickAtOffset(page, block(page), { from: 'bottom', dy: 12 });
		expect(hit.inOwnLine, "the press must land in the widget's own line").toBe(true);

		expect(hit.hit).not.toMatch(/BUTTON/);
		await expectRendered(page);
		await expect.poll(() => activeLineText(page)).toBe(BLANK_BELOW);
	});

	test('rendered body reveals the source', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);

		await clickAtOffset(page, page.locator('.cm-lp-codeblock-pre').first(), { from: 'left', dx: 40 });

		await expect(page.locator('.cm-lp-codeblock')).toHaveCount(0);
		await expect.poll(() => isRevealed(page, RAW_SNIPPET)).toBe(true);
		await expect.poll(() => activeLineText(page)).toBe(CODE_LINE);
	});

	test('line after the block takes the cursor and the block stays rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);

		await page.locator('.cm-line').filter({ hasText: 'After line.' }).first().click();

		await expect.poll(() => activeLineText(page)).toBe('After line.');
		await expectRendered(page);
	});

	test('blank space left of the block, at its vertical center, keeps it rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		await clickLeftOfWidget(page, block(page));

		await expectRendered(page);
		await expect.poll(() => activeLineText(page)).toBe('End line.');
	});
});
