import { test, expect } from '../fixtures/test-vault';
import { openTreeItem, pressShortcut } from '../fixtures/helpers';

// Pinned tabs render WITHOUT a name span, so `hasText: 'Welcome'` cannot be
// used after pinning. We target the currently-active tab via
// `[role="tab"][aria-selected="true"]` instead, which stays valid across
// the pin toggle.

test.describe('Tab pinning', () => {
	test.beforeEach(async ({ vaultPage: page }) => {
		// `closeTab` prompts via `ask` for dirty tabs — auto-confirm.
		await page.evaluate(() => window.__e2e.dialog.setAskResponse(true));
	});

	test('right-click → Pin Tab hides the close button', async ({ vaultPage: page }) => {
		await openTreeItem(page, 'Welcome.md');
		const activeTab = page.locator('[role="tab"][aria-selected="true"]');
		await activeTab.click({ button: 'right' });

		const pinItem = page.getByRole('menuitem', { name: /Pin Tab/i });
		await expect(pinItem).toBeVisible();
		await pinItem.click();

		await activeTab.hover();
		await expect(activeTab.getByRole('button', { name: /Close/i })).toHaveCount(0);
	});

	test('Unpin Tab restores the close button', async ({ vaultPage: page }) => {
		await openTreeItem(page, 'Inbox.md');
		const activeTab = page.locator('[role="tab"][aria-selected="true"]');

		await activeTab.click({ button: 'right' });
		await page.getByRole('menuitem', { name: /Pin Tab/i }).click();
		await activeTab.hover();
		await expect(activeTab.getByRole('button', { name: /Close/i })).toHaveCount(0);

		await activeTab.click({ button: 'right' });
		await page.getByRole('menuitem', { name: /Unpin Tab/i }).click();
		await activeTab.hover();
		await expect(activeTab.getByRole('button', { name: /Close Inbox/i })).toBeVisible();
	});

	test('Cmd+W skips pinned tabs', async ({ vaultPage: page }) => {
		await openTreeItem(page, 'Welcome.md');
		const welcomeActive = page.locator('[role="tab"][aria-selected="true"]');
		await welcomeActive.click({ button: 'right' });
		await page.getByRole('menuitem', { name: /Pin Tab/i }).click();
		// After pin, the Welcome tab keeps role=tab but no longer has its name
		// span. Capture its DOM node now so we can verify it survives below.
		const allTabsBefore = await page.locator('[role="tab"]').count();

		await openTreeItem(page, 'Inbox.md');
		await expect(page.locator('[role="tab"]', { hasText: 'Inbox' })).toBeVisible();

		await pressShortcut(page, 'Mod+W');
		// The unpinned Inbox tab is gone
		await expect(page.locator('[role="tab"]', { hasText: 'Inbox' })).toHaveCount(0);
		// The pinned Welcome tab survived — total tabs reduced by exactly 1
		await expect(page.locator('[role="tab"]')).toHaveCount(allTabsBefore);
	});
});
