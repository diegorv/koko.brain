// Click behavior around a rendered block math widget (`$$...$$`, MathWidget displayMode).
import { test, expect } from '../../../fixtures/live-preview';
import {
	openAndSettle,
	clickAtOffset,
	clickLeftOfWidget,
	activeLineText,
	isRevealed,
	lineBandProbe,
	END_LINE,
} from '../../../fixtures/click-reveal';

const SAMPLE = 'Above line.\n\n$$\nx^2\n$$\n\nAfter line.\n\nEnd line.\n';
const BLOCK = '.cm-lp-math-block';

test.describe('Live Preview - click reveal - block math', () => {
	test('blank band above the block stays rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const block = page.locator(BLOCK).first();
		const band = await lineBandProbe(block);
		expect(band.above).toBeGreaterThan(2);

		const click = await clickAtOffset(page, block, { from: 'top', dy: -12 });
		expect(click.inOwnLine, "the press must land in the widget's own line").toBe(true);
		expect(click.hit).toBe('DIV.cm-line');

		await expect(page.locator(BLOCK)).toHaveCount(1);
		expect(await isRevealed(page, '$$')).toBe(false);
		expect(await activeLineText(page)).toBe('');
	});

	test('blank band below the block stays rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const block = page.locator(BLOCK).first();
		const band = await lineBandProbe(block);
		expect(band.below).toBeGreaterThan(2);

		const click = await clickAtOffset(page, block, { from: 'bottom', dy: 12 });
		expect(click.inOwnLine, "the press must land in the widget's own line").toBe(true);
		expect(click.hit).toBe('DIV.cm-line');

		await expect(page.locator(BLOCK)).toHaveCount(1);
		expect(await isRevealed(page, '$$')).toBe(false);
		expect(await activeLineText(page)).toBe('');
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

	test('blank space left of the block, at its vertical center, keeps it rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		await clickLeftOfWidget(page, page.locator(BLOCK).first());

		await expect(page.locator(BLOCK)).toHaveCount(1);
		expect(await isRevealed(page, '$$')).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe('End line.');
	});
});
