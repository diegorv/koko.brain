// Click behavior around a horizontal rule (`---`), a line decoration with no widget.
import { test, expect } from '../../../fixtures/live-preview';
import { openAndSettle, clickAtOffset, activeLineText } from '../../../fixtures/click-reveal';

// Lines: 1 "Above line.", 2 blank, 3 "---" (the rule), 4 blank, 5 "After line.", 6 blank, 7 "End line."
const SAMPLE = 'Above line.\n\n---\n\nAfter line.\n\nEnd line.\n';
const RULE_LINE = '.cm-lp-hr-line';
const RULE_MARK = '.cm-formatting-hr';

test.describe('Live Preview - click reveal - horizontal rule', () => {
	// Owner decision: the rule follows the line rule in core/reveal.ts, so a click reveals `---`.
	test('click on the rule line reveals its source', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const rule = page.locator('.cm-line').filter({ hasText: '---' }).first();

		const click = await clickAtOffset(page, rule, { from: 'center' });
		expect(click.hitLine).toBe('---');

		await expect(page.locator(RULE_LINE)).toHaveCount(0);
		await expect(page.locator(RULE_MARK)).toHaveCount(0);
		expect(await activeLineText(page)).toBe('---');
	});

	test('clicks on the blank lines above and below the rule keep the rule rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const above = page.locator('.cm-line').nth(1);
		const below = page.locator('.cm-line').nth(3);
		await expect(above).toHaveText('');
		await expect(below).toHaveText('');

		const clickAbove = await clickAtOffset(page, above, { from: 'center' });
		expect(clickAbove.hitLine).toBe('');
		await expect(above).toHaveClass(/cm-activeLine/);
		expect(await activeLineText(page)).toBe('');
		await expect(page.locator(RULE_LINE)).toHaveCount(1);
		await expect(page.locator(RULE_MARK)).toHaveCount(1);

		const clickBelow = await clickAtOffset(page, below, { from: 'center' });
		expect(clickBelow.hitLine).toBe('');
		await expect(below).toHaveClass(/cm-activeLine/);
		expect(await activeLineText(page)).toBe('');
		await expect(page.locator(RULE_LINE)).toHaveCount(1);
		await expect(page.locator(RULE_MARK)).toHaveCount(1);
	});
});
