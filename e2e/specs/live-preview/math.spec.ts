import { test, expect } from '../../fixtures/live-preview';
import { openMarkdownFile, clickOnLine, clickAway } from '../../fixtures/live-preview';

const CONTENT = `# Math

Inline math: $E = mc^2$ here.

Block math below:

$$
\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}
$$

Plain text at the end.

`;

test.describe('Live Preview - Math', () => {
	test.beforeEach(async ({ lpPage: page }) => {
		await openMarkdownFile(page, 'test.md', CONTENT);
	});

	test('inline math renders widget', async ({ lpPage: page }) => {
		await clickOnLine(page, 'Plain text at the end');
		await expect(page.locator('.cm-lp-math-inline').first()).toBeVisible();
	});

	test('block math renders widget', async ({ lpPage: page }) => {
		await clickOnLine(page, 'Plain text at the end');
		await expect(page.locator('.cm-lp-math-block').first()).toBeVisible();
	});
});
