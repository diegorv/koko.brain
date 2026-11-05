import { ask } from '@tauri-apps/plugin-dialog';
import { toast } from 'svelte-sonner';
import { deleteItem } from '#lib/core/filesystem/fs.service.js';
import { fileOperationErrorMessage, PreDeleteSaveError } from '#lib/core/filesystem/fs.logic.js';
import { basename } from '#lib/utils/path.js';

/**
 * Asks the same "Move to Trash" confirmation as the file explorer, then moves
 * the note to the trash. A failure is shown in a toast (`deleteItem` logs it).
 * @param path - the note's absolute path
 */
export async function deleteNoteWithConfirm(path: string): Promise<void> {
	const name = basename(path);
	const confirmed = await ask(`Move "${name}" to trash?`, {
		title: 'Move to Trash',
		kind: 'warning',
		okLabel: 'Move to Trash',
		cancelLabel: 'Cancel',
	});
	if (!confirmed) return;
	try {
		await deleteItem(path, false);
	} catch (err) {
		// The editor already toasted the failed save.
		if (err instanceof PreDeleteSaveError) return;
		toast.error(fileOperationErrorMessage('move {name} to the Trash', name, err));
	}
}
