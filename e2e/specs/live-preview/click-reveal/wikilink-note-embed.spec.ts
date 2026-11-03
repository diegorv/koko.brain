import { test, expect } from '../../../fixtures/live-preview';
import {
	END_LINE,
	activeLineText,
	clickAtOffset,
	isRevealed,
	lineBandProbe,
	openAndSettle,
} from '../../../fixtures/click-reveal';

const CONTENT = 'Above line.\n\n![[Missing note]]\n\nAfter line.\n\nEnd line.\n';
const RAW_EMBED = '![[Missing';
const EMBED = '.cm-lp-embed';

test.describe('Live Preview - click reveal: wikilink note embed', () => {
	test('blank band above the embed keeps it rendered', async ({ lpPage: page }) => {
		// Known bug: the widget-buffer line box above the embed maps the click into the replaced range and reveals the source.
		test.fail();
		await openAndSettle(page, CONTENT);
		const embed = page.locator(EMBED).first();
		const band = await lineBandProbe(embed);

		const click = await clickAtOffset(page, embed, { from: 'top', dy: -Math.floor(band.above / 2) });
		expect(click.hit).not.toContain('cm-lp-embed');

		await expect(page.locator(EMBED)).toHaveCount(1);
		expect(await isRevealed(page, RAW_EMBED)).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe(END_LINE);
	});

	test('blank band below the embed keeps it rendered', async ({ lpPage: page }) => {
		// Known bug: the widget-buffer line box below the embed maps the click into the replaced range and reveals the source.
		test.fail();
		await openAndSettle(page, CONTENT);
		const embed = page.locator(EMBED).first();
		const band = await lineBandProbe(embed);

		const click = await clickAtOffset(page, embed, { from: 'bottom', dy: Math.floor(band.below / 2) });
		expect(click.hit).not.toContain('cm-lp-embed');

		await expect(page.locator(EMBED)).toHaveCount(1);
		expect(await isRevealed(page, RAW_EMBED)).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe(END_LINE);
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
		// Known bug: the header shows cursor:pointer but has no click handler (owner decision: a click opens the embedded note).
		test.fail();
		await openAndSettle(page, CONTENT);
		const header = page.locator('.cm-lp-embed-header').first();

		await clickAtOffset(page, header, { from: 'left', dx: 200 });

		await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('Missing note');
	});
});
