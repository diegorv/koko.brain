// Click behavior around the inline highlight `==text==`, the inline comment `%%x%%` and the block reference `^id`, all on one line.
import { test, expect } from '../../../fixtures/live-preview';
import { openAndSettle, clickAtOffset, activeLineText, isRevealed } from '../../../fixtures/click-reveal';

// Lines: 1 "Above line.", 2 blank, 3 the sample line, 4 blank, 5 "End line."
const SAMPLE = 'Above line.\n\nSome ==hl== and %%cmt%% text. ^blk\n\nEnd line.\n';
const SAMPLE_LINE = 'Some ==hl== and %%cmt%% text. ^blk';
const HIGHLIGHT = '.cm-lp-highlight';
const BLOCK_REF = '.cm-lp-block-ref';
const BLOCK_REF_HIDDEN = '.cm-lp-block-ref-hidden';

test.describe('Live Preview - click reveal - highlight, inline comment and block reference', () => {
	test('click on the highlighted text reveals the highlight markers and the comment on that line', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		expect(await isRevealed(page, '==hl==')).toBe(false);
		expect(await isRevealed(page, '%%cmt%%')).toBe(false);

		const highlight = page.locator(HIGHLIGHT);
		await expect(highlight).toHaveCount(1);
		await expect(highlight).toHaveText('hl');

		const click = await clickAtOffset(page, highlight, { from: 'center' });
		expect(click.hitLine).toContain('hl');

		expect(await activeLineText(page)).toBe(SAMPLE_LINE);
		expect(await isRevealed(page, '==hl==')).toBe(true);
		expect(await isRevealed(page, '%%cmt%%')).toBe(true);
		await expect(page.locator(BLOCK_REF)).toBeVisible();
		await expect(page.locator(BLOCK_REF_HIDDEN)).toHaveCount(0);
		await expect(highlight).toHaveCount(1);
	});

	test('click on the line right after reveals nothing: the comment and block reference hide again', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const highlight = page.locator(HIGHLIGHT);
		await clickAtOffset(page, highlight, { from: 'center' });
		expect(await isRevealed(page, '%%cmt%%')).toBe(true);
		await expect(page.locator(BLOCK_REF)).toBeVisible();

		const blankAfter = page.locator('.cm-line').nth(3);
		await expect(blankAfter).toHaveText('');

		const click = await clickAtOffset(page, blankAfter, { from: 'center' });
		expect(click.hitLine).toBe('');

		expect(await activeLineText(page)).toBe('');
		expect(await isRevealed(page, '==hl==')).toBe(false);
		expect(await isRevealed(page, '%%cmt%%')).toBe(false);
		await expect(page.locator(BLOCK_REF)).toBeHidden();
		await expect(page.locator(BLOCK_REF_HIDDEN)).toHaveCount(1);
		await expect(highlight).toHaveCount(1);
		await expect(highlight).toHaveText('hl');
	});
});
