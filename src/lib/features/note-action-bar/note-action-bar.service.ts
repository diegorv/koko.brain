import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { toast } from 'svelte-sonner';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { createFile } from '#lib/core/filesystem/fs.service.js';
import { getParentPath } from '#lib/core/filesystem/fs.logic.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { buildOpenNoteDeepLink } from '#lib/features/deep-link/deep-link.logic.js';
import { ensureFrontmatterLink } from '#lib/core/frontmatter/properties.logic.js';
import { applyExplicitOrganization } from '#lib/core/note-creator/explicit-organization.logic.js';
import { error } from '#lib/utils/debug.js';
import { basename, stem } from '#lib/utils/path.js';

/** Flips the one global note width setting between the configured content width and full width. */
export function toggleWideNotes(): void {
	settingsStore.updateEditor({ wideNotes: !settingsStore.editor.wideNotes });
}

/**
 * Shows the note in Finder; a failure (file gone, opener refused) is shown in a toast.
 * @param path - the note's absolute path
 */
export async function revealNote(path: string): Promise<void> {
	try {
		await revealItemInDir(path);
	} catch (err) {
		error('NOTE-ACTION-BAR', 'Reveal in Finder failed:', err);
		toast.error(`Could not reveal "${basename(path)}" in Finder.`);
	}
}

/** Writes `text` to the clipboard and confirms with `confirmation`; a failure is shown in a toast. */
async function copyWithToast(text: string, what: string, confirmation: string): Promise<void> {
	try {
		await navigator.clipboard.writeText(text);
	} catch (err) {
		error('NOTE-ACTION-BAR', `Copying ${what} failed:`, err);
		toast.error(`Could not copy ${what} to the clipboard.`);
		return;
	}
	toast.success(confirmation);
}

/**
 * Copies the note's absolute path and confirms with a toast.
 * @param path - the note's absolute path
 */
export async function copyNotePath(path: string): Promise<void> {
	await copyWithToast(path, 'the path', 'Path copied');
}

/**
 * Copies a `kokobrain://open` link for the note in the open vault and confirms
 * with a toast.
 * @param path - the note's absolute path
 */
export async function copyNoteDeepLink(path: string): Promise<void> {
	const vaultPath = vaultStore.path;
	const vaultName = vaultStore.name;
	const link = vaultPath && vaultName ? buildOpenNoteDeepLink(vaultName, vaultPath, path) : null;
	if (!link) {
		toast.error('Could not build a deeplink: the note is not in the open vault.');
		return;
	}
	await copyWithToast(link, 'the deeplink', 'Deeplink copied');
}

/**
 * New linked note: creates a plain `Untitled` note (deduped) in the hub's
 * folder whose frontmatter is `_belongs_to: [[hub]]`, then opens it. The note
 * is written whole by `create_note`, so a failure leaves no file; it is shown
 * in a toast.
 * @param hubPath - the hub note's absolute path
 */
export async function createLinkedNote(hubPath: string): Promise<void> {
	const hub = stem(hubPath);
	let created: string;
	try {
		const content = applyExplicitOrganization(ensureFrontmatterLink('', '_belongs_to', hub), settingsStore.explicitOrganization);
		created = await createFile(getParentPath(hubPath), 'Untitled.md', content);
	} catch {
		// `createFile` already logged the cause.
		toast.error(`Could not create a note linked to "${hub}".`);
		return;
	}
	await openFileInEditor(created);
}
