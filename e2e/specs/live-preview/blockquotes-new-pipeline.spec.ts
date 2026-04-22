import { test, expect } from '../../fixtures/live-preview';
import type { Page } from '@playwright/test';

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

const CONTENT = `> single-depth quote

> outer level
> > nested level 2
> > > nested level 3

> [!note] callout title
> callout body

Plain text after.
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

test.describe('Live Preview - Blockquotes (new pipeline, flag on)', () => {
	test.beforeEach(async ({ lpPage: page }) => {
		await open(page, 'blockquote-new.md', CONTENT);
	});

	test('depth-1 line gets cm-lp-blockquote', async ({ lpPage: page }) => {
		const line = page.locator('.cm-line').filter({ hasText: 'single-depth' });
		await expect(line).toHaveClass(/cm-lp-blockquote/);
	});

	test('depth-2 line gets cm-lp-blockquote-2', async ({ lpPage: page }) => {
		const line = page.locator('.cm-line').filter({ hasText: 'nested level 2' });
		await expect(line).toHaveClass(/cm-lp-blockquote-2/);
	});

	test('depth-3 line gets cm-lp-blockquote-3', async ({ lpPage: page }) => {
		const line = page.locator('.cm-line').filter({ hasText: 'nested level 3' });
		await expect(line).toHaveClass(/cm-lp-blockquote-3/);
	});

	test('callout line does not get cm-lp-blockquote', async ({ lpPage: page }) => {
		const line = page.locator('.cm-line').filter({ hasText: 'callout title' });
		await expect(line).not.toHaveClass(/cm-lp-blockquote/);
	});

	test('> marks hidden when cursor is on another line', async ({ lpPage: page }) => {
		await clickOnLine(page, 'Plain text');

		const quoteLine = page.locator('.cm-line').filter({ hasText: 'single-depth' });
		const marks = quoteLine.locator('.cm-formatting-block');
		const count = await marks.count();
		if (count > 0) {
			await expect(marks.first()).not.toHaveClass(/cm-formatting-block-visible/);
		}
	});

	test('> marks visible when cursor is on the blockquote line', async ({ lpPage: page }) => {
		await clickOnLine(page, 'single-depth');

		const quoteLine = page.locator('.cm-line').filter({ hasText: 'single-depth' });
		await expect(quoteLine.locator('.cm-formatting-block-visible').first()).toBeVisible();
	});
});
