import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../../../fixtures/live-preview';
import {
	END_LINE,
	activeLineText,
	clickAtOffset,
	clickLeftOfWidget,
	isRevealed,
	lineBandProbe,
	openAndSettle,
} from '../../../fixtures/click-reveal';
import { activeTab } from '../../../fixtures/helpers';

/**
 * Click behavior around the collection block widget. The widget replaces the
 * fence line of a ```collection block (inline Decoration.replace over a
 * display:block div), so the blank bands CodeMirror adds above and below it
 * sit inside the same .cm-line. Clicks there must not reveal the YAML. Rows
 * open their note and keep the block rendered. Header and other non-row body
 * text reveal the source, since the widget does not stop their mousedown.
 */
const SAMPLE = 'Above line.\n\n```collection\nviews:\n  - type: table\n    name: T\n```\n\nAfter line.\n\nEnd line.\n';

/** Raw fence line: only in the markdown, never in the rendered widget. */
const RAW_FENCE = '```collection';

/** Row of the vault note the click opens; the mock index lists every seeded note. */
const OTHER_NOTE = 'Daily-Note';

const block = (page: Page): Locator => page.locator('.cm-lp-collection-block');
const rows = (page: Page): Locator => page.locator('.cm-lp-collection-block tbody tr');

/** Waits until the query has produced its rows (they render once the index settles). */
async function waitForRows(page: Page): Promise<void> {
	await expect.poll(() => rows(page).count(), { timeout: 10_000 }).toBeGreaterThan(0);
}

test.describe('Live Preview - click reveal: collection block', () => {
	test('blank band above the block stays rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		await waitForRows(page);
		const band = await lineBandProbe(block(page));
		expect(band.above, 'the widget line box must add a blank band above the block').toBeGreaterThan(2);
		// The top of the band sits under the tab bar, so only its lower part is inside the editor scroller.
		const scroller = await page.locator('.cm-scroller').boundingBox();
		if (!scroller) throw new Error('editor scroller has no box');
		const visibleTop = Math.max(band.line.top, scroller.y);
		const dy = -Math.max(1, Math.round((band.box.top - visibleTop) / 2));

		const click = await clickAtOffset(page, block(page), { from: 'top', dy });
		expect(click.inOwnLine, "the press must land in the widget's own line").toBe(true);
		expect(click.hit, 'the click must land on blank line space, not a control').not.toMatch(/^(BUTTON|TABLE|TD|TH|A)[.\s]/);

		await expect(block(page)).toHaveCount(1);
		expect(await isRevealed(page, RAW_FENCE)).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe('');
	});

	test('blank band below the block stays rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		await waitForRows(page);
		const band = await lineBandProbe(block(page));
		expect(band.below, 'the widget line box must add a blank band below the block').toBeGreaterThan(2);

		const click = await clickAtOffset(page, block(page), { from: 'bottom', dy: Math.max(1, Math.floor(band.below / 2)) });
		expect(click.inOwnLine, "the press must land in the widget's own line").toBe(true);
		expect(click.hit, 'the click must land on blank line space, not a control').not.toMatch(/^(BUTTON|TABLE|TD|TH|A)[.\s]/);

		await expect(block(page)).toHaveCount(1);
		expect(await isRevealed(page, RAW_FENCE)).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe('');
	});

	test('clicking a row opens its note and the block stays rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		await waitForRows(page);
		const row = rows(page).filter({ hasText: OTHER_NOTE }).first();

		await clickAtOffset(page, row, { from: 'center' });

		await expect(activeTab(page)).toContainText(OTHER_NOTE);
		await page.locator('.editor-tabs-bar [role="tab"]', { hasText: 'test.md' }).click();
		await expect(activeTab(page)).toContainText('test.md');
		await expect(block(page)).toHaveCount(1);
		expect(await isRevealed(page, RAW_FENCE)).toBe(false);
		expect(await activeLineText(page)).toBe(END_LINE);
	});

	test('rendered header reveals the source', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		await waitForRows(page);
		const header = page.locator('.cm-lp-collection-header').first();

		await clickAtOffset(page, header, { from: 'left', dx: 40 });

		await expect(block(page)).toHaveCount(0);
		await expect.poll(() => isRevealed(page, RAW_FENCE)).toBe(true);
		await expect.poll(() => activeLineText(page)).toBe(RAW_FENCE);
	});

	test('line after the block takes the cursor and the block stays rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		await waitForRows(page);

		await page.locator('.cm-line').filter({ hasText: 'After line.' }).first().click();

		await expect.poll(() => activeLineText(page)).toBe('After line.');
		await expect(block(page)).toHaveCount(1);
		expect(await isRevealed(page, RAW_FENCE)).toBe(false);
	});

	test('blank space left of the block, at its vertical center, keeps it rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		await waitForRows(page);
		await clickLeftOfWidget(page, block(page));

		await expect(block(page)).toHaveCount(1);
		expect(await isRevealed(page, RAW_FENCE)).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe('End line.');
	});
});
