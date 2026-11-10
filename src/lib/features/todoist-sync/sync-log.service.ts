import { toast } from 'svelte-sonner';
import { call } from '#lib/contracts/ipc.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { error } from '#lib/utils/debug.js';
import { todoistSyncStore } from './todoist-sync.store.svelte.js';

/** Rows the sync log dialog lists. */
const LOG_LIMIT = 100;

/**
 * Palette "Todoist: Show sync log": reads the newest sync log rows of the
 * open vault (conflict losers, detaches, frozen anchors, skipped lines,
 * terminal command errors) and opens the dialog on them. A read failure is
 * logged and shown in an error toast.
 */
export async function showSyncLog(): Promise<void> {
	const vaultPath = vaultStore.path;
	if (vaultPath === null) {
		toast.error('Open a vault to see its Todoist sync log.');
		return;
	}
	try {
		todoistSyncStore.openLog(await call('todoist_read_log', { vaultPath, limit: LOG_LIMIT }));
	} catch (err) {
		error('TODOIST', 'reading the sync log failed:', err);
		toast.error('Could not read the Todoist sync log. Details are in the log.');
	}
}
