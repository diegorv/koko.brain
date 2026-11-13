// Click behavior around the rendered video player (single-line `<video>` block, MediaWidget video).
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

const SAMPLE = 'Above line.\n\n<video src="clip.mp4"></video>\n\nAfter line.\n\nEnd line.\n';
const WRAPPER = '.cm-lp-video-wrapper';
const PLAYER = 'video.cm-lp-video';
const RAW_TAG = '<video';

test.describe('Live Preview - click reveal - video player', () => {
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

	test('the player takes the press and the cursor does not move', async ({ lpPage: page }) => {
		await openAndSettle(page, SAMPLE);
		const player = page.locator(PLAYER).first();
		await player.evaluate((el) => {
			el.addEventListener('mousedown', () => {
				el.dataset.clickProbe = 'pressed';
			});
		});

		const click = await clickAtOffset(page, player, { from: 'center' });
		expect(click.hit).toMatch(/^VIDEO\.cm-lp-video/);

		await expect(player).toHaveAttribute('data-click-probe', 'pressed');
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
});
