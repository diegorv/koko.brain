import { toast } from 'svelte-sonner';
import { call } from '#lib/contracts/ipc.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { error } from '#lib/utils/debug.js';
import { cycleLogEntry, type CycleRun } from './cycle-log.logic.js';
import { todoistSyncStore } from './todoist-sync.store.svelte.js';

/** Rows the sync log dialog lists. */
const LOG_LIMIT = 100;

/**
 * Palette "Todoist: Show sync log": reads the newest sync log rows of the
 * open vault (cycle rows, conflict losers, detaches, frozen anchors, skipped
 * lines, terminal command errors) and opens the dialog on them. A read
 * failure is logged and shown in an error toast.
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

/**
 * Writes the `cycle` row of a sync cycle to the log of `vaultPath`, folding a
 * quiet automatic cycle into the newest row (`cycleLogEntry`). A failure is
 * logged and leaves the cycle's outcome as it is: the sync already ran.
 */
export async function logCycle(vaultPath: string, run: CycleRun): Promise<void> {
	try {
		const [newest] = await call('todoist_read_log', { vaultPath, limit: 1 });
		await call('todoist_append_log', { vaultPath, entries: [cycleLogEntry(run, newest ?? null)] });
	} catch (err) {
		error('TODOIST', 'writing the sync cycle row failed:', err);
	}
}
