// Click behavior around the rendered audio player (single-line `<audio>` block, MediaWidget audio).
import { test, expect } from '../../../fixtures/live-preview';
import {
	END_LINE,
	activeLineText,
	clickAtOffset,
	isRevealed,
	lineBandProbe,
	openAndSettle,
} from '../../../fixtures/click-reveal';

const SAMPLE = 'Above line.\n\n<audio src="clip.mp3"></audio>\n\nAfter line.\n\nEnd line.\n';
const WRAPPER = '.cm-lp-audio-wrapper';
const PLAYER = 'audio.cm-lp-audio';
const RAW_TAG = '<audio';

test.describe('Live Preview - click reveal - audio player', () => {
	test('blank band above the player stays rendered', async ({ lpPage: page }) => {
		// Known bug: the cm-widgetBuffer line box above the display:block audio wrapper maps the click into the replaced <audio> line and reveals the source.
		test.fail();
		await openAndSettle(page, SAMPLE);
		const wrapper = page.locator(WRAPPER).first();
		const band = await lineBandProbe(wrapper);
		expect(band.above).toBeGreaterThan(2);

		const click = await clickAtOffset(page, wrapper, { from: 'top', dy: -12 });
		expect(['DIV.cm-line', 'IMG.cm-widgetBuffer']).toContain(click.hit);

		await expect(page.locator(WRAPPER)).toHaveCount(1);
		expect(await isRevealed(page, RAW_TAG)).toBe(false);
		expect(await activeLineText(page)).toBe(END_LINE);
	});

	test('blank band below the player stays rendered', async ({ lpPage: page }) => {
		// Known bug: the cm-widgetBuffer line box below the display:block audio wrapper maps the click into the replaced <audio> line and reveals the source.
		test.fail();
		await openAndSettle(page, SAMPLE);
		const wrapper = page.locator(WRAPPER).first();
		const band = await lineBandProbe(wrapper);
		expect(band.below).toBeGreaterThan(2);

		const click = await clickAtOffset(page, wrapper, { from: 'bottom', dy: 12 });
		expect(['DIV.cm-line', 'IMG.cm-widgetBuffer']).toContain(click.hit);

		await expect(page.locator(WRAPPER)).toHaveCount(1);
		expect(await isRevealed(page, RAW_TAG)).toBe(false);
		expect(await activeLineText(page)).toBe(END_LINE);
	});

	test('the player controls take the press and the cursor does not move', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const player = page.locator(PLAYER).first();

		const click = await clickAtOffset(page, player, { from: 'left', dx: 14 });
		expect(click.hit).toMatch(/^AUDIO\.cm-lp-audio/);

		await expect(player).toHaveCount(1);
		await expect(page.locator(WRAPPER)).toHaveCount(1);
		expect(await isRevealed(page, RAW_TAG)).toBe(false);
		expect(await activeLineText(page)).toBe(END_LINE);
	});

	test('clicking the line after the player moves the cursor there and keeps the player rendered', async ({
		lpPage: page,
	}) => {
		await openAndSettle(page, SAMPLE);

		await page.locator('.cm-line').filter({ hasText: 'After line.' }).first().click();
		await page.waitForTimeout(150);

		await expect(page.locator(WRAPPER)).toHaveCount(1);
		expect(await isRevealed(page, RAW_TAG)).toBe(false);
		expect(await activeLineText(page)).toBe('After line.');
	});
});
