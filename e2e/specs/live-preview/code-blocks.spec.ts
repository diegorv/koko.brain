import { test, expect } from '../../fixtures/live-preview';
import { openMarkdownFile, clickOnLine, clickAway } from '../../fixtures/live-preview';

const CONTENT = `# Code Blocks

Some text before.

\`\`\`javascript
const x = 42;
console.log(x);
\`\`\`

\`\`\`python
def hello():
    print("world")
\`\`\`

Plain text at the end.

`;

test.describe('Live Preview - Code Blocks', () => {
	test.beforeEach(async ({ lpPage: page }) => {
		await openMarkdownFile(page, 'test.md', CONTENT);
	});

	test('fenced code block renders widget', async ({ lpPage: page }) => {
		await clickOnLine(page, 'Plain text at the end');
		await expect(page.locator('.cm-lp-codeblock').first()).toBeVisible();
	});

	test('code block header shows language label', async ({ lpPage: page }) => {
		await clickOnLine(page, 'Plain text at the end');
		await expect(page.locator('.cm-lp-codeblock-lang').first()).toContainText('javascript');
	});

	test('code block has copy button', async ({ lpPage: page }) => {
		await clickOnLine(page, 'Plain text at the end');
		await expect(page.locator('.cm-lp-codeblock-copy').first()).toBeAttached();
	});

	test('code block has pre element with code', async ({ lpPage: page }) => {
		await clickOnLine(page, 'Plain text at the end');
		await expect(page.locator('.cm-lp-codeblock-pre').first()).toBeVisible();
	});

	test('code block shows source when cursor inside', async ({ lpPage: page }) => {
		// First verify widget is visible
		await clickOnLine(page, 'Plain text at the end');
		await expect(page.locator('.cm-lp-codeblock').first()).toBeVisible();

		// Click on the code block widget to enter source mode
		await page.locator('.cm-lp-codeblock').first().click();
		await page.waitForTimeout(200);

		// Source lines should now be visible (code block lines with cm-lp-codeblock-line)
		await expect(page.locator('.cm-line').filter({ hasText: 'const x = 42' })).toBeVisible();
	});

	test('multiple code blocks render independently', async ({ lpPage: page }) => {
		await clickOnLine(page, 'Plain text at the end');
		const codeBlocks = page.locator('.cm-lp-codeblock');
		const count = await codeBlocks.count();
		expect(count).toBeGreaterThanOrEqual(2);
	});
});
