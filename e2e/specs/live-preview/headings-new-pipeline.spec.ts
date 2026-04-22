import { test, expect } from '../../fixtures/live-preview';
import type { Page } from '@playwright/test';

/** Parallel to headings.spec.ts with experimental.newLivePreview: true. */

const TEST_VAULT_PATH = '/test-vault';

const SETTINGS_WITH_FLAG = {
	layout: {
		rightSidebarVisible: false,
		calendarVisible: false,
		propertiesVisible: false,
		backlinksVisible: false,
		outgoingLinksVisible: false,
		tagsVisible: false,
	},
	editor: {
		fontFamily: 'MonoLisa, ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
		fontSize: 14,
		lineHeight: 1.6,
	},
	folderNotes: { enabled: false },
	templates: { folder: '_templates' },
	appearance: {},
	experimental: { newLivePreview: true },
};

const CONTENT = `# Heading 1

## Heading 2

### Heading 3

#### Heading 4

##### Heading 5

###### Heading 6

# **Bold** heading

Setext H1
=========

Setext H2
---------

Plain text line here.
`;

async function open(page: Page, fileName: string, content: string) {
	await page.goto('/', { waitUntil: 'networkidle' });
	await page.waitForFunction(() => typeof window !== 'undefined' && window.__e2e?.fs !== undefined, {
		timeout: 10_000,
	});

	const files: Record<string, string> = {
		[`${TEST_VAULT_PATH}/${fileName}`]: content,
		[`${TEST_VAULT_PATH}/.kokobrain/`]: '',
		[`${TEST_VAULT_PATH}/.kokobrain/settings.json`]: JSON.stringify(SETTINGS_WITH_FLAG, null, 2),
	};
	await page.evaluate(({ f }) => window.__e2e.fs.populate(f), { f: files });
	await page.evaluate(({ p }) => window.__e2e.dialog.setOpenResponse(p), { p: TEST_VAULT_PATH });
	await page.getByRole('button', { name: 'Open Vault' }).click();
	await page.locator('[role="tree"]').waitFor({ state: 'visible', timeout: 10_000 });
	await page.locator('[role="treeitem"]', { hasText: fileName }).click();
	await page.locator('.cm-content').waitFor({ state: 'visible', timeout: 15_000 });
	await page.waitForTimeout(300);
}

async function clickOnLine(page: Page, text: string) {
	await page.locator('.cm-line').filter({ hasText: text }).first().click();
	await page.waitForTimeout(150);
}

test.describe('Live Preview - Headings (new pipeline, flag on)', () => {
	test.beforeEach(async ({ lpPage: page }) => {
		await open(page, 'headings-new.md', CONTENT);
	});

	test('ATX h1..h6 each get their cm-lp-hN class', async ({ lpPage: page }) => {
		for (let lvl = 1; lvl <= 6; lvl++) {
			await expect(page.locator(`.cm-lp-h${lvl}`).first()).toBeVisible();
		}
	});

	test('Setext H1 gets cm-lp-h1 class', async ({ lpPage: page }) => {
		const setextLine = page.locator('.cm-line').filter({ hasText: 'Setext H1' });
		await expect(setextLine).toHaveClass(/cm-lp-h1/);
	});

	test('Setext H2 gets cm-lp-h2 class', async ({ lpPage: page }) => {
		const setextLine = page.locator('.cm-line').filter({ hasText: 'Setext H2' });
		await expect(setextLine).toHaveClass(/cm-lp-h2/);
	});

	test('heading marks hidden when cursor is away', async ({ lpPage: page }) => {
		await clickOnLine(page, 'Plain text');

		const h1Line = page.locator('.cm-lp-h1').first();
		const marks = h1Line.locator('.cm-formatting-block');
		const count = await marks.count();
		if (count > 0) {
			await expect(marks.first()).not.toHaveClass(/cm-formatting-block-visible/);
		}
	});

	test('heading marks visible when cursor is on heading', async ({ lpPage: page }) => {
		await clickOnLine(page, 'Heading 1');

		const h1Line = page.locator('.cm-lp-h1').first();
		await expect(h1Line.locator('.cm-formatting-block-visible').first()).toBeVisible();
	});

	test('heading with bold renders both h1 line class and bold content class', async ({
		lpPage: page,
	}) => {
		const boldHeading = page.locator('.cm-lp-h1').filter({ hasText: 'Bold' });
		await expect(boldHeading).toBeVisible();
		await expect(boldHeading.locator('.cm-lp-bold')).toContainText('Bold');
	});
});
