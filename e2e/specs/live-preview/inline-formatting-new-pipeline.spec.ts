import { test, expect } from '../../fixtures/live-preview';
import type { Page } from '@playwright/test';

/**
 * Parallel to inline-formatting.spec.ts but boots the vault with
 * experimental.newLivePreview: true so the unified HighlightStyle +
 * handler-registry pipeline renders the classes. If both suites pass
 * against the same fixture content, the legacy and new paths agree
 * on the class surface — that's the contract Phase 3 ships.
 */

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

const CONTENT = `# Heading One

## Heading Two

This has **bold text** here.

This has *italic text* here.

This has ~~strikethrough text~~ here.

This has \`inline code\` here.

This has ==highlighted text== here.

**bold** and *italic* and ~~strike~~ on same line.

***bold italic*** combined.
`;

async function openWithNewPipeline(page: Page, fileName: string, content: string) {
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

test.describe('Live Preview - Inline Formatting (new pipeline, flag on)', () => {
	test.beforeEach(async ({ lpPage: page }) => {
		await openWithNewPipeline(page, 'new-pipeline.md', CONTENT);
	});

	test('bold renders with cm-lp-bold', async ({ lpPage: page }) => {
		await expect(page.locator('.cm-lp-bold').first()).toContainText('bold');
	});

	test('italic renders with cm-lp-italic', async ({ lpPage: page }) => {
		await expect(page.locator('.cm-lp-italic').first()).toContainText('italic');
	});

	test('strikethrough renders with cm-lp-strikethrough', async ({ lpPage: page }) => {
		await expect(page.locator('.cm-lp-strikethrough').first()).toContainText('strikethrough');
	});

	test('inline code renders with cm-lp-code', async ({ lpPage: page }) => {
		await expect(page.locator('.cm-lp-code').first()).toContainText('inline code');
	});

	test('highlight renders with cm-lp-highlight (via handler)', async ({ lpPage: page }) => {
		await expect(page.locator('.cm-lp-highlight').first()).toContainText('highlighted text');
	});

	test('headings h1 and h2 render with cm-lp-h1 / cm-lp-h2', async ({ lpPage: page }) => {
		await expect(page.locator('.cm-lp-h1').first()).toBeVisible();
		await expect(page.locator('.cm-lp-h2').first()).toBeVisible();
	});

	test('all inline formats co-exist on one line', async ({ lpPage: page }) => {
		const line = page.locator('.cm-line').filter({ hasText: 'on same line' });
		await expect(line.locator('.cm-lp-bold')).toContainText('bold');
		await expect(line.locator('.cm-lp-italic')).toContainText('italic');
		await expect(line.locator('.cm-lp-strikethrough')).toContainText('strike');
	});

	test('bold+italic (***text***) renders both classes on the same element', async ({ lpPage: page }) => {
		const line = page.locator('.cm-line').filter({ hasText: 'bold italic' });
		await expect(line.locator('.cm-lp-bold')).toBeVisible();
		await expect(line.locator('.cm-lp-italic')).toBeVisible();
	});
});
