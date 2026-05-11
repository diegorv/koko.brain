import { test, expect } from '../fixtures/test-vault';
import { pressShortcut } from '../fixtures/helpers';

test.describe('Tasks view', () => {
	test('Cmd+Shift+T opens the Tasks virtual tab', async ({ vaultPage: page }) => {
		await pressShortcut(page, 'Mod+Shift+T');

		await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('Tasks');
		// The tasks tab is a virtual view — no `.cm-content`.
		await expect(page.locator('.cm-content')).toHaveCount(0);
	});

	test('Tasks view surfaces tasks from the vault', async ({ vaultPage: page }) => {
		// Fixture Daily/2026-05-01.md contains: `- [ ] Reply to email thread`
		// Projects/2026-Q2.md contains: `- [ ] Ship feature A`, `- [x] Draft RFC`, `- [ ] Review pending PRs`
		await pressShortcut(page, 'Mod+Shift+T');
		// TasksView ships with a "section tag" filter pre-populated to
		// `#to-list`. None of the fixture tasks live under that tag, so the
		// view shows "No tasks found" until the filter is cleared.
		const sectionTagInput = page.getByRole('textbox', { name: /section tag/i });
		await sectionTagInput.fill('');
		await page.waitForTimeout(300);

		await expect(
			page.getByText(/Ship feature A|Reply to email|Review pending PRs/i).first(),
		).toBeVisible({ timeout: 5_000 });
	});

	test('Cmd+Shift+T again closes the Tasks tab', async ({ vaultPage: page }) => {
		await pressShortcut(page, 'Mod+Shift+T');
		await expect(page.locator('[role="tab"]', { hasText: 'Tasks' })).toBeVisible();

		await pressShortcut(page, 'Mod+Shift+T');
		await expect(page.locator('[role="tab"]', { hasText: 'Tasks' })).toHaveCount(0);
	});
});
