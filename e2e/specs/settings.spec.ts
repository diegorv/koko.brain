import { test, expect } from '../fixtures/test-vault';
import { pressShortcut } from '../fixtures/helpers';

test.describe('Settings window', () => {
	test('Cmd+, opens the settings window', async ({ vaultPage: page }) => {
		await pressShortcut(page, 'Mod+Comma');
		await page.waitForFunction(() => window.__e2e.webviewWindows.has('settings'), null, { timeout: 5000 });
	});

	test('settings window URL contains vault path', async ({ vaultPage: page }) => {
		await pressShortcut(page, 'Mod+Comma');
		await page.waitForFunction(() => window.__e2e.webviewWindows.has('settings'), null, { timeout: 5000 });
		const url = await page.evaluate(() => window.__e2e.webviewWindows.get('settings')?.url ?? '');
		expect(url).toContain('/settings');
		expect(url).toContain('vault=');
	});

	test('second Cmd+, focuses existing window instead of creating duplicate', async ({ vaultPage: page }) => {
		await pressShortcut(page, 'Mod+Comma');
		await page.waitForFunction(() => window.__e2e.webviewWindows.has('settings'), null, { timeout: 5000 });
		await pressShortcut(page, 'Mod+Comma');
		// Small delay for the second call to resolve
		await page.waitForTimeout(200);
		const count = await page.evaluate(() => window.__e2e.webviewWindows.size);
		expect(count).toBeLessThanOrEqual(1);
	});
});
