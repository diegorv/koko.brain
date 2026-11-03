import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../../../fixtures/live-preview';
import { clickOnLine } from '../../../fixtures/live-preview';
import {
	activeLineText,
	clickAtOffset,
	clickLeftOfWidget,
	isRevealed,
	lineBandProbe,
	openAndSettle,
} from '../../../fixtures/click-reveal';

/**
 * Click behavior around the table widget. The table is a block widget that
 * replaces its first line; the lines below it are hidden. Clicks in the blank
 * bands the widget's line box adds above and below its box, and clicks on the
 * wrapper's padding, must not reveal the source. Clicks on a cell must.
 */
const SAMPLE = 'Above line.\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\nAfter line.\n\nEnd line.\n';

/** Text that only exists in the raw markdown, never in the rendered widget. */
const RAW_SNIPPET = '| A |';

/** A table whose cells hold formatting and a task marker. Table cells render `[ ]` as text, not as a checkbox. */
const RICH_HEADER = '| Name | State |';
const RICH_ROW = '| **boldcell** | [ ] todo |';
const RICH_SAMPLE = `Above line.\n\n${RICH_HEADER}\n|---|---|\n${RICH_ROW}\n\nAfter line.\n\nEnd line.\n`;

const table = (page: Page): Locator => page.locator('table.cm-lp-table');
const wrapper = (page: Page): Locator => page.locator('.cm-lp-table-wrapper');

async function expectRendered(page: Page): Promise<void> {
	await expect(table(page)).toHaveCount(1);
	await expect.poll(() => isRevealed(page, RAW_SNIPPET)).toBe(false);
}

async function expectRevealed(page: Page): Promise<void> {
	await expect(table(page)).toHaveCount(0);
	await expect.poll(() => isRevealed(page, RAW_SNIPPET)).toBe(true);
}

/** Text of the cursor's line, or '' when the editor has no active line. */
async function activeText(page: Page): Promise<string> {
	return (await activeLineText(page)) ?? '';
}

test.describe('Live Preview - table click reveal', () => {
	test('blank band above the table stays rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const hit = await clickAtOffset(page, table(page), { from: 'top', dy: -10 });
		expect(hit.inOwnLine, "the press must land in the widget's own line").toBe(true);
		expect(hit.hit).not.toMatch(/BUTTON|TABLE|TD|TH/);
		await expectRendered(page);
		await expect.poll(() => activeText(page)).toBe('');
	});

	test('blank band below the table wrapper, under the +row button, stays rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const hit = await clickAtOffset(page, wrapper(page), { from: 'bottom', dy: 12 });
		expect(hit.inOwnLine, "the press must land in the widget's own line").toBe(true);
		expect(hit.hit).not.toMatch(/BUTTON|TABLE|TD|TH/);
		await expectRendered(page);
		await expect.poll(() => activeText(page)).toBe('');
	});

	test('bottom-right corner of the wrapper stays rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const box = (await wrapper(page).boundingBox())!;
		const hit = await clickAtOffset(page, wrapper(page), { from: 'bottom', dx: box.width / 2 - 12, dy: -4 });
		expect(hit.hit).not.toMatch(/BUTTON/);
		await expectRendered(page);
		await expect.poll(() => activeText(page)).toBe('End line.');
	});

	test('20px right of the line box, at the table vertical center, stays rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const band = await lineBandProbe(table(page));
		const hit = await clickAtOffset(page, table(page), { from: 'right', dx: band.right + 20 });
		expect(hit.hit).not.toMatch(/BUTTON/);
		await expectRendered(page);
		await expect.poll(() => activeText(page)).toBe('End line.');
	});

	test('left of the table, at its vertical center, stays rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		await clickLeftOfWidget(page, table(page));
		await expectRendered(page);
		await expect.poll(() => activeText(page)).toBe('End line.');
	});

	test('a click in a text line left padding puts the cursor at the start of that line', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const line = page.locator('.cm-line').filter({ hasText: 'After line.' }).first();
		const hit = await clickAtOffset(page, line, { from: 'left', dx: 2 });
		expect(hit.hit).toBe('DIV.cm-line');
		expect(hit.hitLine).toBe('After line.');
		await page.keyboard.type('X');
		await expect.poll(() => activeText(page)).toBe('XAfter line.');
		await expectRendered(page);
	});

	test('a click right of a text line box puts the cursor at the end of that line', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const line = page.locator('.cm-line').filter({ hasText: 'After line.' }).first();
		const hit = await clickAtOffset(page, line, { from: 'right', dx: 10 });
		expect(hit.hit).toMatch(/^DIV\.cm-content/);
		await page.keyboard.type('X');
		await expect.poll(() => activeText(page)).toBe('After line.X');
		await expectRendered(page);
	});

	test('the gap below the table is at most 12px larger than the gap above', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const gaps = await table(page).evaluate((el) => {
			const line = el.closest('.cm-line')!;
			// The table's source lines after the first are hidden, so skip zero-height siblings.
			const visible = (start: Element | null, step: (e: Element) => Element | null): Element => {
				let e = start;
				while (e && (!e.classList.contains('cm-line') || e.getBoundingClientRect().height === 0)) e = step(e);
				if (!e) throw new Error('no visible line next to the table');
				return e;
			};
			const prev = visible(line.previousElementSibling, (e) => e.previousElementSibling);
			const next = visible(line.nextElementSibling, (e) => e.nextElementSibling);
			const t = el.getBoundingClientRect();
			return {
				above: t.top - prev.getBoundingClientRect().bottom,
				below: next.getBoundingClientRect().top - t.bottom,
			};
		});
		expect(gaps.below, `above=${gaps.above} below=${gaps.below}`).toBeLessThanOrEqual(gaps.above + 12);
	});

	test('rendered body cell reveals the source', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		await clickAtOffset(page, table(page).locator('td').first());
		await expectRevealed(page);
		await expect.poll(() => activeText(page)).toMatch(/^\|/);
	});

	test('line right after the table gets the cursor and the table stays rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		await clickOnLine(page, 'After line.');
		await expectRendered(page);
		await expect.poll(() => activeText(page)).toBe('After line.');
	});

	test('clicking away after a reveal renders the table again', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		await clickAtOffset(page, table(page).locator('td').first());
		await expectRevealed(page);
		await clickOnLine(page, 'End line.');
		await expectRendered(page);
		await expect.poll(() => activeText(page)).toBe('End line.');
	});

	test('rendered header cell reveals the source and puts the cursor on the header line', async ({ lpPage: page }) => {
		await openAndSettle(page, RICH_SAMPLE);
		const th = table(page).locator('th', { hasText: 'Name' });

		const click = await clickAtOffset(page, th);
		expect(click.hit).toMatch(/^TH/);

		await expect(table(page)).toHaveCount(0);
		await expect.poll(() => isRevealed(page, RICH_HEADER)).toBe(true);
		await expect.poll(() => activeText(page)).toBe(RICH_HEADER);
	});

	test('bold text inside a cell reveals the source like any body cell', async ({ lpPage: page }) => {
		await openAndSettle(page, RICH_SAMPLE);
		const bold = table(page).locator('td strong', { hasText: 'boldcell' });
		await expect(bold).toHaveCount(1);

		const click = await clickAtOffset(page, bold);
		expect(click.hit).toBe('STRONG');

		// Like any body cell (see "rendered body cell reveals the source"): the source shows, the cursor is on a table line.
		await expect(table(page)).toHaveCount(0);
		await expect.poll(() => isRevealed(page, RICH_HEADER)).toBe(true);
		await expect.poll(() => isRevealed(page, '| [ ] todo |')).toBe(true);
		await expect.poll(() => activeText(page)).toMatch(/^\|/);
	});

	test('a cell holding a task marker shows it as text, and a click reveals the source like any body cell', async ({ lpPage: page }) => {
		await openAndSettle(page, RICH_SAMPLE);
		const cell = table(page).locator('td', { hasText: 'todo' });
		await expect(cell).toHaveText('[ ] todo');
		await expect(table(page).locator('input')).toHaveCount(0);

		const click = await clickAtOffset(page, cell);
		expect(click.hit).toMatch(/^TD/);

		// Like any body cell (see "rendered body cell reveals the source"): the source shows, the cursor is on a table line.
		await expect(table(page)).toHaveCount(0);
		await expect.poll(() => isRevealed(page, RICH_HEADER)).toBe(true);
		await expect.poll(() => isRevealed(page, '| [ ] todo |')).toBe(true);
		await expect.poll(() => activeText(page)).toMatch(/^\|/);
	});
});
