import type { Page } from '@playwright/test';
import { test, expect } from '../../../fixtures/live-preview';
import {
	END_LINE,
	activeLineText,
	clickAtOffset,
	clickLeftOfWidget,
	isRevealed,
	openAndSettle,
} from '../../../fixtures/click-reveal';

const RAW_FENCE = '```queryjs';
const MANUAL = { queryjs: { autoRunQueries: 'manual' } };
const FIRST_OPEN = { queryjs: { autoRunQueries: 'first-open' } };

const CONTENT = 'Above line.\n\n```queryjs\nkb.paragraph("QOUT");\n```\n\nAfter line.\n\nEnd line.\n';

// The first run throws, the retry succeeds. `window` is the global the script runs in (kb-api.ts runQueryjsBlock).
const RETRY_CONTENT =
	'Above line.\n\n```queryjs\n' +
	'if (!window.__qjsTries) { window.__qjsTries = 1; throw new Error("QJS_FIRST_FAIL"); }\n' +
	'kb.paragraph("QJS_RETRY_OK");\n' +
	'```\n\nAfter line.\n\nEnd line.\n';

// Counts executions on the global so a re-run is visible even when its output is identical.
const COUNTED_CONTENT =
	'Above line.\n\n```queryjs\n' +
	'window.__qjsRuns = (window.__qjsRuns ?? 0) + 1;\n' +
	'kb.paragraph("QOUT");\n' +
	'```\n\nAfter line.\n\nEnd line.\n';

async function runCount(page: Page): Promise<number | undefined> {
	return page.evaluate(() => (window as unknown as { __qjsRuns?: number }).__qjsRuns);
}

test.describe('Live Preview - click reveal: QueryJS block', () => {
	test('blank band above the widget keeps it rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT, MANUAL);
		const block = page.locator('.cm-lp-qjs-block').first();

		const click = await clickAtOffset(page, block, { from: 'top', dy: -8 });
		expect(click.inOwnLine, "the press must land in the widget's own line").toBe(true);
		expect(click.hit).toBe('DIV.cm-line');

		await expect(page.locator('.cm-lp-qjs-block')).toHaveCount(1);
		expect(await isRevealed(page, RAW_FENCE)).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe('');
	});

	test('blank band below the widget keeps it rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT, MANUAL);
		const block = page.locator('.cm-lp-qjs-block').first();

		const click = await clickAtOffset(page, block, { from: 'bottom', dy: 8 });
		expect(click.inOwnLine, "the press must land in the widget's own line").toBe(true);
		expect(click.hit).toBe('DIV.cm-line');

		await expect(page.locator('.cm-lp-qjs-block')).toHaveCount(1);
		expect(await isRevealed(page, RAW_FENCE)).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe('');
	});

	test('Run button runs the script, stays rendered, and leaves the cursor alone', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT, MANUAL);
		const run = page.locator('button.cm-lp-qjs-run').first();

		const click = await clickAtOffset(page, run);
		expect(click.hit).toBe('BUTTON.cm-lp-qjs-run');

		await expect(page.locator('.cm-lp-qjs-block')).toContainText('QOUT');
		await expect(page.locator('.cm-lp-qjs-block')).toHaveCount(1);
		expect(await isRevealed(page, RAW_FENCE)).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe(END_LINE);
	});

	test('Run again retries a failed script, stays rendered, and leaves the cursor alone', async ({ lpPage: page }) => {
		await openAndSettle(page, RETRY_CONTENT, MANUAL);
		await clickAtOffset(page, page.locator('button.cm-lp-qjs-run').first());
		await expect(page.locator('.cm-lp-qjs-error-title')).toContainText('QJS_FIRST_FAIL');

		const retry = page.locator('.cm-lp-qjs-error button.cm-lp-qjs-run').first();
		const click = await clickAtOffset(page, retry);
		expect(click.hit).toBe('BUTTON.cm-lp-qjs-run');

		await expect(page.locator('.cm-lp-qjs-block')).toContainText('QJS_RETRY_OK');
		await expect(page.locator('.cm-lp-qjs-block')).toHaveCount(1);
		expect(await isRevealed(page, RAW_FENCE)).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe(END_LINE);
	});

	test('rendered placeholder reveals the source', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT, MANUAL);
		const placeholder = page.locator('.cm-lp-qjs-loading', { hasText: 'Query not run yet' }).first();

		const click = await clickAtOffset(page, placeholder, { from: 'left', dx: 40 });
		expect(click.hit).toBe('DIV.cm-lp-qjs-loading');

		await expect(page.locator('.cm-lp-qjs-block')).toHaveCount(0);
		expect(await isRevealed(page, RAW_FENCE)).toBe(true);
		await expect.poll(() => activeLineText(page)).toBe(RAW_FENCE);
	});

	test('line after the block takes the cursor, block stays rendered, script not re-run', async ({ lpPage: page }) => {
		await openAndSettle(page, COUNTED_CONTENT, FIRST_OPEN);
		await expect(page.locator('.cm-lp-qjs-block')).toContainText('QOUT');
		expect(await runCount(page)).toBe(1);

		await page.locator('.cm-line').filter({ hasText: 'After line.' }).first().click();

		await expect.poll(() => activeLineText(page)).toBe('After line.');
		await expect(page.locator('.cm-lp-qjs-block')).toHaveCount(1);
		await expect(page.locator('.cm-lp-qjs-block')).toContainText('QOUT');
		await expect(page.locator('button.cm-lp-qjs-run')).toHaveCount(0);
		expect(await isRevealed(page, RAW_FENCE)).toBe(false);
		expect(await runCount(page)).toBe(1);
	});

	test('blank space left of the widget, at its vertical center, keeps it rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT, MANUAL);
		await clickLeftOfWidget(page, page.locator('.cm-lp-qjs-block').first());

		await expect(page.locator('.cm-lp-qjs-block')).toHaveCount(1);
		expect(await isRevealed(page, RAW_FENCE)).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe('End line.');
	});

	test('rendered output text reveals the source like the placeholder', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT, FIRST_OPEN);
		const output = page.locator('.cm-lp-qjs-block').getByText('QOUT', { exact: true }).first();
		await expect(output).toBeVisible();

		const click = await clickAtOffset(page, output, { from: 'center' });
		expect(click.hitLine).toContain('QOUT');

		await expect(page.locator('.cm-lp-qjs-block')).toHaveCount(0);
		expect(await isRevealed(page, RAW_FENCE)).toBe(true);
		await expect.poll(() => activeLineText(page)).toBe(RAW_FENCE);
	});
});
