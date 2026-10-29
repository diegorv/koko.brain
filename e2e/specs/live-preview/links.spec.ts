import { test, expect } from '../../fixtures/live-preview';
import { openMarkdownFile, clickOnLine, clickAway } from '../../fixtures/live-preview';

const CONTENT = `# Links

This has a [markdown link](https://example.com) here.

This has a [[wikilink]] here.

This has a [[target|Display Text]] wikilink.

Plain text at the end.

`;

test.describe('Live Preview - Markdown Links', () => {
	test.beforeEach(async ({ lpPage: page }) => {
		await openMarkdownFile(page, 'test.md', CONTENT);
	});

	test('markdown link gets cm-lp-link class', async ({ lpPage: page }) => {
		await expect(page.locator('.cm-lp-link').first()).toContainText('markdown link');
	});

	test('link marks hidden when cursor is away', async ({ lpPage: page }) => {
		await clickOnLine(page, 'Plain text');

		// Hidden syntax is a Decoration.replace: brackets and URL are not in the DOM
		const linkLine = page.locator('.cm-line').filter({ hasText: 'markdown link' });
		await expect(linkLine).not.toContainText('[');
		await expect(linkLine).not.toContainText('https://example.com');
	});
});

test.describe('Live Preview - Wikilinks', () => {
	test.beforeEach(async ({ lpPage: page }) => {
		await openMarkdownFile(page, 'test.md', CONTENT);
	});

	test('wikilink gets cm-lp-wikilink class', async ({ lpPage: page }) => {
		await expect(page.locator('.cm-lp-wikilink').first()).toBeVisible();
	});

	test('wikilink marks hidden when cursor is away', async ({ lpPage: page }) => {
		await clickOnLine(page, 'Plain text');

		const wlLine = page.locator('.cm-line').filter({ hasText: 'wikilink' }).first();
		await expect(wlLine).not.toContainText('[[');
		await expect(wlLine).not.toContainText(']]');
	});

	test('wikilink with display text shows display text', async ({ lpPage: page }) => {
		const wl = page.locator('.cm-lp-wikilink').filter({ hasText: 'Display Text' });
		await expect(wl).toBeVisible();
	});
});
