import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../../../fixtures/live-preview';
import { END_LINE, activeLineText, clickAtOffset, isRevealed, openAndSettle } from '../../../fixtures/click-reveal';

const LINK_LINE = 'A [link](https://x.test) and <https://auto.test> and https://bare.test here.';
const RAW_LINK = '[link](https://x.test)';
const RAW_AUTOLINK = '<https://auto.test>';
const CONTENT = `Above line.\n\n${LINK_LINE}\n\n${END_LINE}\n`;

/**
 * Asserts the centre of `link` is inside the `.cm-lp-link` element before the
 * press. `clickAtOffset`'s `hit` names the innermost node (a CodeMirror
 * syntax span), which does not carry the link class.
 */
async function expectCentreOnLink(link: Locator): Promise<void> {
	const box = await link.boundingBox();
	if (!box) throw new Error('link has no bounding box');
	const inside = await link.evaluate(
		(el, p) => el.contains(document.elementFromPoint(p.x, p.y)),
		{ x: box.x + box.width / 2, y: box.y + box.height / 2 },
	);
	expect(inside, 'click point must be on the link text').toBe(true);
}

/** URLs the app handed to the opener plugin (`openUrl`), in call order. */
async function openedUrls(page: Page): Promise<string[]> {
	return page.evaluate(() => [...window.__e2e.opener.urls]);
}

test.describe('Live Preview - click reveal: markdown link', () => {
	test('plain click on the rendered link text reveals its source and puts the cursor on that line', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		const link = page.locator('.cm-lp-link', { hasText: 'link' }).first();
		await expect(link).toBeVisible();
		await expectCentreOnLink(link);

		const click = await clickAtOffset(page, link);

		expect(await activeLineText(page), `click hit ${click.hit}`).toBe(LINK_LINE);
		expect(await isRevealed(page, RAW_LINK)).toBe(true);
		await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('test.md');
	});

	test('Cmd/Ctrl+click on the rendered link text opens its URL, keeps it rendered and leaves the cursor where it was', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		const link = page.locator('.cm-lp-link', { hasText: 'link' }).first();
		await expect(link).toBeVisible();
		await expectCentreOnLink(link);

		await page.keyboard.down('ControlOrMeta');
		let click;
		try {
			click = await clickAtOffset(page, link);
		} finally {
			await page.keyboard.up('ControlOrMeta');
		}

		expect(await activeLineText(page), `click hit ${click.hit}`).toBe(END_LINE);
		expect(await isRevealed(page, RAW_LINK)).toBe(false);
		await expect(link).toHaveText('link');
		await expect.poll(() => openedUrls(page)).toEqual(['https://x.test']);
	});

	test('plain click on the rendered autolink reveals its <url> source and puts the cursor on that line', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		const link = page.locator('.cm-lp-link', { hasText: 'auto.test' }).first();
		await expectCentreOnLink(link);
		expect(await isRevealed(page, RAW_AUTOLINK)).toBe(false);

		const click = await clickAtOffset(page, link);

		expect(await activeLineText(page), `click hit ${click.hit}`).toBe(LINK_LINE);
		expect(await isRevealed(page, RAW_AUTOLINK)).toBe(true);
		expect(await openedUrls(page)).toEqual([]);
	});

	test('plain click on a bare URL puts the cursor on that line and opens nothing', async ({ lpPage: page }) => {
		await openAndSettle(page, CONTENT);
		const link = page.locator('.cm-lp-link', { hasText: 'bare.test' }).first();
		await expectCentreOnLink(link);

		const click = await clickAtOffset(page, link);

		expect(await activeLineText(page), `click hit ${click.hit}`).toBe(LINK_LINE);
		expect(await isRevealed(page, RAW_LINK)).toBe(true);
		expect(await openedUrls(page)).toEqual([]);
	});

	for (const [name, text, url] of [
		['autolink', 'auto.test', 'https://auto.test'],
		['bare URL', 'bare.test', 'https://bare.test'],
	] as const) {
		test(`Cmd/Ctrl+click on the ${name} opens it, keeps the line rendered and leaves the cursor where it was`, async ({ lpPage: page }) => {
			await openAndSettle(page, CONTENT);
			const link = page.locator('.cm-lp-link', { hasText: text }).first();
			await expectCentreOnLink(link);

			await page.keyboard.down('ControlOrMeta');
			let click;
			try {
				click = await clickAtOffset(page, link);
			} finally {
				await page.keyboard.up('ControlOrMeta');
			}

			await expect.poll(() => openedUrls(page), `click hit ${click.hit}`).toEqual([url]);
			expect(await activeLineText(page)).toBe(END_LINE);
			expect(await isRevealed(page, RAW_LINK)).toBe(false);
			expect(await isRevealed(page, RAW_AUTOLINK)).toBe(false);
		});
	}
});
