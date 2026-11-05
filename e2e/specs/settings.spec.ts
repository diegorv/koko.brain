import type { Locator } from '@playwright/test';
import { test, expect } from '../fixtures/test-vault';
import { pressShortcut } from '../fixtures/helpers';

test.describe('Settings panel', () => {
	test('Cmd+, opens the panel', async ({ vaultPage: page }) => {
		await pressShortcut(page, 'Mod+Comma');
		const panel = page.locator('[role="dialog"][aria-label="Settings"]');
		await expect(panel).toBeVisible();
	});

	test('the panel ends at the top edge of the status bar', async ({ vaultPage: page }) => {
		await pressShortcut(page, 'Mod+Comma');
		const panel = page.locator('[role="dialog"][aria-label="Settings"]');
		await expect(panel).toBeVisible();

		const panelBox = await panel.boundingBox();
		const barBox = await page.locator('[data-status-bar]').boundingBox();
		expect(panelBox).not.toBeNull();
		expect(barBox).not.toBeNull();
		expect(panelBox!.y + panelBox!.height).toBeLessThanOrEqual(barBox!.y + 0.5);
		expect(panelBox!.y + panelBox!.height).toBeGreaterThanOrEqual(barBox!.y - 0.5);
		expect(barBox!.height).toBeCloseTo(32, 0);
	});

	test('navigating between sections updates the visible content', async ({ vaultPage: page }) => {
		await pressShortcut(page, 'Mod+Comma');
		const panel = page.locator('[role="dialog"][aria-label="Settings"]');
		await expect(panel).toBeVisible();

		const editorTab = panel.getByRole('button', { name: /^editor$/i }).first();
		if (await editorTab.isVisible().catch(() => false)) {
			await editorTab.click();
			await expect(panel.getByText(/font/i).first()).toBeVisible();
		}
	});

	test('Escape closes the panel', async ({ vaultPage: page }) => {
		await pressShortcut(page, 'Mod+Comma');
		const panel = page.locator('[role="dialog"][aria-label="Settings"]');
		await expect(panel).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(panel).not.toBeVisible();
	});

	test('Sentry error monitoring is opt-in and asks for a DSN only when enabled', async ({ vaultPage: page }) => {
		await pressShortcut(page, 'Mod+Comma');
		const panel = page.locator('[role="dialog"][aria-label="Settings"]');
		await panel.getByRole('button', { name: /^sentry$/i }).click();

		const errorMonitoring = panel.getByRole('switch');
		await expect(errorMonitoring).toHaveAttribute('data-state', 'unchecked');
		await expect(panel.locator('input[type="url"]')).not.toBeVisible();

		await errorMonitoring.click();
		await expect(panel.locator('input[type="url"]')).toBeVisible();
		await expect(panel.getByRole('alert')).toContainText('valid Sentry Cloud DSN');

		await panel.getByRole('button', { name: 'Send test event' }).click();
		await expect(panel.getByRole('status')).toContainText('Sentry is not active');
	});

	test('the heading font weight is picked from a Select', async ({ vaultPage: page }) => {
		await pressShortcut(page, 'Mod+Comma');
		const panel = page.locator('[role="dialog"][aria-label="Settings"]');
		await panel.getByRole('button', { name: /^editor$/i }).click();

		const h1 = panel.locator('details', { has: page.getByText('Heading 1', { exact: true }) });
		await h1.locator('summary').click();
		const weight = h1.getByRole('combobox', { name: 'Font weight', exact: true });
		await expect(weight).toContainText('Bold');

		// H1 starts Bold, so pick another weight first to make the Bold pick observable.
		for (const option of ['Normal', 'Bold']) {
			await weight.click();
			await page.getByRole('option', { name: option, exact: true }).click();
			await expect(weight).toContainText(option);
		}
		await expect(h1.locator('summary')).toContainText('bold');
	});

	test('setting rows give the text the width the control does not need', async ({ vaultPage: page }) => {
		await pressShortcut(page, 'Mod+Comma');
		const panel = page.locator('[role="dialog"][aria-label="Settings"]');
		await expect(panel).toBeVisible();

		const row = (label: string) =>
			panel.locator('div.bg-setting-item-bg', { has: page.getByText(label, { exact: true }) });
		/** Width of `part` as a fraction of `whole`, both measured on screen. */
		const ratio = async (part: Locator, whole: Locator) => {
			const [p, w] = [await part.boundingBox(), await whole.boundingBox()];
			expect(p).not.toBeNull();
			expect(w).not.toBeNull();
			return p!.width / w!.width;
		};

		// A switch needs 36px: the description takes the rest of the row.
		await panel.getByRole('button', { name: /^troubleshooting$/i }).click();
		const debug = row('Debug mode');
		const debugDescription = debug.getByText('Log debug messages to the browser console', { exact: true });
		expect.soft(await ratio(debugDescription, debug)).toBeGreaterThan(0.7);

		// A wide value sits below its label at full width.
		await panel.getByRole('button', { name: /^editor$/i }).click();
		const font = row('Font family');
		expect.soft(await ratio(font.locator('[data-slot="input"]'), font)).toBeGreaterThan(0.7);

		// A free-text field takes half the row, not its intrinsic width.
		await panel.getByRole('button', { name: /^templates$/i }).click();
		const folder = row('Templates folder');
		expect.soft(await ratio(folder.locator('[data-slot="input"]'), folder)).toBeGreaterThanOrEqual(0.45);
	});
});
