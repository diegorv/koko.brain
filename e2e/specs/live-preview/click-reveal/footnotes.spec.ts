// Click behavior around the footnote elements (the `[^label]` reference, the `^[text]` inline footnote,
// the `[^label]: text` definition line) and the ` ^block-id` block reference suffix.
import type { Locator } from '@playwright/test';
import { test, expect } from '../../../fixtures/live-preview';
import {
	openAndSettle,
	clickAtOffset,
	clickTextInLine,
	editorSelection,
	activeLineText,
	isRevealed,
	END_LINE,
} from '../../../fixtures/click-reveal';

const LINE = 'Text with foot[^1] and inline^[note text] here.';
const SAMPLE = `Above line.\n\n${LINE}\n\n[^1]: def\n\n${END_LINE}\n`;
const FOOTNOTE_REF = '.cm-lp-footnote-ref';
const REF_LABEL = '[^1]';
const INLINE_TEXT = 'note text';
const INLINE_SOURCE = '^[note text]';
const DEF_LINE = '[^1]: def';
const DEF_MARKER = '.cm-lp-footnote-def-marker';

const BLOCK_LINE = 'Para with ref ^blk';
const BLOCK_SAMPLE = `Above line.\n\n${BLOCK_LINE}\n\n${END_LINE}\n`;
const BLOCK_REF = '.cm-lp-block-ref';
const BLOCK_REF_HIDDEN = '.cm-lp-block-ref-hidden';

/** Fails unless the element at the locator's center sits inside a footnote mark, so the click lands on the reference itself. */
async function expectCenterInsideRef(locator: Locator): Promise<void> {
	const box = (await locator.boundingBox())!;
	const inside = await locator.page().evaluate(
		([x, y]) => document.elementFromPoint(x, y)?.closest('.cm-lp-footnote-ref') !== null,
		[box.x + box.width / 2, box.y + box.height / 2],
	);
	expect(inside, 'click point is on the footnote reference').toBe(true);
}

/** Document offset where `line` starts in `doc`. */
function lineOffset(doc: string, line: string): number {
	const i = doc.indexOf(line);
	if (i < 0) throw new Error(`line "${line}" not in sample`);
	return i;
}

test.describe('Live Preview - click reveal - footnotes', () => {
	test('clicking the [^1] reference reveals its source and moves the cursor onto its line', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const ref = page.locator(FOOTNOTE_REF, { hasText: REF_LABEL });
		await expect(ref).toHaveCount(1);

		await expectCenterInsideRef(ref);
		await clickAtOffset(page, ref, { from: 'center' });

		await expect.poll(() => activeLineText(page)).toBe(LINE);
		await expect(page.locator(FOOTNOTE_REF, { hasText: REF_LABEL })).toHaveCount(0);
	});

	test('clicking the inline footnote text reveals ^[note text] and moves the cursor onto its line', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const inline = page.locator(FOOTNOTE_REF, { hasText: INLINE_TEXT });
		await expect(inline).toHaveCount(1);
		expect(await isRevealed(page, INLINE_SOURCE)).toBe(false);

		await expectCenterInsideRef(inline);
		await clickAtOffset(page, inline, { from: 'center' });

		await expect.poll(() => activeLineText(page)).toBe(LINE);
		await expect.poll(() => isRevealed(page, INLINE_SOURCE)).toBe(true);
		await expect(page.locator(FOOTNOTE_REF, { hasText: INLINE_TEXT })).toHaveCount(0);
	});

	test('clicking the definition text moves the cursor onto the [^1]: line and drops the marker style', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		await expect(page.locator(DEF_MARKER)).toHaveCount(1);
		const line = page.locator('.cm-line', { hasText: DEF_LINE }).first();

		const click = await clickTextInLine(page, line, 'def');
		expect(click.hitLine).toBe(DEF_LINE);

		await expect.poll(() => activeLineText(page)).toBe(DEF_LINE);
		await expect(page.locator(DEF_MARKER)).toHaveCount(0);
	});

	test('clicking the styled [^1]: marker moves the cursor onto its line', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const marker = page.locator(DEF_MARKER).first();
		await expect(marker).toHaveCount(1);

		await clickAtOffset(page, marker, { from: 'center' });

		await expect.poll(() => activeLineText(page)).toBe(DEF_LINE);
		await expect(page.locator(DEF_MARKER)).toHaveCount(0);
	});

	test('clicking the text of a line with a block reference moves the cursor there and shows ^blk', async ({ lpPage: page }) => {
		await openAndSettle(page, BLOCK_SAMPLE);
		await expect(page.locator(BLOCK_REF_HIDDEN)).toHaveCount(1);
		await expect(page.locator(BLOCK_REF).first()).toBeHidden();
		const line = page.locator('.cm-line', { hasText: 'Para with ref' }).first();

		await clickTextInLine(page, line, 'Para');

		await expect.poll(() => activeLineText(page)).toBe(BLOCK_LINE);
		await expect(page.locator(BLOCK_REF_HIDDEN)).toHaveCount(0);
		await expect(page.locator(BLOCK_REF).first()).toBeVisible();
	});

	test('clicking the shown ^blk directly keeps the cursor inside it and the reference shown', async ({ lpPage: page }) => {
		await openAndSettle(page, BLOCK_SAMPLE);
		await clickTextInLine(page, page.locator('.cm-line', { hasText: 'Para with ref' }).first(), 'Para');
		const ref = page.locator(BLOCK_REF).first();
		await expect(ref).toBeVisible();

		const click = await clickTextInLine(page, page.locator('.cm-line', { hasText: 'Para with ref' }).first(), 'blk');
		expect(click.hit).toContain('cm-lp-block-ref');

		await expect.poll(() => activeLineText(page)).toBe(BLOCK_LINE);
		const sel = await editorSelection(page);
		const lineStart = lineOffset(BLOCK_SAMPLE, BLOCK_LINE);
		expect(sel.from).toBeGreaterThan(lineStart + BLOCK_LINE.indexOf('^'));
		expect(sel.from).toBeLessThanOrEqual(lineStart + BLOCK_LINE.length);
		await expect(page.locator(BLOCK_REF_HIDDEN)).toHaveCount(0);
		await expect(ref).toBeVisible();
	});

	test('clicking the blank space right of a line whose ^blk is hidden puts the cursor at the end of its visible text', async ({ lpPage: page }) => {
		await openAndSettle(page, BLOCK_SAMPLE);
		const line = page.locator('.cm-line', { hasText: 'Para with ref' }).first();
		await expect(page.locator(BLOCK_REF_HIDDEN)).toHaveCount(1);

		const click = await clickAtOffset(page, line, { from: 'right', dx: -10 });
		expect(click.hitLine).toBe(BLOCK_LINE);

		await expect.poll(() => activeLineText(page)).toBe(BLOCK_LINE);
		const sel = await editorSelection(page);
		// The hidden ` ^blk` takes no space, so the click lands before it: typed text stays ahead of the id.
		expect(sel.from).toBe(lineOffset(BLOCK_SAMPLE, BLOCK_LINE) + BLOCK_LINE.indexOf(' ^blk'));
		await expect(page.locator(BLOCK_REF).first()).toBeVisible();
	});
});
