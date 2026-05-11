import { test, expect } from '../../fixtures/live-preview';
import { openMarkdownFile, clickOnLine } from '../../fixtures/live-preview';

const CONTENT = `# Heading One

## Heading Two

### Heading Three

#### Heading Four

##### Heading Five

###### Heading Six

Setext H1
=========

Setext H2
---------

# **Bold inside heading**

`;

/**
 * Heading rendering through the new live-preview pipeline
 * (`experimental.newLivePreview = true`). Mirrors what the legacy
 * `headings.spec.ts` covers via the legacy path; both must produce the
 * same DOM classes.
 */
test.describe('Live Preview - Headings (new pipeline)', () => {
	test.beforeEach(async ({ lpPage: page }) => {
		await openMarkdownFile(page, 'headings.md', CONTENT, {
			experimental: { newLivePreview: true },
		});
	});

	test('all six ATX heading levels emit cm-lp-hN line decoration', async ({ lpPage: page }) => {
		for (const level of [1, 2, 3, 4, 5, 6]) {
			await expect(page.locator(`.cm-lp-h${level}`).first()).toBeVisible();
		}
	});

	test('setext H1 (===) emits cm-lp-h1', async ({ lpPage: page }) => {
		const setextLine = page.locator('.cm-lp-h1').filter({ hasText: 'Setext H1' });
		await expect(setextLine).toBeVisible();
	});

	test('setext H2 (---) emits cm-lp-h2', async ({ lpPage: page }) => {
		const setextLine = page.locator('.cm-lp-h2').filter({ hasText: 'Setext H2' });
		await expect(setextLine).toBeVisible();
	});

	test('# marks hidden when cursor is away from heading', async ({ lpPage: page }) => {
		// Move cursor to a non-heading line
		await clickOnLine(page, 'Setext H1');

		const h1Line = page.locator('.cm-line').filter({ hasText: 'Heading One' }).first();
		const marks = h1Line.locator('.cm-formatting-block');
		const count = await marks.count();
		if (count > 0) {
			await expect(marks.first()).not.toHaveClass(/cm-formatting-block-visible/);
		}
	});

	test('# marks revealed when cursor is on the heading line', async ({ lpPage: page }) => {
		await clickOnLine(page, 'Heading One');

		const h1Line = page.locator('.cm-line').filter({ hasText: 'Heading One' }).first();
		const marks = h1Line.locator('.cm-formatting-block');
		const count = await marks.count();
		expect(count).toBeGreaterThan(0);
		await expect(marks.first()).toHaveClass(/cm-formatting-block-visible/);
	});

	test('bold inside an h1 emits both cm-lp-h1 and cm-lp-bold', async ({ lpPage: page }) => {
		const boldH1Line = page.locator('.cm-line').filter({ hasText: 'Bold inside heading' });
		await expect(boldH1Line).toHaveClass(/cm-lp-h1/);
		// Filter to the content span — see note in inline-formatting.spec.ts.
		await expect(
			boldH1Line.locator('.cm-lp-bold').filter({ hasText: 'Bold inside heading' }).first(),
		).toBeVisible();
	});
});
