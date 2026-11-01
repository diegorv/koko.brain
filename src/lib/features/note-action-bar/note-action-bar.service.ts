import { ask } from '@tauri-apps/plugin-dialog';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { toast } from 'svelte-sonner';
import { deleteItem } from '#lib/core/filesystem/fs.service.js';
import { fileOperationErrorMessage } from '#lib/core/filesystem/fs.logic.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { buildOpenNoteDeepLink } from '#lib/features/deep-link/deep-link.logic.js';
import { error } from '#lib/utils/debug.js';
import { basename } from '#lib/utils/path.js';

/**
 * Asks the same "Move to Trash" confirmation as the file explorer, then moves
 * the note to the trash. A failure is shown in a toast (`deleteItem` logs it).
 * @param path - the note's absolute path
 */
export async function deleteNoteWithConfirm(path: string): Promise<void> {
	const name = basename(path);
	const confirmed = await ask(`Move "${name}" to trash?`, { title: 'Move to Trash', kind: 'warning' });
	if (!confirmed) return;
	try {
		await deleteItem(path, false);
	} catch (err) {
		toast.error(fileOperationErrorMessage('move {name} to the Trash', name, err));
	}
}

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
