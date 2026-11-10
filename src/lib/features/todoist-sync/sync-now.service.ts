import { toast } from 'svelte-sonner';
import { call } from '#lib/contracts/ipc.js';
import type { TodoistTaskLink } from '#lib/contracts/index.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { debug, error } from '#lib/utils/debug.js';
import { createNoteFile } from './closed-note-writer.service.js';
import { writeTaskLinesToNote } from './note-writer.service.js';
import {
	excludedLabelSet,
	formatPullResult,
	normalizeSyncFolder,
	planPull,
	type PullCounts,
	type PullItem,
} from './pull.logic.js';
import { classifyTodoistError, syncErrorMessage, treeProjectIds } from './sync-scope.logic.js';
import { createTodoistClient } from './todoist-client.js';
import { todoistSyncStore } from './todoist-sync.store.svelte.js';
import { scanVault } from './vault-scan.service.js';

/** The outcome of "Sync now", with the message to show. */
export type SyncNowOutcome = { ok: boolean; message: string };

/** A run stopped by a fixed, user-facing reason; the message is shown as-is. */
class SyncStop extends Error {}

const VAULT_SWITCHED = 'The vault changed during the Todoist sync; nothing more was written.';
const ROOT_MISSING = 'The sync root project was not found in Todoist. Choose it again in Settings > Todoist.';

/**
 * Runs one "Sync now" cycle, pull only (nothing is sent to Todoist): one full
 * `/sync` of projects and items, a scan of the vault, then project notes
 * created and open tasks of the vault's tree inserted as anchored lines
 * (`planPull`), and the new links committed in one transaction with the
 * `sync_token`. A rerun inserts and rewrites nothing.
 *
 * Refuses before the vault index is ready, while sync is off, without a
 * token or root project, with a sync folder that is absolute or climbs out
 * with `..`, and while another run is in progress. The vault path is captured
 * at the start and rechecked before every write; after a vault switch the
 * run stops and writes nothing more (design rule 9). Status and result go to
 * `todoistSyncStore`; a failure is logged raw and reduced to a fixed message.
 */
export async function syncNow(): Promise<SyncNowOutcome> {
	const { apiToken, syncEnabled, syncRootProjectId, syncFolder } = settingsStore.todoist;
	const vaultRoot = vaultStore.path;
	if (vaultRoot === null || !vaultStore.indexReady) {
		return { ok: false, message: 'The vault is still indexing. Try again when it finishes.' };
	}
	if (!syncEnabled) return { ok: false, message: 'Turn on Todoist sync in Settings > Todoist first.' };
	if (!apiToken) return { ok: false, message: 'Add your Todoist API token in Settings > Todoist first.' };
	if (!syncRootProjectId) return { ok: false, message: 'Choose a sync root project in Settings > Todoist first.' };
	const folder = normalizeSyncFolder(syncFolder);
	if (folder === null) {
		return { ok: false, message: 'The Todoist sync folder must be a folder inside the vault. Fix it in Settings > Todoist.' };
	}
	if (todoistSyncStore.isSyncing) return { ok: false, message: 'A Todoist sync is already running.' };

	todoistSyncStore.start();
	try {
		const counts = await pull(vaultRoot, folder);
		debug('TODOIST', 'sync now:', counts);
		todoistSyncStore.succeed({ kind: 'pull', ...counts, finishedAt: Date.now() });
		return { ok: true, message: formatPullResult(counts) };
	} catch (err) {
		if (!(err instanceof SyncStop)) error('TODOIST', 'sync failed:', err);
		const message = err instanceof SyncStop ? err.message : 'Todoist sync failed. Details are in the log.';
		todoistSyncStore.fail(message);
		return { ok: false, message };
	}
}

/** Palette entry point: runs "Sync now" and shows its message in a toast. */
export async function syncNowFromUi(): Promise<void> {
	const { ok, message } = await syncNow();
	if (ok) toast.success(message);
	else toast.error(message);
}

async function pull(vaultRoot: string, folder: string): Promise<PullCounts> {
	const { apiToken, syncRootProjectId, syncIncludeInbox, defaultLabel } = settingsStore.todoist;
	let res;
	try {
		res = await createTodoistClient(apiToken).sync({ syncToken: '*', resourceTypes: ['projects', 'items'] });
	} catch (err) {
		error('TODOIST', 'sync failed:', err);
		throw new SyncStop(syncErrorMessage(classifyTodoistError(err)));
	}
	const projects = res.projects ?? [];
	if (!treeProjectIds(projects, syncRootProjectId, syncIncludeInbox)) throw new SyncStop(ROOT_MISSING);

	assertVault(vaultRoot);
	const links = await call('todoist_read_links', { vaultPath: vaultRoot });
	const scan = await scanVault(vaultRoot, settingsStore.templates.folder);
	const plan = planPull({
		folder,
		projects,
		items: (res.items ?? []) as PullItem[],
		rootId: syncRootProjectId,
		includeInbox: syncIncludeInbox,
		links,
		occurrences: scan.occurrences,
		notes: scan.notes,
		excludedLabels: excludedLabelSet(defaultLabel),
	});

	const commit: TodoistTaskLink[] = [...plan.updatedLinks, ...plan.pairedLinks];
	const log = [...plan.log];
	let tasksInserted = 0;
	let anyStale = false;
	for (const note of plan.createNotes) {
		assertVault(vaultRoot);
		await createNoteFile(vaultRoot, `${vaultRoot}/${note.relPath}`, note.content);
	}
	for (const insert of plan.inserts) {
		assertVault(vaultRoot);
		const out = await writeTaskLinesToNote(vaultRoot, insert.relPath, {
			replace: [],
			remove: [],
			insert: [{ afterHeading: null, lines: insert.lines }],
		});
		if (out.kind === 'stale') {
			// Its links and the sync token are not stored, so an incremental pull
			// from the token cannot skip these items; the next run retries them.
			anyStale = true;
			log.push({ kind: 'stale', anchor: null, message: `${insert.relPath}: ${out.stale.reason} ${out.stale.subject}` });
			continue;
		}
		commit.push(...insert.links);
		tasksInserted += insert.lines.length;
	}

	assertVault(vaultRoot);
	await call('todoist_commit_state', {
		vaultPath: vaultRoot,
		commit: {
			kv: res.syncToken && !anyStale ? [{ key: 'sync_token', value: res.syncToken }] : [],
			upsertLinks: commit,
			deleteAnchors: [],
		},
	});
	if (log.length > 0) await call('todoist_append_log', { vaultPath: vaultRoot, entries: log });
	return {
		mode: plan.mode,
		notesCreated: plan.createNotes.length,
		tasksInserted,
		linksPaired: plan.pairedLinks.length,
		linesUnmatched: plan.linesUnmatched,
	};
}

function assertVault(vaultRoot: string): void {
	if (vaultStore.path !== vaultRoot) throw new SyncStop(VAULT_SWITCHED);
}
