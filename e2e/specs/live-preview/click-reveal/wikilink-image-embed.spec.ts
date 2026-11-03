import type { Page } from '@playwright/test';
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

const CONTENT = 'Above line.\n\n![[pic.png]]\n\nAfter line.\n\nEnd line.\n';

const RAW_EMBED = '![[pic';
const WRAPPER = '.cm-lp-image-wrapper';

/** 150x150 solid-grey PNG served for the seeded image (the E2E asset URL is the file path itself). */
const STUB_PNG = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAJYAAACWCAIAAACzY+a1AAABb0lEQVR4nO3RQQkAMAzAwPpXVlkVsccI3CkIZJa4+R3AKwvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CvAN53wpz/wbXQQAAAABJRU5ErkJggg==',
	'base64',
);
const REAL_CONTENT = 'Above line.\n\n![[real.png]]\n\nAfter line.\n\nEnd line.\n';
const RAW_REAL = '![[real';

/** Seeds `real.png` in the vault, serves the stub PNG at its asset URL, opens the note and waits for the image to load. */
async function openWithRealImage(page: Page): Promise<void> {
	await page.route('**/test-vault/real.png', (route) =>
		route.fulfill({ status: 200, contentType: 'image/png', body: STUB_PNG }),
	);
	await openAndSettle(page, REAL_CONTENT, {}, { 'real.png': '' });
	await expect
		.poll(() => page.locator('img.cm-lp-image').first().evaluate((img) => (img as HTMLImageElement).naturalWidth))
		.toBe(150);
}

test.describe('Live Preview - click reveal: wikilink image embed', () => {
	test('blank band above the embed keeps it rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		const wrapper = page.locator(WRAPPER).first();
		const band = await lineBandProbe(wrapper);

		const click = await clickAtOffset(page, wrapper, { from: 'top', dy: -Math.floor(band.above / 2) });
		expect(click.inOwnLine, "the press must land in the widget's own line").toBe(true);
		expect(click.hit).not.toContain('cm-lp-image');

		await expect(page.locator(WRAPPER)).toHaveCount(1);
		expect(await isRevealed(page, RAW_EMBED)).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe('');
	});

	test('blank band below the embed keeps it rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		const wrapper = page.locator(WRAPPER).first();
		const band = await lineBandProbe(wrapper);

		const click = await clickAtOffset(page, wrapper, { from: 'bottom', dy: Math.floor(band.below / 2) });
		expect(click.inOwnLine, "the press must land in the widget's own line").toBe(true);
		expect(click.hit).not.toContain('cm-lp-image');

		await expect(page.locator(WRAPPER)).toHaveCount(1);
		expect(await isRevealed(page, RAW_EMBED)).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe('');
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

	test('blank space left of the embed, at its vertical center, keeps it rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		await clickLeftOfWidget(page, page.locator(WRAPPER).first());

		await expect(page.locator(WRAPPER)).toHaveCount(1);
		expect(await isRevealed(page, RAW_EMBED)).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe('End line.');
	});
});

test.describe('Live Preview - click reveal: wikilink image embed of an existing image', () => {
	test('the loaded image keeps rendered on a click on the image itself', async ({ lpPage: page }) => {
		await openWithRealImage(page);
		await expect(page.locator(`${WRAPPER}.cm-lp-image-missing`)).toHaveCount(0);
		const img = page.locator('img.cm-lp-image').first();

		const click = await clickAtOffset(page, img, { from: 'center' });
		expect(click.hit).toBe('IMG.cm-lp-image');

		await expect(page.locator(WRAPPER)).toHaveCount(1);
		expect(await isRevealed(page, RAW_REAL)).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe(END_LINE);
	});

	test('blank band above the loaded image keeps it rendered', async ({ lpPage: page }) => {
		await openWithRealImage(page);
		const wrapper = page.locator(WRAPPER).first();
		const band = await lineBandProbe(wrapper);
		expect(band.above).toBeGreaterThan(2);

		const click = await clickAtOffset(page, wrapper, { from: 'top', dy: -Math.floor(band.above / 2) });
		expect(click.inOwnLine, "the press must land in the widget's own line").toBe(true);
		expect(click.hit).not.toContain('cm-lp-image');

		await expect(page.locator(WRAPPER)).toHaveCount(1);
		expect(await isRevealed(page, RAW_REAL)).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe('');
	});

	test('blank band below the loaded image keeps it rendered', async ({ lpPage: page }) => {
		await openWithRealImage(page);
		const wrapper = page.locator(WRAPPER).first();
		const band = await lineBandProbe(wrapper);
		expect(band.below).toBeGreaterThan(2);

		const click = await clickAtOffset(page, wrapper, { from: 'bottom', dy: Math.floor(band.below / 2) });
		expect(click.inOwnLine, "the press must land in the widget's own line").toBe(true);
		expect(click.hit).not.toContain('cm-lp-image');

		await expect(page.locator(WRAPPER)).toHaveCount(1);
		expect(await isRevealed(page, RAW_REAL)).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe('');
	});

	test('blank space right of the loaded image, inside its line, keeps it rendered', async ({ lpPage: page }) => {
		await openWithRealImage(page);
		const img = page.locator('img.cm-lp-image').first();
		const band = await lineBandProbe(img);
		expect(band.right).toBeGreaterThan(40);

		const click = await clickAtOffset(page, img, { from: 'right', dx: 20 });
		expect(click.inOwnLine, "the press must land in the widget's own line").toBe(true);
		expect(click.hit).not.toBe('IMG.cm-lp-image');

		await expect(page.locator(WRAPPER)).toHaveCount(1);
		expect(await isRevealed(page, RAW_REAL)).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe(END_LINE);
	});
});
