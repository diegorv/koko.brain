// Click behavior around a rendered Mermaid diagram block (```mermaid fence, MermaidWidget).
import type { Page } from '@playwright/test';
import { test, expect } from '../../../fixtures/live-preview';
import {
	openAndSettle,
	clickAtOffset,
	clickLeftOfWidget,
	activeLineText,
	isRevealed,
	lineBandProbe,
	END_LINE,
} from '../../../fixtures/click-reveal';

const SAMPLE = 'Above line.\n\n```mermaid\ngraph TD\n  A-->B\n```\n\nAfter line.\n\nEnd line.\n';
const WIDGET = '.cm-lp-mermaid';
const SVG = '.cm-lp-mermaid-diagram svg';
const HEADER = '.cm-lp-mermaid-header';
const RAW_FENCE = '```mermaid';

/** Opens the sample and waits for the async SVG, which grows the line and shifts "End line." when it lands. */
async function openRendered(page: Page): Promise<void> {
	await openAndSettle(page, SAMPLE);
	await expect(page.locator(SVG)).toBeVisible({ timeout: 10_000 });
}

test.describe('Live Preview - click reveal - mermaid block', () => {
	test('blank band above the diagram stays rendered', async ({ lpPage: page }) => {
		await openRendered(page);
		const widget = page.locator(WIDGET).first();
		const band = await lineBandProbe(widget);
		expect(band.above).toBeGreaterThan(2);

		const click = await clickAtOffset(page, widget, { from: 'top', dy: -12 });
		expect(click.inOwnLine, "the press must land in the widget's own line").toBe(true);
		expect(click.hit).not.toContain('cm-lp-mermaid');

		await expect(page.locator(WIDGET)).toHaveCount(1);
		expect(await isRevealed(page, RAW_FENCE)).toBe(false);
		expect(await activeLineText(page)).toBe('');
	});

	test('blank band below the diagram stays rendered', async ({ lpPage: page }) => {
		await openRendered(page);
		const widget = page.locator(WIDGET).first();
		const band = await lineBandProbe(widget);
		expect(band.below).toBeGreaterThan(2);

		const click = await clickAtOffset(page, widget, { from: 'bottom', dy: 12 });
		expect(click.inOwnLine, "the press must land in the widget's own line").toBe(true);
		expect(click.hit).not.toContain('cm-lp-mermaid');

		await expect(page.locator(WIDGET)).toHaveCount(1);
		expect(await isRevealed(page, RAW_FENCE)).toBe(false);
		expect(await activeLineText(page)).toBe('');
	});

	test('rendered SVG body stays rendered and the cursor does not move', async ({ lpPage: page }) => {
		await openRendered(page);

		const click = await clickAtOffset(page, page.locator(SVG).first(), { from: 'center' });
		expect(click.hit).not.toBe('DIV.cm-line');

		await expect(page.locator(WIDGET)).toHaveCount(1);
		expect(await isRevealed(page, RAW_FENCE)).toBe(false);
		expect(await activeLineText(page)).toBe(END_LINE);
	});

	test('header stays rendered and the cursor does not move', async ({ lpPage: page }) => {
		await openRendered(page);

		const click = await clickAtOffset(page, page.locator(HEADER).first(), { from: 'center' });
		expect(click.hit).not.toBe('DIV.cm-line');

		await expect(page.locator(WIDGET)).toHaveCount(1);
		expect(await isRevealed(page, RAW_FENCE)).toBe(false);
		expect(await activeLineText(page)).toBe(END_LINE);
	});

	test('clicking the line after the diagram moves the cursor there and keeps it rendered', async ({ lpPage: page }) => {
		await openRendered(page);

		await page.locator('.cm-line').filter({ hasText: 'After line.' }).first().click();
		await page.waitForTimeout(150);

		await expect(page.locator(WIDGET)).toHaveCount(1);
		expect(await isRevealed(page, RAW_FENCE)).toBe(false);
		expect(await activeLineText(page)).toBe('After line.');
	});

	test('blank space left of the diagram, at its vertical center, keeps it rendered', async ({ lpPage: page }) => {
		await openRendered(page);
		await clickLeftOfWidget(page, page.locator(WIDGET).first());

		await expect(page.locator(WIDGET)).toHaveCount(1);
		expect(await isRevealed(page, RAW_FENCE)).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe('End line.');
	});
});
