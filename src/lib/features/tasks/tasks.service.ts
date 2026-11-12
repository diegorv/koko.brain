import { toast } from 'svelte-sonner';
import { call } from '#lib/contracts/ipc.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { saveFileByPath } from '#lib/core/editor/editor.service.js';
import { findTabIndex, isTabDirty, TASKS_VIRTUAL_PATH } from '#lib/core/editor/editor.logic.js';
import { settleTaskWrite } from '#lib/core/filesystem/task-write.service.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { getVaultEntries, invalidateVaultEntries } from '#lib/core/vault/vault-entries.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { tasksStore } from './tasks.store.svelte';
import { buildTaskRows, headingSources, tagHeadingCardText, type TaskOverlayEntry, type TaskSource } from './task-query.logic';
import { statusMenuLabel, toggleTarget } from './task-status.logic';
import { taskRowKey } from './tasks-keys.logic';
import { parseSectionTags, parseTasksView, taskDisplayText, withSectionTag } from './tasks.logic';
import type { TaskMetadata, TaskStatus } from './task-metadata.types';
import type { FileTaskGroup, TaskItem } from './tasks.types';
import type { FileTaskGroupV2 } from '#lib/types/vault-v2.types.js';
import { debug, error, timeAsync } from '#lib/utils/debug.js';
import { vaultRelativeKey } from '#lib/utils/path.js';

/**
 * Converts a `FileTaskGroupV2` (Rust, modifiedAt in seconds) into the
 * TS-side `FileTaskGroup` shape used by the store. Rust `NoteEntry`
 * carries `modifiedAt` in seconds since epoch; the FE filter logic
 * (`applyQuickFilters`' Note edited options) compares against `Date.now()`, which is milliseconds.
 * Multiply by 1000 here so the rest of the TS path keeps using ms.
 */
function fromV2(group: FileTaskGroupV2): FileTaskGroup {
	return {
		filePath: group.filePath,
		fileName: group.fileName,
		modifiedAt: group.modifiedAt * 1000,
		tasks: group.tasks.map((t) => ({
			text: t.text,
			checked: t.checked,
			indent: t.indent,
			lineNumber: t.lineNumber,
			status: t.status,
			metadata: {
				description: t.metadata.description,
				dueDate: t.metadata.dueDate,
				scheduledDate: t.metadata.scheduledDate,
				startDate: t.metadata.startDate,
				createdDate: t.metadata.createdDate,
				doneDate: t.metadata.doneDate,
				cancelledDate: t.metadata.cancelledDate,
				priority: t.metadata.priority,
				recurrence: t.metadata.recurrence,
				id: t.metadata.id,
				dependsOn: t.metadata.dependsOn,
				onCompletion: t.metadata.onCompletion,
				tags: t.metadata.tags,
			},
		})),
	};
}

/**
 * Sequence number of the latest `buildTaskIndex` call. The IPCs are async,
 * so an older call (a toggle's refetch, then the throttled version bump)
 * can resolve after a newer one; only the latest may write the store.
 */
let latestTaskIndexRequest = 0;

/**
 * The view's own task writes, keyed by `taskRowKey(filePath, lineNumber)`,
 * laid over the entries snapshot until a snapshot read at or after the
 * write's index version holds them (the memo lags the write by the throttled
 * version bump). Not store state: nothing renders it.
 */
const taskOverlay = new Map<string, TaskOverlayEntry>();

/** What the Tasks view shows when the latest refresh failed; the raw error goes to the log. */
const TASKS_REFRESH_ERROR = 'Tasks could not be refreshed. The log has the details.';

/** Number of `resetTasks` calls, so a caller can tell whether the store was reset since it looked. */
let tasksResetGeneration = 0;

/**
 * Returns how many times `resetTasks` has run. Capture it, then compare later:
 * a different value means the store was reset (a vault switch) in between,
 * and work begun before it must not write the new vault's store.
 */
export function getTasksResetGeneration(): number {
	return tasksResetGeneration;
}

/**
 * Builds the Tasks store's rows from the memoized entries snapshot
 * (`getVaultEntries`, one `get_all_vault_entries_v2` per index version,
 * shared with QueryJS): every task (`buildTaskRows`), with the view's own
 * writes laid over it. The store's sources and excludes select from these
 * rows in memory, so a source change needs no call here. Calls at one
 * version share one read.
 * Rows are in path order (`compareTaskPaths`), not the snapshot's order, so a
 * toggle that rewrites a note does not move it.
 *
 * The version is read in the same turn as the snapshot: it is the version
 * the snapshot was read or patched at (the listener bumps it and patches the
 * memo in one turn), so every overlay entry at or below it is already in the
 * snapshot and is dropped.
 *
 * A call superseded by a newer one (or by `resetTasks`) while in flight
 * leaves the store, the overlay, the loading flag, `hasLoaded` and error
 * reporting to the newer call. The latest call sets `hasLoaded` once it
 * settles, on success or failure, so the view swaps "Indexing tasks..." for
 * the list or the empty state only after the current vault's first fetch.
 * The latest call's failure sets `tasksStore.error` to a fixed message and
 * leaves the rows as they were; only a later success clears it.
 */
export async function buildTaskIndex(): Promise<void> {
	const request = ++latestTaskIndexRequest;
	tasksStore.setLoading(true);
	try {
		await timeAsync('TASKS', 'buildTaskIndex', async () => {
			const version = vaultStore.vaultIndexVersion;
			const entries = await getVaultEntries();
			if (request !== latestTaskIndexRequest) return;
			for (const [key, written] of taskOverlay) {
				if (written.version <= version) taskOverlay.delete(key);
			}
			const rows = buildTaskRows(entries, vaultStore.path, taskOverlay);
			tasksStore.setRows(rows);
			tasksStore.setError(null);
			debug('TASKS', `Tasks: ${new Set(rows.map((r) => r.filePath)).size} files, ${rows.length} tasks`);
		});
	} catch (err) {
		if (request === latestTaskIndexRequest) {
			error('TASKS', 'buildTaskIndex failed:', err);
			tasksStore.setError(TASKS_REFRESH_ERROR);
		}
	} finally {
		if (request === latestTaskIndexRequest) {
			tasksStore.setLoading(false);
			tasksStore.setHasLoaded(true);
		}
	}
}

/**
 * Replaces the Tasks query's source cards. When the tag heading cards change
 * (`tagHeadingCardText`), saves their texts in the vault's settings
 * (`tasksView.sectionTag`), which `loadSavedTasksView` reads back; the other
 * cards stay in this session only, until saved views. Starts no fetch: the
 * store re-selects the rows it holds.
 */
export function setTaskSources(sources: TaskSource[]): void {
	const before = tagHeadingCardText(tasksStore.query.sources);
	tasksStore.setSources(sources);
	const after = tagHeadingCardText(sources);
	if (after === null || after === before) return;
	// Into the settings store only: settings persistence writes the file, and
	// holds the guard for a session whose settings.json was never loaded.
	settingsStore.updateTasksView(withSectionTag(settingsStore.tasksView, after));
}

/**
 * Sets the Tasks query's sources to one heading card per tag saved in this
 * vault's settings (`tasksView`), or the `#to-list` card when none is. Always
 * sets them, so a vault without a saved value never keeps the previous
 * vault's cards. An invalid value is logged and toasted but left in settings
 * untouched: the next tag card change replaces it. Writes nothing and starts
 * no fetch (the view fetches on mount).
 */
export function loadSavedTasksView(): void {
	const raw = settingsStore.tasksView;
	const saved = parseTasksView(raw);
	if (!saved.valid) {
		error('TASKS', 'Invalid tasksView in settings.json:', raw);
		toast.error('The saved Tasks section tags could not be read, so #to-list is used.');
	}
	tasksStore.setSources(headingSources(parseSectionTags(saved.sectionTag)));
}

/**
 * Writes `target` as the status of `task` via the Rust `toggle_task_status`
 * command, and returns true only when the line was rewritten. Rust does the
 * read → check → write → `VaultIndex` update → emit chain. The Rust update
 * emits `vault-index-updated` before the command returns, so the prompt
 * index refresh (`vaultStore.requestPromptIndexRefresh`) is asked for right
 * before the call, after the dirty-tab save, whose own event would consume
 * it; when the call throws, is stale or changes nothing, Rust emits nothing
 * and the request is taken back. Search, the per-file consumers and the
 * content caches are refreshed by `afterTaskWrite`.
 *
 * A `target` equal to `task.status` returns false before anything runs: no
 * save, no IPC, no Undo dismissal. Rust would not skip it (it rewrites `[X]`
 * to `[x]`), and bits-ui calls a radio group's `onValueChange` again when the
 * checked item is picked. Any real write retires the menu's Undo toast.
 *
 * The list can lag disk by seconds, so Rust writes only when the line at
 * `task.lineNumber` still holds `task.text` with `task.status`. Otherwise
 * the result is `stale`: the list is rebuilt from a fresh snapshot
 * (`refreshAfterRefusal`) and the user asked to try again.
 *
 * On a changed result the write is laid over the snapshot (`afterTaskWrite`)
 * and the rows rebuilt right away: the snapshot holds the write only after
 * the throttled version bump, and the clicked checkbox must not look
 * unclicked until then.
 *
 * The open editor tab gets `syncExternalContentToEditor` (in
 * `settleTaskWrite`) so the change is visible without waiting for the
 * watcher to round-trip the file change.
 *
 * A dirty open tab of the note is saved first (`preflightTaskWrite`).
 */
export async function setTaskStatus(
	filePath: string,
	task: Pick<TaskItem, 'text' | 'status' | 'lineNumber'>,
	target: TaskStatus,
): Promise<boolean> {
	if (target === task.status) return false;
	dismissStatusUndo();
	const { lineNumber } = task;
	try {
		if (!(await preflightTaskWrite(filePath, lineNumber))) return false;
		vaultStore.requestPromptIndexRefresh();
		let result;
		try {
			result = await call('toggle_task_status', {
				path: filePath,
				lineNumber,
				expectedText: task.text,
				expectedStatus: task.status,
				target,
			});
		} catch (err) {
			vaultStore.takePromptIndexRefresh();
			throw err;
		}
		if (result.stale || !result.updateResult.changed) vaultStore.takePromptIndexRefresh();
		if (result.stale) {
			await refreshAfterRefusal(filePath, lineNumber);
			toast.info('The task changed on disk, so the list was refreshed. Try again.');
			return false;
		}
		if (!result.updateResult.changed) {
			return false;
		}
		await afterTaskWrite(filePath, result.updatedContent, {
			lineNumber,
			text: task.text,
			status: target,
			version: result.updateResult.version,
		});
		return true;
	} catch (err) {
		error('TASKS', 'Failed to set task status:', err);
		toast.error('Failed to save task change.');
		return false;
	}
}

/**
 * Runs before a Rust task command writes line `lineNumber` of `filePath`,
 * and returns false when the write must not run (the refusal is already
 * shown). Rust writes the DISK copy and the sync marks the tab saved, so a
 * dirty open tab is saved first or its unsaved typing would be overwritten.
 * If that save fails nothing is written. `lineNumber` comes from the index of
 * the disk copy, so when the saved typing moved that line the write is
 * skipped and the list refreshed from a fresh snapshot instead of changing
 * whatever line is there.
 * The check compares line text only: if the shift leaves an identical line
 * at `lineNumber` (a duplicated task), that line is the one written.
 */
async function preflightTaskWrite(filePath: string, lineNumber: number): Promise<boolean> {
	const tab = editorStore.tabs.find((t) => t.path === filePath);
	if (!tab || !isTabDirty(tab)) return true;
	const diskLine = lineAt(tab.savedContent, lineNumber);
	if (!(await saveFileByPath(filePath))) {
		toast.error('Task not changed: the note could not be saved.');
		return false;
	}
	const saved = editorStore.tabs.find((t) => t.path === filePath)?.savedContent;
	if (saved === undefined || lineAt(saved, lineNumber) !== diskLine) {
		await refreshAfterRefusal(filePath, lineNumber);
		toast.info('The note changed, so the list was refreshed. Try again.');
		return false;
	}
	return true;
}

/**
 * Writes `newText` as the text of `task` (the part after `[ ] `) via the
 * Rust `write_task_text` command, and returns true only when the line was
 * rewritten. A `newText` equal to `task.text` returns false before anything
 * runs: no save, no IPC, no Undo dismissal. Any real write retires the menu's
 * Undo toast.
 *
 * Otherwise it follows `setTaskStatus`: the dirty-tab save
 * (`preflightTaskWrite`), the prompt index refresh asked for right before the
 * call and taken back when Rust emits nothing, the `stale` refresh, and the
 * overlay on a changed result. The overlay entry also carries the metadata
 * Rust re-parsed from the written line (`TaskTextWriteResult.task`), so the
 * due and priority chips change before the snapshot holds the write.
 *
 * The command takes the open vault and a vault-relative path; a note outside
 * the open vault is refused like a failed write, before the dirty-tab save.
 */
export async function updateTask(
	filePath: string,
	task: Pick<TaskItem, 'text' | 'status' | 'lineNumber'>,
	newText: string,
): Promise<boolean> {
	if (newText === task.text) return false;
	dismissStatusUndo();
	const { lineNumber } = task;
	try {
		const vaultRoot = vaultStore.path;
		const relPath = vaultRoot === null ? null : vaultRelativeKey(vaultRoot, filePath);
		if (vaultRoot === null || relPath === null) throw new Error(`Task note is not in the open vault: ${filePath}`);
		if (!(await preflightTaskWrite(filePath, lineNumber))) return false;
		vaultStore.requestPromptIndexRefresh();
		let result;
		try {
			result = await call('write_task_text', {
				vaultRoot,
				relPath,
				lineNumber,
				expectedText: task.text,
				expectedStatus: task.status,
				newText,
			});
		} catch (err) {
			vaultStore.takePromptIndexRefresh();
			throw err;
		}
		if (result.stale || !result.updateResult.changed) vaultStore.takePromptIndexRefresh();
		if (result.stale) {
			await refreshAfterRefusal(filePath, lineNumber);
			toast.info('The task changed on disk, so the list was refreshed. Try again.');
			return false;
		}
		if (!result.updateResult.changed) return false;
		await afterTaskWrite(filePath, result.updatedContent, {
			lineNumber,
			text: newText,
			status: task.status,
			version: result.updateResult.version,
			metadata: result.task?.metadata,
		});
		return true;
	} catch (err) {
		error('TASKS', 'Failed to update task text:', err);
		toast.error('Failed to save task change.');
		return false;
	}
}

/** Toggles a task: writes `toggleTarget(task.status)` through `setTaskStatus`. Shows no Undo toast. */
export async function toggleTask(filePath: string, task: TaskItem): Promise<void> {
	await setTaskStatus(filePath, task, toggleTarget(task.status));
}

/** Id of the shown Undo toast of the last menu write, or null. Only that write can be undone. */
let statusUndoToastId: string | number | null = null;

/** Dismisses the menu write's Undo toast while one is shown. */
function dismissStatusUndo(): void {
	if (statusUndoToastId === null) return;
	toast.dismiss(statusUndoToastId);
	statusUndoToastId = null;
}

/**
 * A row menu's status change: `setTaskStatus`, then a `Task marked <Label>`
 * toast whose Undo writes `task.status` back. No toast when nothing was
 * written or the vault switched during the write. Undo does nothing after a
 * vault switch (the command writes any absolute path), and goes through
 * `setTaskStatus`, so it shows no toast of its own.
 */
export async function setTaskStatusFromMenu(filePath: string, task: TaskItem, target: TaskStatus): Promise<void> {
	const generation = tasksResetGeneration;
	if (!(await setTaskStatus(filePath, task, target)) || generation !== tasksResetGeneration) return;
	holdUndoToast(`Task marked ${statusMenuLabel(target)}`, task, generation, () => {
		void setTaskStatus(filePath, { text: task.text, lineNumber: task.lineNumber, status: target }, task.status);
	});
}

/**
 * A row menu's text change (due date, priority): `updateTask`, then a toast
 * with `message` whose Undo writes `task.text` back, expecting `newText`.
 * The same rules as `setTaskStatusFromMenu`: no toast when nothing was
 * written or the vault switched during the write, Undo does nothing after a
 * vault switch and shows no toast of its own.
 */
export async function updateTaskFromMenu(filePath: string, task: TaskItem, newText: string, message: string): Promise<void> {
	const generation = tasksResetGeneration;
	if (!(await updateTask(filePath, task, newText)) || generation !== tasksResetGeneration) return;
	holdUndoToast(message, task, generation, () => {
		void updateTask(filePath, { text: newText, status: task.status, lineNumber: task.lineNumber }, task.text);
	});
}

/**
 * Shows the Undo toast of a menu write of `task` and holds its id, the one
 * `dismissStatusUndo` retires. `undo` runs only while the reset generation
 * is still `generation`.
 */
function holdUndoToast(message: string, task: TaskItem, generation: number, undo: () => void): void {
	const forget = (t: { id: string | number }) => {
		if (statusUndoToastId === t.id) statusUndoToastId = null;
	};
	// An overlapping menu write may have stored its id after this write's start-of-write dismiss.
	dismissStatusUndo();
	statusUndoToastId = toast(message, {
		description: taskDisplayText(task),
		onDismiss: forget,
		onAutoClose: forget,
		action: {
			label: 'Undo',
			onClick: () => {
				if (generation !== tasksResetGeneration) return;
				undo();
			},
		},
	});
}

/**
 * Settles a note a Rust task command wrote (`settleTaskWrite`), records the
 * written line in the overlay and rebuilds the rows right away: the memoized
 * snapshot holds the write only after the throttled version bump, and the
 * overlay shows it until then.
 *
 * A write without `metadata` (a status write) keeps the metadata of the
 * line's overlay entry when that entry holds the same text: a status change
 * right after a due edit must not bring back the snapshot's older chips.
 * @param path - absolute path of the written note
 * @param updatedContent - the note's content after the write
 * @param written - the written line, its text and status after the write, the version the write produced, and the re-parsed metadata of a text write
 */
async function afterTaskWrite(
	path: string,
	updatedContent: string,
	written: { lineNumber: number; text: string; status: TaskStatus; version: number; metadata?: TaskMetadata },
): Promise<void> {
	settleTaskWrite(path, updatedContent);
	const key = taskRowKey(path, written.lineNumber);
	const previous = taskOverlay.get(key);
	const metadata = written.metadata ?? (previous?.text === written.text ? previous.metadata : undefined);
	taskOverlay.set(key, {
		text: written.text,
		status: written.status,
		version: written.version,
		...(metadata ? { metadata } : {}),
	});
	await buildTaskIndex();
}

/**
 * Rebuilds the rows from a fresh snapshot after a refused write (a stale
 * line, or saved typing that moved it): the memoized snapshot just proved
 * stale, and a retry against it would be refused again until the throttled
 * bump. Drops the overlay entry of that line, which the refusal disproved.
 * Costs one whole-vault `get_all_vault_entries_v2`, which every other reader
 * then shares.
 */
async function refreshAfterRefusal(filePath: string, lineNumber: number): Promise<void> {
	taskOverlay.delete(taskRowKey(filePath, lineNumber));
	invalidateVaultEntries();
	await buildTaskIndex();
}

/** Returns the 1-based `lineNumber` line of `content` (undefined past the end). */
function lineAt(content: string, lineNumber: number): string | undefined {
	return content.split('\n')[lineNumber - 1];
}

/** Opens or focuses the Tasks tab. Creates it if it doesn't exist. */
export function openTasksTab(): void {
	const existingIndex = findTabIndex(editorStore.tabs, TASKS_VIRTUAL_PATH);
	if (existingIndex >= 0) {
		editorStore.setActiveIndex(existingIndex);
		return;
	}
	editorStore.addTab({
		path: TASKS_VIRTUAL_PATH,
		name: 'Tasks',
		content: '',
		savedContent: '',
		fileType: 'tasks',
	});
}

/** Closes the Tasks tab if it exists. */
export function closeTasksTab(): void {
	const index = findTabIndex(editorStore.tabs, TASKS_VIRTUAL_PATH);
	if (index >= 0) {
		editorStore.removeTab(index);
	}
}

/** Toggles the Tasks tab: opens if closed, closes if active, focuses if open but not active. */
export function toggleTasksTab(): void {
	const existingIndex = findTabIndex(editorStore.tabs, TASKS_VIRTUAL_PATH);
	if (existingIndex < 0) {
		openTasksTab();
	} else if (existingIndex === editorStore.activeIndex) {
		editorStore.removeTab(existingIndex);
	} else {
		editorStore.setActiveIndex(existingIndex);
	}
}

/**
 * Resets all task state. Advancing the request counter discards any
 * `buildTaskIndex` call still in flight, so a read of the previous vault
 * cannot write into the reset store, and the overlay is cleared with it.
 * Raises `getTasksResetGeneration()` and dismisses a menu write's Undo toast.
 */
export function resetTasks(): void {
	latestTaskIndexRequest++;
	taskOverlay.clear();
	tasksResetGeneration++;
	dismissStatusUndo();
	tasksStore.reset();
	closeTasksTab();
}
