import { test as base, expect, type Page } from '@playwright/test';

const TEST_VAULT_PATH = '/test-vault';

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

/** Test vault with tagged files for tag panel testing */
const TAGGED_FILES: Record<string, string> = {
	[`${TEST_VAULT_PATH}/note-a.md`]:
		'---\ntags: [project, work]\n---\n# Note A\nSome content with #meeting tag.',
	[`${TEST_VAULT_PATH}/note-b.md`]:
		'---\ntags: [project]\n---\n# Note B\nMore content here.\n\n#work #review',
	[`${TEST_VAULT_PATH}/note-c.md`]:
		'# Note C\nNo frontmatter tags.\n\n#work #meeting',
	[`${TEST_VAULT_PATH}/.kokobrain/`]: '',
	[`${TEST_VAULT_PATH}/.kokobrain/settings.json`]: JSON.stringify(DEFAULT_SETTINGS, null, 2),
	[`${TEST_VAULT_PATH}/.kokobrain/folder-order.json`]: JSON.stringify({
		_comment: 'Custom folder order for the file explorer.',
		_example: { '.': ['Projects', 'Archive', 'Daily'], Projects: ['active', 'backlog'] },
	}, null, 2),
};

async function openVaultWithTags(page: Page) {
	await page.goto('/', { waitUntil: 'networkidle' });
	await page.waitForFunction(
		() => typeof window !== 'undefined' && window.__e2e?.fs !== undefined,
		{ timeout: 10_000 },
	);
	await page.evaluate(({ files }) => { window.__e2e.fs.populate(files); }, { files: TAGGED_FILES });
	await page.evaluate(({ vaultPath }) => { window.__e2e.dialog.setOpenResponse(vaultPath); }, { vaultPath: TEST_VAULT_PATH });
	await page.getByRole('button', { name: 'Open Vault' }).click();
	await page.locator('[role="tree"]').waitFor({ state: 'visible', timeout: 10_000 });
	// Wait for full vault initialization (index build + tag indexing)
	await page.waitForTimeout(1_000);
}

const test = base.extend<{ tagPage: Page }>({
	tagPage: async ({ page }, use) => {
		await openVaultWithTags(page);
		await use(page);
	},
});

test.describe('Tags Panel', () => {
	test('shows tags panel with tag count', async ({ tagPage: page }) => {
		// Tags panel should be visible with a tag count
		await expect(page.getByText('Tags', { exact: true })).toBeVisible();
		await expect(page.locator('p', { hasText: /\d+ tags?/ })).toBeVisible({ timeout: 5_000 });
	});

	test('displays tags that appear in multiple files', async ({ tagPage: page }) => {
		// Wait for tag count to appear (signals tags are loaded)
		await expect(page.locator('p', { hasText: /\d+ tags?/ })).toBeVisible({ timeout: 5_000 });

		// Tags with count > 1 are displayed (hideRareTags is on by default, threshold = 1)
		// "project" appears in 2 files → count 2
		// "work" appears in 3 files → count 3
		// "meeting" appears in 2 files → count 2
		// Use the Tags panel's scrollable area to find tag items
		const tagsPanel = page.locator('.max-h-\\[50vh\\]').last();
		await expect(tagsPanel.locator('button', { hasText: 'project' })).toBeVisible({ timeout: 3_000 });
		await expect(tagsPanel.locator('button', { hasText: 'work' })).toBeVisible({ timeout: 3_000 });
		await expect(tagsPanel.locator('button', { hasText: 'meeting' })).toBeVisible({ timeout: 3_000 });
	});

	test('toggle filter shows rare tags', async ({ tagPage: page }) => {
		// Wait for tags to load
		await expect(page.locator('p', { hasText: /\d+ tags?/ })).toBeVisible({ timeout: 5_000 });

		// "review" appears only in 1 file, so it should be hidden with default filter
		const tagsPanel = page.locator('.max-h-\\[50vh\\]').last();
		await expect(tagsPanel.locator('button', { hasText: 'review' })).not.toBeVisible();

		// Click filter button to show all tags
		await page.locator('button[title="Show all tags"]').click();

		// Now "review" should be visible
		await expect(tagsPanel.locator('button', { hasText: 'review' })).toBeVisible({ timeout: 3_000 });
	});

	test('tags show occurrence count', async ({ tagPage: page }) => {
		// Wait for tags to load
		await expect(page.locator('p', { hasText: /\d+ tags?/ })).toBeVisible({ timeout: 5_000 });

		// The "work" tag should show its count (3 files have #work)
		const tagsPanel = page.locator('.max-h-\\[50vh\\]').last();
		const workTag = tagsPanel.locator('button', { hasText: 'work' });
		await expect(workTag).toBeVisible({ timeout: 3_000 });
		await expect(workTag).toContainText('3');
	});
});
