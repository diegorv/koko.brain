import type { Page } from '@playwright/test';
import { test, expect } from '../../../fixtures/live-preview';
import { END_LINE, activeLineText, clickAtOffset, isRevealed, openAndSettle } from '../../../fixtures/click-reveal';

const CONTENT = `Above line.

> quoted text

${END_LINE}
`;

const QUOTE_LINE = '> quoted text';

/** The plain blockquote's line: a `cm-lp-blockquote` line decoration, not a widget. */
function quoteLine(page: Page) {
	return page.locator('.cm-line.cm-lp-blockquote');
}

test.describe('Live Preview - click reveal - plain blockquote', () => {
	test('click on the quoted text reveals the ">" on that line only', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		await expect(quoteLine(page)).toHaveCount(1);
		await expect(quoteLine(page)).toContainText('quoted text');
		await expect(page.locator('.cm-formatting-block')).toHaveCount(0);
		expect(await isRevealed(page, QUOTE_LINE)).toBe(false);

		const click = await clickAtOffset(page, quoteLine(page), { from: 'left', dx: 40 });
		expect(click.hitLine).toContain('quoted text');

		expect(await isRevealed(page, QUOTE_LINE)).toBe(true);
		await expect(quoteLine(page)).toHaveCount(1);
		await expect(quoteLine(page).locator('.cm-formatting-block')).toContainText('>');
		await expect(page.locator('.cm-formatting-block')).toHaveCount(1);
		expect(await activeLineText(page)).toBe(QUOTE_LINE);
	});

	test('click on the left border and padding of the quote line reveals the ">" on that line only', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		await expect(quoteLine(page)).toHaveCount(1);
		await expect(page.locator('.cm-formatting-block')).toHaveCount(0);
		expect(await isRevealed(page, QUOTE_LINE)).toBe(false);

		const click = await clickAtOffset(page, quoteLine(page), { from: 'left', dx: 5 });
		expect(click.hitLine).toContain('quoted text');

		expect(await isRevealed(page, QUOTE_LINE)).toBe(true);
		await expect(quoteLine(page)).toHaveCount(1);
		await expect(quoteLine(page).locator('.cm-formatting-block')).toContainText('>');
		await expect(page.locator('.cm-formatting-block')).toHaveCount(1);
		expect(await activeLineText(page)).toBe(QUOTE_LINE);
	});
});
