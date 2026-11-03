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

/** Row of the vault note the click opens, seeded by the test that clicks it. */
const OTHER_NOTE = 'Other-Note';
const OTHER_NOTE_FILES = { 'Other-Note.md': 'Other note body.\n' };

/** Today as `YYYY-MM-DD` in the page's local time zone: the calendar views show the current month and year. */
async function todayKey(page: Page): Promise<string> {
	return page.evaluate(() => {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	});
}

/** A ```collection block with one view of `type`, keyed on the `date` property. */
const calendarSample = (type: 'calendar' | 'linear-calendar'): string =>
	`Above line.\n\n\`\`\`collection\nviews:\n  - type: ${type}\n    name: Cal\n    dateProperty: date\n\`\`\`\n\nAfter line.\n\nEnd line.\n`;

/** Seeds `Event-Note.md` dated today and opens `sample`, so the calendar views draw one event. */
async function openWithEvent(page: Page, sample: string): Promise<void> {
	await page.goto('/', { waitUntil: 'networkidle' });
	const date = await todayKey(page);
	await openAndSettle(page, sample, {}, { 'Event-Note.md': `---\ndate: ${date}\n---\nEvent body.\n` });
}

const EMPTY_SAMPLE =
	"Above line.\n\n```collection\nviews:\n  - type: table\n    name: T\n    filters: \"status == 'nope'\"\n```\n\nAfter line.\n\nEnd line.\n";
const ERROR_SAMPLE = 'Above line.\n\n```collection\nnope: 1\n```\n\nAfter line.\n\nEnd line.\n';

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
		await openAndSettle(page, SAMPLE, {}, OTHER_NOTE_FILES);
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

	for (const type of ['calendar', 'linear-calendar'] as const) {
		test(`${type} view: clicking the event opens its note and the block stays rendered`, async ({ lpPage: page }) => {
			await openWithEvent(page, calendarSample(type));
			const event = block(page).locator('.cm-lp-collection-table div', { hasText: /^Event-Note$/ }).first();
			await expect(event).toBeVisible({ timeout: 10_000 });

			await clickAtOffset(page, event, { from: 'center' });

			await expect(activeTab(page)).toContainText('Event-Note');
			await page.locator('.editor-tabs-bar [role="tab"]', { hasText: 'test.md' }).click();
			await expect(activeTab(page)).toContainText('test.md');
			await expect(block(page)).toHaveCount(1);
			expect(await isRevealed(page, RAW_FENCE)).toBe(false);
			expect(await activeLineText(page)).toBe(END_LINE);
		});

		test(`${type} view: clicking a header cell reveals the source like the header`, async ({ lpPage: page }) => {
			await openWithEvent(page, calendarSample(type));
			await expect(block(page).locator('.cm-lp-collection-table div', { hasText: /^Event-Note$/ }).first()).toBeVisible({
				timeout: 10_000,
			});
			// A header cell holds no event: the day-of-week label (calendar) or a day number (linear-calendar).
			const cell = block(page).locator('.cm-lp-collection-table th').nth(1);

			const click = await clickAtOffset(page, cell, { from: 'center' });
			expect(click.hit).toMatch(/^TH/);

			await expect(block(page)).toHaveCount(0);
			await expect.poll(() => isRevealed(page, RAW_FENCE)).toBe(true);
			await expect.poll(() => activeLineText(page)).toBe(RAW_FENCE);
		});
	}

	test('empty state: clicking the "No results" message reveals the source like the header', async ({ lpPage: page }) => {
		await openAndSettle(page, EMPTY_SAMPLE);
		const empty = page.locator('.cm-lp-collection-empty').first();
		await expect(empty).toHaveText('No results match the current filters', { timeout: 10_000 });

		const click = await clickAtOffset(page, empty, { from: 'left', dx: 40 });
		expect(click.hit).toBe('DIV.cm-lp-collection-empty');

		await expect(block(page)).toHaveCount(0);
		await expect.poll(() => isRevealed(page, RAW_FENCE)).toBe(true);
		await expect.poll(() => activeLineText(page)).toBe(RAW_FENCE);
	});

	test('error state: clicking the parse error reveals the source to fix', async ({ lpPage: page }) => {
		await openAndSettle(page, ERROR_SAMPLE);
		const error = page.locator('.cm-lp-collection-error').first();
		await expect(error).toContainText('Missing required field: views');

		const click = await clickAtOffset(page, error, { from: 'left', dx: 40 });
		expect(click.hit).toBe('DIV.cm-lp-collection-error');

		await expect(block(page)).toHaveCount(0);
		await expect.poll(() => isRevealed(page, RAW_FENCE)).toBe(true);
		await expect.poll(() => activeLineText(page)).toBe(RAW_FENCE);
	});

	test('error state: blank band below the error box keeps it rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, ERROR_SAMPLE);
		const band = await lineBandProbe(block(page));
		expect(band.below).toBeGreaterThan(2);

		const click = await clickAtOffset(page, block(page), { from: 'bottom', dy: Math.max(1, Math.floor(band.below / 2)) });
		expect(click.inOwnLine, "the press must land in the widget's own line").toBe(true);

		await expect(block(page)).toHaveCount(1);
		expect(await isRevealed(page, RAW_FENCE)).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe('');
	});
});
