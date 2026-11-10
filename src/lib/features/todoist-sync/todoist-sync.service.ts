import { toast } from 'svelte-sonner';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { debug, error } from '#lib/utils/debug.js';
import {
	classifyTodoistError,
	countSyncScope,
	formatCheckResult,
	rootProjectChoices,
	syncErrorMessage,
	type RootProjectChoice,
} from './sync-scope.logic';
import { createTodoistClient } from './todoist-client';
import { todoistSyncStore } from './todoist-sync.store.svelte';

/** The outcome of a connection check, with the message to show. */
export type SyncCheckOutcome = { ok: boolean; message: string };

/**
 * The vault's root project choices, from a projects-only full `/sync`.
 * @throws Error when no token is configured, or the SDK error of a failed request
 */
export async function fetchRootProjectChoices(): Promise<RootProjectChoice[]> {
	const token = settingsStore.todoist.apiToken;
	if (!token) throw new Error('Todoist API token not configured');
	const res = await createTodoistClient(token).sync({ syncToken: '*', resourceTypes: ['projects'] });
	return rootProjectChoices(res.projects ?? []);
}

/**
 * Runs one full `/sync` of projects and items and counts what the vault's
 * root tree (plus the Inbox when included) holds. Writes nothing: no note,
 * no sync state. Refuses before the vault index is ready, without a token or
 * root project, and while another run is in progress; a Todoist failure is
 * logged raw and reduced to a fixed message. Status and result go to
 * `todoistSyncStore`.
 */
export async function checkSyncConnection(): Promise<SyncCheckOutcome> {
	const { apiToken, syncRootProjectId, syncIncludeInbox } = settingsStore.todoist;
	if (!vaultStore.indexReady) return { ok: false, message: 'The vault is still indexing. Try again when it finishes.' };
	if (!apiToken) return { ok: false, message: 'Add your Todoist API token in Settings > Todoist first.' };
	if (!syncRootProjectId) return { ok: false, message: 'Choose a sync root project in Settings > Todoist first.' };
	if (todoistSyncStore.isSyncing) return { ok: false, message: 'A Todoist sync is already running.' };

	todoistSyncStore.start();
	let res;
	try {
		res = await createTodoistClient(apiToken).sync({ syncToken: '*', resourceTypes: ['projects', 'items'] });
	} catch (err) {
		error('TODOIST', 'sync connection check failed:', err);
		const message = syncErrorMessage(classifyTodoistError(err));
		todoistSyncStore.fail(message);
		return { ok: false, message };
	}

	const counts = countSyncScope(res.projects ?? [], res.items ?? [], syncRootProjectId, syncIncludeInbox);
	if (!counts) {
		const message = 'The sync root project was not found in Todoist. Choose it again in Settings > Todoist.';
		todoistSyncStore.fail(message);
		return { ok: false, message };
	}
	debug('TODOIST', 'sync connection check:', counts);
	todoistSyncStore.succeed({ kind: 'check', ...counts, finishedAt: Date.now() });
	return { ok: true, message: formatCheckResult(counts) };
}

/** Palette entry point: runs the check and shows its message in a toast. */
export async function checkSyncConnectionFromUi(): Promise<void> {
	const { ok, message } = await checkSyncConnection();
	if (ok) toast.success(message);
	else toast.error(message);
}
