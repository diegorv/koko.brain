import type { Page, Locator } from '@playwright/test';
import { test as base, expect } from './console-guard';
import { openFile } from './helpers';

const TEST_VAULT_PATH = '/test-vault';

const DEFAULT_SETTINGS = {
	layout: {
		// The app's defaults are its minimums; these keep the editor's geometry independent of them.
		railWidth: 192,
		navigatorSize: 13,
		noteListSize: 18,
		rightSidebarSize: 20,
		rightSidebarVisible: false,
		propertiesVisible: false,
		backlinksVisible: false,
		outgoingLinksVisible: false,
		tableOfContentsVisible: false,
	},
	editor: {
		fontFamily: 'MonoLisa, ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
		fontSize: 14,
		lineHeight: 1.6,
	},
	folderNotes: { enabled: false },
	templates: { folder: '_templates' },
	appearance: {},
};

async function waitForE2eApi(page: Page) {
	await page.waitForFunction(
		() => typeof window !== 'undefined' && window.__e2e?.fs !== undefined,
		{ timeout: 10_000 },
	);
}

/**
 * Populates the virtual FS with a single markdown file, opens the vault,
 * opens the file from the Files navigator, and waits for the editor to render.
 *
 * `settingsOverride` is shallow-merged into DEFAULT_SETTINGS — pass e.g.
 * `{ experimental: { newLivePreview: true } }` to drive a flag-on spec.
 * `extraFiles` maps vault-relative paths to content, seeded with the note
 * before the vault opens (a note to embed, an image, a row for a query).
 */
export async function openMarkdownFile(
	page: Page,
	fileName: string,
	content: string,
	settingsOverride: Record<string, unknown> = {},
	extraFiles: Record<string, string> = {},
): Promise<void> {
	await page.goto('/', { waitUntil: 'networkidle' });
	await waitForE2eApi(page);

	const settings = { ...DEFAULT_SETTINGS, ...settingsOverride };

	const files: Record<string, string> = {
		...Object.fromEntries(Object.entries(extraFiles).map(([p, c]) => [`${TEST_VAULT_PATH}/${p}`, c])),
		[`${TEST_VAULT_PATH}/${fileName}`]: content,
		[`${TEST_VAULT_PATH}/.kokobrain/`]: '',
		[`${TEST_VAULT_PATH}/.kokobrain/settings.json`]: JSON.stringify(settings, null, 2),
	};

	await page.evaluate(({ f }) => window.__e2e.fs.populate(f), { f: files });
	await page.evaluate(({ p }) => window.__e2e.dialog.setOpenResponse(p), { p: TEST_VAULT_PATH });
	await page.getByRole('button', { name: 'Open Vault' }).click();
	await page.locator('[data-rail]').waitFor({ state: 'visible', timeout: 10_000 });

	await openFile(page, fileName);
	await page.locator('.cm-content').waitFor({ state: 'visible', timeout: 15_000 });

	// Brief wait for live preview decorations to apply
	await page.waitForTimeout(300);
}

/** Returns the CodeMirror editor content locator. */
export function editorContent(page: Page): Locator {
	return page.locator('.cm-content');
}

/** Clicks on a .cm-line containing the given text (moves cursor there). */
export async function clickOnLine(page: Page, text: string): Promise<void> {
	await page.locator('.cm-line').filter({ hasText: text }).first().click();
	await page.waitForTimeout(150);
}

/** Clicks on an empty area to move cursor away from the target element. */
export async function clickAway(page: Page): Promise<void> {
	// Click on the last line (usually empty) to move cursor away
	await page.locator('.cm-line').last().click();
	await page.waitForTimeout(150);
}

export const test = base.extend<{ lpPage: Page }>({
	lpPage: async ({ page }, use) => {
		await use(page);
	},
});

export { expect };
