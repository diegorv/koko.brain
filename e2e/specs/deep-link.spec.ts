import type { Page } from '@playwright/test';
import { test, expect, TEST_FILES, TEST_VAULT_PATH } from '../fixtures/test-vault';
import { expectTabActive } from '../fixtures/helpers';

const SETTINGS_PATH = `${TEST_VAULT_PATH}/.kokobrain/settings.json`;

/** The `note` capture template the default quick-capture settings point at; `<% title %>` is the note's title. */
const CAPTURE_TEMPLATE_PATH = `${TEST_VAULT_PATH}/_system/templates/quick-capture/Composer-Note.md`;

/** The fixture settings with the daily note's auto-open off, so only the `daily` link creates today's note. */
function settingsWithoutDailyAutoOpen(): string {
	const settings = JSON.parse(TEST_FILES[SETTINGS_PATH]);
	settings.periodicNotes.daily.autoOpen = false;
	return JSON.stringify(settings, null, 2);
}

test.use({
	clockTime: '2026-11-10T10:00:00+01:00',
	timezoneId: 'Europe/Berlin',
	vaultFiles: {
		...TEST_FILES,
		[SETTINGS_PATH]: settingsWithoutDailyAutoOpen(),
		[CAPTURE_TEMPLATE_PATH]: '# <% title %>',
	},
});

/** Hands `url` to the running app, the way the OS delivers a `kokobrain://` link. */
async function openDeepLink(page: Page, url: string): Promise<void> {
	await page.evaluate((u) => window.__e2e.deepLink.open([u]), url);
}

/** The file's content in the virtual vault, or null when it does not exist. */
function fileContent(page: Page, path: string): Promise<string | null> {
	return page.evaluate((p) => window.__e2e.fs.readFileSafe(p), path);
}

test.describe('Deep links', () => {
	test('open shows an existing note in a tab', async ({ vaultPage: page }) => {
		await openDeepLink(page, 'kokobrain://open?vault=test-vault&file=Inbox.md');

		await expectTabActive(page, 'Inbox.md');
		await expect(page.locator('.cm-content')).toContainText('Quick capture area');
	});

	test('new creates a note with the given content and opens it', async ({ vaultPage: page }) => {
		const path = `${TEST_VAULT_PATH}/Projects/Deep Note.md`;
		expect(await fileContent(page, path)).toBeNull();

		await openDeepLink(page, `kokobrain://new?vault=test-vault&name=${encodeURIComponent('Projects/Deep Note')}&content=${encodeURIComponent('Written by a deep link')}`);

		await expectTabActive(page, 'Deep Note.md');
		await expect(page.locator('.cm-content')).toContainText('Written by a deep link');
		await expect.poll(() => fileContent(page, path)).toContain('Written by a deep link');
	});

	test('daily creates today\'s daily note in the periodic-notes folder and appends the content', async ({ vaultPage: page }) => {
		const path = `${TEST_VAULT_PATH}/Daily/2026-11-10.md`;
		expect(await fileContent(page, path)).toBeNull();

		await openDeepLink(page, `kokobrain://daily?vault=test-vault&content=${encodeURIComponent('Logged by a deep link')}`);

		await expectTabActive(page, '2026-11-10.md');
		await expect(page.locator('.cm-content')).toContainText('Logged by a deep link');
		await expect.poll(() => fileContent(page, path)).toContain('Logged by a deep link');
	});

	test('capture note writes a titled note with the text at the quick-capture path', async ({ vaultPage: page }) => {
		// Default quick-capture formats: base folder `Daily` (periodic notes), folder `YYYY/MM-MMM`,
		// file `[capture-note-]YYYY-MM-DD[_]HH-mm-ss-SSS`. The seconds are not fixed, so match the name.
		const folder = `${TEST_VAULT_PATH}/Daily/2026/11-Nov/`;
		const captures = () =>
			page.evaluate(
				(dir) => Object.entries(window.__e2e.fs.dump()).filter(([p]) => p.startsWith(dir) && p.endsWith('.md')),
				folder,
			);
		expect(await captures()).toEqual([]);

		await openDeepLink(page, `kokobrain://capture?vault=test-vault&v=2&kind=note&text=${encodeURIComponent('Captured by a deep link')}`);

		await expect.poll(async () => (await captures()).length).toBe(1);
		const [[path, content]] = await captures();
		const name = path.slice(folder.length);
		expect(name).toMatch(/^capture-note-2026-11-10_10-\d{2}-\d{2}-\d{3}\.md$/);
		expect(content).toBe(`---\n_organized: false\n---\n# ${name.replace(/\.md$/, '')}\nCaptured by a deep link`);
	});
});
