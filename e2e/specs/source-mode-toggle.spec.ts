import { test, expect } from '../fixtures/test-vault';
import { openFile } from '../fixtures/helpers';

test.describe('Source mode toggle button', () => {
	test('a Markdown note has no floating toggle: the action bar Raw button toggles live preview', async ({
		vaultPage: page,
	}) => {
		await openFile(page, 'Welcome.md');

		// Live-preview is on by default → heading line is decorated.
		await expect(page.locator('.cm-lp-h1').first()).toBeVisible();
		// The floating EditorView toggle is kept for kanban, canvas and view tabs only.
		await expect(page.getByRole('button', { name: /Switch to (source mode|live preview)/i })).toHaveCount(0);

		const bar = page.getByTestId('note-action-bar');
		await bar.getByRole('button', { name: 'Show raw Markdown' }).click();
		await expect(page.locator('.cm-lp-h1')).toHaveCount(0);

		await bar.getByRole('button', { name: 'Back to live preview' }).click();
		await expect(page.locator('.cm-lp-h1').first()).toBeVisible();
	});
});
