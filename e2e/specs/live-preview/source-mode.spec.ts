import { test, expect } from '../../fixtures/live-preview';
import { openMarkdownFile } from '../../fixtures/live-preview';

const CONTENT = `# Heading One

This has **bold text** here.

This has *italic text* here.

This has [link](https://example.com) here.

`;

/**
 * Cmd+K toggles source mode (`editorStore.isLivePreview`). When source mode
 * is on, the entire `livePreview` extension is removed via the compartment —
 * line numbers + gutters reappear and no decorations render. Mirrors the
 * `Code`/`Eye` toolbar button.
 */
test.describe('Live Preview - Source Mode (Cmd+K)', () => {
	test.beforeEach(async ({ lpPage: page }) => {
		await openMarkdownFile(page, 'source-mode-test.md', CONTENT);
	});

	test('default: live preview decorations are present', async ({ lpPage: page }) => {
		// Heading rendered as a styled line, not raw `# Heading One`
		await expect(page.locator('.cm-lp-h1').first()).toBeVisible();
		// `.cm-lp-bold` wraps both `**` markers (hidden when cursor is away)
		// and the inner text; filter to the content span by `hasText`.
		await expect(page.locator('.cm-lp-bold').filter({ hasText: 'bold' }).first()).toBeVisible();
	});

	test('Cmd+K removes live preview decorations', async ({ lpPage: page }) => {
		await page.keyboard.press('Meta+K');
		await page.waitForTimeout(150);

		// Decorations should be gone
		await expect(page.locator('.cm-lp-h1')).toHaveCount(0);
		await expect(page.locator('.cm-lp-bold')).toHaveCount(0);
	});

	test('Cmd+K twice returns to live preview', async ({ lpPage: page }) => {
		await page.keyboard.press('Meta+K');
		await page.waitForTimeout(150);
		await page.keyboard.press('Meta+K');
		await page.waitForTimeout(150);

		await expect(page.locator('.cm-lp-h1').first()).toBeVisible();
		await expect(page.locator('.cm-lp-bold').filter({ hasText: 'bold' }).first()).toBeVisible();
	});
});
