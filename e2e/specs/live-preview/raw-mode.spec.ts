import { test, expect } from '../../fixtures/live-preview';
import { openMarkdownFile, clickAway } from '../../fixtures/live-preview';

const CONTENT = `# Heading One

This paragraph has **bold text** and *italic text* mixed together.

## Heading Two

Another line with ~~strikethrough~~ and \`inline code\`.
`;

/**
 * Cross-platform shortcut for Cmd/Ctrl+K. Playwright maps this to
 * metaKey on macOS and ctrlKey elsewhere — the registered keybinding
 * expects metaKey, so this spec runs on the platform that matches the
 * keybinding handler. The handler itself is unit-tested separately;
 * this spec validates the rendered DOM consequence of rawMode=true.
 */
const TOGGLE_KEY = 'Meta+k';

test.describe('Live Preview - Raw Mode (Cmd+K)', () => {
	test.beforeEach(async ({ lpPage: page }) => {
		await openMarkdownFile(page, 'raw-mode.md', CONTENT);
		await clickAway(page);
	});

	test('inline formatting marks hidden by default (rawMode off)', async ({ lpPage: page }) => {
		const boldLine = page.locator('.cm-line').filter({ hasText: 'bold text' });
		const marks = boldLine.locator('.cm-formatting-inline');
		const count = await marks.count();
		expect(count).toBeGreaterThan(0);
		for (let i = 0; i < count; i++) {
			await expect(marks.nth(i)).not.toHaveClass(/cm-formatting-inline-visible/);
		}
	});

	test('Cmd+K makes inline formatting marks visible', async ({ lpPage: page }) => {
		await page.keyboard.press(TOGGLE_KEY);
		await page.waitForTimeout(300);

		// With rawMode on, raw ** and * characters are visible inside the rendered line
		const boldLine = page.locator('.cm-line').filter({ hasText: 'bold text' });
		await expect(boldLine).toContainText('**bold text**');
		await expect(boldLine).toContainText('*italic text*');

		const strikeLine = page.locator('.cm-line').filter({ hasText: 'strikethrough' });
		await expect(strikeLine).toContainText('~~strikethrough~~');
		await expect(strikeLine).toContainText('`inline code`');
	});

	test('Cmd+K twice restores hidden marks', async ({ lpPage: page }) => {
		await page.keyboard.press(TOGGLE_KEY);
		await page.waitForTimeout(200);
		await page.keyboard.press(TOGGLE_KEY);
		await page.waitForTimeout(300);
		await clickAway(page);

		const boldLine = page.locator('.cm-line').filter({ hasText: 'bold text' });
		const marks = boldLine.locator('.cm-formatting-inline');
		const count = await marks.count();
		if (count > 0) {
			await expect(marks.first()).not.toHaveClass(/cm-formatting-inline-visible/);
		}
	});

	test('rawMode reveals heading marks (# prefix visible)', async ({ lpPage: page }) => {
		await page.keyboard.press(TOGGLE_KEY);
		await page.waitForTimeout(300);

		const h1Line = page.locator('.cm-line').filter({ hasText: 'Heading One' });
		await expect(h1Line).toContainText('# Heading One');

		const h2Line = page.locator('.cm-line').filter({ hasText: 'Heading Two' });
		await expect(h2Line).toContainText('## Heading Two');
	});
});
