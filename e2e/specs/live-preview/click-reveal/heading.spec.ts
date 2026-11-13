// Click behavior around the heading element (ATX `# ` and setext `===` underline).
import { test, expect } from '../../../fixtures/live-preview';
import { openAndSettle, clickAtOffset, activeLineText, isRevealed } from '../../../fixtures/click-reveal';

const SAMPLE = 'Above line.\n\n# Heading\n\nSetext\n===\n\nEnd line.\n';
const ATX_SOURCE = '# Heading';
const ATX_TEXT = 'Heading';
const SETEXT_TEXT = 'Setext';
const SETEXT_UNDERLINE = '===';
const HEADING_LINE = '.cm-line.cm-lp-h1';

test.describe('Live Preview - click reveal - headings', () => {
	test('clicking the ATX heading text reveals its # marker and moves the cursor there', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const heading = page.locator(HEADING_LINE).filter({ hasText: ATX_TEXT });
		await expect(heading).toHaveCount(1);

		const click = await clickAtOffset(page, heading, { from: 'left', dx: 20 });
		expect(click.hitLine).toContain(ATX_TEXT);

		await expect.poll(() => activeLineText(page)).toBe(ATX_SOURCE);
		await expect.poll(() => isRevealed(page, ATX_SOURCE)).toBe(true);
		await expect(heading).toContainText(ATX_TEXT);
	});

	test('clicking the setext heading text reveals the === underline', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const heading = page.locator(HEADING_LINE).filter({ hasText: SETEXT_TEXT });
		await expect(heading).toHaveCount(1);

		const click = await clickAtOffset(page, heading, { from: 'left', dx: 10 });
		expect(click.hitLine).toContain(SETEXT_TEXT);

		await expect.poll(() => activeLineText(page)).toBe(SETEXT_TEXT);
		await expect.poll(() => isRevealed(page, SETEXT_UNDERLINE)).toBe(true);
		await expect(heading).toHaveText(SETEXT_TEXT);
	});

	test('clicking the line right after the ATX heading moves the cursor there and hides its # marker', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const heading = page.locator(HEADING_LINE).filter({ hasText: ATX_TEXT });
		const after = heading.locator('xpath=following-sibling::*[1]');
		await expect(after).toHaveText('');

		const click = await clickAtOffset(page, after, { from: 'center' });
		expect(click.hitLine).toBe('');

		await expect.poll(() => activeLineText(page)).toBe('');
		await expect.poll(() => isRevealed(page, ATX_SOURCE)).toBe(false);
		await expect(heading).toHaveText(ATX_TEXT);
	});
});
