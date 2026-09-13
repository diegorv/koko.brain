import { test, expect } from '@playwright/test';
import { E2E_DOCUMENT_DIR } from '../mocks/tauri-path';

/**
 * Touch shell (iOS / iPadOS). The platform is detected from the user agent,
 * so an iPhone UA on the Chromium project is enough to exercise the mobile
 * branch: auto-opened on-device vault, full-width editor, sidebar drawer.
 */
const IPHONE_UA =
	'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
const MOBILE_VAULT = `${E2E_DOCUMENT_DIR}/kokobrain-vaults/Notes`;

test.use({
	userAgent: IPHONE_UA,
	viewport: { width: 390, height: 844 },
	hasTouch: true,
	isMobile: true,
});

/** Locator for the sidebar drawer overlay. */
function drawer(page: import('@playwright/test').Page) {
	return page.getByRole('dialog', { name: 'Sidebar' });
}

test.describe('Mobile shell', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/', { waitUntil: 'networkidle' });
		// The welcome page opens the on-device vault by itself; the status-bar
		// drawer toggle only exists once the touch shell is mounted.
		await page.getByRole('button', { name: 'Show sidebar' }).waitFor({ state: 'visible', timeout: 10_000 });
	});

	test('creates and opens the on-device vault without a folder picker', async ({ page }) => {
		const created = await page.evaluate((path) => window.__e2e.fs.exists(path), MOBILE_VAULT);
		expect(created).toBe(true);
		// Desktop chrome is absent: no pane toggle buttons, no resize handles.
		await expect(page.getByRole('button', { name: /left sidebar/i })).toHaveCount(0);
		await expect(page.getByRole('button', { name: /right sidebar/i })).toHaveCount(0);
		await expect(page.locator('[data-pane-resizer]')).toHaveCount(0);
		// The daily note auto-opens, so the editor is on screen right away.
		await expect(page.locator('.cm-content')).toBeVisible({ timeout: 10_000 });
		await expect(drawer(page)).toHaveCount(0);
	});

	test('the status-bar button opens the drawer with the file tree and the scrim closes it', async ({ page }) => {
		await page.getByRole('button', { name: 'Show sidebar' }).click();

		await expect(drawer(page)).toBeVisible();
		await expect(page.locator('[role="tree"]')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Hide sidebar' })).toHaveAttribute('aria-pressed', 'true');

		// Tap the scrim to the right of the drawer (the drawer covers 85% of the
		// width, so the scrim's centre would land on the drawer itself).
		await page.getByRole('button', { name: 'Close sidebar' }).click({ position: { x: 370, y: 400 } });
		await expect(drawer(page)).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Show sidebar' })).toHaveAttribute('aria-pressed', 'false');
	});

	test('creating a note from the drawer opens it and reveals the editor', async ({ page }) => {
		await page.getByRole('button', { name: 'Show sidebar' }).click();
		await expect(drawer(page)).toBeVisible();

		// Root context menu → New File creates Untitled.md in rename mode; Enter
		// keeps the name and opens the note, which is what closes the drawer.
		await page.locator('[role="tree"]').click({ button: 'right' });
		await page.getByRole('menuitem', { name: /New File/i }).first().click();
		await expect(page.locator('[role="dialog"][aria-label="Sidebar"] input')).toBeFocused();
		await page.keyboard.press('Enter');

		await expect(page.locator('[role="tab"]', { hasText: 'Untitled' }).first()).toBeVisible({ timeout: 10_000 });
		await expect(drawer(page)).toHaveCount(0);
		await expect(page.locator('.cm-content')).toBeVisible();
		const created = await page.evaluate((path) => window.__e2e.fs.exists(`${path}/Untitled.md`), MOBILE_VAULT);
		expect(created).toBe(true);
	});

	test('settings open from the status bar without the desktop-only sections', async ({ page }) => {
		await page.getByRole('button', { name: 'Open settings' }).click();

		const settings = page.getByRole('dialog', { name: 'Settings' });
		await expect(settings).toBeVisible();
		await expect(settings.getByRole('button', { name: 'Search' })).toBeVisible();
		await expect(settings.getByRole('button', { name: 'Update' })).toHaveCount(0);
		await expect(settings.getByRole('button', { name: 'Quick Capture' })).toHaveCount(0);

		await settings.getByRole('button', { name: 'Search' }).click();
		await expect(settings.getByText('Desktop only')).toBeVisible();
	});
});
