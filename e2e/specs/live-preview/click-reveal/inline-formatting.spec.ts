// Click behavior on inline formatting (bold, italic, strikethrough, inline code) and the hard break `↵`.
// The delimiters are hidden off the cursor's line; a click on the formatted
// text, or on the `↵` glyph, puts the cursor on that line and shows them.
import { test, expect } from '../../../fixtures/live-preview';
import {
	END_LINE,
	activeLineText,
	clickAtOffset,
	clickTextInLine,
	isRevealed,
	openAndSettle,
} from '../../../fixtures/click-reveal';

const MARKS_LINE = 'Plain **boldword** and *italword* and ~~strikeword~~ and `codeword` end.';
const BREAK_LINE = 'Break here\\';
const SAMPLE = `Above line.\n\n${MARKS_LINE}\n\n${BREAK_LINE}\nnext part.\n\n${END_LINE}\n`;

const HARD_BREAK = '.cm-formatting-hard-break';

const MARKS = [
	{ name: 'bold', cls: '.cm-lp-bold', word: 'boldword', raw: '**boldword**' },
	{ name: 'italic', cls: '.cm-lp-italic', word: 'italword', raw: '*italword*' },
	{ name: 'strikethrough', cls: '.cm-lp-strikethrough', word: 'strikeword', raw: '~~strikeword~~' },
	{ name: 'inline code', cls: '.cm-lp-code', word: 'codeword', raw: '`codeword`' },
] as const;

test.describe('Live Preview - click reveal - inline formatting', () => {
	for (const mark of MARKS) {
		test(`clicking the ${mark.name} text shows its delimiters and moves the cursor onto its line`, async ({ lpPage: page }) => {
			await openAndSettle(page, SAMPLE);
			await expect(page.locator(mark.cls, { hasText: mark.word })).toHaveCount(1);
			expect(await isRevealed(page, mark.raw)).toBe(false);
			const line = page.locator('.cm-line', { hasText: 'end.' }).first();

			const click = await clickTextInLine(page, line, mark.word);
			expect(click.hitLine).toBe(MARKS_LINE.replace(/\*\*|\*|~~|`/g, ''));

			await expect.poll(() => activeLineText(page)).toBe(MARKS_LINE);
			expect(await isRevealed(page, mark.raw)).toBe(true);
		});
	}

	test('clicking the line after keeps every delimiter hidden', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		await clickAtOffset(page, page.locator('.cm-line', { hasText: 'Above line.' }).first());

		await expect.poll(() => activeLineText(page)).toBe('Above line.');
		for (const mark of MARKS) expect(await isRevealed(page, mark.raw), mark.name).toBe(false);
	});

	test('clicking the hard break glyph moves the cursor onto its line and shows the backslash', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const glyph = page.locator(HARD_BREAK).first();
		await expect(glyph).toHaveCount(1);

		const click = await clickAtOffset(page, glyph, { from: 'right', dx: -3 });
		expect(click.hit).toContain('cm-formatting-hard-break');

		await expect.poll(() => activeLineText(page)).toBe(BREAK_LINE);
		await expect(page.locator(HARD_BREAK)).toHaveCount(0);
	});

	test('clicking the text before a hard break moves the cursor there and shows the backslash', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const line = page.locator('.cm-line', { hasText: 'Break here' }).first();

		await clickTextInLine(page, line, 'Break');

		await expect.poll(() => activeLineText(page)).toBe(BREAK_LINE);
		await expect(page.locator(HARD_BREAK)).toHaveCount(0);
	});

	test('clicking the line after a hard break keeps the break rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const line = page.locator('.cm-line', { hasText: 'next part.' }).first();

		await clickTextInLine(page, line, 'next');

		await expect.poll(() => activeLineText(page)).toBe('next part.');
		await expect(page.locator(HARD_BREAK)).toHaveCount(1);
	});
});
