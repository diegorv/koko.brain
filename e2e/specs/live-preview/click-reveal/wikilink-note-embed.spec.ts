import type { Page } from '@playwright/test';
import { test, expect } from '../../../fixtures/live-preview';
import {
	END_LINE,
	activeLineText,
	clickAtOffset,
	clickLeftOfWidget,
	clickTextInLine,
	isRevealed,
	lineBandProbe,
	openAndSettle,
} from '../../../fixtures/click-reveal';

const CONTENT = 'Above line.\n\n![[Missing note]]\n\nAfter line.\n\nEnd line.\n';
const RAW_EMBED = '![[Missing';
const EMBED = '.cm-lp-embed';

const REAL_CONTENT = 'Above line.\n\n![[Embedded note]]\n\nAfter line.\n\nEnd line.\n';
const RAW_REAL = '![[Embedded';
const EMBEDDED_NOTE = 'Embedded body text.\nSecond embedded line.\n';

/** Seeds `Embedded note.md`, opens the note and waits for the embed to show its text. */
async function openWithRealNote(page: Page): Promise<void> {
	await openAndSettle(page, REAL_CONTENT, {}, { 'Embedded note.md': EMBEDDED_NOTE });
	await expect(page.locator('.cm-lp-embed-content').first()).toContainText('Second embedded line.');
	// The text grew the embed's line; park the cursor again so a no-op click is visible.
	await page.locator('.cm-line', { hasText: END_LINE }).first().click();
	await expect.poll(() => activeLineText(page)).toBe(END_LINE);
}

test.describe('Live Preview - click reveal: wikilink note embed', () => {
	test('blank band above the embed keeps it rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		const embed = page.locator(EMBED).first();
		const band = await lineBandProbe(embed);

		const click = await clickAtOffset(page, embed, { from: 'top', dy: -Math.floor(band.above / 2) });
		expect(click.inOwnLine, "the press must land in the widget's own line").toBe(true);
		expect(click.hit).not.toContain('cm-lp-embed');

		await expect(page.locator(EMBED)).toHaveCount(1);
		expect(await isRevealed(page, RAW_EMBED)).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe('');
	});

	test('blank band below the embed keeps it rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		const embed = page.locator(EMBED).first();
		const band = await lineBandProbe(embed);

		const click = await clickAtOffset(page, embed, { from: 'bottom', dy: Math.floor(band.below / 2) });
		expect(click.inOwnLine, "the press must land in the widget's own line").toBe(true);
		expect(click.hit).not.toContain('cm-lp-embed');

		await expect(page.locator(EMBED)).toHaveCount(1);
		expect(await isRevealed(page, RAW_EMBED)).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe('');
	});

	test('rendered body keeps the embed rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		const body = page.locator('.cm-lp-embed-content').first();

		const click = await clickAtOffset(page, body, { from: 'center' });
		expect(click.hit).toContain('cm-lp-embed-content');

		await expect(page.locator(EMBED)).toHaveCount(1);
		expect(await isRevealed(page, RAW_EMBED)).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe(END_LINE);
	});

	test('line after the embed takes the cursor and keeps the embed rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		const after = page.locator('.cm-line').filter({ hasText: 'After line.' }).first();

		await clickAtOffset(page, after, { from: 'center' });

		await expect.poll(() => activeLineText(page)).toBe('After line.');
		await expect(page.locator(EMBED)).toHaveCount(1);
		expect(await isRevealed(page, RAW_EMBED)).toBe(false);
	});

	test('header click opens the embedded note', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		const header = page.locator('.cm-lp-embed-header').first();

		await clickAtOffset(page, header, { from: 'left', dx: 200 });

		await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('Missing note');

		// The source note still shows the embed rendered, not its raw syntax.
		await page.locator('[role="tab"]', { hasText: 'test.md' }).click();
		await expect(page.locator(EMBED)).toHaveCount(1);
		expect(await isRevealed(page, RAW_EMBED)).toBe(false);
	});

	test('blank space left of the embed, at its vertical center, keeps it rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		await clickLeftOfWidget(page, page.locator(EMBED).first());

		await expect(page.locator(EMBED)).toHaveCount(1);
		expect(await isRevealed(page, RAW_EMBED)).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe('End line.');
	});
});

test.describe('Live Preview - click reveal: wikilink note embed of an existing note', () => {
	test('clicking the embedded text keeps the embed rendered and the cursor where it was', async ({ lpPage: page }) => {
		await openWithRealNote(page);
		const content = page.locator('.cm-lp-embed-content').first();
		await expect(content).not.toHaveClass(/cm-lp-embed-error/);

		const click = await clickTextInLine(page, page.locator('.cm-line').filter({ has: content }).first(), 'Second embedded');
		expect(click.hit).toContain('cm-lp-embed-content');

		await expect(page.locator(EMBED)).toHaveCount(1);
		expect(await isRevealed(page, RAW_REAL)).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe(END_LINE);
	});

	test('header click opens the existing note and leaves its content as it was', async ({ lpPage: page }) => {
		await openWithRealNote(page);

		await clickAtOffset(page, page.locator('.cm-lp-embed-header').first(), { from: 'left', dx: 200 });

		await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('Embedded note');
		await expect(page.locator('.cm-content')).toContainText('Embedded body text.');
		expect(await page.evaluate(() => window.__e2e.fs.readFile('/test-vault/Embedded note.md'))).toBe(EMBEDDED_NOTE);
	});

	test('blank band above the loaded embed keeps it rendered', async ({ lpPage: page }) => {
		await openWithRealNote(page);
		const embed = page.locator(EMBED).first();
		const band = await lineBandProbe(embed);
		expect(band.above).toBeGreaterThan(2);

		const click = await clickAtOffset(page, embed, { from: 'top', dy: -Math.floor(band.above / 2) });
		expect(click.inOwnLine, "the press must land in the widget's own line").toBe(true);
		expect(click.hit).not.toContain('cm-lp-embed');

		await expect(page.locator(EMBED)).toHaveCount(1);
		expect(await isRevealed(page, RAW_REAL)).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe('');
	});

	test('blank band below the loaded embed keeps it rendered', async ({ lpPage: page }) => {
		await openWithRealNote(page);
		const embed = page.locator(EMBED).first();
		const band = await lineBandProbe(embed);
		expect(band.below).toBeGreaterThan(2);

		const click = await clickAtOffset(page, embed, { from: 'bottom', dy: Math.floor(band.below / 2) });
		expect(click.inOwnLine, "the press must land in the widget's own line").toBe(true);
		expect(click.hit).not.toContain('cm-lp-embed');

		await expect(page.locator(EMBED)).toHaveCount(1);
		expect(await isRevealed(page, RAW_REAL)).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe('');
	});
});
