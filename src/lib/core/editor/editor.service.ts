import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { ask } from '@tauri-apps/plugin-dialog';
import { toast } from 'svelte-sonner';
import { editorStore } from './editor.store.svelte';
import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
import { findTabIndex, getFileName, isTabDirty, isTabPinned, isVirtualTab } from './editor.logic';
import { isCollectionFile, isCanvasFile, isKanbanFile } from '$lib/core/filesystem/fs.logic';
import { applyReadTransform, applyWriteTransform, notifyAfterSave } from './editor.hooks';
import { debounce } from '$lib/utils/debounce';
import { clearAllTabViewStates, deleteTabViewState } from '$lib/core/markdown-editor/tab-view-state';
import { debug, error, perfStart, perfEnd } from '$lib/utils/debug';

/**
 * Opens a file in the editor.
 * If the file is already open in a tab, just switches to it.
 * Otherwise reads the file from disk and creates a new tab.
 */
export async function openFileInEditor(filePath: string) {
	const existingIndex = findTabIndex(editorStore.tabs, filePath);
	if (existingIndex >= 0) {
		editorStore.setActiveIndex(existingIndex);
		fsStore.setSelectedFilePath(filePath);
		return;
	}

	try {
		const rawContent = await readTextFile(filePath);
		const transformed = await applyReadTransform(filePath, rawContent);
		const content = transformed?.content ?? rawContent;

		if (transformed) {
			debug('EDITOR', 'Read transform applied:', filePath, transformed.tabProps ? JSON.stringify(transformed.tabProps) : '');
		}

		// Re-check after async gap — another call may have added the tab
		const raceIndex = findTabIndex(editorStore.tabs, filePath);
		if (raceIndex >= 0) {
			editorStore.setActiveIndex(raceIndex);
			fsStore.setSelectedFilePath(filePath);
			return;
		}

		const name = getFileName(filePath);
		const fileType = isCollectionFile(name) ? 'collection' as const
			: isCanvasFile(name) ? 'canvas' as const
			: isKanbanFile(name) ? 'kanban' as const
			: undefined;
		editorStore.addTab({ path: filePath, name, content, savedContent: content, fileType, ...transformed?.tabProps });
		fsStore.setSelectedFilePath(filePath);
		debug('EDITOR', 'opened file:', filePath);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		if (msg === 'canceled') return; // Touch ID dismissed — silent
		if (msg === 'no-encryption-key') {
			toast.error('No encryption key found for this vault. Restore from a recovery key in Settings > Security.');
			return;
		}
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
		const handled = await applyWriteTransform(path, content, tab);
		if (handled) {
			debug('EDITOR', 'Write transform handled save for:', path);
		} else {
			await writeTextFile(path, content);
		}
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

/**
 * Auto-save: triggers a save of ALL dirty tabs 2 seconds after the last keystroke.
 * Iterates every open tab and saves any that have unsaved changes,
 * so edits are never lost when the user switches between tabs.
 */
const debouncedSave = debounce(() => {
	for (const tab of editorStore.tabs) {
		if (!isVirtualTab(tab) && isTabDirty(tab)) {
			saveFileByPath(tab.path);
		}
	}
}, 2000);

/** Called on every editor keystroke — updates store content and schedules an auto-save */
export function onContentChange(content: string) {
	editorStore.updateContent(content);
	debouncedSave();
}

/** Immediately saves all dirty tabs that have a pending auto-save */
export function flushPendingSaves(): void {
	debouncedSave.flush();
}

/**
 * Saves all dirty tabs immediately, awaiting completion.
 * Used before app close or vault switch.
 * Returns an array of file paths that failed to save (empty = all succeeded).
 */
export async function saveAllDirtyTabs(): Promise<string[]> {
	debouncedSave.cancel();
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

	const newActive = editorStore.activeTab;
	fsStore.setSelectedFilePath(newActive && !isVirtualTab(newActive) ? newActive.path : null);
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

/** Pins a tab identified by file path (used for auto-pin features like daily notes) */
export function pinTabByPath(filePath: string) {
	const index = findTabIndex(editorStore.tabs, filePath);
	if (index >= 0 && !editorStore.tabs[index].pinned) {
		editorStore.setPinned(index, true);
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
			editorStore.removeTab(i);
		}
	}

	const newActive = editorStore.activeTab;
	fsStore.setSelectedFilePath(newActive && !isVirtualTab(newActive) ? newActive.path : null);
}

/**
 * Cancels any pending auto-saves and resets all editor state.
 * Uses cancel (not flush) because callers must await saveAllDirtyTabs()
 * before calling resetEditor — flushing would fire async saves that race
 * with the subsequent store reset.
 */
export function resetEditor() {
	debouncedSave.cancel();
	editorStore.reset();
	clearAllTabViewStates();
}
