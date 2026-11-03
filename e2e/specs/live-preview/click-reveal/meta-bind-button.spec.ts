import type { Page } from '@playwright/test';
import { test, expect } from '../../../fixtures/live-preview';
import { openAndSettle, clickAtOffset, clickLeftOfWidget, activeLineText, isRevealed, END_LINE } from '../../../fixtures/click-reveal';

const SAMPLE = `---
status: todo
---
Above line.

\`\`\`meta-bind-button
label: Go
style: primary
actions:
  - type: updateMetadata
    prop: status
    value: done
\`\`\`

After line.

${END_LINE}
`;

const CONTAINER = '.cm-lp-meta-bind-button-container';
const BUTTON = '.cm-lp-meta-bind-btn';
const FENCE = '```meta-bind-button';
const NOTE_PATH = '/test-vault/test.md';

async function readNote(page: Page): Promise<string> {
	return page.evaluate((p) => window.__e2e.fs.readFile(p), NOTE_PATH);
}

test.describe('Click reveal: meta-bind button block', () => {
	// Owner decision: the band above stays rendered like every other block band; the keyboard or source mode reaches the YAML.
	test('blank band 2-20px above the container stays rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const click = await clickAtOffset(page, page.locator(CONTAINER).first(), { from: 'top', dy: -10 });
		expect(click.inOwnLine, "the press must land in the widget's own line").toBe(true);
		expect(click.hit).not.toContain('meta-bind');
		await expect(page.locator(BUTTON)).toBeVisible();
		expect(await isRevealed(page, FENCE)).toBe(false);
		expect(await activeLineText(page)).toBe('');
	});

	test('blank band 2-20px below the container stays rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const click = await clickAtOffset(page, page.locator(CONTAINER).first(), { from: 'bottom', dy: 10 });
		expect(click.inOwnLine, "the press must land in the widget's own line").toBe(true);
		expect(click.hit).not.toContain('meta-bind');
		await expect(page.locator(BUTTON)).toBeVisible();
		expect(await isRevealed(page, FENCE)).toBe(false);
		expect(await activeLineText(page)).toBe('');
	});

	test('the button acts (status becomes done) and stays rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const button = page.locator(BUTTON).first();
		await button.click();
		await expect.poll(() => readNote(page)).toContain('status: done');
		await expect(button).toBeVisible();
		expect(await isRevealed(page, FENCE)).toBe(false);
		expect(await activeLineText(page)).toBe(END_LINE);
	});

	test('blank part of the container right of the button stays rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const click = await clickAtOffset(page, page.locator(CONTAINER).first(), { from: 'right', dx: -5 });
		expect(click.hit).toContain('cm-lp-meta-bind-button-container');
		await expect(page.locator(BUTTON)).toBeVisible();
		expect(await isRevealed(page, FENCE)).toBe(false);
		expect(await activeLineText(page)).toBe(END_LINE);
	});

	test('line right after the block takes the cursor and the block stays rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		await page.locator('.cm-line').filter({ hasText: 'After line.' }).first().click();
		await page.waitForTimeout(150);
		expect(await activeLineText(page)).toBe('After line.');
		await expect(page.locator(BUTTON)).toBeVisible();
		expect(await isRevealed(page, FENCE)).toBe(false);
	});

	test('blank space left of the container, at its vertical center, keeps it rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		await clickLeftOfWidget(page, page.locator(CONTAINER).first());

		await expect(page.locator(BUTTON)).toBeVisible();
		expect(await isRevealed(page, FENCE)).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe(END_LINE);
	});
});
