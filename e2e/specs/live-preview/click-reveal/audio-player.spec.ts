// Click behavior around the rendered audio player (single-line `<audio>` block, MediaWidget audio).
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

const SAMPLE = 'Above line.\n\n<audio src="clip.mp3"></audio>\n\nAfter line.\n\nEnd line.\n';
const WRAPPER = '.cm-lp-audio-wrapper';
const PLAYER = 'audio.cm-lp-audio';
const RAW_TAG = '<audio';

test.describe('Live Preview - click reveal - audio player', () => {
	test('blank band above the player stays rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const wrapper = page.locator(WRAPPER).first();
		const band = await lineBandProbe(wrapper);
		expect(band.above).toBeGreaterThan(2);

		const click = await clickAtOffset(page, wrapper, { from: 'top', dy: -12 });
		expect(click.inOwnLine, "the press must land in the widget's own line").toBe(true);
		expect(['DIV.cm-line', 'IMG.cm-widgetBuffer']).toContain(click.hit);

		await expect(page.locator(WRAPPER)).toHaveCount(1);
		expect(await isRevealed(page, RAW_TAG)).toBe(false);
		expect(await activeLineText(page)).toBe('');
	});

	test('blank band below the player stays rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const wrapper = page.locator(WRAPPER).first();
		const band = await lineBandProbe(wrapper);
		expect(band.below).toBeGreaterThan(2);

		const click = await clickAtOffset(page, wrapper, { from: 'bottom', dy: 12 });
		expect(click.inOwnLine, "the press must land in the widget's own line").toBe(true);
		expect(['DIV.cm-line', 'IMG.cm-widgetBuffer']).toContain(click.hit);

		await expect(page.locator(WRAPPER)).toHaveCount(1);
		expect(await isRevealed(page, RAW_TAG)).toBe(false);
		expect(await activeLineText(page)).toBe('');
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

	test('blank space left of the player, at its vertical center, keeps it rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		await clickLeftOfWidget(page, page.locator(WRAPPER).first());

		await expect(page.locator(WRAPPER)).toHaveCount(1);
		expect(await isRevealed(page, RAW_TAG)).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe('End line.');
	});

	test("the wrapper's own padding above the player keeps it rendered and the cursor where it was", async ({ lpPage: page }) => {
		// Known bug: MediaWidget ignores the press without preventDefault, so the browser's own caret lands at the start of "Above line.".
		test.fail();
		await openAndSettle(page, SAMPLE);
		const wrapper = page.locator(WRAPPER).first();
		const pad = await wrapper.evaluate((el) => {
			const w = el.getBoundingClientRect();
			const a = el.querySelector('audio')!.getBoundingClientRect();
			return { top: a.top - w.top, bottom: w.bottom - a.bottom };
		});
		expect(pad.top, 'the wrapper must have padding above the player').toBeGreaterThanOrEqual(3);

		const click = await clickAtOffset(page, wrapper, { from: 'top', dy: Math.floor(pad.top / 2) });
		expect(click.hit).toBe('DIV.cm-lp-audio-wrapper');

		await expect(page.locator(WRAPPER)).toHaveCount(1);
		expect(await isRevealed(page, RAW_TAG)).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe(END_LINE);
	});

	test("the wrapper's own padding below the player keeps it rendered and the cursor where it was", async ({ lpPage: page }) => {
		// Known bug: MediaWidget ignores the press without preventDefault, so the browser's own caret lands at the start of "Above line.".
		test.fail();
		await openAndSettle(page, SAMPLE);
		const wrapper = page.locator(WRAPPER).first();
		const pad = await wrapper.evaluate((el) => {
			const w = el.getBoundingClientRect();
			const a = el.querySelector('audio')!.getBoundingClientRect();
			return { top: a.top - w.top, bottom: w.bottom - a.bottom };
		});
		expect(pad.bottom, 'the wrapper must have padding below the player').toBeGreaterThanOrEqual(3);

		const click = await clickAtOffset(page, wrapper, { from: 'bottom', dy: -Math.ceil(pad.bottom / 2) });
		expect(click.hit).toBe('DIV.cm-lp-audio-wrapper');

		await expect(page.locator(WRAPPER)).toHaveCount(1);
		expect(await isRevealed(page, RAW_TAG)).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe(END_LINE);
	});
});
