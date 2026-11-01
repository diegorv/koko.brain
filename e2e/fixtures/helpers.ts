/**
 * Shared helpers for golden-path specs. Keeps platform-shortcut translation
 * and Files navigator / editor interactions in one place so specs stay focused on
 * assertions instead of plumbing.
 */

import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Press a keyboard combo using `Meta` as the cross-platform modifier.
 *
 * Why always `Meta` (and not `Control` on Linux)?
 *
 * The app's keybinding utility (`src/lib/utils/keybindings.ts`) only checks
 * `event.metaKey` for `meta: true` bindings — it does NOT treat `ctrlKey`
 * as an equivalent fallback. The app is Tauri-first and targets the macOS
 * convention. Playwright's `keyboard.press('Meta+S')` dispatches a synthetic
 * keyboard event with `metaKey: true` on every OS (Cmd on macOS, Super/Win
 * on Linux/Windows), so the same `'Meta+S'` works in CI on Ubuntu just like
 * it does locally on macOS.
 *
 * Use `Mod` as the placeholder in callers — e.g. `pressShortcut(page, 'Mod+S')`.
 */
export async function pressShortcut(page: Page, combo: string): Promise<void> {
	await page.keyboard.press(combo.replace(/\bMod\b/g, 'Meta'));
}

/** Locator for the Files navigator (the Files rail item's folder column). */
export function filesNavigator(page: Page): Locator {
	return page.locator('[data-files-navigator]');
}

/** Locator for the Files navigator's button for the folder at `path` (absolute). */
export function folderButton(page: Page, path: string): Locator {
	return filesNavigator(page).locator(`[data-files-navigator-folder="${path}"]`);
}

/** Locator for the note list row titled `title` (a file name without its extension). */
export function listRow(page: Page, title: string): Locator {
	return page.locator('[data-rail-note-list] [data-note-row]', { has: page.getByText(title, { exact: true }) });
}

/**
 * Picks the Files rail item and the folder at `dir` (absolute), expanding its
 * ancestors in the navigator, so the note list shows that folder's files.
 */
export async function showFolder(page: Page, dir: string): Promise<void> {
	if (!(await filesNavigator(page).isVisible())) await page.locator('[data-rail-item="files"]').click();
	const root = filesNavigator(page).locator('[data-files-navigator-root]');
	await root.waitFor({ state: 'visible', timeout: 10_000 });
	const rootPath = (await root.getAttribute('data-files-navigator-folder')) ?? '';
	let current = rootPath;
	for (const segment of dir.slice(rootPath.length).split('/').filter(Boolean)) {
		const next = `${current}/${segment}`;
		if (current !== rootPath && !(await folderButton(page, next).isVisible())) {
			await filesNavigator(page).locator(`[data-files-navigator-toggle="${current}"]`).click();
		}
		current = next;
	}
	await folderButton(page, dir).click();
}

/** Absolute path of the vault file named `name`, outside hidden folders (the shallowest when several match). */
export async function vaultFilePath(page: Page, name: string): Promise<string> {
	const path = await page.evaluate(
		(n) =>
			Object.keys(window.__e2e.fs.dump())
				.filter((p) => p.endsWith(`/${n}`) && !p.split('/').some((part) => part.startsWith('.')))
				.sort((a, b) => a.split('/').length - b.split('/').length)[0] ?? null,
		name,
	);
	if (!path) throw new Error(`No file named ${name} in the vault`);
	return path;
}

/**
 * Opens the vault file named `name` (e.g. `Welcome.md`, `Board.canvas`) the way a
 * user does: Files rail item, its folder in the navigator, then its note list row.
 * Waits for the editor when the file is a Markdown note.
 */
export async function openFile(page: Page, name: string): Promise<void> {
	const path = await vaultFilePath(page, name);
	await showFolder(page, path.slice(0, path.lastIndexOf('/')));
	const dot = name.lastIndexOf('.');
	const row = listRow(page, dot > 0 ? name.slice(0, dot) : name).first();
	await row.waitFor({ state: 'visible', timeout: 10_000 });
	await row.click();
	if (name.endsWith('.md')) await page.locator('.cm-content').waitFor({ state: 'visible', timeout: 10_000 });
}

/** Type text into the active CodeMirror instance. Click first to ensure focus. */
export async function typeInEditor(page: Page, text: string): Promise<void> {
	await page.locator('.cm-content').click();
	await page.keyboard.type(text);
}

/** Save the active file (Cmd/Ctrl+S). */
export async function saveCurrentFile(page: Page): Promise<void> {
	await pressShortcut(page, 'Mod+S');
}

/** Open the command palette (Cmd/Ctrl+P). */
export async function openCommandPalette(page: Page): Promise<void> {
	await pressShortcut(page, 'Mod+P');
}

/** Open the quick switcher (Cmd/Ctrl+O). */
export async function openQuickSwitcher(page: Page): Promise<void> {
	await pressShortcut(page, 'Mod+O');
}

/** Open the global search panel (Cmd/Ctrl+Shift+F). */
export async function openSearch(page: Page): Promise<void> {
	await pressShortcut(page, 'Mod+Shift+F');
}

/**
 * Locator for the currently-active editor tab.
 *
 * `EditorTabs.svelte` marks the active tab with `aria-selected="true"`. The
 * `.editor-tabs-bar` scope matters: the event calendar's Day/Week/Month
 * switcher also renders `role="tab"` + `aria-selected`, so an unscoped
 * selector matches two elements while a Calendar tab is open. No `.first()`,
 * so Playwright's strict mode fails if more than one tab ever matches.
 */
export function activeTab(page: Page): Locator {
	return page.locator('.editor-tabs-bar [role="tab"][aria-selected="true"]');
}

/** Assert the active tab's label contains the given substring. */
export async function expectTabActive(page: Page, name: string): Promise<void> {
	await expect(activeTab(page)).toContainText(name);
}
