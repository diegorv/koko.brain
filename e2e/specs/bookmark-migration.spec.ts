import type { Page } from '@playwright/test';
import { test, expect, TEST_FILES, TEST_VAULT_PATH } from '../fixtures/test-vault';

const SETTINGS_PATH = `${TEST_VAULT_PATH}/.kokobrain/settings.json`;
const BOOKMARKS_PATH = `${TEST_VAULT_PATH}/.kokobrain/bookmarks.json`;
const WELCOME_PATH = `${TEST_VAULT_PATH}/Welcome.md`;
const ROADMAP_PATH = `${TEST_VAULT_PATH}/Projects/Roadmap.md`;
const BOARD_PATH = `${TEST_VAULT_PATH}/Board.canvas`;

/** A bookmarks.json entry as the removed bookmarks feature wrote it. */
function bookmark(path: string, isDirectory = false) {
	return { path, name: path.split('/').pop(), isDirectory, createdAt: 1 };
}

/** The test vault's settings, opened in the rail shell so the Favorites lens is one click away. */
function railSettings(): string {
	const settings = JSON.parse(TEST_FILES[SETTINGS_PATH]);
	return JSON.stringify({ ...settings, layout: { ...settings.layout, shell: 'rail' } }, null, 2);
}

/** Opens the test vault seeded with `extraFiles` on top of the standard files. */
async function openVault(page: Page, extraFiles: Record<string, string>): Promise<void> {
	await page.goto('/', { waitUntil: 'networkidle' });
	await page.waitForFunction(() => window.__e2e?.fs !== undefined, { timeout: 10_000 });
	const files = { ...TEST_FILES, [SETTINGS_PATH]: railSettings(), ...extraFiles };
	await page.evaluate((f) => window.__e2e.fs.populate(f), files);
	await page.evaluate((p) => window.__e2e.dialog.setOpenResponse(p), TEST_VAULT_PATH);
	await page.getByRole('button', { name: 'Open Vault' }).click();
	await expect(page.locator('[data-rail]')).toBeVisible({ timeout: 10_000 });
}

/** Reopens the vault in a fresh page load with the in-memory fs it currently holds. */
async function reopenVault(page: Page): Promise<void> {
	const files = await page.evaluate(() => window.__e2e.fs.dump());
	await page.reload({ waitUntil: 'networkidle' });
	await page.waitForFunction(() => window.__e2e?.fs !== undefined, { timeout: 10_000 });
	await page.evaluate((f) => window.__e2e.fs.populate(f), files);
	await page.evaluate((p) => window.__e2e.dialog.setOpenResponse(p), TEST_VAULT_PATH);
	await page.getByRole('button', { name: 'Open Vault' }).click();
	await expect(page.locator('[data-rail]')).toBeVisible({ timeout: 10_000 });
}

function fileOnDisk(page: Page, path: string): Promise<string | null> {
	return page.evaluate((p) => window.__e2e.fs.readFileSafe(p), path);
}

function toasts(page: Page) {
	return page.locator('[data-sonner-toast]');
}

function favoritesRow(page: Page, title: string) {
	return page
		.locator('[data-rail-note-list]')
		.locator('[data-note-row]', { has: page.getByText(title, { exact: true }) });
}

test.describe('Bookmark migration', () => {
	test('markdown bookmarks become favorites, the rest are named in one toast, and the bookmarks file is gone', async ({ page }) => {
		await openVault(page, {
			[BOARD_PATH]: JSON.stringify({ nodes: [], edges: [] }),
			[BOOKMARKS_PATH]: JSON.stringify([
				bookmark(WELCOME_PATH),
				bookmark(`${TEST_VAULT_PATH}/Projects`, true),
				bookmark(ROADMAP_PATH),
				bookmark(BOARD_PATH),
			]),
		});

		const toast = toasts(page).filter({ hasText: 'Bookmarks are now Favorites' });
		await expect(toast).toHaveCount(1);
		await expect(toast).toContainText('Projects');
		await expect(toast).toContainText('Board.canvas');
		await expect(toast).not.toContainText('Welcome.md');

		expect(await fileOnDisk(page, BOOKMARKS_PATH)).toBeNull();
		expect(await fileOnDisk(page, WELCOME_PATH)).toContain('_favorite: true');
		const roadmap = await fileOnDisk(page, ROADMAP_PATH);
		expect(roadmap).toContain('_favorite: true');
		expect(roadmap).toContain('status: active');

		await page.locator('[data-rail-item="favorites"]').click();
		await expect(page.locator('[data-rail-note-list] [data-note-list-label]')).toHaveText('Favorites');
		await expect(favoritesRow(page, 'Welcome')).toBeVisible({ timeout: 15_000 });
		await expect(favoritesRow(page, 'Roadmap')).toBeVisible({ timeout: 15_000 });

		// A second open has no bookmarks file left: nothing to migrate, no toast.
		await reopenVault(page);
		await page.waitForTimeout(1_000);
		await expect(toasts(page).filter({ hasText: /bookmark/i })).toHaveCount(0);
		expect(await fileOnDisk(page, WELCOME_PATH)).toContain('_favorite: true');
	});

	test('a vault with no bookmarks file shows no migration toast', async ({ page }) => {
		await openVault(page, {});
		await page.waitForTimeout(1_000);

		await expect(toasts(page).filter({ hasText: /bookmark/i })).toHaveCount(0);
		expect(await fileOnDisk(page, WELCOME_PATH)).not.toContain('_favorite');
	});

	test('a note whose frontmatter cannot be rewritten keeps the bookmarks file and shows a toast', async ({ page }) => {
		const lossyPath = `${TEST_VAULT_PATH}/Lossy.md`;
		const lossy = '---\nstatus: open # keep this comment\n---\n# Lossy\n';
		const bookmarks = JSON.stringify([bookmark(WELCOME_PATH), bookmark(lossyPath)]);
		await openVault(page, { [lossyPath]: lossy, [BOOKMARKS_PATH]: bookmarks });

		const toast = toasts(page).filter({ hasText: 'Could not mark these bookmarked notes as favorites' });
		await expect(toast).toHaveCount(1);
		await expect(toast).toContainText('Lossy.md');
		expect(await fileOnDisk(page, BOOKMARKS_PATH)).toBe(bookmarks);
		expect(await fileOnDisk(page, lossyPath)).toBe(lossy);
	});
});
