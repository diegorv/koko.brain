import { test, expect } from '../../../fixtures/live-preview';
import {
	END_LINE,
	activeLineText,
	clickAtOffset,
	isRevealed,
	lineBandProbe,
	openAndSettle,
} from '../../../fixtures/click-reveal';

const CONTENT = 'Above line.\n\n![[pic.png]]\n\nAfter line.\n\nEnd line.\n';
const RAW_EMBED = '![[pic';
const WRAPPER = '.cm-lp-image-wrapper';

test.describe('Live Preview - click reveal: wikilink image embed', () => {
	test('blank band above the embed keeps it rendered', async ({ lpPage: page }) => {
		// Known bug: the widget-buffer line box above the embed maps the click into the replaced range and reveals the source.
		test.fail();
		await openAndSettle(page, CONTENT);
		const wrapper = page.locator(WRAPPER).first();
		const band = await lineBandProbe(wrapper);

		const click = await clickAtOffset(page, wrapper, { from: 'top', dy: -Math.floor(band.above / 2) });
		expect(click.hit).not.toContain('cm-lp-image');

		await expect(page.locator(WRAPPER)).toHaveCount(1);
		expect(await isRevealed(page, RAW_EMBED)).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe(END_LINE);
	});

	test('blank band below the embed keeps it rendered', async ({ lpPage: page }) => {
		// Known bug: the widget-buffer line box below the embed maps the click into the replaced range and reveals the source.
		test.fail();
		await openAndSettle(page, CONTENT);
		const wrapper = page.locator(WRAPPER).first();
		const band = await lineBandProbe(wrapper);

		const click = await clickAtOffset(page, wrapper, { from: 'bottom', dy: Math.floor(band.below / 2) });
		expect(click.hit).not.toContain('cm-lp-image');

		await expect(page.locator(WRAPPER)).toHaveCount(1);
		expect(await isRevealed(page, RAW_EMBED)).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe(END_LINE);
	});

	test('rendered body keeps the embed rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		const wrapper = page.locator(WRAPPER).first();

		const click = await clickAtOffset(page, wrapper, { from: 'center' });
		expect(click.hit).toContain('cm-lp-image-wrapper');

		await expect(page.locator(WRAPPER)).toHaveCount(1);
		expect(await isRevealed(page, RAW_EMBED)).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe(END_LINE);
	});

	test('line after the embed takes the cursor and keeps the embed rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		const after = page.locator('.cm-line').filter({ hasText: 'After line.' }).first();

		await clickAtOffset(page, after, { from: 'center' });

		await expect(page.locator(WRAPPER)).toHaveCount(1);
		expect(await isRevealed(page, RAW_EMBED)).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe('After line.');
	});
});
