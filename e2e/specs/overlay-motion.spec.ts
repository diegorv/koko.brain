import type { Locator } from '@playwright/test';
import { test, expect, TEST_VAULT_PATH } from '../fixtures/test-vault';
import { listRow, openCommandPalette, showFolder } from '../fixtures/helpers';

/**
 * The shadcn overlay primitives animate through tw-animate-css classes
 * (`animate-in`, `fade-in-0`, `zoom-in-95`, ...). jsdom evaluates no CSS, so
 * only a real browser proves those classes emit an animation: without the
 * stylesheet `animationName` stays `none` and the overlay appears in one frame.
 */
async function animationName(locator: Locator): Promise<string> {
	return locator.evaluate((el) => getComputedStyle(el).animationName);
}

test.describe('Overlay motion', () => {
	test('the command palette dialog and its overlay animate in', async ({ vaultPage: page }) => {
		await openCommandPalette(page);

		const content = page.locator('[data-slot="dialog-content"]');
		const overlay = page.locator('[data-slot="dialog-overlay"]');
		await expect(content).toBeVisible();
		await expect(overlay).toBeVisible();

		expect(await animationName(content)).not.toBe('none');
		expect(await animationName(overlay)).not.toBe('none');
	});

	test('a file-row context menu animates in and out', async ({ vaultPage: page }) => {
		await showFolder(page, TEST_VAULT_PATH);
		await listRow(page, 'Inbox').first().click({ button: 'right' });

		const menu = page.locator('[data-slot="context-menu-content"]');
		await expect(menu).toBeVisible();

		expect(await animationName(menu)).not.toBe('none');

		// bits-ui keeps the content mounted with data-state="closed" until its
		// exit animation ends, so the `exit` keyframe is readable in that window.
		await page.keyboard.press('Escape');
		const closing = page.locator('[data-slot="context-menu-content"][data-state="closed"]');
		expect(await animationName(closing)).toBe('exit');
		await expect(menu).toBeHidden();
	});
});
