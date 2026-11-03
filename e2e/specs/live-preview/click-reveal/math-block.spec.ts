// Click behavior around a rendered block math widget (`$$...$$`, MathWidget displayMode).
import { test, expect } from '../../../fixtures/live-preview';
import {
	openAndSettle,
	clickAtOffset,
	activeLineText,
	isRevealed,
	lineBandProbe,
	END_LINE,
} from '../../../fixtures/click-reveal';

const SAMPLE = 'Above line.\n\n$$\nx^2\n$$\n\nAfter line.\n\nEnd line.\n';
const BLOCK = '.cm-lp-math-block';

test.describe('Live Preview - click reveal - block math', () => {
	test('blank band above the block stays rendered', async ({ lpPage: page }) => {
		// Known bug: the cm-widgetBuffer line box above the display:block widget maps the click into the replaced "$$" line and reveals the source.
		test.fail();
		await openAndSettle(page, SAMPLE);
		const block = page.locator(BLOCK).first();
		const band = await lineBandProbe(block);
		expect(band.above).toBeGreaterThan(2);

		const click = await clickAtOffset(page, block, { from: 'top', dy: -12 });
		expect(click.hit).toBe('DIV.cm-line');

		await expect(page.locator(BLOCK)).toHaveCount(1);
		expect(await isRevealed(page, '$$')).toBe(false);
		expect(await activeLineText(page)).toBe(END_LINE);
	});

	test('blank band below the block stays rendered', async ({ lpPage: page }) => {
		// Known bug: the cm-widgetBuffer line box below the display:block widget maps the click into the replaced "$$" line and reveals the source.
		test.fail();
		await openAndSettle(page, SAMPLE);
		const block = page.locator(BLOCK).first();
		const band = await lineBandProbe(block);
		expect(band.below).toBeGreaterThan(2);

		const click = await clickAtOffset(page, block, { from: 'bottom', dy: 12 });
		expect(click.hit).toBe('DIV.cm-line');

		await expect(page.locator(BLOCK)).toHaveCount(1);
		expect(await isRevealed(page, '$$')).toBe(false);
		expect(await activeLineText(page)).toBe(END_LINE);
	});

	test('rendered KaTeX glyphs stay rendered and the cursor does not move', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const block = page.locator(BLOCK).first();

		const click = await clickAtOffset(page, block, { from: 'center' });
		expect(click.hit, 'centre click must land on a KaTeX glyph span').toMatch(/^SPAN\./);

		await expect(page.locator(BLOCK)).toHaveCount(1);
		expect(await isRevealed(page, '$$')).toBe(false);
		expect(await activeLineText(page)).toBe(END_LINE);
	});

	test('blank left part of the full-width block stays rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const block = page.locator(BLOCK).first();

		const click = await clickAtOffset(page, block, { from: 'left', dx: 10 });
		expect(click.hit).toBe('DIV.cm-lp-math-block');

		await expect(page.locator(BLOCK)).toHaveCount(1);
		expect(await isRevealed(page, '$$')).toBe(false);
		expect(await activeLineText(page)).toBe(END_LINE);
	});

	test('20px right of the line box stays rendered', async ({ lpPage: page }) => {
		// Known bug: the click reveals the source and parks the cursor on the "$$" line (owner decision: blank space stays rendered).
		test.fail();
		await openAndSettle(page, SAMPLE);
		const block = page.locator(BLOCK).first();

		await clickAtOffset(page, block, { from: 'right', dx: 20 });

		await expect(page.locator(BLOCK)).toHaveCount(1);
		expect(await isRevealed(page, '$$')).toBe(false);
		expect(await activeLineText(page)).toBe(END_LINE);
	});

	test('clicking the line after the block moves the cursor there and keeps the block rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);

		await page.locator('.cm-line').filter({ hasText: 'After line.' }).first().click();
		await page.waitForTimeout(150);

		await expect(page.locator(BLOCK)).toHaveCount(1);
		expect(await isRevealed(page, '$$')).toBe(false);
		expect(await activeLineText(page)).toBe('After line.');
	});
});
