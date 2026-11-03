// Click behavior in the gap between two adjacent block widgets (no blank line between them).
//
// With no blank line between the blocks, the gap is made only of the two
// blocks' own line boxes (the band below the upper widget and the band above
// the lower one), so any document position a click there maps to belongs to
// one of the blocks and reveals it. What must hold is that only that block
// reveals and every other block stays rendered.
import type { Locator, Page } from '@playwright/test';
import { test, expect, clickOnLine } from '../../../fixtures/live-preview';
import { openAndSettle, clickAtOffset, activeLineText, isRevealed } from '../../../fixtures/click-reveal';

const SAMPLE = 'Above line.\n\n```js\na\n```\n```py\nb\n```\n$$\nx^2\n$$\n\nAfter line.\n\nEnd line.\n';
const PARKED_LINE = 'Above line.';
const CODE = '.cm-lp-codeblock';
const MATH = '.cm-lp-math-block';

/**
 * Vertical offset from `upper`'s bottom edge to the point three quarters of
 * the way down the gap to `lower`'s top edge: inside the band above `lower`,
 * clear of the line boundary at the midpoint, where CodeMirror's height map
 * and the DOM hit test disagree by a pixel on which line was hit.
 */
async function lowerBandOffset(upper: Locator, lower: Locator): Promise<number> {
	const u = await upper.boundingBox();
	const l = await lower.boundingBox();
	if (!u || !l) throw new Error('lowerBandOffset: block has no bounding box');
	const gap = l.y - (u.y + u.height);
	expect(gap).toBeGreaterThan(8);
	return Math.round((gap * 3) / 4);
}

/** Parks the cursor on a plain line away from the blocks, so a click that does nothing is visible as an unchanged cursor. */
async function parkCursor(page: Page): Promise<void> {
	await clickOnLine(page, PARKED_LINE);
	await expect.poll(() => activeLineText(page)).toBe(PARKED_LINE);
}

test.describe('Live Preview - click reveal - adjacent block widgets', () => {
	test('gap between the js and py code blocks reveals only the py block', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		await parkCursor(page);
		const upper = page.locator(CODE).nth(0);
		const lower = page.locator(CODE).nth(1);

		const click = await clickAtOffset(page, upper, { from: 'bottom', dy: await lowerBandOffset(upper, lower) });
		expect(click.hit).toBe('DIV.cm-line');

		await expect.poll(() => activeLineText(page)).toBe('```py');
		await expect(page.locator(CODE)).toHaveCount(1);
		await expect(page.locator(MATH)).toHaveCount(1);
		expect(await isRevealed(page, '```js')).toBe(false);
		expect(await isRevealed(page, '$$')).toBe(false);
	});

	test('gap between the py code block and the math block reveals only the math block', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		await parkCursor(page);
		const upper = page.locator(CODE).nth(1);
		const lower = page.locator(MATH).nth(0);

		const click = await clickAtOffset(page, upper, { from: 'bottom', dy: await lowerBandOffset(upper, lower) });
		expect(click.hit).toBe('DIV.cm-line');

		await expect.poll(() => activeLineText(page)).toBe('$$');
		await expect(page.locator(MATH)).toHaveCount(0);
		await expect(page.locator(CODE)).toHaveCount(2);
		expect(await isRevealed(page, '```js')).toBe(false);
		expect(await isRevealed(page, '```py')).toBe(false);
	});
});
