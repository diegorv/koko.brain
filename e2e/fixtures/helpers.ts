/**
 * Shared helpers for golden-path specs. Keeps platform-shortcut translation
 * and tree/editor interactions in one place so specs stay focused on
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

/** Locator for the file explorer tree container. */
export function tree(page: Page): Locator {
	return page.locator('[role="tree"]');
}

/** Locator for a single tree item by visible name. */
export function treeItem(page: Page, name: string): Locator {
	return page.locator('[role="treeitem"]', { hasText: name });
}

/**
 * Wait for and click a tree item, then wait for the editor to mount.
 * Use this whenever a spec needs a file open in the editor as a precondition.
 */
export async function openTreeItem(page: Page, name: string): Promise<void> {
	const item = treeItem(page, name).first();
	await item.waitFor({ state: 'visible', timeout: 10_000 });
	await item.click();
	await page.locator('.cm-content').waitFor({ state: 'visible', timeout: 10_000 });
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

/** Locator for the currently-active editor tab. */
export function activeTab(page: Page): Locator {
	return page.locator('[role="tab"][data-state="active"]').first();
}

/** Assert the active tab's label contains the given substring. */
export async function expectTabActive(page: Page, name: string): Promise<void> {
	await expect(activeTab(page)).toContainText(name);
}
