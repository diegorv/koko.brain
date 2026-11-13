// Click behavior around the inline math widget (`$...$`, MathWidget inline: a span that replaces the InlineMath node).
import { test, expect } from '../../../fixtures/live-preview';
import {
	openAndSettle,
	clickAtOffset,
	activeLineText,
	isRevealed,
	END_LINE,
} from '../../../fixtures/click-reveal';

const SAMPLE = 'Above line.\n\nInline $x^2$ math.\n\nAfter line.\n\nEnd line.\n';
const INLINE = '.cm-lp-math-inline';
const RAW_SNIPPET = '$x^2$';
const LINE_TEXT = 'Inline $x^2$ math.';

test.describe('Live Preview - click reveal - inline math', () => {
	test('clicking the rendered formula keeps it rendered and the cursor does not move', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const formula = page.locator(INLINE).first();
		const box = await formula.boundingBox();
		if (!box) throw new Error('formula has no bounding box');
		const onFormula = await formula.evaluate(
			(el, p) => el.contains(document.elementFromPoint(p.x, p.y)),
			{ x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) },
		);
		expect(onFormula, 'centre click must land inside the formula widget').toBe(true);

		const click = await clickAtOffset(page, formula, { from: 'center' });
		expect(click.hitLine).toContain('Inline');

		await expect(page.locator(INLINE)).toHaveCount(1);
		expect(await isRevealed(page, RAW_SNIPPET)).toBe(false);
		expect(await activeLineText(page)).toBe(END_LINE);
	});

	test('plain text right of the formula on the same line reveals its source', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const formula = page.locator(INLINE).first();

		// dx lands on " math." just past the formula's right edge.
		const click = await clickAtOffset(page, formula, { from: 'right', dx: 15 });
		expect(click.hitLine).toContain('math.');

		await expect(page.locator(INLINE)).toHaveCount(0);
		expect(await isRevealed(page, RAW_SNIPPET)).toBe(true);
		expect(await activeLineText(page)).toBe(LINE_TEXT);
	});

	test('clicking the line after the formula moves the cursor there and keeps the formula rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);

		await page.locator('.cm-line').filter({ hasText: 'After line.' }).first().click();
		await page.waitForTimeout(150);

		await expect(page.locator(INLINE)).toHaveCount(1);
		expect(await isRevealed(page, RAW_SNIPPET)).toBe(false);
		expect(await activeLineText(page)).toBe('After line.');
	});

	test('clicking away after a reveal renders the formula again', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		await clickAtOffset(page, page.locator(INLINE).first(), { from: 'right', dx: 15 });
		await expect(page.locator(INLINE)).toHaveCount(0);

		await page.locator('.cm-line').filter({ hasText: 'After line.' }).first().click();
		await page.waitForTimeout(150);

		await expect(page.locator(INLINE)).toHaveCount(1);
		expect(await isRevealed(page, RAW_SNIPPET)).toBe(false);
		expect(await activeLineText(page)).toBe('After line.');
	});
});
