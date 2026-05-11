import { test as base, expect, type Page } from '@playwright/test';

const TEST_VAULT_PATH = '/test-vault';

// Minimal vault that opts queryjs into MANUAL mode so the widget renders
// a ▶ Run button instead of auto-executing. The script writes a unique
// marker via `kb.paragraph(...)` so the test can detect execution.
const QUERY_NOTE = `# Query Note

\`\`\`queryjs
kb.paragraph("QUERYJS_OUTPUT_2026");
\`\`\`

Plain text at the end.
`;

const SECOND_NOTE = `# Second note

Other content.
`;

const SETTINGS = {
	periodicNotes: {
		folder: 'Daily',
		daily: { format: 'YYYY-MM-DD', template: '', templatePath: '', autoOpen: false, autoPin: false },
		weekly: { format: 'YYYY-[W]WW', templatePath: '' },
		monthly: { format: 'YYYY-MM', templatePath: '' },
		quarterly: { format: 'YYYY-[Q]Q', templatePath: '' },
	},
	queryjs: { autoRunQueries: 'manual' },
	layout: {
		rightSidebarVisible: false,
		calendarVisible: false,
		propertiesVisible: false,
		backlinksVisible: false,
		outgoingLinksVisible: false,
		tagsVisible: false,
	},
	folderNotes: { enabled: false },
	editor: { fontFamily: 'monospace', fontSize: 14, lineHeight: 1.6 },
	templates: { folder: '_templates' },
	appearance: {},
};

const FILES: Record<string, string> = {
	[`${TEST_VAULT_PATH}/Query.md`]: QUERY_NOTE,
	[`${TEST_VAULT_PATH}/Other.md`]: SECOND_NOTE,
	[`${TEST_VAULT_PATH}/.kokobrain/`]: '',
	[`${TEST_VAULT_PATH}/.kokobrain/settings.json`]: JSON.stringify(SETTINGS, null, 2),
};

const test = base.extend<{ qjsPage: Page }>({
	qjsPage: async ({ page }, use) => {
		await page.goto('/', { waitUntil: 'networkidle' });
		await page.waitForFunction(() => window.__e2e?.fs !== undefined, { timeout: 10_000 });
		await page.evaluate(({ files }) => window.__e2e.fs.populate(files), { files: FILES });
		await page.evaluate(({ vaultPath }) => window.__e2e.dialog.setOpenResponse(vaultPath), {
			vaultPath: TEST_VAULT_PATH,
		});
		await page.getByRole('button', { name: 'Open Vault' }).click();
		await page.locator('[role="tree"]').waitFor({ state: 'visible', timeout: 10_000 });
		await use(page);
	},
});

async function openNote(page: Page, name: string) {
	const item = page.locator('[role="treeitem"]', { hasText: name }).first();
	await item.waitFor({ state: 'visible', timeout: 10_000 });
	await item.click();
	await page.locator('.cm-content').waitFor({ state: 'visible', timeout: 10_000 });
	await page.waitForTimeout(250);
}

test.describe('QueryJS basics', () => {
	test('manual mode renders a ▶ Run button and does not auto-execute', async ({ qjsPage: page }) => {
		await openNote(page, 'Query.md');

		const runBtn = page.locator('button.cm-lp-qjs-run');
		await expect(runBtn).toBeVisible({ timeout: 5_000 });
		await expect(runBtn).toContainText('Run');

		// Script has NOT executed → marker text is absent.
		await expect(page.locator('text=QUERYJS_OUTPUT_2026')).toHaveCount(0);
	});

	test('clicking ▶ Run executes the script and renders the output', async ({ qjsPage: page }) => {
		await openNote(page, 'Query.md');
		// Run button stops `mousedown` propagation so CodeMirror can't move
		// the cursor and destroy the widget mid-click — Playwright's normal
		// click works end-to-end.
		await page.locator('button.cm-lp-qjs-run').first().click();

		await expect(page.locator('text=QUERYJS_OUTPUT_2026')).toBeVisible({ timeout: 5_000 });
		await expect(page.locator('button.cm-lp-qjs-run')).toHaveCount(0);
	});

	test('cached result survives a tab switch (no re-execution, no Run button)', async ({
		qjsPage: page,
	}) => {
		await openNote(page, 'Query.md');
		await page.locator('button.cm-lp-qjs-run').first().click();
		await expect(page.locator('text=QUERYJS_OUTPUT_2026')).toBeVisible({ timeout: 5_000 });

		// Switch away to discard the widget DOM, then switch back. The cached
		// container is re-attached — the marker is still there AND the Run
		// button does NOT reappear (manual-mode cache hit is the contract).
		await openNote(page, 'Other.md');
		await openNote(page, 'Query.md');

		await expect(page.locator('text=QUERYJS_OUTPUT_2026')).toBeVisible({ timeout: 3_000 });
		await expect(page.locator('button.cm-lp-qjs-run')).toHaveCount(0);
	});
});

export { expect };
