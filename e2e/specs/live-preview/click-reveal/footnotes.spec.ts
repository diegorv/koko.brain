// Click behavior around the footnote elements: the `[^label]` reference and the `^[text]` inline footnote.
import type { Locator } from '@playwright/test';
import { test, expect } from '../../../fixtures/live-preview';
import { openAndSettle, clickAtOffset, activeLineText, isRevealed, END_LINE } from '../../../fixtures/click-reveal';

const LINE = 'Text with foot[^1] and inline^[note text] here.';
const SAMPLE = `Above line.\n\n${LINE}\n\n[^1]: def\n\n${END_LINE}\n`;
const FOOTNOTE_REF = '.cm-lp-footnote-ref';
const REF_LABEL = '[^1]';
const INLINE_TEXT = 'note text';
const INLINE_SOURCE = '^[note text]';

/** Fails unless the element at the locator's center sits inside a footnote mark, so the click lands on the reference itself. */
async function expectCenterInsideRef(locator: Locator): Promise<void> {
	const box = (await locator.boundingBox())!;
	const inside = await locator.page().evaluate(
		([x, y]) => document.elementFromPoint(x, y)?.closest('.cm-lp-footnote-ref') !== null,
		[box.x + box.width / 2, box.y + box.height / 2],
	);
	expect(inside, 'click point is on the footnote reference').toBe(true);
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
});
