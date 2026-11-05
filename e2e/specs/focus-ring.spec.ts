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

		// The mock returns no snapshots, so File History has no tabbable child
		// and bits-ui focuses the content element itself. The closing palette
		// stays mounted during its exit animation, so filter by the open state.
		const content = page.locator('[data-slot="dialog-content"][data-state="open"]', {
			has: page.getByRole('heading', { name: 'File History: Welcome.md' }),
		});
		await expect(content).toBeVisible();
		await expect(content).toBeFocused();
		// Chromium draws the UA `auto` outline only on :focus-visible, so without
		// this precondition the test could pass with no `outline-none` at all.
		expect(await content.evaluate((el) => el.matches(':focus-visible'))).toBe(true);

		expect(await content.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('none');
	});

	test('a raw button without its own focus style uses the theme ring color', async ({ vaultPage: page }) => {
		await pressShortcut(page, 'Mod+Comma');
		const panel = page.locator('[role="dialog"][aria-label="Settings"]');
		await expect(panel).toBeVisible();

		// Clicking the non-focusable heading moves the sequential focus start
		// point there, so the next Tab lands on the close button right after it.
		await panel.getByRole('heading', { name: 'Settings', exact: true }).click();
		await page.keyboard.press('Tab');
		const close = page.locator('button[aria-label="Close settings"]');
		await expect(close).toBeFocused();
		expect(await close.evaluate((el) => el.matches(':focus-visible'))).toBe(true);

		const { outlineColor, outlineStyle, ringColor } = await close.evaluate((el) => {
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
});
