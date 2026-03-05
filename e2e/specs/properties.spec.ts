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

/** Test vault with frontmatter properties */
const PROPERTIES_FILES: Record<string, string> = {
	[`${TEST_VAULT_PATH}/with-props.md`]:
		'---\ntitle: My Note\nstatus: draft\ntags: [project, important]\n---\n# With Properties\nContent here.',
	[`${TEST_VAULT_PATH}/no-props.md`]:
		'# No Properties\nJust plain content without frontmatter.',
	[`${TEST_VAULT_PATH}/.kokobrain/`]: '',
	[`${TEST_VAULT_PATH}/.kokobrain/settings.json`]: JSON.stringify(DEFAULT_SETTINGS, null, 2),
	[`${TEST_VAULT_PATH}/.kokobrain/folder-order.json`]: JSON.stringify({
		_comment: 'Custom folder order for the file explorer.',
		_example: { '.': ['Projects', 'Archive', 'Daily'], Projects: ['active', 'backlog'] },
	}, null, 2),
};

async function openVaultWithProperties(page: Page) {
	await page.goto('/', { waitUntil: 'networkidle' });
	await page.waitForFunction(
		() => typeof window !== 'undefined' && window.__e2e?.fs !== undefined,
		{ timeout: 10_000 },
	);
	await page.evaluate(({ files }) => { window.__e2e.fs.populate(files); }, { files: PROPERTIES_FILES });
	await page.evaluate(({ vaultPath }) => { window.__e2e.dialog.setOpenResponse(vaultPath); }, { vaultPath: TEST_VAULT_PATH });
	await page.getByRole('button', { name: 'Open Vault' }).click();
	await page.locator('[role="tree"]').waitFor({ state: 'visible', timeout: 10_000 });
	// Wait for vault initialization to complete
	await page.waitForTimeout(1_000);
}

const test = base.extend<{ propsPage: Page }>({
	propsPage: async ({ page }, use) => {
		await openVaultWithProperties(page);
		await use(page);
	},
});

test.describe('Properties Panel', () => {
	test('shows properties from frontmatter', async ({ propsPage: page }) => {
		// Open file with frontmatter properties
		await page.locator('[role="treeitem"]', { hasText: 'with-props.md' }).click();
		await expect(page.locator('.cm-content')).toContainText('With Properties');

		// Wait for properties panel to parse frontmatter (300ms debounce + rendering)
		// Svelte sets DOM .value property, not HTML attribute, so use waitForFunction
		await page.waitForFunction(() => {
			const inputs = document.querySelectorAll('input[placeholder="key"]');
			const values = Array.from(inputs).map(i => (i as HTMLInputElement).value);
			return values.includes('title') && values.includes('status') && values.includes('tags');
		}, { timeout: 5_000 });
	});

	test('shows property values', async ({ propsPage: page }) => {
		// Open file with properties
		await page.locator('[role="treeitem"]', { hasText: 'with-props.md' }).click();
		await expect(page.locator('.cm-content')).toContainText('With Properties');

		// Wait for property values to appear (check DOM property, not HTML attribute)
		await page.waitForFunction(() => {
			const inputs = document.querySelectorAll('input');
			const values = Array.from(inputs).map(i => i.value);
			return values.includes('My Note') && values.includes('draft');
		}, { timeout: 5_000 });
	});

	test('shows empty properties for file without frontmatter', async ({ propsPage: page }) => {
		// Open file without frontmatter
		await page.locator('[role="treeitem"]', { hasText: 'no-props.md' }).click();
		await expect(page.locator('.cm-content')).toContainText('No Properties');

		// Wait for debounce, then check "Add property" button shows (no property fields)
		await page.waitForTimeout(500);
		await expect(page.getByText('Add property')).toBeVisible({ timeout: 3_000 });
	});

	test('add new property via panel', async ({ propsPage: page }) => {
		// Open file without frontmatter
		await page.locator('[role="treeitem"]', { hasText: 'no-props.md' }).click();
		await expect(page.locator('.cm-content')).toContainText('No Properties');
		await page.waitForTimeout(500);

		// Click "Add property" button
		await page.getByText('Add property').click();

		// Type property name
		const nameInput = page.locator('input[placeholder="Property name..."]');
		await expect(nameInput).toBeVisible();
		await nameInput.fill('author');
		await nameInput.press('Enter');

		// The new property key should appear (check DOM property, not HTML attribute)
		await page.waitForFunction(() => {
			const inputs = document.querySelectorAll('input[placeholder="key"]');
			return Array.from(inputs).some(i => (i as HTMLInputElement).value === 'author');
		}, { timeout: 3_000 });
	});

	test('properties update when switching files', async ({ propsPage: page }) => {
		// Open file with properties
		await page.locator('[role="treeitem"]', { hasText: 'with-props.md' }).click();

		// Wait for properties to load
		await page.waitForFunction(() => {
			const inputs = document.querySelectorAll('input[placeholder="key"]');
			return Array.from(inputs).some(i => (i as HTMLInputElement).value === 'title');
		}, { timeout: 5_000 });

		// Switch to file without properties
		await page.locator('[role="treeitem"]', { hasText: 'no-props.md' }).click();
		await expect(page.locator('.cm-content')).toContainText('No Properties');

		// Properties should clear — wait for debounce
		await page.waitForFunction(() => {
			const inputs = document.querySelectorAll('input[placeholder="key"]');
			return !Array.from(inputs).some(i => (i as HTMLInputElement).value === 'title');
		}, { timeout: 5_000 });
		await expect(page.getByText('Add property')).toBeVisible();
	});
});
