import type { Locator, Page } from '@playwright/test';
import { expect } from './test-vault';
import { pressShortcut } from './helpers';

/** Past the frontmatter autosave plus the default 3 s rule debounce, with slack for slow runs. */
export const RULE_TIMEOUT_MS = 15_000;

/** Opens Settings on the Auto Organize section and returns the Settings panel. */
export async function openAutoOrganizeSettings(page: Page): Promise<Locator> {
	await pressShortcut(page, 'Mod+Comma');
	const panel = page.locator('[role="dialog"][aria-label="Settings"]');
	await expect(panel).toBeVisible();
	await panel.getByRole('button', { name: 'Auto Organize', exact: true }).click();
	await expect(panel.getByRole('heading', { name: 'Auto Organize' })).toBeVisible();
	return panel;
}

/** Turns the whole feature on with the section's first switch, "Enable Auto Organize". */
export async function switchAutoOrganizeOn(panel: Locator): Promise<void> {
	const enable = panel.getByRole('switch').first();
	await enable.click();
	await expect(enable).toHaveAttribute('aria-checked', 'true');
}

/** Turns Auto Organize on through its Settings switch, then closes Settings. */
export async function enableAutoOrganize(page: Page): Promise<void> {
	const panel = await openAutoOrganizeSettings(page);
	await switchAutoOrganizeOn(panel);
	await page.keyboard.press('Escape');
	await expect(panel).toBeHidden();
}

/** The saved content of the vault file at `path`, or null when it does not exist. */
export function fileContent(page: Page, path: string): Promise<string | null> {
	return page.evaluate((p) => window.__e2e.fs.dump()[p] ?? null, path);
}

/**
 * The active editor's document, read from the CodeMirror view behind
 * `.cm-content` (a spec cannot import the page's CodeMirror module).
 */
export function editorDoc(page: Page): Promise<string> {
	return page.evaluate(() => {
		const content = document.querySelector('.cm-content') as
			| (Element & { cmTile?: { root?: { view?: { state: { doc: { toString(): string } } } } } })
			| null;
		const view = content?.cmTile?.root?.view;
		if (!view) throw new Error('No CodeMirror view behind .cm-content');
		return view.state.doc.toString();
	});
}

/**
 * Types `text` at the end of the active note's body, so it never lands in the
 * frontmatter whatever the layout puts under the centre of the editor.
 */
export async function typeAtEnd(page: Page, text: string): Promise<void> {
	await page.locator('.cm-content').click();
	await pressShortcut(page, 'Mod+End');
	await page.keyboard.type(text);
}
