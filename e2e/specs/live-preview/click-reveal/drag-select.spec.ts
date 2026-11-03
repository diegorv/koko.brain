// Drag-selects that start or end in a block widget's blank band, or on the widget itself.
//
// A press in a band starts the selection on the line next to the block, and a
// drag that ends in a band should stop there, so neither reveals the block. A
// drag that ends on the widget body keeps a body click's behavior: it can
// reach into the block's source, which the line rule then reveals.
import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../../../fixtures/live-preview';
import { END_LINE, activeLineText, editorSelection, isRevealed, lineBandProbe, openAndSettle } from '../../../fixtures/click-reveal';

const CODE_SAMPLE = `Above line.\n\n\`\`\`js\nconst x = 1;\n\`\`\`\n\nAfter line.\n\n${END_LINE}\n`;
const CODE = '.cm-lp-codeblock';
const RAW_CODE = '```js';

const MATH_SAMPLE = `Above line.\n\n$$\nx^2\n$$\n\nAfter line.\n\n${END_LINE}\n`;
const MATH = '.cm-lp-math-block';
const RAW_MATH = '$$';

interface Point {
	x: number;
	y: number;
}

/** Viewport point at the start (`at: 0`) or end (`at: 1`) of `text` inside the first `.cm-line` holding it. */
async function textEdge(page: Page, text: string, at: 0 | 1): Promise<Point> {
	return page
		.locator('.cm-line', { hasText: text })
		.first()
		.evaluate(
			(el, [t, edge]) => {
				const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
				for (let node = walker.nextNode(); node; node = walker.nextNode()) {
					const i = (node.textContent ?? '').indexOf(t as string);
					if (i < 0) continue;
					const range = document.createRange();
					range.setStart(node, i);
					range.setEnd(node, i + (t as string).length);
					const r = range.getBoundingClientRect();
					return { x: edge === 0 ? r.left + 1 : r.right - 1, y: r.top + r.height / 2 };
				}
				throw new Error(`text "${t}" not found`);
			},
			[text, at] as const,
		);
}

/** Middle of the blank band above (`side: 'above'`) or below a widget, inside its own line. */
async function bandPoint(widget: Locator, side: 'above' | 'below'): Promise<Point> {
	const band = await lineBandProbe(widget);
	const x = (band.box.left + band.box.right) / 2;
	return side === 'above'
		? { x, y: band.box.top - Math.max(1, Math.floor(band.above / 2)) }
		: { x, y: band.box.bottom + Math.max(1, Math.floor(band.below / 2)) };
}

/** Real mouse drag: press at `from`, move in steps to `to`, release. */
async function drag(page: Page, from: Point, to: Point): Promise<void> {
	await page.mouse.move(Math.round(from.x), Math.round(from.y), { steps: 1 });
	await page.mouse.down();
	await page.mouse.move(Math.round(to.x), Math.round(to.y), { steps: 12 });
	await page.mouse.up();
	await page.waitForTimeout(150);
}

test.describe('Live Preview - click reveal - drag-select around block widgets', () => {
	test('a drag from the band above a code block up to the start of "Above line." keeps the block rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, CODE_SAMPLE);
		const from = await bandPoint(page.locator(CODE).first(), 'above');
		const to = await textEdge(page, 'Above line.', 0);

		await drag(page, from, to);

		const sel = await editorSelection(page);
		expect(sel.text).toBe('Above line.\n');
		await expect(page.locator(CODE)).toHaveCount(1);
		expect(await isRevealed(page, RAW_CODE)).toBe(false);
	});

	test('a drag from the end of "After line." up into the band below a code block stops before the block', async ({ lpPage: page }) => {
		await openAndSettle(page, CODE_SAMPLE);
		const from = await textEdge(page, 'After line.', 1);
		const to = await bandPoint(page.locator(CODE).first(), 'below');

		await drag(page, from, to);

		const sel = await editorSelection(page);
		expect(sel.text).toBe('\nAfter line.');
		await expect(page.locator(CODE)).toHaveCount(1);
		expect(await isRevealed(page, RAW_CODE)).toBe(false);
	});

	test('a drag from the start of "Above line." down into the band above a code block stops before the block', async ({ lpPage: page }) => {
		await openAndSettle(page, CODE_SAMPLE);
		const from = await textEdge(page, 'Above line.', 0);
		const to = await bandPoint(page.locator(CODE).first(), 'above');

		await drag(page, from, to);

		// The head stops at the start of the block's line, before the widget, so nothing of the block is selected.
		const sel = await editorSelection(page);
		expect(sel.text).toBe('Above line.\n\n');
		await expect(page.locator(CODE)).toHaveCount(1);
		expect(await isRevealed(page, RAW_CODE)).toBe(false);
	});

	// A drag over the widget body maps to one side of the replaced range: its start on the left half, its end on the right half.
	test('a drag from "Above line." onto the left half of the code block body stops at the block start and keeps it rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, CODE_SAMPLE);
		const from = await textEdge(page, 'Above line.', 0);
		const box = await page.locator(CODE).first().boundingBox();
		if (!box) throw new Error('code block has no box');

		await drag(page, from, { x: box.x + box.width / 4, y: box.y + box.height / 2 });

		const sel = await editorSelection(page);
		expect(sel.text).toBe('Above line.\n\n');
		await expect(page.locator(CODE)).toHaveCount(1);
		expect(await isRevealed(page, RAW_CODE)).toBe(false);
	});

	test('a drag from "Above line." onto the right half of the code block body selects into the block and reveals it', async ({ lpPage: page }) => {
		await openAndSettle(page, CODE_SAMPLE);
		const from = await textEdge(page, 'Above line.', 0);
		const box = await page.locator(CODE).first().boundingBox();
		if (!box) throw new Error('code block has no box');

		await drag(page, from, { x: box.x + (box.width * 3) / 4, y: box.y + box.height / 2 });

		const sel = await editorSelection(page);
		expect(sel.text).toBe('Above line.\n\n```js');
		await expect(page.locator(CODE)).toHaveCount(0);
		await expect.poll(() => isRevealed(page, RAW_CODE)).toBe(true);
	});

	test('a drag that starts on the rendered math glyphs selects no text, keeps the block rendered and keeps the cursor off the block', async ({ lpPage: page }) => {
		await openAndSettle(page, MATH_SAMPLE);
		const glyphs = page.locator(`${MATH} .katex`).first();
		const box = await glyphs.boundingBox();
		if (!box) throw new Error('KaTeX glyphs have no box');
		const to = await textEdge(page, 'After line.', 1);

		await drag(page, { x: box.x + box.width / 2, y: box.y + box.height / 2 }, to);

		// The glyphs ignore the press, so CodeMirror starts no drag selection. The browser's own
		// selection then decides whether the cursor stays put or follows the release point: both
		// happen from run to run, and neither touches the block.
		const sel = await editorSelection(page);
		expect(sel.text).toBe('');
		expect([END_LINE, 'After line.']).toContain(await activeLineText(page));
		await expect(page.locator(MATH)).toHaveCount(1);
		expect(await isRevealed(page, RAW_MATH)).toBe(false);
	});
});
