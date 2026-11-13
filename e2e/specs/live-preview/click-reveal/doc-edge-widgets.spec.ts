// Click behavior in the blank band above a block widget on the document's first line, and below one on its last line.
//
// A band click normally moves the cursor to the neighbouring line. At the
// document's edge there is none, so the click must keep the widget rendered
// and leave the cursor where it was.
import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../../../fixtures/live-preview';
import {
	END_LINE,
	activeLineText,
	clickAtOffset,
	isRevealed,
	lineBandProbe,
	openAndSettle,
} from '../../../fixtures/click-reveal';

interface EdgeCase {
	name: string;
	widget: string;
	raw: string;
	/** Widget on the first line, END_LINE further down. */
	atStart: string;
	/** Widget on the last line (no trailing newline), END_LINE further up. */
	atEnd: string;
}

const CASES: EdgeCase[] = [
	{
		name: 'fenced code block',
		widget: '.cm-lp-codeblock',
		raw: '```js',
		atStart: '```js\nconst a = 1;\n```\n\nAfter line.\n\nEnd line.\n',
		atEnd: 'End line.\n\nBefore line.\n\n```js\nconst z = 9;\n```',
	},
	{
		name: 'wikilink image embed',
		widget: '.cm-lp-image-wrapper',
		raw: '![[pic',
		atStart: '![[pic.png]]\n\nAfter line.\n\nEnd line.\n',
		atEnd: 'End line.\n\nBefore line.\n\n![[pic.png]]',
	},
];

async function expectRenderedAndParked(page: Page, c: EdgeCase): Promise<void> {
	await expect(page.locator(c.widget)).toHaveCount(1);
	expect(await isRevealed(page, c.raw)).toBe(false);
	await expect.poll(() => activeLineText(page)).toBe(END_LINE);
}

/** Fails unless the widget's own line is the first (or last) `.cm-line` of the editor. */
async function expectEdgeLine(widget: Locator, edge: 'first' | 'last'): Promise<void> {
	const isEdge = await widget.evaluate((el, e) => {
		const line = el.closest('.cm-line');
		const lines = [...document.querySelectorAll('.cm-content > .cm-line')].filter(
			(l) => l.getBoundingClientRect().height > 0,
		);
		return line === (e === 'first' ? lines[0] : lines[lines.length - 1]);
	}, edge);
	expect(isEdge, `the widget's line must be the ${edge} visible line`).toBe(true);
}

test.describe('Live Preview - click reveal - block widgets at the document edges', () => {
	for (const c of CASES) {
		test(`${c.name} on the first line: the blank band above it keeps it rendered`, async ({ lpPage: page }) => {
			await openAndSettle(page, c.atStart);
			const widget = page.locator(c.widget).first();
			await expectEdgeLine(widget, 'first');
			const band = await lineBandProbe(widget);
			expect(band.above, 'the widget line box must add a blank band above it').toBeGreaterThan(2);

			const click = await clickAtOffset(page, widget, { from: 'top', dy: -Math.max(1, Math.floor(band.above / 2)) });
			expect(click.inOwnLine, "the press must land in the widget's own line").toBe(true);

			await expectRenderedAndParked(page, c);
		});

		test(`${c.name} on the last line: the blank band below it keeps it rendered`, async ({ lpPage: page }) => {
			await openAndSettle(page, c.atEnd);
			const widget = page.locator(c.widget).first();
			await expectEdgeLine(widget, 'last');
			const band = await lineBandProbe(widget);
			expect(band.below, 'the widget line box must add a blank band below it').toBeGreaterThan(2);

			const click = await clickAtOffset(page, widget, { from: 'bottom', dy: Math.max(1, Math.floor(band.below / 2)) });
			expect(click.inOwnLine, "the press must land in the widget's own line").toBe(true);

			await expectRenderedAndParked(page, c);
		});

		test(`${c.name} on the last line: the empty editor space under the document keeps it rendered`, async ({ lpPage: page }) => {
			await openAndSettle(page, c.atEnd);
			const widget = page.locator(c.widget).first();
			await expectEdgeLine(widget, 'last');
			const band = await lineBandProbe(widget);
			const scroller = await page.locator('.cm-scroller').boundingBox();
			if (!scroller) throw new Error('editor scroller has no box');
			const y = band.line.bottom + 40;
			expect(y, 'the editor must have empty space under the last line').toBeLessThan(scroller.y + scroller.height - 5);

			const click = await clickAtOffset(page, widget, { from: 'bottom', dy: y - band.box.bottom });
			expect(click.hitLine, `the press must land under every line (hit ${click.hit})`).toBeNull();
			expect(click.hit).toMatch(/^DIV\.cm-(content|scroller)/);

			await expectRenderedAndParked(page, c);
		});
	}
});
