import type { Page } from '@playwright/test';
import { test, expect, TEST_FILES, TEST_VAULT_PATH } from '../fixtures/test-vault';
import { expectTabActive, pressShortcut } from '../fixtures/helpers';

const SETTINGS_PATH = `${TEST_VAULT_PATH}/.kokobrain/settings.json`;

/** The fixture vault with `activeTheme` set in its settings.json. */
function vaultWithTheme(activeTheme: string): Record<string, string> {
	const settings = JSON.parse(TEST_FILES[SETTINGS_PATH]);
	settings.appearance = { activeTheme };
	return { ...TEST_FILES, [SETTINGS_PATH]: JSON.stringify(settings, null, 2) };
}

/** The computed `color-scheme` of `<html>`; jsdom has no cascade, so only a real browser can read it. */
function rootColorScheme(page: Page): Promise<string> {
	return page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
}

/** Opens the Graph tab and asserts its canvas container paints `background`. */
async function expectGraphBackground(page: Page, background: string): Promise<void> {
	await pressShortcut(page, 'Mod+G');
	await expectTabActive(page, 'Graph View');
	await expect(page.locator('[data-testid="graph-view"]')).toHaveCSS('background-color', background);
}

/**
 * The emulated OS appearance is set opposite to the theme, so each case fails
 * if the mode followed `prefers-color-scheme` instead of the applied theme.
 */
test.describe('Theme mode', () => {
	test.describe('a light theme on a dark OS', () => {
		test.use({ colorScheme: 'dark', vaultFiles: vaultWithTheme('Lavender Haze') });

		test('renders light', async ({ vaultPage: page }) => {
			await expect(page.locator('html')).not.toHaveClass(/(^|\s)dark(\s|$)/);
			await expect.poll(() => rootColorScheme(page)).toBe('light');
		});

		test('keeps the derived code and meta-bind colors', async ({ vaultPage: page }) => {
			await expect.poll(() => rootColorScheme(page)).toBe('light');
			const derived = await page.evaluate(() => {
				const style = getComputedStyle(document.documentElement);
				return ['--lp-syntax-keyword', '--lp-meta-bind-select-bg', '--lp-codeblock-header-bg'].map(
					(name) => `${name}=${style.getPropertyValue(name).trim() !== ''}`,
				);
			});
			expect(derived).toEqual([
				'--lp-syntax-keyword=true',
				'--lp-meta-bind-select-bg=true',
				'--lp-codeblock-header-bg=true',
			]);
		});

		test('paints the graph with the editor background', async ({ vaultPage: page }) => {
			await expect.poll(() => rootColorScheme(page)).toBe('light');
			await expectGraphBackground(page, 'rgb(243, 240, 248)');
		});
	});

	test.describe('a dark theme on a light OS', () => {
		test.use({ colorScheme: 'light', vaultFiles: vaultWithTheme('KokoBrain Default') });

		test('renders dark', async ({ vaultPage: page }) => {
			// app.html ships `class="dark"`, so the class alone would pass before
			// any theme ran; `color-scheme` is set only when the theme is applied.
			await expect.poll(() => rootColorScheme(page)).toBe('dark');
			await expect(page.locator('html')).toHaveClass(/(^|\s)dark(\s|$)/);
		});

		test('paints the graph with the editor background', async ({ vaultPage: page }) => {
			await expect.poll(() => rootColorScheme(page)).toBe('dark');
			await expectGraphBackground(page, 'rgb(42, 46, 61)');
		});
	});
});
