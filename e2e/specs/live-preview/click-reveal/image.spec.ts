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

const IMAGE_URL = 'https://example.test/p.png';
const RAW_IMAGE = '![Alt';
const CONTENT = `Above line.\n\n![Alt](${IMAGE_URL})\n\nAfter line.\n\n${END_LINE}\n`;

/** 150x150 solid-grey PNG served in place of the remote asset; the img is zero-size without it. */
const STUB_PNG = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAJYAAACWCAIAAACzY+a1AAABb0lEQVR4nO3RQQkAMAzAwPpXVlkVsccI3CkIZJa4+R3AKwvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CPAvzLMyzMM/CvAN53wpz/wbXQQAAAABJRU5ErkJggg==',
	'base64',
);

/** Route the remote image to the stub and wait until the `<img>` has decoded it (150px wide). */
async function serveImage(page: Page): Promise<void> {
	await page.route(IMAGE_URL, (route) =>
		route.fulfill({ status: 200, contentType: 'image/png', body: STUB_PNG }),
	);
}

async function waitForImageDecoded(page: Page): Promise<void> {
	await expect
		.poll(() => page.locator('img.cm-lp-image').first().evaluate((img: HTMLImageElement) => img.naturalWidth))
		.toBe(150);
}

/** Clicks the blank band on one side of the widget wrapper, inside the wrapper's own `.cm-line`. */
async function clickBlankBand(page: Page, side: 'above' | 'below') {
	const wrapper = page.locator('.cm-lp-image-wrapper').first();
	const band = await lineBandProbe(wrapper);
	const gap = side === 'above' ? band.above : band.below;
	expect(gap, `${side} band must be measurable`).toBeGreaterThanOrEqual(2);
	const half = Math.ceil(gap / 2);
	const click = await clickAtOffset(
		page,
		wrapper,
		side === 'above' ? { from: 'top', dy: -half } : { from: 'bottom', dy: half },
	);
	expect(click.inOwnLine, "the press must land in the widget's own line").toBe(true);
	return click;
}

test.describe('Live Preview - click reveal: markdown image', () => {
	test.beforeEach(async ({ lpPage: page }) => {
		await serveImage(page);
	});

	test('blank band above the image keeps it rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		await waitForImageDecoded(page);

		const click = await clickBlankBand(page, 'above');
		expect(click.hit).not.toContain('cm-lp-image');

		expect(await activeLineText(page), `click hit ${click.hit}`).toBe('');
		expect(await isRevealed(page, RAW_IMAGE)).toBe(false);
		await expect(page.locator('img.cm-lp-image')).toHaveCount(1);
		await expect(page.locator('img.cm-lp-image')).toBeVisible();
	});

	test('blank band below the image keeps it rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		await waitForImageDecoded(page);

		const click = await clickBlankBand(page, 'below');
		expect(click.hit).not.toContain('cm-lp-image');

		expect(await activeLineText(page), `click hit ${click.hit}`).toBe('');
		expect(await isRevealed(page, RAW_IMAGE)).toBe(false);
		await expect(page.locator('img.cm-lp-image')).toHaveCount(1);
		await expect(page.locator('img.cm-lp-image')).toBeVisible();
	});

	test('click on the rendered image body keeps it rendered and leaves the cursor', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		await waitForImageDecoded(page);
		const img = page.locator('img.cm-lp-image').first();

		const click = await clickAtOffset(page, img);
		expect(click.hit).toBe('IMG.cm-lp-image');

		await expect(img).toBeVisible();
		expect(await isRevealed(page, RAW_IMAGE)).toBe(false);
		expect(await activeLineText(page)).toBe(END_LINE);
	});

	test('blank part of the full-width wrapper right of the image keeps it rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		await waitForImageDecoded(page);
		const wrapper = page.locator('.cm-lp-image-wrapper').first();
		const img = page.locator('img.cm-lp-image').first();
		const wrapperBox = await wrapper.boundingBox();
		const imgBox = await img.boundingBox();
		expect(wrapperBox && imgBox).toBeTruthy();
		const freeRight = wrapperBox!.x + wrapperBox!.width - (imgBox!.x + imgBox!.width);
		expect(freeRight, 'wrapper must extend past the image').toBeGreaterThanOrEqual(20);

		const click = await clickAtOffset(page, wrapper, { from: 'right', dx: -Math.floor(freeRight / 2) });
		expect(click.hit).toContain('cm-lp-image-wrapper');
		expect(click.x).toBeGreaterThan(imgBox!.x + imgBox!.width);

		await expect(img).toBeVisible();
		expect(await isRevealed(page, RAW_IMAGE)).toBe(false);
		expect(await activeLineText(page)).toBe(END_LINE);
	});

	test('click on the line after the image moves the cursor there and keeps the image rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		await waitForImageDecoded(page);
		const afterLine = page.locator('.cm-line').filter({ hasText: 'After line.' }).first();

		await clickAtOffset(page, afterLine, { from: 'left', dx: 4 });

		expect(await activeLineText(page)).toBe('After line.');
		await expect(page.locator('img.cm-lp-image')).toBeVisible();
		expect(await isRevealed(page, RAW_IMAGE)).toBe(false);
	});

	test('blank space left of the image, at its vertical center, keeps it rendered', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		await waitForImageDecoded(page);
		await clickLeftOfWidget(page, page.locator('.cm-lp-image-wrapper').first());

		await expect(page.locator('img.cm-lp-image')).toHaveCount(1);
		expect(await isRevealed(page, RAW_IMAGE)).toBe(false);
		await expect.poll(() => activeLineText(page)).toBe('End line.');
	});
});
