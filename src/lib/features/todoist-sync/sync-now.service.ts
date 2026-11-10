import { TodoistSyncError, type SyncCommand, type TodoistApi } from '@doist/todoist-sdk';
import { ask } from '@tauri-apps/plugin-dialog';
import { call } from '#lib/contracts/ipc.js';
import type { TaskLineReplace, TodoistSyncLogInput, TodoistTaskLink } from '#lib/contracts/index.js';
import { syncExternalContentToEditor } from '#lib/core/editor/editor.service.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { renameItem } from '#lib/core/filesystem/fs.service.js';
import { FrontmatterWriteError, updateNoteFrontmatter } from '#lib/core/frontmatter/frontmatter-write.service.js';
import {
	detectLossyFrontmatter,
	extractBody,
	parseFrontmatterProperties,
	rebuildContent,
} from '#lib/core/frontmatter/properties.logic.js';
import type { Property } from '#lib/core/frontmatter/properties.types.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { debug, error } from '#lib/utils/debug.js';
import { generateAnchor, idValues } from './anchor.logic.js';
import { createNoteFile } from './closed-note-writer.service.js';
import {
	applyLineChange,
	planAck,
	planCompletion,
	terminalLink,
	type LineChange,
	type PlannedCommand,
} from './completion.logic.js';
import { ackedLink, addAnchor, pairPendingAdds, planCreates, type CreatePlan, type PendingAdd, type PlannedCreate } from './create.logic.js';
import { belowLineBrake, DETACH_AFTER_MISSES, isDetached, planDetach } from './detach.logic.js';
import { planFields, type PlannedUpdate } from './fields.logic.js';
import { readNoteContent, writeTaskLinesToNote } from './note-writer.service.js';
import {
	heldProjectIds,
	planProjects,
	projectStateEntry,
	readProjectState,
	type PendingProject,
	type PlannedNoteRename,
	type PlannedProjectUpdate,
	type ProjectState,
} from './projects.logic.js';
import {
	excludedLabelSet,
	formatPullResult,
	normalizeSyncFolder,
	planPull,
	type PullCounts,
	type PullItem,
	type ScannedLine,
} from './pull.logic.js';
import { isFirstRunDone } from './sync-scheduler.logic.js';
import { classifyTodoistError, syncErrorMessage, treeProjectIds, type ScopeProject, type TodoistFailure } from './sync-scope.logic.js';
import { taskLineText } from './task-line.logic.js';
import { createTodoistClient } from './todoist-client.js';
import { todoistSyncStore } from './todoist-sync.store.svelte.js';
import { scanVault } from './vault-scan.service.js';

/**
 * Why a run that started failed: a Todoist failure, the root project gone
 * from Todoist, a vault switch mid-run, the line brake (`lines-missing`,
 * design rule 9), or anything else (`error`).
 */
export type SyncFailure =
	| TodoistFailure
	| { kind: 'root-missing' }
	| { kind: 'vault-switched' }
	| { kind: 'lines-missing' }
	| { kind: 'error' };

/**
 * The outcome of "Sync now", with the message to show. `failure` is set only
 * when a run started and failed; a refusal (sync off, index not ready, a run
 * already in progress, ...) has none. `skippedPushes`, `skippedDetaches`,
 * `skippedFieldPushes` and `skippedCreates` are set only when an automatic
 * cycle left out its close and reopen pushes, its detaches, its field pushes
 * or its creates, for being over their cap (creates: also before the first
 * run): how many it planned.
 */
export type SyncNowOutcome = {
	ok: boolean;
	message: string;
	failure?: SyncFailure;
	skippedPushes?: number;
	skippedDetaches?: number;
	skippedFieldPushes?: number;
	skippedCreates?: number;
};

/** Who started a cycle: "Sync now" (`manual`) or a scheduler trigger (`auto`). */
export type SyncMode = 'manual' | 'auto';

/** A run stopped by a fixed, user-facing reason; the message is shown as-is. */
class SyncStop extends Error {
	constructor(
		message: string,
		readonly failure: SyncFailure,
	) {
		super(message);
	}
}

const VAULT_SWITCHED = 'The vault changed during the Todoist sync; nothing more was written.';
const ROOT_MISSING = 'The sync root project was not found in Todoist. Choose it again in Settings > Todoist.';
const CANCELLED = 'Todoist sync cancelled; nothing was changed.';
const LINES_MISSING = 'Todoist sync stopped: fewer than half of the synced task lines were found in the vault. Nothing was changed.';

/** Close and reopen pushes one cycle sends without asking (design rule 9). */
const CLOSE_REOPEN_CAP = 25;
/** Detaches one cycle makes without asking (design rule 9). */
const DETACH_CAP = 10;
/** Field pushes (`item_update` commands, one per task) one cycle sends without asking (design rule 9). */
const FIELD_PUSH_CAP = 50;
/** New creates (`item_add` of lines without an anchor) one cycle sends without asking (design rule 9). */
const CREATE_CAP = 25;
/** Sync API limit on commands per request (design rule 13). */
const COMMANDS_PER_REQUEST = 100;

/**
 * Runs one "Sync now" cycle. The pull: one full `/sync` of projects and
 * items plus, with a stored token, an incremental one for items (the full
 * one leaves closed items out), a scan of the vault, project notes created
 * and open tasks of the vault's tree inserted as anchored lines
 * (`planPull`). Then deletion (`planDetach`): a link whose task was deleted
 * or moved out of the tree in Todoist, or whose line was missing from 3
 * scans in a row, is detached (kept, never synced again; neither side is
 * deleted). Then completion (`planCompletion`) and the content, due,
 * priority and label edits made on either side (`planFields`) for the links
 * still attached: lines patched from Todoist, and the links committed with
 * the `sync_token`, close and reopen
 * pushes stored as `pending_cmd` first. The commands go out in their own
 * requests; after Todoist acknowledges them an incremental pull rewrites
 * those lines (`planAck`). Then the brain's field edits go out as
 * `item_update` commands, and their bases are stored by Todoist's answer.
 * Last, brain-born lines (`planCreates`): each new line gets its anchor
 * written and its pending link committed with the rest, then its `item_add`
 * goes out, together with the pending adds of earlier cycles; a pending add
 * whose response was lost pairs with its task in the next pull
 * (`pairPendingAdds`) before the pull may insert it. Projects
 * (`planProjects`): a new note directly in the sync folder goes out as a
 * `project_add` under the root in the same request as its lines'
 * `item_add`s, which name its temp id, and gets the project id in its
 * frontmatter; a note rename goes out as `project_update`; a Todoist rename
 * renames the note last, through the app's rename path; a project named by
 * two notes is frozen; a deleted project, or one moved out of the tree,
 * detaches its note and its links. A rerun inserts, rewrites and sends
 * nothing.
 *
 * Refuses before the vault index is ready, while sync is off, without a
 * token or root project, with a sync folder that is absolute or climbs out
 * with `..`, and while another run is in progress. Stops before any write
 * when fewer than half of the attached links have a line in the scan (the
 * line brake). Before `first_run_done`, a manual cycle with creates shows
 * their count and creates nothing until confirmed; the first manual cycle
 * in normal mode that commits sets `first_run_done`. Over 10 detaches, 25 close/reopen
 * pushes, 50 field pushes or 25 creates (projects and tasks), a manual cycle
 * asks before writing anything ("Cancel" stops the run with the state
 * untouched); an automatic one never asks: it runs without that action
 * class, those links left as stored, and reports how many it skipped
 * (design rule 9). The vault path is captured at the start and
 * rechecked before every write; after a vault switch the run stops, writes
 * nothing more and leaves `todoistSyncStore` to the next vault (design rule
 * 9). Otherwise
 * status and result go to `todoistSyncStore`; a failure is logged raw and
 * reduced to a fixed message.
 */
export async function syncNow(mode: SyncMode): Promise<SyncNowOutcome> {
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
		const { skippedPushes, skippedDetaches, skippedFieldPushes, skippedCreates, ...counts } = await cycle(vaultRoot, folder, mode);
		debug('TODOIST', `sync now (${mode}):`, counts, { skippedPushes, skippedDetaches, skippedFieldPushes, skippedCreates });
		todoistSyncStore.succeed({ kind: 'pull', ...counts, finishedAt: Date.now() });
		return {
			ok: true,
			message: formatPullResult(counts),
			...(skippedPushes > 0 ? { skippedPushes } : {}),
			...(skippedDetaches > 0 ? { skippedDetaches } : {}),
			...(skippedFieldPushes > 0 ? { skippedFieldPushes } : {}),
			...(skippedCreates > 0 ? { skippedCreates } : {}),
		};
	} catch (err) {
		if (!(err instanceof SyncStop)) error('TODOIST', 'sync failed:', err);
		const stop = err instanceof SyncStop ? err : new SyncStop('Todoist sync failed. Details are in the log.', { kind: 'error' });
		// After a vault switch the store belongs to the next vault: the
		// lifecycle resets it when the next vault initializes, and this
		// run's error is not that vault's.
		if (stop.failure.kind !== 'vault-switched') todoistSyncStore.fail(stop.message);
		return { ok: false, message: stop.message, failure: stop.failure };
	}
}

/** A Todoist request whose failure stops the run with its fixed message. */
async function request<T>(run: () => Promise<T>): Promise<T> {
	try {
		return await run();
	} catch (err) {
		error('TODOIST', 'sync failed:', err);
		const failure = classifyTodoistError(err);
		throw new SyncStop(syncErrorMessage(failure), failure);
	}
}

async function cycle(
	vaultRoot: string,
	folder: string,
	mode: SyncMode,
): Promise<PullCounts & { skippedPushes: number; skippedDetaches: number; skippedFieldPushes: number; skippedCreates: number }> {
	const { apiToken, syncRootProjectId, syncIncludeInbox, defaultLabel, syncContext } = settingsStore.todoist;
	const client = createTodoistClient(apiToken);
	const full = await request(() => client.sync({ syncToken: '*', resourceTypes: ['projects', 'items'] }));
	if (!treeProjectIds(full.projects ?? [], syncRootProjectId, syncIncludeInbox)) throw new SyncStop(ROOT_MISSING, { kind: 'root-missing' });

	assertVault(vaultRoot);
	const kv = await call('todoist_read_kv', { vaultPath: vaultRoot });
	const storedToken = kv.find((e) => e.key === 'sync_token')?.value ?? null;
	const changes = storedToken === null ? null : await request(() => client.sync({ syncToken: storedToken, resourceTypes: ['items', 'projects'] }));
	// The incremental pull ran last, so its rows are the newest; it also carries the closed items and the archived and deleted projects.
	const items = new Map<string, PullItem>();
	for (const item of [...((full.items ?? []) as PullItem[]), ...((changes?.items ?? []) as PullItem[])]) items.set(item.id, item);
	const projectsById = new Map<string, ScopeProject>();
	for (const project of [...(full.projects ?? []), ...(changes?.projects ?? [])]) projectsById.set(project.id, project);
	const projects = [...projectsById.values()];
	// From the merged rows, as `planPull` builds its tree: a project deleted between the two pulls is out of it.
	const treeIds = treeProjectIds(projects, syncRootProjectId, syncIncludeInbox);
	if (!treeIds) throw new SyncStop(ROOT_MISSING, { kind: 'root-missing' });
	const token = changes?.syncToken ?? full.syncToken;

	assertVault(vaultRoot);
	const firstRunDone = isFirstRunDone(kv);
	const storedLinks = await call('todoist_read_links', { vaultPath: vaultRoot });
	const scan = await scanVault(vaultRoot, settingsStore.templates.folder);
	if (belowLineBrake(storedLinks, scan.occurrences)) throw new SyncStop(LINES_MISSING, { kind: 'lines-missing' });
	const excludedLabels = excludedLabelSet(defaultLabel);
	// Pending adds whose response was lost pair with their task first, so the pull never inserts it as a second line.
	const adoption = pairPendingAdds({ links: storedLinks, items: [...items.values()], excludedLabels });
	const links = [...byAnchor(storedLinks, adoption.links).values()];
	const storedProjects = readProjectState(kv);
	const plan = planPull({
		folder,
		projects,
		items: [...items.values()].filter((i) => !adoption.heldItemIds.has(i.id)),
		rootId: syncRootProjectId,
		includeInbox: syncIncludeInbox,
		links,
		occurrences: scan.occurrences,
		notes: scan.notes,
		excludedLabels,
		heldProjectIds: heldProjectIds(storedProjects, projects, treeIds, scan.notes),
	});
	const projectPlan = planProjects({
		folder,
		projects,
		treeIds,
		rootId: syncRootProjectId,
		notes: scan.notes,
		createdNotes: plan.createNotes,
		templatesFolder: settingsStore.templates.folder,
		state: storedProjects,
		// Rebuild mode creates nothing (design rule 1).
		allowAdds: plan.mode === 'normal',
		newUuid: () => crypto.randomUUID(),
		newTempId: () => crypto.randomUUID(),
	});
	// A project named by two notes is frozen (design rule 10): none of its tasks sync either way.
	const syncTreeIds = new Set([...treeIds].filter((id) => !projectPlan.frozenProjectIds.has(id)));
	let detach = planDetach({ links: [...byAnchor(links, plan.updatedLinks).values()], occurrences: scan.occurrences, items, treeIds, projects });
	let skippedDetaches = 0;
	if (detach.detached.length > DETACH_CAP) {
		if (mode === 'auto') {
			// Left as stored, so the next cycle plans the same detaches; miss counts below the threshold still move.
			skippedDetaches = detach.detached.length;
			const skipped = new Set(detach.detached);
			detach = { links: detach.links.filter((l) => !skipped.has(l.anchor)), detached: [], log: [] };
		} else if (!(await confirmDetaches(detach.detached.length))) {
			throw new SyncStop(CANCELLED, { kind: 'error' });
		}
	}
	const current = byAnchor(links, [...plan.updatedLinks, ...detach.links]);
	// A detached link never syncs again, so neither planner may see it: not even when its task is back in the tree.
	const attached = [...current.values()].filter((l) => !isDetached(l));
	let completion = planCompletion({
		links: attached,
		occurrences: scan.occurrences,
		items,
		incremental: changes !== null,
		treeIds: syncTreeIds,
		newUuid: () => crypto.randomUUID(),
	});
	let skippedPushes = 0;
	if (completion.commands.length > CLOSE_REOPEN_CAP) {
		if (mode === 'auto') {
			// Their status bases stay as stored (`planFields` moves only field bases), so the next cycle plans the same pushes.
			skippedPushes = completion.commands.length;
			const skipped = new Set(completion.commands.map((c) => c.anchor));
			completion = { ...completion, commands: [], links: completion.links.filter((l) => !skipped.has(l.anchor)) };
		} else if (!(await confirmOverCap(completion.commands.length))) {
			// Not a Todoist failure; `error` keeps the scheduler's fixed kinds.
			throw new SyncStop(CANCELLED, { kind: 'error' });
		}
	}
	const fields = planFields(
		{ links: attached, occurrences: scan.occurrences, items, incremental: changes !== null, treeIds: syncTreeIds, excludedLabels, newUuid: () => crypto.randomUUID() },
		completion,
	);
	completion = fields;
	let updates = fields.updates;
	let skippedFieldPushes = 0;
	if (updates.length > FIELD_PUSH_CAP) {
		if (mode === 'auto') {
			// Their bases move only on `ok`, so the next cycle plans the same pushes.
			skippedFieldPushes = updates.length;
			updates = [];
		} else if (!(await confirmFieldPushes(updates.length))) {
			throw new SyncStop(CANCELLED, { kind: 'error' });
		}
	}
	// Rebuild mode creates nothing (design rule 1): its next cycle, in normal mode, does.
	let creates: CreatePlan =
		plan.mode === 'rebuild'
			? { creates: [], resends: [], log: [] }
			: planCreates({
					lines: scan.lines,
					notes: scan.notes,
					links: [...current.values()],
					occurrences: scan.occurrences,
					treeIds: syncTreeIds,
					rootId: syncRootProjectId,
					pendingProjects: new Map([...projectPlan.resends, ...projectPlan.adds].map((p) => [p.relPath, p.tempId])),
					excludedLabels,
					syncContext,
					takenAnchors: new Set([...scan.occurrences.keys(), ...current.keys(), ...plan.inserts.flatMap((i) => i.links.map((l) => l.anchor))]),
					newUuid: () => crypto.randomUUID(),
					newAnchor: (taken) => generateAnchor(taken),
				});
	let skippedCreates = 0;
	let projectAdds = projectPlan.adds;
	const newCreates = creates.creates.length + projectAdds.length;
	if (newCreates > 0 && (!firstRunDone || newCreates > CREATE_CAP)) {
		const what = createCounts(projectAdds.length, creates.creates.length);
		// An automatic cycle never runs before the first run (the scheduler), and never asks.
		if (mode === 'auto') {
			skippedCreates = newCreates;
			creates = { ...creates, creates: [] };
			projectAdds = [];
		} else if (!(await (firstRunDone ? confirmCreates(what) : confirmFirstRun(what)))) {
			throw new SyncStop(CANCELLED, { kind: 'error' });
		}
	}
	// The pending adds are stored before they are sent (design rule 2); the state moves on as the cycle's commands are answered.
	const projectState: ProjectState = { ...projectPlan.state, pending: [...projectPlan.state.pending, ...projectAdds] };
	const projectStateChanged = JSON.stringify(projectState) !== JSON.stringify(storedProjects);

	// Skipped lines are planned again every cycle: logged on automatic ones they would fill the capped sync log.
	const log: TodoistSyncLogInput[] = [
		...adoption.log,
		...plan.log,
		...projectPlan.log,
		...detach.log,
		...completion.log,
		...(mode === 'manual' ? creates.log : []),
	];
	for (const note of plan.createNotes) {
		assertVault(vaultRoot);
		await createNoteFile(vaultRoot, `${vaultRoot}/${note.relPath}`, note.content);
	}
	const batches = new Map<string, NoteBatch>();
	const batch = (relPath: string) =>
		batches.get(relPath) ?? batches.set(relPath, { inserts: [], insertLinks: [], changes: [], creates: [] }).get(relPath)!;
	for (const insert of plan.inserts) {
		batch(insert.relPath).inserts.push(...insert.lines);
		batch(insert.relPath).insertLinks.push(...insert.links);
	}
	const changedAnchors = new Set(completion.lineChanges.map((c) => c.anchor));
	const completionLinks = byAnchor([], completion.links);
	for (const change of completion.lineChanges) {
		batch(change.relPath).changes.push({ change, link: completionLinks.get(change.anchor)!, fallback: null });
	}
	for (const create of creates.creates) batch(create.line.relPath).creates.push(create);
	const written = await writeBatches(vaultRoot, batches, log);

	const commit = byAnchor(
		[],
		[
			...adoption.links,
			...plan.updatedLinks,
			...plan.pairedLinks,
			...detach.links,
			...completion.links.filter((l) => !changedAnchors.has(l.anchor)),
		],
	);
	// A create's pending link is among them: it is stored with its anchor before the `item_add` goes out (design rule 2).
	for (const link of written.links) commit.set(link.anchor, link);
	const kvCommit = [
		// Without this cycle's bases for every change, an incremental pull from the new token would never report it again
		// (a deletion is reported only by an incremental pull, so skipped detaches keep the token out too; so does a
		// Todoist edit of a task whose close or reopen goes out now, which the field sync left to the next cycle).
		...(token && !written.anyStale && skippedDetaches === 0 && !fields.withholdToken ? [{ key: 'sync_token', value: token }] : []),
		// The first manual cycle past the preview turns automatic cycles on; a rebuild, which plans no create, is no preview.
		...(mode === 'manual' && !firstRunDone && plan.mode === 'normal' ? [{ key: 'first_run_done', value: '1' }] : []),
		...(projectStateChanged ? [projectStateEntry(projectState)] : []),
	];
	assertVault(vaultRoot);
	await call('todoist_commit_state', {
		vaultPath: vaultRoot,
		commit: { kv: kvCommit, upsertLinks: [...commit.values()], deleteAnchors: [] },
	});
	if (log.length > 0) await call('todoist_append_log', { vaultPath: vaultRoot, entries: log });

	let todoistUpdated = 0;
	let linesUpdated = written.linesUpdated;
	if (completion.commands.length > 0) {
		const stored = byAnchor([...current.values()], completion.links);
		const acked = await pushCompletions(client, vaultRoot, completion.commands, stored, scan.occurrences, token ?? '*');
		todoistUpdated = acked.todoistUpdated;
		linesUpdated += acked.linesUpdated;
	}
	// A push whose line patch went stale would store bases for a line that was never written.
	const storedAnchors = new Set(written.links.map((l) => l.anchor));
	const ready = updates.filter((u) => !changedAnchors.has(u.anchor) || storedAnchors.has(u.anchor));
	if (ready.length > 0) todoistUpdated += await pushFields(client, vaultRoot, ready);
	const adds = [...written.created.map((c) => ({ link: c.link, command: c.command })), ...creates.resends];
	const projectCommands = [...projectPlan.resends, ...projectAdds];
	const pushed =
		adds.length > 0 || projectCommands.length > 0
			? await pushCreates(client, vaultRoot, projectCommands, adds, excludedLabels, projectState)
			: { todoistCreated: 0, projectsCreated: 0 };
	// Renames go last: every line write of this cycle used the note paths of the scan.
	let projectsRenamed = projectPlan.updates.length > 0 ? await pushProjectUpdates(client, vaultRoot, projectPlan.updates, projectState) : 0;
	projectsRenamed += await renameProjectNotes(vaultRoot, projectPlan.renames, projectState);
	if (projectPlan.updates.length > 0 || projectPlan.renames.length > 0) {
		assertVault(vaultRoot);
		await call('todoist_commit_state', { vaultPath: vaultRoot, commit: { kv: [projectStateEntry(projectState)], upsertLinks: [], deleteAnchors: [] } });
	}
	return {
		mode: plan.mode,
		notesCreated: plan.createNotes.length,
		tasksInserted: written.tasksInserted,
		linksPaired: plan.pairedLinks.length,
		linesUnmatched: plan.linesUnmatched,
		linesUpdated,
		todoistUpdated,
		todoistCreated: pushed.todoistCreated,
		projectsCreated: pushed.projectsCreated,
		projectsRenamed,
		skippedPushes,
		skippedDetaches,
		skippedFieldPushes,
		skippedCreates,
	};
}

/**
 * Sends the close and reopen commands, at most 100 per request and never in
 * the same request as a pull (design rule 13), then pulls the items changed
 * since `token` and rewrites each acknowledged line from its item. A 4xx
 * status other than 429 is terminal: `pending_cmd` is cleared and logged.
 * Any other failed status keeps `pending_cmd` for the next cycle, which
 * resends the same uuid.
 */
async function pushCompletions(
	client: TodoistApi,
	vaultRoot: string,
	commands: PlannedCommand[],
	stored: Map<string, TodoistTaskLink>,
	occurrences: Map<string, ScannedLine[]>,
	token: string,
): Promise<{ todoistUpdated: number; linesUpdated: number }> {
	const { statuses } = await sendCommands(
		client,
		commands.map((c) => ({ type: c.pending.type, uuid: c.pending.uuid, args: { id: c.todoistId } })),
	);

	const acked = commands.filter((c) => statuses[c.pending.uuid] === 'ok');
	const after = acked.length > 0 ? await request(() => client.sync({ syncToken: token, resourceTypes: ['items'] })) : null;
	const items = new Map(((after?.items ?? []) as PullItem[]).map((i) => [i.id, i]));

	const log: TodoistSyncLogInput[] = [];
	const direct: TodoistTaskLink[] = [];
	const batches = new Map<string, NoteBatch>();
	for (const command of commands) {
		const status = statuses[command.pending.uuid];
		const link = stored.get(command.anchor)!;
		const line = occurrences.get(command.anchor)![0];
		if (status === 'ok') {
			const ack = planAck(link, line, items.get(command.todoistId));
			log.push(...ack.log);
			if (!ack.lineChange) {
				direct.push(ack.link);
				continue;
			}
			const b = batches.get(line.relPath) ?? { inserts: [], insertLinks: [], changes: [], creates: [] };
			b.changes.push({ change: ack.lineChange, link: ack.link, fallback: ack.staleLink });
			batches.set(line.relPath, b);
		} else if (isTerminal(status)) {
			direct.push(terminalLink(link, line));
			log.push({ kind: 'command-error', anchor: command.anchor, message: `Todoist refused ${command.pending.type}: ${JSON.stringify(status)}` });
		} else if (status !== undefined) {
			error('TODOIST', `${command.pending.type} for ${command.anchor} failed; it is resent next cycle:`, status);
		}
	}
	const written = await writeBatches(vaultRoot, batches, log);
	assertVault(vaultRoot);
	await call('todoist_commit_state', {
		vaultPath: vaultRoot,
		commit: { kv: [], upsertLinks: [...direct, ...written.links], deleteAnchors: [] },
	});
	if (log.length > 0) await call('todoist_append_log', { vaultPath: vaultRoot, entries: log });
	return { todoistUpdated: acked.length, linesUpdated: written.linesUpdated };
}

/**
 * Sends the field pushes as `item_update` commands and stores each link's
 * bases by its answer: `ok` moves both to the pushed values, so the echo in
 * the next pull is no remote change; a terminal 4xx moves only `local_base`
 * to the line (not retried) and is logged; any other failure stores nothing,
 * so the next cycle plans the push again. Returns how many Todoist accepted.
 */
async function pushFields(client: TodoistApi, vaultRoot: string, updates: PlannedUpdate[]): Promise<number> {
	const { statuses } = await sendCommands(
		client,
		updates.map((u) => ({ type: 'item_update', uuid: u.uuid, args: { ...u.args } })),
	);
	const log: TodoistSyncLogInput[] = [];
	const links: TodoistTaskLink[] = [];
	let acked = 0;
	for (const update of updates) {
		const status = statuses[update.uuid];
		if (status === 'ok') {
			acked++;
			links.push(update.okLink);
		} else if (isTerminal(status)) {
			links.push(update.refusedLink);
			log.push({ kind: 'command-error', anchor: update.anchor, message: `Todoist refused item_update: ${JSON.stringify(status)}` });
		} else if (status !== undefined) {
			error('TODOIST', `item_update for ${update.anchor} failed; it is planned again next cycle:`, status);
		}
	}
	assertVault(vaultRoot);
	await call('todoist_commit_state', { vaultPath: vaultRoot, commit: { kv: [], upsertLinks: links, deleteAnchors: [] } });
	if (log.length > 0) await call('todoist_append_log', { vaultPath: vaultRoot, entries: log });
	return acked;
}

/**
 * Sends the brain-born projects as `project_add` commands under the root,
 * then the creates of brain-born lines as `item_add` commands, in the same
 * requests, each with the uuid and temp id stored before (a project's in the
 * project state, a line's in its `pending_cmd`), so a resend after a lost
 * response is applied once (live-check 8). A line of a brain-born project
 * names the project's temp id as its project.
 *
 * A project `ok` gets its id written to the note's `todoist_project` and
 * its base stored; a failed write keeps the pending add, whose resend
 * returns the same id. A terminal 4xx refuses the note for good (logged);
 * any other failure keeps it for a resend. Each line link is stored by its
 * answer: `ok` stores the Todoist id from `temp_id_mapping` and the real
 * project id ({@link ackedLink}); a terminal 4xx detaches the link (the line
 * keeps its anchor and never syncs; removing the `🆔` makes it a new line)
 * and is logged; any other failure keeps the pending add for a resend next
 * cycle. `state` is updated in place and committed with the links.
 */
async function pushCreates(
	client: TodoistApi,
	vaultRoot: string,
	projectAdds: PendingProject[],
	adds: { link: TodoistTaskLink; command: PendingAdd }[],
	excludedLabels: ReadonlySet<string>,
	state: ProjectState,
): Promise<{ todoistCreated: number; projectsCreated: number }> {
	// A line resent after its project was acknowledged in an earlier cycle still names the project's temp id.
	const known: Record<string, string> = {};
	for (const [id, base] of Object.entries(state.bases)) if (base.tempId) known[base.tempId] = id;
	const { statuses, tempIds } = await sendCommands(
		client,
		[
			...projectAdds.map((p) => ({ type: 'project_add' as const, uuid: p.uuid, tempId: p.tempId, args: { ...p.args } })),
			...adds.map(({ command }) => ({ type: command.type, uuid: command.uuid, tempId: command.tempId, args: { ...command.args } })),
		],
		known,
	);
	const log: TodoistSyncLogInput[] = [];
	let projectsCreated = 0;
	for (const project of projectAdds) {
		const status = statuses[project.uuid];
		const id = tempIds[project.tempId];
		const settle = () => (state.pending = state.pending.filter((p) => p.uuid !== project.uuid));
		if (status === 'ok' && id !== undefined) {
			if (!(await writeProjectId(vaultRoot, project.relPath, id, log))) continue;
			settle();
			state.bases[id] = { name: project.args.name, relPath: project.relPath, tempId: project.tempId };
			projectsCreated++;
		} else if (isTerminal(status)) {
			settle();
			state.refused.push(project.relPath);
			log.push({
				kind: 'command-error',
				anchor: null,
				message: `Todoist refused project_add for ${project.relPath}: ${JSON.stringify(status)}; the note is not created as a project again under this name`,
			});
		} else if (status !== undefined) {
			error('TODOIST', `project_add for ${project.relPath} got ${JSON.stringify(status)} without a Todoist id; it is resent next cycle`);
		}
	}
	const links: TodoistTaskLink[] = [];
	let created = 0;
	for (const { link, command } of adds) {
		const status = statuses[command.uuid];
		const id = tempIds[command.tempId];
		if (status === 'ok' && id !== undefined) {
			created++;
			const projectId = tempIds[command.args.projectId] ?? known[command.args.projectId] ?? command.args.projectId;
			links.push(ackedLink(link, command, id, excludedLabels, projectId));
		} else if (isTerminal(status)) {
			links.push({ ...link, missCount: DETACH_AFTER_MISSES, pendingUuid: null, pendingCmd: null });
			log.push({
				kind: 'command-error',
				anchor: link.anchor,
				message: `Todoist refused item_add: ${JSON.stringify(status)}; the line is detached and kept (remove its 🆔 to create it again)`,
			});
		} else if (status !== undefined) {
			error('TODOIST', `item_add for ${link.anchor} got ${JSON.stringify(status)} without a Todoist id; it is resent next cycle`);
		}
	}
	assertVault(vaultRoot);
	await call('todoist_commit_state', {
		vaultPath: vaultRoot,
		commit: { kv: projectAdds.length > 0 ? [projectStateEntry(state)] : [], upsertLinks: links, deleteAnchors: [] },
	});
	if (log.length > 0) await call('todoist_append_log', { vaultPath: vaultRoot, entries: log });
	return { todoistCreated: created, projectsCreated };
}

/**
 * Writes a brain-born project's id to its note's `todoist_project`. A note
 * with a tab gets it in the tab's content only, left to the autosave (design
 * rule 12: the sync never saves the user's tab); a closed note goes through
 * the frontmatter writer. Returns false when the write failed (logged); a
 * vault switch stops the run.
 */
async function writeProjectId(vaultRoot: string, relPath: string, id: string, log: TodoistSyncLogInput[]): Promise<boolean> {
	assertVault(vaultRoot);
	const path = `${vaultRoot}/${relPath}`;
	const withId = (props: Property[]): Property[] => [
		...props.filter((p) => p.key !== 'todoist_project'),
		{ key: 'todoist_project', value: id, type: 'text' },
	];
	try {
		const tab = editorStore.tabs.find((t) => t.path === path);
		if (tab) {
			const lossy = detectLossyFrontmatter(tab.content);
			if (lossy !== null) throw new FrontmatterWriteError(lossy, path);
			const next = rebuildContent(withId(parseFrontmatterProperties(tab.content)), extractBody(tab.content), tab.content);
			if (next !== tab.content) syncExternalContentToEditor(path, next, false, 'body');
			return true;
		}
		await updateNoteFrontmatter(path, withId);
		return true;
	} catch (err) {
		assertVault(vaultRoot);
		error('TODOIST', `writing todoist_project ${id} to ${relPath} failed:`, err);
		log.push({ kind: 'stale', anchor: null, message: `${relPath}: the Todoist project id ${id} could not be written to the note; it is retried next cycle` });
		return false;
	}
}

/**
 * Sends the note renames as `project_update` commands. `ok` moves the base
 * to the note's name; a terminal 4xx moves it to the note's path with
 * Todoist's name (logged, not retried); any other failure leaves it, so the
 * next cycle sends the update again. Returns how many Todoist renamed.
 */
async function pushProjectUpdates(client: TodoistApi, vaultRoot: string, updates: PlannedProjectUpdate[], state: ProjectState): Promise<number> {
	const { statuses } = await sendCommands(
		client,
		updates.map((u) => ({ type: 'project_update' as const, uuid: u.uuid, args: { id: u.projectId, name: u.name } })),
	);
	const log: TodoistSyncLogInput[] = [];
	let renamed = 0;
	for (const update of updates) {
		const status = statuses[update.uuid];
		const base = state.bases[update.projectId];
		if (status === 'ok') {
			renamed++;
			state.bases[update.projectId] = { ...base, name: update.name, relPath: update.relPath };
		} else if (isTerminal(status)) {
			state.bases[update.projectId] = { ...base, name: update.remoteName, relPath: update.relPath };
			log.push({
				kind: 'command-error',
				anchor: null,
				message: `Todoist refused renaming project ${update.projectId} to ${JSON.stringify(update.name)}: ${JSON.stringify(status)}; the names stay apart`,
			});
		} else if (status !== undefined) {
			error('TODOIST', `project_update for ${update.projectId} failed; it is sent again next cycle:`, status);
		}
	}
	assertVault(vaultRoot);
	if (log.length > 0) await call('todoist_append_log', { vaultPath: vaultRoot, entries: log });
	return renamed;
}

/**
 * Renames project notes after their Todoist rename, through the app's
 * rename path (`renameItem`: links to the note are rewritten, tabs and
 * indexes follow). A failed rename is logged and left to the next cycle.
 * Returns how many notes were renamed.
 */
async function renameProjectNotes(vaultRoot: string, renames: PlannedNoteRename[], state: ProjectState): Promise<number> {
	const log: TodoistSyncLogInput[] = [];
	let renamed = 0;
	for (const rename of renames) {
		assertVault(vaultRoot);
		try {
			await renameItem(`${vaultRoot}/${rename.from}`, rename.to.slice(rename.to.lastIndexOf('/') + 1));
		} catch (err) {
			assertVault(vaultRoot);
			error('TODOIST', `renaming ${rename.from} to ${rename.to} failed:`, err);
			log.push({ kind: 'stale', anchor: null, message: `${rename.from}: renaming it to ${rename.to} after Todoist failed; it is retried next cycle` });
			continue;
		}
		renamed++;
		state.bases[rename.projectId] = { ...state.bases[rename.projectId], name: rename.name, relPath: rename.to };
	}
	assertVault(vaultRoot);
	if (log.length > 0) await call('todoist_append_log', { vaultPath: vaultRoot, entries: log });
	return renamed;
}

/**
 * Sends commands at most 100 per request, never in the same request as a
 * pull (design rule 13), and returns every `sync_status` by uuid and every
 * created id by temp id. A failed command arrives as a status; a failed
 * request stops the run. A `projectId` naming a temp id that an earlier
 * request (or `known`) resolved is sent as the real id: a temp id holds
 * only within its own request.
 */
async function sendCommands(
	client: TodoistApi,
	commands: SyncCommand[],
	known: Record<string, string> = {},
): Promise<{ statuses: Record<string, unknown>; tempIds: Record<string, string> }> {
	const statuses: Record<string, unknown> = {};
	const tempIds: Record<string, string> = {};
	const resolved = { ...known };
	const withRealProject = (command: SyncCommand): SyncCommand => {
		const projectId = (command.args as { projectId?: unknown }).projectId;
		return typeof projectId === 'string' && resolved[projectId] ? ({ ...command, args: { ...command.args, projectId: resolved[projectId] } } as SyncCommand) : command;
	};
	for (let i = 0; i < commands.length; i += COMMANDS_PER_REQUEST) {
		try {
			const res = await client.sync({ commands: commands.slice(i, i + COMMANDS_PER_REQUEST).map(withRealProject) });
			Object.assign(statuses, res.syncStatus ?? {});
			Object.assign(tempIds, res.tempIdMapping ?? {});
		} catch (err) {
			if (!(err instanceof TodoistSyncError)) {
				error('TODOIST', 'sending commands failed:', err);
				const failure = classifyTodoistError(err);
				throw new SyncStop(syncErrorMessage(failure), failure);
			}
			Object.assign(statuses, err.syncStatus);
			Object.assign(tempIds, err.tempIdMapping);
		}
		Object.assign(resolved, tempIds);
	}
	return { statuses, tempIds };
}

/**
 * What one note gets in a cycle: inserted lines with their links, line
 * patches with the link each one stores, and the brain-born lines that get
 * their first anchor (their pending link is stored only when it is written).
 */
interface NoteBatch {
	inserts: string[];
	insertLinks: TodoistTaskLink[];
	/** `fallback` is stored instead of `link` when the patch cannot be applied; null stores nothing. */
	changes: { change: LineChange; link: TodoistTaskLink; fallback: TodoistTaskLink | null }[];
	creates: PlannedCreate[];
}

/**
 * Writes each note's batch through the guarded writer, all or nothing per
 * note. A patch whose line was edited since the scan, or a note that went
 * stale, keeps its links out (or stores their fallbacks) and is logged. A
 * create whose line changed since the scan is left to the next cycle,
 * logged; `created` lists the creates whose anchor was written.
 */
async function writeBatches(
	vaultRoot: string,
	batches: Map<string, NoteBatch>,
	log: TodoistSyncLogInput[],
): Promise<{ links: TodoistTaskLink[]; created: PlannedCreate[]; tasksInserted: number; linesUpdated: number; anyStale: boolean }> {
	const out = { links: [] as TodoistTaskLink[], created: [] as PlannedCreate[], tasksInserted: 0, linesUpdated: 0, anyStale: false };
	const fallBack = (changes: NoteBatch['changes']) => {
		for (const c of changes) if (c.fallback) out.links.push(c.fallback);
	};
	for (const [relPath, note] of batches) {
		assertVault(vaultRoot);
		const replace: TaskLineReplace[] = [];
		const applied: NoteBatch['changes'] = [];
		const anchored: PlannedCreate[] = [];
		if (note.changes.length > 0 || note.creates.length > 0) {
			const lines = (await readNoteContent(vaultRoot, relPath)).split('\n');
			for (const c of note.creates) {
				const raw = lines[c.line.lineNumber - 1];
				const newLine = raw !== undefined && taskLineText(raw) === c.line.line ? addAnchor(raw, c.anchor) : null;
				if (newLine === null) {
					log.push({ kind: 'stale', anchor: null, message: `${relPath}:${c.line.lineNumber}: the line changed since the scan; it is created next cycle` });
					continue;
				}
				anchored.push(c);
				replace.push({ anchor: c.anchor, expectedLine: raw, newLine, lineNumber: c.line.lineNumber });
			}
			for (const c of note.changes) {
				const hits = lines.filter((l) => idValues(l).includes(c.change.anchor));
				const newLine = hits.length === 1 ? applyLineChange(hits[0], c.change) : null;
				if (newLine === null) {
					out.anyStale = true;
					log.push({ kind: 'stale', anchor: c.change.anchor, message: `${relPath}: the line changed since the scan; it is retried next cycle` });
					fallBack([c]);
					continue;
				}
				applied.push(c);
				if (newLine !== hits[0]) replace.push({ anchor: c.change.anchor, expectedLine: hits[0], newLine });
			}
		}
		if (note.inserts.length > 0 || replace.length > 0) {
			assertVault(vaultRoot);
			const result = await writeTaskLinesToNote(vaultRoot, relPath, {
				replace,
				remove: [],
				insert: note.inserts.length > 0 ? [{ afterHeading: null, lines: note.inserts }] : [],
			});
			if (result.kind === 'stale') {
				out.anyStale = true;
				log.push({ kind: 'stale', anchor: null, message: `${relPath}: ${result.stale.reason} ${result.stale.subject}` });
				fallBack(applied);
				continue;
			}
		}
		out.links.push(...note.insertLinks, ...applied.map((c) => c.link), ...anchored.map((c) => c.link));
		out.created.push(...anchored);
		out.tasksInserted += note.inserts.length;
		out.linesUpdated += replace.length - anchored.length;
	}
	return out;
}

function isTerminal(status: unknown): boolean {
	const code = (status as { httpCode?: unknown } | null)?.httpCode;
	return typeof code === 'number' && code >= 400 && code < 500 && code !== 429;
}

/** The links by anchor, later lists replacing earlier entries. */
function byAnchor(base: TodoistTaskLink[], overrides: TodoistTaskLink[]): Map<string, TodoistTaskLink> {
	const map = new Map(base.map((l) => [l.anchor, l]));
	for (const link of overrides) map.set(link.anchor, link);
	return map;
}

/** "Pause and ask" of design rule 9 for a manual cycle. */
async function confirmOverCap(count: number): Promise<boolean> {
	return ask(`This Todoist sync would close or reopen ${count} tasks in Todoist, more than ${CLOSE_REOPEN_CAP} in one sync. Continue?`, {
		title: 'Todoist sync',
		kind: 'warning',
		okLabel: 'Sync',
		cancelLabel: 'Cancel',
	});
}

/** "Pause and ask" of design rule 9 for a manual cycle over the detach cap. */
async function confirmDetaches(count: number): Promise<boolean> {
	return ask(
		`This Todoist sync would detach ${count} tasks deleted or moved on one side, more than ${DETACH_CAP} in one sync. Their lines and Todoist tasks are kept but stop syncing. Continue?`,
		{ title: 'Todoist sync', kind: 'warning', okLabel: 'Sync', cancelLabel: 'Cancel' },
	);
}

/** What a cycle would create, e.g. `1 project and 3 tasks`. */
function createCounts(projects: number, tasks: number): string {
	const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`;
	if (projects === 0) return count(tasks, 'task');
	return tasks === 0 ? count(projects, 'project') : `${count(projects, 'project')} and ${count(tasks, 'task')}`;
}

/** The first-run preview of design rule 9: nothing is created before the user confirms the count. */
async function confirmFirstRun(what: string): Promise<boolean> {
	return ask(
		`This first Todoist sync would create ${what} in Todoist from notes and task lines in the vault. Nothing is sent until you continue. Continue?`,
		{ title: 'Todoist sync', kind: 'warning', okLabel: 'Create', cancelLabel: 'Cancel' },
	);
}

/** "Pause and ask" of design rule 9 for a manual cycle over the create cap. */
async function confirmCreates(what: string): Promise<boolean> {
	return ask(`This Todoist sync would create ${what} in Todoist from new notes and task lines, more than ${CREATE_CAP} in one sync. Continue?`, {
		title: 'Todoist sync',
		kind: 'warning',
		okLabel: 'Sync',
		cancelLabel: 'Cancel',
	});
}

/** "Pause and ask" of design rule 9 for a manual cycle over the field push cap. */
async function confirmFieldPushes(count: number): Promise<boolean> {
	return ask(`This Todoist sync would update ${count} tasks in Todoist with edits made in the brain, more than ${FIELD_PUSH_CAP} in one sync. Continue?`, {
		title: 'Todoist sync',
		kind: 'warning',
		okLabel: 'Sync',
		cancelLabel: 'Cancel',
	});
}

function assertVault(vaultRoot: string): void {
	if (vaultStore.path !== vaultRoot) throw new SyncStop(VAULT_SWITCHED, { kind: 'vault-switched' });
}
