import { test, expect } from '../../fixtures/live-preview';
import { openMarkdownFile, clickOnLine, clickAway } from '../../fixtures/live-preview';

const CONTENT = `# Mermaid

Some text before.

\`\`\`mermaid
graph TD
    A[Start] --> B[End]
\`\`\`

Plain text at the end.

`;

test.describe('Live Preview - Mermaid', () => {
	test.beforeEach(async ({ lpPage: page }) => {
		await openMarkdownFile(page, 'test.md', CONTENT);
	});

	test('mermaid block renders widget', async ({ lpPage: page }) => {
		await clickOnLine(page, 'Plain text at the end');
		await expect(page.locator('.cm-lp-mermaid')).toBeVisible();
	});

	test('mermaid header shows language label', async ({ lpPage: page }) => {
		await clickOnLine(page, 'Plain text at the end');
		await expect(page.locator('.cm-lp-mermaid-lang')).toContainText('mermaid');
	});

	test('mermaid diagram area present', async ({ lpPage: page }) => {
		await clickOnLine(page, 'Plain text at the end');
		await expect(page.locator('.cm-lp-mermaid-diagram')).toBeVisible();
	});

	test('mermaid diagram renders SVG', async ({ lpPage: page }) => {
		await clickOnLine(page, 'Plain text at the end');
		await expect(page.locator('.cm-lp-mermaid-diagram svg')).toBeVisible({ timeout: 5000 });
	});

	test('mermaid SVG has expected structure', async ({ lpPage: page }) => {
		await clickOnLine(page, 'Plain text at the end');
		const svg = page.locator('.cm-lp-mermaid-diagram svg');
		await expect(svg).toBeVisible({ timeout: 5000 });
		// Mermaid 10+ emits `aria-roledescription="flowchart-v2"` (or the
		// equivalent for other diagram types) instead of the older
		// `role="graphics-document document"`. Assert on the aria attribute
		// instead — it's the stable signal that the diagram rendered.
		await expect(svg).toHaveAttribute('aria-roledescription', /flowchart/);
	});
});
