import { test as base, type Page } from '@playwright/test';

export const TEST_VAULT_PATH = '/test-vault';

const DEFAULT_SETTINGS = {
	periodicNotes: {
		folder: '_notes',
		daily: {
			format: 'YYYY/MM-MMM/_[journal]-[day]-DD-MM-YYYY',
			template: '',
			templatePath: '_templates/Daily Note.md',
		},
		weekly: { format: 'YYYY/MM-MMM/[__journal-week-]WW[-]YYYY', templatePath: '_templates/Weekly Note.md' },
		monthly: { format: 'YYYY/MM-MMM/MM-MMM', templatePath: '_templates/Monthly Note.md' },
		quarterly: { format: 'YYYY/[_journal-quarter-]YYYY[-Q]Q', templatePath: '_templates/Quarterly Note.md' },
	},
	quickNote: {
		folderFormat: 'YYYY/MM-MMM',
		filenameFormat: '[capture-note-]YYYY-MM-DD[_]HH-mm-ss-SSS',
		templatePath: '_templates/Quick Note.md',
	},
	oneOnOne: {
		peopleFolder: '_people',
		folderFormat: 'YYYY/MM-MMM',
		filenameFormat: '[-1on1-]{person}[-]DD-MM-YYYY',
		templatePath: '_templates/One on One.md',
	},
	layout: {
		rightSidebarVisible: true,
		calendarVisible: true,
		propertiesVisible: true,
		backlinksVisible: true,
		outgoingLinksVisible: true,
		tagsVisible: true,
	},
	folderNotes: { enabled: true },
	editor: {
		fontFamily: 'MonoLisa, ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
		fontSize: 14,
		lineHeight: 1.6,
	},
	templates: { folder: '_templates' },
	appearance: {},
};

const FOLDER_ORDER_TEMPLATE = {
	_comment: 'Custom folder order for the file explorer.',
	_example: { '.': ['Projects', 'Archive', 'Daily'], Projects: ['active', 'backlog'] },
};

export const TEST_FILES: Record<string, string> = {
	[`${TEST_VAULT_PATH}/Welcome.md`]: '# Welcome\nThis is a test vault.\n\nSee also [[Projects/todo]].',
	[`${TEST_VAULT_PATH}/Projects/`]: '',
	[`${TEST_VAULT_PATH}/Projects/todo.md`]: '# Todo\n- [ ] First task\n- [x] Done task',
	[`${TEST_VAULT_PATH}/Projects/notes.md`]: '# Notes\nSome [[Welcome]] link here.',
	[`${TEST_VAULT_PATH}/Daily/`]: '',
	[`${TEST_VAULT_PATH}/Daily/2024-01-15.md`]: '# Daily Note\nToday was productive.',
	[`${TEST_VAULT_PATH}/.kokobrain/`]: '',
	[`${TEST_VAULT_PATH}/.kokobrain/settings.json`]: JSON.stringify(DEFAULT_SETTINGS, null, 2),
	[`${TEST_VAULT_PATH}/.kokobrain/folder-order.json`]: JSON.stringify(FOLDER_ORDER_TEMPLATE, null, 2),
};

async function waitForE2eApi(page: Page) {
	await page.waitForFunction(
		() => typeof window !== 'undefined' && window.__e2e?.fs !== undefined,
		{ timeout: 10_000 },
	);
}

async function populateAndOpenVault(page: Page) {
	await page.goto('/', { waitUntil: 'networkidle' });
	await waitForE2eApi(page);

	// Populate virtual FS
	await page.evaluate(
		({ files }) => {
			window.__e2e.fs.populate(files);
		},
		{ files: TEST_FILES },
	);

	// Set dialog response so "Open Vault" returns our test vault path
	await page.evaluate(
		({ vaultPath }) => {
			window.__e2e.dialog.setOpenResponse(vaultPath);
		},
		{ vaultPath: TEST_VAULT_PATH },
	);

	// Click "Open Vault" button
	await page.getByRole('button', { name: 'Open Vault' }).click();

	// Wait for file explorer to render (tree container appears)
	await page.locator('[role="tree"]').waitFor({ state: 'visible', timeout: 10_000 });
}

export const test = base.extend<{ vaultPage: Page }>({
	vaultPage: async ({ page }, use) => {
		await populateAndOpenVault(page);
		await use(page);
	},
});

export { expect } from '@playwright/test';
