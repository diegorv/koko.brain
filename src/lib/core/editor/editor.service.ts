import { readTextFile } from '@tauri-apps/plugin-fs';
import { ask } from '@tauri-apps/plugin-dialog';
import { toast } from 'svelte-sonner';
import { editorStore } from './editor.store.svelte';
import { findTabIndex, getFileName, isTabDirty, isTabPinned, isVirtualTab } from './editor.logic';
import { isViewFile, isCanvasFile, isKanbanFile, isBinaryFile } from '#lib/core/filesystem/fs.logic.js';
import { notifyAfterSave } from './editor.hooks';
import { writeNote } from './note-write.port';
import type { EditorTab } from './editor.types';
import { debounce } from '#lib/utils/debounce.js';
import { clearAllTabViewStates, deleteTabViewState } from '#lib/core/markdown-editor/tab-view-state.js';
import { debug, error, perfStart, perfEnd, perfBaseline } from '#lib/utils/debug.js';
import { appendLog } from '#lib/utils/log.service.js';
import { NOTE_CONFLICT_MESSAGE, NoteConflictError } from '#lib/contracts/note-conflict.js';

/** A named callback told the path of every tab `closeTab` or `closeTabsForDeletedPath` removes. */
interface TabCloseListener {
	name: string;
	closed: (path: string) => void;
}

/** Live tab-close listeners, in registration order. */
const tabCloseListeners: TabCloseListener[] = [];

/**
 * Registers `closed` to run with the path of each tab `closeTab` or
 * `closeTabsForDeletedPath` removes. A throwing listener is logged and does
 * not stop the close. Returns the unregister function.
 */
export function registerTabCloseListener(name: string, closed: (path: string) => void): () => void {
	const listener = { name, closed };
	tabCloseListeners.push(listener);
	return () => {
		const idx = tabCloseListeners.indexOf(listener);
		if (idx >= 0) tabCloseListeners.splice(idx, 1);
	};
}

/**
 * Paths whose last save was refused because the note changed on disk
 * (`NoteConflictError`), each with the tab content the conflict message was
 * last shown for. Autosave skips them, with no retry, until the note is
 * reloaded (`syncExternalContentToEditor` with `markSaved`) or its tab
 * closes: saving again on the same base would only be refused again. A
 * skipped autosave that finds new typing shows the message again, so unsaved
 * text never piles up silently behind one missed toast.
 */
const conflictedPaths = new Map<string, string>();

/** Runs every tab-close listener for `path`, isolating and logging failures. */
function notifyTabClosed(path: string): void {
	conflictedPaths.delete(path);
	for (const listener of tabCloseListeners) {
		try {
			listener.closed(path);
		} catch (err) {
			error('EDITOR', `${listener.name} tab-close listener failed:`, err);
		}
	}
}

/**
 * Per-path functions that write a view's not-yet-persisted edit into the tab
 * of that path. A Set per path, so unregistering one instance never drops
 * another's registration for the same path (a re-key destroys the old instance
 * and mounts the new one back to back, in either order).
 */
const pendingEditFlushers = new Map<string, Set<() => void>>();

/**
 * Registers `flush` to run when `closeTab` closes the tab of `path`, before it
 * saves, so an edit a view still holds in a debounce reaches the file. Lives in
 * core so a feature view registers into it without core importing the feature
 * (ADR-0003). Returns the unregister function, which removes only `flush`.
 */
export function registerPendingEditFlusher(path: string, flush: () => void): () => void {
	let flushers = pendingEditFlushers.get(path);
	if (!flushers) {
		flushers = new Set();
		pendingEditFlushers.set(path, flushers);
	}
	flushers.add(flush);
	return () => {
		const current = pendingEditFlushers.get(path);
		if (!current) return;
		current.delete(flush);
		if (current.size === 0) pendingEditFlushers.delete(path);
	};
}

/**
 * Runs every flusher registered for `path`, logging any that throws. Returns
 * false only when a flusher threw, true otherwise, including when none is
 * registered.
 */
export function flushPendingEdits(path: string): boolean {
	const flushers = pendingEditFlushers.get(path);
	if (!flushers) return true;
	let ok = true;
	for (const flush of [...flushers]) {
		try {
			flush();
		} catch (err) {
			error('EDITOR', `pending-edit flush failed for ${path}:`, err);
			ok = false;
		}
	}
	return ok;
}

/**
 * Single owner of "external content → CodeMirror" sync (Phase 5 of the
 * perf refactor). Updates a tab's content (path-keyed) and bumps
 * `editorStore.externalContentSignal` so `MarkdownEditor.svelte`'s
 * content-sync `$effect` fires a doc replace.
 *
 * Replaces the prior pattern where each external writer touched
 * `editorStore` directly and the editor effect re-ran on every keystroke
 * (because it depended on `activeTab.content`). Now the effect only re-runs
 * on the signal bump, eliminating the per-keystroke `view.state.doc.toString()`
 * round-trip on the hot path.
 *
 * @param markSaved - when `true` the write is treated as disk-synced (sets
 *   both `content` and `savedContent`). When `false`, only `content` is
 *   updated and dirty state is preserved (used by the Properties panel's
 *   in-memory edits).
 * @param schedule - which auto-save timer this write arms: `'frontmatter'`
 *   (500 ms), `'body'` (2000 ms), or `'none'` when the content is already on
 *   disk. Explicit because `MarkdownEditor.svelte` flags the resulting doc
 *   replace as an external edit, so the schedule can no longer be inferred
 *   from the CodeMirror transaction — and background tabs never reach
 *   CodeMirror at all.
 */
export function syncExternalContentToEditor(
	path: string,
	content: string,
	markSaved: boolean,
	schedule: AutoSaveSchedule,
): void {
	const tab = editorStore.tabs.find((t) => t.path === path);
	if (!tab) return;
	if (markSaved) {
		editorStore.updateTabContentByPath(path, content);
		conflictedPaths.delete(path);
	} else {
		editorStore.updateTabContentOnly(path, content);
	}
	// Only signal CodeMirror if this is the active tab — the tab-switch
	// effect will handle non-active tabs when the user switches to them.
	// This avoids a wasted CM dispatch when an external write targets a
	// background tab.
	if (editorStore.activeTabPath === path) {
		editorStore.bumpExternalContentSignal();
	}
	scheduleAutoSave(schedule);
}

/**
 * Opens a file in the editor.
 * If the file is already open in a tab, just switches to it.
 * Otherwise reads the file from disk and creates a new tab.
 */
export async function openFileInEditor(filePath: string) {
	// [FE-STARTUP-PROBE]
	const probeStart = performance.now();
	const baseStart = perfStart();
	appendLog('FE-STARTUP-PROBE', `openFileInEditor: ENTRY path=${filePath}`);

	// Defensive guard: never load binary content (images / audio / video / pdf / archives)
	// into the markdown editor. `readTextFile` decodes the bytes as UTF-8 and the
	// resulting string crashes the renderer when CodeMirror + live-preview plugins
	// iterate over malformed surrogate pairs (kokobrain crash on `![[image.png]]` click).
	if (isBinaryFile(filePath)) {
		appendLog('FE-STARTUP-PROBE', `openFileInEditor: rejected binary path ${filePath}`);
		toast.error(`Cannot open binary file in the editor: ${getFileName(filePath)}`);
		return;
	}

	const existingIndex = findTabIndex(editorStore.tabs, filePath);
	if (existingIndex >= 0) {
		editorStore.setActiveIndex(existingIndex);
		appendLog('FE-STARTUP-PROBE', `openFileInEditor: tab already open @ ${(performance.now() - probeStart).toFixed(1)}ms`);
		perfBaseline('openFileInEditor:cached', baseStart);
		return;
	}

	try {
		appendLog('FE-STARTUP-PROBE', `openFileInEditor: before readTextFile @ ${(performance.now() - probeStart).toFixed(1)}ms`);
		const content = await readTextFile(filePath);
		appendLog('FE-STARTUP-PROBE', `openFileInEditor: after readTextFile @ ${(performance.now() - probeStart).toFixed(1)}ms (${content.length} chars)`);

		// Re-check after async gap — another call may have added the tab
		const raceIndex = findTabIndex(editorStore.tabs, filePath);
		if (raceIndex >= 0) {
			editorStore.setActiveIndex(raceIndex);
			perfBaseline('openFileInEditor:raceCached', baseStart);
			return;
		}

		const name = getFileName(filePath);
		const fileType = isViewFile(name) ? 'collection' as const
			: isCanvasFile(name) ? 'canvas' as const
			: isKanbanFile(name) ? 'kanban' as const
			: undefined;
		editorStore.addTab({ path: filePath, name, content, savedContent: content, fileType });
		debug('EDITOR', 'opened file:', filePath);
		appendLog('FE-STARTUP-PROBE', `openFileInEditor: EXIT (addTab done) @ ${(performance.now() - probeStart).toFixed(1)}ms`);
		perfBaseline('openFileInEditor:fresh', baseStart);
	} catch (err) {
		error('EDITOR', 'Failed to open file:', err);
		toast.error('Failed to open file.');
	}
}

/** Writes the active tab's content to disk if it has unsaved changes */
export async function saveCurrentFile() {
	const tab = editorStore.activeTab;
	if (!tab) return;
	await saveFileByPath(tab.path);
}

/**
 * The last save started for each path, until it settles. A save queues behind
 * the previous one of its path, so two writes of one file never race and a
 * `.view` writer can wait for the tab's save (`waitForTabSave`).
 */
const saveTails = new Map<string, Promise<boolean>>();

/**
 * Writes a specific tab's content to disk if it has unsaved changes.
 * Returns true if the save succeeded (or was a no-op), false if the write failed.
 * A save of a path waits for the one already pending on it, then writes the
 * tab's content as it is at that point, based on the content that landed (a
 * checked writer would refuse a write based on the one before as a conflict).
 */
export function saveFileByPath(path: string): Promise<boolean> {
	const prev = saveTails.get(path);
	const run = prev ? prev.then(() => writeTab(path)) : writeTab(path);
	saveTails.set(path, run);
	void run.then(() => {
		if (saveTails.get(path) === run) saveTails.delete(path);
	});
	return run;
}

/** Resolves once the save pending on `path`, if any, has settled; it never rejects. */
export async function waitForTabSave(path: string): Promise<void> {
	await saveTails.get(path);
}

/**
 * One save of `saveFileByPath`; never rejects. Writes the tab's content through
 * the note writer, based on the content the tab was loaded or last saved with.
 * A conflict keeps the tab dirty and marks the path in `conflictedPaths`.
 */
async function writeTab(path: string): Promise<boolean> {
	const tab = editorStore.tabs.find((t) => t.path === path);
	if (!tab || isVirtualTab(tab) || !isTabDirty(tab)) return true;

	const content = tab.content;
	const base = tab.savedContent;

	try {
		await writeNote(path, content, base);
		conflictedPaths.delete(path);
		editorStore.markSavedByPath(path, content);
		notifyAfterSave(path, content);
		debug('EDITOR', 'saved file (by path):', path);
		return true;
	} catch (err) {
		if (err instanceof NoteConflictError) {
			conflictedPaths.set(path, content);
			debug('EDITOR', 'save refused, the note changed on disk:', path);
			toast.error(NOTE_CONFLICT_MESSAGE);
			return false;
		}
		error('EDITOR', 'Failed to save file:', err);
		toast.error('Failed to save file.');
		return false;
	}
}

/** Retry delay when auto-save fails (ms) */
const SAVE_RETRY_DELAY_MS = 5000;

async function saveDirtyTabs() {
	for (const tab of editorStore.tabs) {
		const shownFor = conflictedPaths.get(tab.path);
		if (shownFor === undefined || !isTabDirty(tab) || tab.content === shownFor) continue;
		conflictedPaths.set(tab.path, tab.content);
		toast.error(NOTE_CONFLICT_MESSAGE);
	}
	const dirtyTabs = editorStore.tabs.filter(
		(tab) => !isVirtualTab(tab) && isTabDirty(tab) && !conflictedPaths.has(tab.path),
	);
	if (dirtyTabs.length === 0) return;
	const results = await Promise.all(
		dirtyTabs.map((tab) => saveFileByPath(tab.path)),
	);
	if (results.some((ok, i) => !ok && !conflictedPaths.has(dirtyTabs[i].path))) {
		setTimeout(saveDirtyTabs, SAVE_RETRY_DELAY_MS);
	}
}

/**
 * Auto-save: 2 seconds after the last body keystroke, and at most 10 seconds
 * into a typing run with no 2 s pause. The max wait bounds what a quit the
 * app cannot intercept (Dock Quit, logout, a crash) loses.
 */
const debouncedSave = debounce(saveDirtyTabs, 2000, { maxWait: 10_000 });

/** Faster auto-save for frontmatter edits (500ms) */
const debouncedSaveFrontmatter = debounce(saveDirtyTabs, 500);

/**
 * Which auto-save timer a content write arms: the 500 ms frontmatter timer,
 * the 2000 ms body timer, or none at all (content already written to disk).
 */
export type AutoSaveSchedule = 'frontmatter' | 'body' | 'none';

/**
 * Arms the timer matching `schedule`. The two timers are mutually exclusive,
 * so arming one cancels the other. `'none'` arms nothing and cancels nothing —
 * a save another edit already scheduled must still fire.
 */
function scheduleAutoSave(schedule: AutoSaveSchedule): void {
	if (schedule === 'frontmatter') {
		debouncedSave.cancel();
		debouncedSaveFrontmatter();
	} else if (schedule === 'body') {
		debouncedSaveFrontmatter.cancel();
		debouncedSave();
	}
}

/** Called on every editor keystroke — updates store content and schedules an auto-save */
export function onContentChange(content: string, frontmatterChanged = false) {
	editorStore.updateContent(content);
	scheduleAutoSave(frontmatterChanged ? 'frontmatter' : 'body');
}

/**
 * Writes `content` into the tab at `path` and schedules a body auto-save.
 * For views that persist after a debounce or on destroy, when the active tab
 * may no longer be theirs: unlike `onContentChange`, the target never follows
 * `activeIndex`. A `path` with no open tab is a no-op apart from the auto-save.
 */
export function onContentChangeForPath(path: string, content: string) {
	editorStore.updateTabContentOnly(path, content);
	scheduleAutoSave('body');
}

/**
 * Saves all dirty tabs immediately, awaiting completion.
 * Used before app close or vault switch.
 * Returns an array of file paths that failed to save (empty = all succeeded).
 */
export async function saveAllDirtyTabs(): Promise<string[]> {
	debouncedSave.cancel();
	debouncedSaveFrontmatter.cancel();
	const dirtyTabs = editorStore.tabs.filter(
		(tab) => !isVirtualTab(tab) && isTabDirty(tab),
	);
	const results = await Promise.all(
		dirtyTabs.map(async (tab) => ({
			path: tab.path,
			ok: await saveFileByPath(tab.path),
		})),
	);
	return results.filter((r) => !r.ok).map((r) => r.path);
}

/** Switches to a specific tab by index */
export function switchTab(index: number) {
	const t0 = perfStart();
	editorStore.setActiveIndex(index);
	perfEnd('EDITOR', 'switchTab:sync', t0);
	perfBaseline('switchTab:sync', t0);
}

/** True when the tab at `path` is still open and differs from its last save. */
function isPathDirty(path: string): boolean {
	const tab = editorStore.tabs.find((t) => t.path === path);
	return !!tab && isTabDirty(tab);
}

/**
 * Closes a tab by index.
 * Pinned tabs are silently skipped — they cannot be closed this way.
 * A file tab's pending-edit flushers run first, so an edit a view still holds
 * in a debounce lands in the tab. A dirty file tab is then saved and closed.
 * Text typed during that save gets one more save; if a flusher threw, a save
 * fails, or the tab is still dirty after the second one, the user is asked
 * whether to close anyway and lose the changes.
 */
export async function closeTab(index: number) {
	const tab = editorStore.tabs[index];
	if (!tab) return;
	if (isTabPinned(tab)) return;

	const tabPath = tab.path;
	const baseStart = perfStart();

	if (!isVirtualTab(tab)) {
		const flushed = flushPendingEdits(tabPath);
		if (!flushed || isPathDirty(tabPath)) {
			let saved = await saveFileByPath(tabPath);
			if (saved && isPathDirty(tabPath)) saved = await saveFileByPath(tabPath);
			if (!flushed || !saved || isPathDirty(tabPath)) {
				const closeAnyway = await ask(
					`Failed to save ${getFileName(tabPath)}. Close anyway and lose unsaved changes?`,
					{ title: 'Unsaved Changes', kind: 'warning', okLabel: 'Close Anyway', cancelLabel: 'Cancel' },
				);
				if (!closeAnyway) return;
			}
		}
	}

	// Re-find the tab by path after the awaits: the original index may be
	// stale if tabs were opened/closed/reordered during the save or the dialog
	const currentIndex = findTabIndex(editorStore.tabs, tabPath);
	if (currentIndex < 0) return;

	editorStore.removeTab(currentIndex);
	deleteTabViewState(tabPath);
	notifyTabClosed(tabPath);
	perfBaseline('closeTab', baseStart);
}

/** Convenience: closes whichever tab is currently focused */
export async function closeActiveTab() {
	if (editorStore.activeIndex >= 0) {
		await closeTab(editorStore.activeIndex);
	}
}

/** Cycles to the next tab (wraps around) */
export function switchToNextTab() {
	const { tabs, activeIndex } = editorStore;
	if (tabs.length <= 1) return;
	switchTab((activeIndex + 1) % tabs.length);
}

/** Cycles to the previous tab (wraps around) */
export function switchToPreviousTab() {
	const { tabs, activeIndex } = editorStore;
	if (tabs.length <= 1) return;
	switchTab((activeIndex - 1 + tabs.length) % tabs.length);
}

/** Toggles the pinned state of the tab at the given index */
export function togglePinTab(index: number) {
	editorStore.togglePin(index);
}

/** Toggles the pinned state of the currently active tab */
export function togglePinActiveTab() {
	if (editorStore.activeIndex >= 0) {
		togglePinTab(editorStore.activeIndex);
	}
}

/**
 * Toggles between live preview and source mode. Mirrors the toolbar button
 * (`Code`/`Eye` icon) and the action bar's Raw button; Cmd+\ binds to the
 * same store flag so every surface stays in sync. When source mode is on, the
 * entire `livePreview` extension is removed via the compartment, so line
 * numbers + gutters reappear and no decorations or widgets render. Toggle is
 * per-editor session, not persisted.
 */
export function toggleSourceMode() {
	editorStore.setLivePreview(!editorStore.isLivePreview);
}

/** Pins a tab identified by file path (used for auto-pin features like daily notes) */
export function pinTabByPath(filePath: string) {
	const index = findTabIndex(editorStore.tabs, filePath);
	if (index >= 0 && !editorStore.tabs[index].pinned) {
		editorStore.setPinned(index, true);
	}
}

/** Unpins a tab identified by file path (used when rotating auto-pinned daily notes) */
export function unpinTabByPath(filePath: string) {
	const index = findTabIndex(editorStore.tabs, filePath);
	if (index >= 0 && editorStore.tabs[index].pinned) {
		editorStore.setPinned(index, false);
	}
}

/**
 * Force-closes all tabs whose path matches or is a child of the given path.
 * Bypasses the pinned check and the dirty check — used when the underlying file
 * is being deleted.
 * @returns the removed tabs in tab order, so a failed delete can re-add them
 */
export function closeTabsForDeletedPath(deletedPath: string): EditorTab[] {
	const removed: EditorTab[] = [];
	// Iterate from the end so that splicing doesn't shift unprocessed indices
	for (let i = editorStore.tabs.length - 1; i >= 0; i--) {
		const tab = editorStore.tabs[i];
		if (tab.path === deletedPath || tab.path.startsWith(deletedPath + '/')) {
			deleteTabViewState(tab.path);
			notifyTabClosed(tab.path);
			editorStore.removeTab(i);
			removed.unshift(tab);
		}
	}
	return removed;
}

/**
 * Reloads content from disk for open tabs whose files were externally modified.
 * Called by the file watcher when changes are detected on disk.
 * Only reloads when the tab is clean (no unsaved editor changes).
 * If the user has unsaved edits, the editor always wins — the disk
 * version is ignored and the editor content will be saved on next auto-save.
 */
export async function reloadExternallyChangedTabs(changedPaths: string[]): Promise<void> {
	// Collect eligible file paths (open, non-virtual, clean tabs)
	const eligible: string[] = [];
	for (const filePath of changedPaths) {
		const tab = editorStore.tabs.find((t) => t.path === filePath);
		if (!tab || isVirtualTab(tab) || isTabDirty(tab)) continue;
		eligible.push(filePath);
	}

	// Read all files in parallel
	const results = await Promise.allSettled(
		eligible.map(async (filePath) => ({ filePath, diskContent: await readTextFile(filePath) })),
	);

	// Apply updates synchronously after all reads complete
	for (const result of results) {
		if (result.status === 'rejected') {
			debug('EDITOR', 'Failed to read externally changed file (may be deleted)');
			continue;
		}
		const { filePath, diskContent } = result.value;
		// Re-check tab state: it may have closed, or been typed into, during the
		// read (a tailnet round trip in the remote browser)
		const tab = editorStore.tabs.find((t) => t.path === filePath);
		if (!tab || isTabDirty(tab) || diskContent === tab.savedContent) continue;
		// Disk-synced: content + savedContent both reflect the new disk state,
		// so the tab is clean and there is nothing to auto-save.
		syncExternalContentToEditor(filePath, diskContent, true, 'none');
		debug('EDITOR', 'Reloaded externally changed file:', filePath);
	}
}

/**
 * Cancels any pending auto-saves and resets all editor state.
 * Uses cancel (not flush) because callers must await saveAllDirtyTabs()
 * before calling resetEditor — flushing would fire async saves that race
 * with the subsequent store reset.
 */
export function resetEditor() {
	debouncedSave.cancel();
	debouncedSaveFrontmatter.cancel();
	conflictedPaths.clear();
	editorStore.reset();
	clearAllTabViewStates();
}
