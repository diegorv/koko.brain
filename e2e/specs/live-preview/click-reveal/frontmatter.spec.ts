// Click behavior around the frontmatter block, which live preview always hides.
import { test, expect } from '../../../fixtures/live-preview';
import { openAndSettle, clickAtOffset, activeLineText, isRevealed } from '../../../fixtures/click-reveal';

const SAMPLE = '---\nstatus: todo\n---\nFirst body line.\n\nAfter line.\n\nEnd line.\n';
const FIRST_BODY_LINE = 'First body line.';
const FRONTMATTER_SOURCE = 'status: todo';
const HIDDEN_FRONTMATTER_LINES = 3;
const HIDDEN_LINE = '.cm-line.cm-lp-hidden-line';

test.describe('Live Preview - click reveal - frontmatter', () => {
	test('clicking the 16px padding above the first body line moves the cursor there and keeps the frontmatter hidden', async ({ lpPage: page }) => {
		// Known bug: the padding click maps to position 0, inside the display:none frontmatter, so the cursor lands on a hidden line (Enter there breaks the frontmatter).
		test.fail();
		await openAndSettle(page, SAMPLE);
		const firstBody = page.locator('.cm-line').filter({ hasText: FIRST_BODY_LINE }).first();
		await expect(firstBody).toHaveText(FIRST_BODY_LINE);

		const click = await clickAtOffset(page, firstBody, { from: 'top', dy: -8 });
		expect(click.hit).toContain('cm-content');

		await expect.poll(() => activeLineText(page)).toBe(FIRST_BODY_LINE);
		await expect(page.locator(HIDDEN_LINE)).toHaveCount(HIDDEN_FRONTMATTER_LINES);
		expect(await isRevealed(page, FRONTMATTER_SOURCE)).toBe(false);
		await expect(firstBody).toHaveText(FIRST_BODY_LINE);
	});

	test('clicking the top edge of the first body line moves the cursor there and keeps the frontmatter hidden', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const firstBody = page.locator('.cm-line').filter({ hasText: FIRST_BODY_LINE }).first();
		await expect(firstBody).toHaveText(FIRST_BODY_LINE);

		const click = await clickAtOffset(page, firstBody, { from: 'top', dy: 1 });
		expect(click.hitLine).toBe(FIRST_BODY_LINE);

		await expect.poll(() => activeLineText(page)).toBe(FIRST_BODY_LINE);
		await expect(page.locator(HIDDEN_LINE)).toHaveCount(HIDDEN_FRONTMATTER_LINES);
		expect(await isRevealed(page, FRONTMATTER_SOURCE)).toBe(false);
		await expect(firstBody).toHaveText(FIRST_BODY_LINE);
	});
});
