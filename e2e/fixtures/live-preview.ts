import { test as base, expect, type Page, type Locator } from '@playwright/test';

const TEST_VAULT_PATH = '/test-vault';

const DEFAULT_SETTINGS = {
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
};

async function waitForE2eApi(page: Page) {
	await page.waitForFunction(
		() => typeof window !== 'undefined' && window.__e2e?.fs !== undefined,
		{ timeout: 10_000 },
	);
}

/**
 * Populates the virtual FS with a single markdown file, opens the vault,
 * clicks the file in the explorer, and waits for the editor to render.
 */
export async function openMarkdownFile(
	page: Page,
	fileName: string,
	content: string,
): Promise<void> {
	await page.goto('/', { waitUntil: 'networkidle' });
	await waitForE2eApi(page);

	const files: Record<string, string> = {
		[`${TEST_VAULT_PATH}/${fileName}`]: content,
		[`${TEST_VAULT_PATH}/.kokobrain/`]: '',
		[`${TEST_VAULT_PATH}/.kokobrain/settings.json`]: JSON.stringify(DEFAULT_SETTINGS, null, 2),
	};

	await page.evaluate(({ f }) => window.__e2e.fs.populate(f), { f: files });
	await page.evaluate(({ p }) => window.__e2e.dialog.setOpenResponse(p), { p: TEST_VAULT_PATH });
	await page.getByRole('button', { name: 'Open Vault' }).click();
	await page.locator('[role="tree"]').waitFor({ state: 'visible', timeout: 10_000 });

	// Wait for the specific tree item to appear before clicking
	const treeItem = page.locator('[role="treeitem"]', { hasText: fileName });
	await treeItem.waitFor({ state: 'visible', timeout: 10_000 });
	await treeItem.click();
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
