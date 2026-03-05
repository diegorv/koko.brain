import { test, expect } from '../../fixtures/live-preview';
import { openMarkdownFile, clickOnLine, clickAway } from '../../fixtures/live-preview';

const CONTENT = `# Heading 1

## Heading 2

### Heading 3

#### Heading 4

##### Heading 5

###### Heading 6

# **Bold** heading

Plain text line here.

`;

test.describe('Live Preview - Headings', () => {
	test.beforeEach(async ({ lpPage: page }) => {
		await openMarkdownFile(page, 'test.md', CONTENT);
	});

	test('H1 gets cm-lp-h1 class', async ({ lpPage: page }) => {
		await expect(page.locator('.cm-lp-h1').first()).toBeVisible();
	});

	test('H2 gets cm-lp-h2 class', async ({ lpPage: page }) => {
		await expect(page.locator('.cm-lp-h2')).toBeVisible();
	});

	test('H3 gets cm-lp-h3 class', async ({ lpPage: page }) => {
		await expect(page.locator('.cm-lp-h3')).toBeVisible();
	});

	test('H4 gets cm-lp-h4 class', async ({ lpPage: page }) => {
		await expect(page.locator('.cm-lp-h4')).toBeVisible();
	});

	test('H5 gets cm-lp-h5 class', async ({ lpPage: page }) => {
		await expect(page.locator('.cm-lp-h5')).toBeVisible();
	});

	test('H6 gets cm-lp-h6 class', async ({ lpPage: page }) => {
		await expect(page.locator('.cm-lp-h6')).toBeVisible();
	});

	test('heading marks hidden when cursor is away', async ({ lpPage: page }) => {
		// Click on plain text to move cursor away from headings
		await clickOnLine(page, 'Plain text');

		const headingLine = page.locator('.cm-lp-h1').first();
		const marks = headingLine.locator('.cm-formatting-block');
		const count = await marks.count();
		if (count > 0) {
			await expect(marks.first()).not.toHaveClass(/cm-formatting-block-visible/);
		}
	});

	test('heading marks visible when cursor is on heading', async ({ lpPage: page }) => {
		await clickOnLine(page, 'Heading 1');

		const headingLine = page.locator('.cm-lp-h1').first();
		const visibleMarks = headingLine.locator('.cm-formatting-block-visible');
		await expect(visibleMarks.first()).toBeVisible();
	});

	test('heading with inline formatting', async ({ lpPage: page }) => {
		const boldHeading = page.locator('.cm-lp-h1').filter({ hasText: 'Bold' });
		await expect(boldHeading).toBeVisible();
		await expect(boldHeading.locator('.cm-lp-bold')).toContainText('Bold');
	});
});
