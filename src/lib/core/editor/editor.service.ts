import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { ask } from '@tauri-apps/plugin-dialog';
import { toast } from 'svelte-sonner';
import { editorStore } from './editor.store.svelte';
import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
import { findTabIndex, getFileName, isTabDirty, isTabPinned, isVirtualTab } from './editor.logic';
import { isCollectionFile, isViewFile, isCanvasFile, isKanbanFile, isBinaryFile } from '$lib/core/filesystem/fs.logic';
import { notifyAfterSave } from './editor.hooks';
import { debounce } from '$lib/utils/debounce';
import { clearAllTabViewStates, deleteTabViewState } from '$lib/core/markdown-editor/tab-view-state';
import { debug, error, perfStart, perfEnd, perfBaseline } from '$lib/utils/debug';
import { appendLog } from '$lib/utils/log.service';
import { queryjsSessionStore } from '$lib/plugins/queryjs/queryjs-session.store.svelte';

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
 * @param markSaved - when `true` (default) the write is treated as
 *   disk-synced (sets both `content` and `savedContent`). When `false`,
 *   only `content` is updated and dirty state is preserved (used by the
 *   Properties panel's in-memory edits).
 */
export function syncExternalContentToEditor(
	path: string,
	content: string,
	markSaved: boolean = true,
): void {
	const tab = editorStore.tabs.find((t) => t.path === path);
	if (!tab) return;
	if (markSaved) {
		editorStore.updateTabContentByPath(path, content);
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
		fsStore.setSelectedFilePath(filePath);
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
			fsStore.setSelectedFilePath(filePath);
			perfBaseline('openFileInEditor:raceCached', baseStart);
			return;
		}

		const name = getFileName(filePath);
		const fileType = (isCollectionFile(name) || isViewFile(name)) ? 'collection' as const
			: isCanvasFile(name) ? 'canvas' as const
			: isKanbanFile(name) ? 'kanban' as const
			: undefined;
		editorStore.addTab({ path: filePath, name, content, savedContent: content, fileType });
		fsStore.setSelectedFilePath(filePath);
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
 * Writes a specific tab's content to disk if it has unsaved changes.
 * Returns true if the save succeeded (or was a no-op), false if the write failed.
 */
export async function saveFileByPath(path: string): Promise<boolean> {
	const tab = editorStore.tabs.find((t) => t.path === path);
	if (!tab || isVirtualTab(tab) || !isTabDirty(tab)) return true;

	const content = tab.content;

	try {
		await writeTextFile(path, content);
		editorStore.markSavedByPath(path, content);
		notifyAfterSave(path, content);
		debug('EDITOR', 'saved file (by path):', path);
		return true;
	} catch (err) {
		error('EDITOR', 'Failed to save file:', err);
		toast.error('Failed to save file.');
		return false;
	}
}

/** Retry delay when auto-save fails (ms) */
const SAVE_RETRY_DELAY_MS = 5000;

async function saveDirtyTabs() {
	const dirtyTabs = editorStore.tabs.filter(
		(tab) => !isVirtualTab(tab) && isTabDirty(tab),
	);
	if (dirtyTabs.length === 0) return;
	const results = await Promise.all(
		dirtyTabs.map((tab) => saveFileByPath(tab.path)),
	);
	if (results.some((ok) => !ok)) {
		setTimeout(saveDirtyTabs, SAVE_RETRY_DELAY_MS);
	}
}

/** Auto-save: 2 seconds after last body keystroke */
const debouncedSave = debounce(saveDirtyTabs, 2000);

/** Faster auto-save for frontmatter edits (500ms) */
const debouncedSaveFrontmatter = debounce(saveDirtyTabs, 500);

/** Called on every editor keystroke — updates store content and schedules an auto-save */
export function onContentChange(content: string, frontmatterChanged = false) {
	editorStore.updateContent(content);
	if (frontmatterChanged) {
		debouncedSave.cancel();
		debouncedSaveFrontmatter();
	} else {
		debouncedSaveFrontmatter.cancel();
		debouncedSave();
	}
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

/** Switches to a specific tab by index and syncs the file explorer selection */
export function switchTab(index: number) {
	const t0 = perfStart();
	editorStore.setActiveIndex(index);
	const tab = editorStore.activeTab;
	if (tab && !isVirtualTab(tab)) {
		fsStore.setSelectedFilePath(tab.path);
	}
	perfEnd('EDITOR', 'switchTab:sync', t0);
	perfBaseline('switchTab:sync', t0);
}

/**
 * Closes a tab by index.
 * Pinned tabs are silently skipped — they cannot be closed this way.
 * If the tab has unsaved changes, prompts the user for confirmation before discarding.
 */
export async function closeTab(index: number) {
	const tab = editorStore.tabs[index];
	if (!tab) return;
	if (isTabPinned(tab)) return;

	const tabPath = tab.path;
	const baseStart = perfStart();

	if (!isVirtualTab(tab)) {
		if (isTabDirty(tab)) {
			const discard = await ask('This file has unsaved changes. Discard changes?', {
				title: 'Unsaved Changes',
				kind: 'warning',
			});
			if (!discard) return;
		}
	}

	// Re-find the tab by path after the async dialog — the original index
	// may be stale if tabs were opened/closed/reordered while the dialog was shown
	const currentIndex = findTabIndex(editorStore.tabs, tabPath);
	if (currentIndex < 0) return;

	editorStore.removeTab(currentIndex);
	deleteTabViewState(tabPath);
	// Drop the file's autoRun marker so reopening the file restarts the
	// 'first-open' policy. Cached results are invalidated on save, not on
	// close — keeping them lets the user reopen a recently-viewed note
	// instantly even mid-session.
	queryjsSessionStore.invalidatePath(tabPath);

	const newActive = editorStore.activeTab;
	fsStore.setSelectedFilePath(newActive && !isVirtualTab(newActive) ? newActive.path : null);
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
 * (`Code`/`Eye` icon) — Cmd+K binds to the same store flag so both surfaces
 * stay in sync. When source mode is on, the entire `livePreview` extension
 * is removed via the compartment, so line numbers + gutters reappear and no
 * decorations or widgets render. Toggle is per-editor session, not persisted.
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
 * Bypasses the pinned check — used when the underlying file has been deleted.
 */
export function closeTabsForDeletedPath(deletedPath: string) {
	// Iterate from the end so that splicing doesn't shift unprocessed indices
	for (let i = editorStore.tabs.length - 1; i >= 0; i--) {
		const tab = editorStore.tabs[i];
		if (tab.path === deletedPath || tab.path.startsWith(deletedPath + '/')) {
			deleteTabViewState(tab.path);
			// Drop autoRun marker — if the user later restores or recreates the
			// file, treat it as a fresh open.
			queryjsSessionStore.invalidatePath(tab.path);
			editorStore.removeTab(i);
		}
	}

	const newActive = editorStore.activeTab;
	fsStore.setSelectedFilePath(newActive && !isVirtualTab(newActive) ? newActive.path : null);
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
		// Re-check tab state — it may have changed during parallel reads
		const tab = editorStore.tabs.find((t) => t.path === filePath);
		if (!tab || diskContent === tab.savedContent) continue;
		// Disk-synced: content + savedContent both reflect the new disk state.
		syncExternalContentToEditor(filePath, diskContent, true);
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
	editorStore.reset();
	clearAllTabViewStates();
}
