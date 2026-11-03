import type { Locator } from '@playwright/test';
import { test, expect } from '../../../fixtures/live-preview';
import { END_LINE, activeLineText, clickAtOffset, isRevealed, openAndSettle } from '../../../fixtures/click-reveal';

const RAW_LINK = '[[Wiki]]';
const LINK_LINE = 'See [[Wiki]] here.';
const CONTENT = `Above line.\n\n${LINK_LINE}\n\n${END_LINE}\n`;

/**
 * Clicks the glyphs of the first `needle` occurrence inside `line`. The point
 * is measured from a text Range, so it lands on that text and not on a
 * wrapping element's padding.
 */
async function clickTextInLine(page: import('@playwright/test').Page, line: Locator, needle: string) {
	const center = await line.evaluate((el, n) => {
		const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
		for (let node = walker.nextNode(); node; node = walker.nextNode()) {
			const i = (node.textContent ?? '').indexOf(n);
			if (i < 0) continue;
			const range = document.createRange();
			range.setStart(node, i);
			range.setEnd(node, i + n.length);
			const r = range.getBoundingClientRect();
			return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
		}
		throw new Error(`text "${n}" not found in line`);
	}, needle);
	const box = await line.boundingBox();
	if (!box) throw new Error('line has no bounding box');
	return clickAtOffset(page, line, {
		from: 'left',
		dx: center.x - box.x,
		dy: center.y - (box.y + box.height / 2),
	});
}

test.describe('Live Preview - click reveal: wikilink', () => {
	test('plain click on the rendered wikilink opens its target and the source stays rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		const link = page.locator('.cm-lp-wikilink', { hasText: 'Wiki' }).first();
		await expect(link).toBeVisible();

		const click = await clickAtOffset(page, link);

		await expect(page.locator('[role="tab"][aria-selected="true"]'), `click hit ${click.hit}`).toContainText('Wiki');

		await page.locator('[role="tab"]', { hasText: 'test.md' }).click();
		await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('test.md');
		await expect(page.locator('.cm-lp-wikilink', { hasText: 'Wiki' })).toBeVisible();
		expect(await isRevealed(page, RAW_LINK)).toBe(false);
		expect(await activeLineText(page), `click hit ${click.hit}`).toBe(END_LINE);
	});

	test('plain text on the same line reveals the wikilink source', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		const line = page.locator('.cm-line', { hasText: 'here.' }).first();
		await expect(page.locator('.cm-lp-wikilink', { hasText: 'Wiki' })).toBeVisible();

		const click = await clickTextInLine(page, line, 'here');
		expect(click.hit, `click hit ${click.hit}`).not.toContain('cm-lp-wikilink');

		expect(await activeLineText(page), `click hit ${click.hit}`).toBe(LINK_LINE);
		expect(await isRevealed(page, RAW_LINK)).toBe(true);
		await expect(page.locator('.cm-lp-wikilink')).toHaveCount(0);
		await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('test.md');
	});
});
