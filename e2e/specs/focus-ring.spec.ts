import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../fixtures/test-vault';
import { openCommandPalette, openFile, pressShortcut } from '../fixtures/helpers';

/**
 * Focus outlines come from CSS only (the `app.css` base layer and the dialog
 * primitive's classes). jsdom evaluates no stylesheet, so a real browser is
 * the only place to read the computed outline.
 */
test.describe('Focus ring', () => {
	test('a dialog focused as a whole draws no outline around itself', async ({ vaultPage: page }) => {
		await openFile(page, 'Welcome.md');
		await openCommandPalette(page);
		const input = page.locator('input[placeholder*="command"]:visible').first();
		await input.fill('View File History');
		await page.keyboard.press('Enter');

		// The closing palette stays mounted during its exit animation, so filter
		// by the open state.
		const content = page.locator('[data-slot="dialog-content"][data-state="open"]', {
			has: page.getByRole('heading', { name: 'File History: Welcome.md' }),
		});
		await expect(content).toBeVisible();
		// bits-ui focuses the first tabbable child (the close button). Move focus
		// to the content itself, as bits-ui does for a dialog with no tabbable
		// child; focus moved by script from a keyboard-focused element keeps
		// :focus-visible.
		await expect(content.locator(':focus')).toHaveCount(1);
		await content.evaluate((el) => el.focus());
		await expect(content).toBeFocused();
		// Chromium draws the UA `auto` outline only on :focus-visible, so without
		// this precondition the test could pass with no `outline-none` at all.
		expect(await content.evaluate((el) => el.matches(':focus-visible'))).toBe(true);

		expect(await content.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('none');
	});

	test('a raw button without its own focus style uses the theme ring color', async ({ vaultPage: page }) => {
		await page.locator('[data-rail-item="files"]').click();
		const navigator = page.locator('[data-files-navigator]');
		await expect(navigator).toBeVisible();

		// The folder disclosure toggle is a raw button with no focus class.
		const toggle = await tabUntil(page, () => navigator.locator('[data-files-navigator-title]').click(), '[data-files-navigator-toggle]');
		expect(await toggle.evaluate((el) => el.matches(':focus-visible'))).toBe(true);

		const { outlineColor, outlineStyle, ringColor } = await toggle.evaluate((el) => {
			const probe = document.createElement('div');
			probe.style.color = 'color-mix(in oklab, var(--ring) 50%, transparent)';
			document.body.appendChild(probe);
			const ring = getComputedStyle(probe).color;
			probe.remove();
			const style = getComputedStyle(el);
			return { outlineColor: style.outlineColor, outlineStyle: style.outlineStyle, ringColor: ring };
		});
		expect(outlineStyle).not.toBe('none');
		expect(outlineColor).toBe(ringColor);
	});

	test('a rail item focused by keyboard shows the ring', async ({ vaultPage: page }) => {
		// The strip's center sits under the rail toggle at 192 px.
		const item = await tabUntil(page, () => page.locator('[data-rail] [data-tauri-drag-region]').click({ position: { x: 4, y: 4 } }), '[data-rail-item]');
		await expectRing(item);
	});

	test('a Files navigator row focused by keyboard shows the ring', async ({ vaultPage: page }) => {
		await page.locator('[data-rail-item="files"]').click();
		const title = page.locator('[data-files-navigator-title]');
		await expect(title).toBeVisible();
		const row = await tabUntil(page, () => title.click(), '[data-files-navigator-root]');
		await expectRing(row);
	});

	test('a folder row rings when its toggle or folder-name button is focused by keyboard', async ({ vaultPage: page }) => {
		await page.locator('[data-rail-item="files"]').click();
		const title = page.locator('[data-files-navigator-title]');
		await expect(title).toBeVisible();

		const toggle = await tabUntil(page, () => title.click(), '[data-files-navigator-toggle]');
		const path = await toggle.getAttribute('data-files-navigator-toggle');
		expect(await toggle.evaluate((el) => el.matches(':focus-visible'))).toBe(true);
		const row = page.locator(`[data-files-navigator-row="${path}"]`);
		const ringColor = await ringToken(page);
		expect(await row.evaluate((el) => getComputedStyle(el).boxShadow)).toContain(ringColor);

		await page.keyboard.press('Tab');
		const name = row.locator(`[data-files-navigator-folder="${path}"]`);
		await expect(name).toBeFocused();
		expect(await name.evaluate((el) => el.matches(':focus-visible'))).toBe(true);
		expect(await row.evaluate((el) => getComputedStyle(el).boxShadow)).toContain(ringColor);
		// The row ring is the name button's only indicator, as on the vault-root row.
		expect(await name.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('none');
	});

	test('a folder-name button clicked with the mouse shows no ring', async ({ vaultPage: page }) => {
		await page.locator('[data-rail-item="files"]').click();
		const name = page.locator('[data-files-navigator-row] [data-files-navigator-folder]').first();
		await name.click();
		await expect(name).toBeFocused();
		expect(await name.evaluate((el) => el.matches(':focus-visible'))).toBe(false);
		expect(await name.evaluate((el) => getComputedStyle(el).boxShadow)).toBe('none');
		const row = name.locator('xpath=ancestor::*[@data-files-navigator-row][1]');
		expect(await row.evaluate((el) => getComputedStyle(el).boxShadow)).toBe('none');
	});

	test('a folder row being renamed shows no row ring', async ({ vaultPage: page }) => {
		await page.locator('[data-rail-item="files"]').click();
		const name = page.locator('[data-files-navigator-row] [data-files-navigator-folder]').first();
		const path = await name.getAttribute('data-files-navigator-folder');
		await name.click({ button: 'right' });
		await page.getByRole('menuitem', { name: 'Rename', exact: true }).click();

		const input = page.locator(`[data-files-navigator-rename="${path}"]`);
		await expect(input).toBeFocused();
		// The input draws its own border; only a focused button may ring the row.
		expect(await input.evaluate((el) => el.matches(':focus-visible'))).toBe(true);
		const row = page.locator(`[data-files-navigator-row="${path}"]`);
		expect(await row.evaluate((el) => getComputedStyle(el).boxShadow)).toBe('none');
	});

	test('a note-list row focused by keyboard shows the ring', async ({ vaultPage: page }) => {
		await openFile(page, 'Welcome.md');
		const row = await tabUntil(page, () => page.locator('[data-note-list-label]').click(), '[data-note-row]');
		await expectRing(row);
	});

	test('the Settings close and nav buttons focused by keyboard show the ring', async ({ vaultPage: page }) => {
		await pressShortcut(page, 'Mod+Comma');
		const panel = page.locator('[role="dialog"][aria-label="Settings"]');
		await expect(panel).toBeVisible();
		const heading = panel.getByRole('heading', { name: 'Settings', exact: true });

		// The title row holds no button, so the first Tab lands on the first nav item.
		await heading.click();
		await page.keyboard.press('Tab');
		const nav = page.locator(':focus');
		expect(await nav.evaluate((el) => el.matches('[role="dialog"][aria-label="Settings"] nav button:not([aria-label])'))).toBe(true);
		await expectRing(nav);

		// The close button sits in the content column's header, after the nav.
		const close = await tabUntil(page, () => heading.click(), 'button[aria-label="Close settings"]');
		await expectRing(close);
	});

	test('a rail item clicked with the mouse shows no ring', async ({ vaultPage: page }) => {
		const item = page.locator('[data-rail-item="files"]');
		await item.click();
		await expect(item).toBeFocused();
		expect(await item.evaluate((el) => el.matches(':focus-visible'))).toBe(false);
		expect(await item.evaluate((el) => getComputedStyle(el).boxShadow)).toBe('none');
	});
});

/**
 * Runs `start` (a click on a non-focusable element, which moves the sequential
 * focus start point there), then presses Tab until the focused element matches
 * `selector`. Tab is a real keyboard move, so the element is `:focus-visible`.
 */
async function tabUntil(page: Page, start: () => Promise<void>, selector: string): Promise<Locator> {
	await start();
	for (let i = 0; i < 30; i++) {
		await page.keyboard.press('Tab');
		if (await page.evaluate((s) => document.activeElement?.matches(s) ?? false, selector)) return page.locator(':focus');
	}
	throw new Error(`Tab never reached ${selector}`);
}

/** Resolves the `ring-ring/50` color (the ring token at 50%) as the browser computes it. */
async function ringToken(page: Page): Promise<string> {
	return page.evaluate(() => {
		const probe = document.createElement('div');
		probe.style.color = 'color-mix(in oklab, var(--ring) 50%, transparent)';
		document.body.appendChild(probe);
		const color = getComputedStyle(probe).color;
		probe.remove();
		return color;
	});
}

/** Asserts the element is keyboard focused and the ring utilities draw (they paint with box-shadow). */
async function expectRing(el: Locator): Promise<void> {
	expect(await el.evaluate((e) => e.matches(':focus-visible'))).toBe(true);
	expect(await el.evaluate((e) => getComputedStyle(e).boxShadow)).not.toBe('none');
}
