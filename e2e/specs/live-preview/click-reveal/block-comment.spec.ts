// Click behavior around a block comment (`%%` ... `%%` lines) while it is hidden.
import { test, expect } from '../../../fixtures/live-preview';
import { openAndSettle, clickAtOffset, activeLineText, isRevealed } from '../../../fixtures/click-reveal';

const SAMPLE = 'Above line.\n\n%%\nblock comment\n%%\nAfter comment.\n\nEnd line.\n';
const AFTER = 'After comment.';
const HIDDEN_LINES = '.cm-line.cm-lp-hidden-line';

test.describe('Live Preview - click reveal - block comment', () => {
	test('click on the line after the hidden block keeps the comment hidden', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const after = page.locator('.cm-line').filter({ hasText: AFTER }).first();

		const click = await clickAtOffset(page, after, { from: 'center' });
		expect(click.hitLine).toBe(AFTER);

		await expect(page.locator(HIDDEN_LINES)).toHaveCount(3);
		expect(await isRevealed(page, '%%')).toBe(false);
		expect(await isRevealed(page, 'block comment')).toBe(false);
		expect(await activeLineText(page)).toBe(AFTER);
	});

	test('top edge (1px) of the line after the hidden block keeps the comment hidden', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const after = page.locator('.cm-line').filter({ hasText: AFTER }).first();

		const click = await clickAtOffset(page, after, { from: 'top', dy: 1 });
		expect(click.hitLine).toBe(AFTER);

		await expect(page.locator(HIDDEN_LINES)).toHaveCount(3);
		expect(await isRevealed(page, '%%')).toBe(false);
		expect(await isRevealed(page, 'block comment')).toBe(false);
		expect(await activeLineText(page)).toBe(AFTER);
	});
});
