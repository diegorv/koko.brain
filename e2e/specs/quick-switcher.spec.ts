import { test, expect } from '../fixtures/test-vault';

test.describe('Quick Switcher', () => {
	test('opens via Cmd+O', async ({ vaultPage: page }) => {
		await page.keyboard.press('Meta+o');
		await expect(page.locator('input[placeholder="Type a note name..."]')).toBeVisible();
	});

	test('shows vault files on open', async ({ vaultPage: page }) => {
		await page.keyboard.press('Meta+o');
		await expect(page.locator('input[placeholder="Type a note name..."]')).toBeVisible();

		// Test vault files should be listed within the suggestions list
		const list = page.getByLabel('Suggestions...');
		await expect(list.getByText('Welcome', { exact: true })).toBeVisible();
	});

	test('filters files by name', async ({ vaultPage: page }) => {
		await page.keyboard.press('Meta+o');
		const input = page.locator('input[placeholder="Type a note name..."]');
		await input.fill('todo');

		// "todo" should be visible in the suggestions list
		const list = page.getByLabel('Suggestions...');
		await expect(list.getByText('todo', { exact: true })).toBeVisible();
	});

	test('selecting file opens in editor', async ({ vaultPage: page }) => {
		await page.keyboard.press('Meta+o');
		const input = page.locator('input[placeholder="Type a note name..."]');
		await input.fill('Welcome');

		// Click the Welcome file inside the suggestions list
		const list = page.getByLabel('Suggestions...');
		await list.getByText('Welcome', { exact: true }).click();

		// Quick switcher should close
		await expect(input).not.toBeVisible();

		// File should be open in editor
		await expect(page.locator('[role="tab"]', { hasText: 'Welcome.md' })).toBeVisible();
		await expect(page.locator('.cm-content')).toContainText('Welcome');
	});

	test('create file when no match', async ({ vaultPage: page }) => {
		await page.keyboard.press('Meta+o');
		const input = page.locator('input[placeholder="Type a note name..."]');
		await input.fill('BrandNewNote');

		// "Create" button should appear
		const createBtn = page.getByText('Create "BrandNewNote"');
		await expect(createBtn).toBeVisible();
		await createBtn.click();

		// Quick switcher closes and file opens in editor
		await expect(input).not.toBeVisible();
		await expect(page.locator('[role="tab"]', { hasText: 'BrandNewNote.md' })).toBeVisible();
	});
});
