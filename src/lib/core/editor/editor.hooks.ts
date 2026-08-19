import { backlinksStore } from '$lib/features/backlinks/backlinks.store.svelte';
import { invalidateQueryjsCache } from '$lib/core/markdown-editor/extensions/live-preview/widgets/queryjs-block-widget';
import { clearLinkedContentCache } from '$lib/plugins/kanban/kanban.service';
import { applyNoteChange } from '$lib/core/filesystem/note-change.service';
import { clearAllIndexed } from '$lib/utils/index-dedupe';
import { debug, error } from '$lib/utils/debug';

/**
 * Called after a file is successfully saved to disk.
 * Fire-and-forget — errors are caught and logged, never propagated.
 * Receives the plaintext content (not the on-disk representation).
 */
export type AfterSaveObserver = (filePath: string, content: string) => void;

/** Registered after-save observers */
const afterSaveObservers: AfterSaveObserver[] = [];

// --- Self-save detection ---
// Tracks paths recently saved by the editor so the file watcher can
// skip expensive full index rebuilds for changes we caused ourselves.

/**
 * Safety timeout: clear stale entries if the watcher never consumes them.
 * Set to 15s because macOS watcher events from a single save can span 10+ seconds
 * (metadata changes on parent directories arrive in delayed batches).
 */
const RECENT_SAVE_TIMEOUT_MS = 15000;

/** Maps recently saved paths to their cleanup timers */
const recentSaves = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Marks a file path as recently saved/created by the editor.
 * Used by the file watcher to skip redundant full index rebuilds.
 * Called automatically by `notifyAfterSave`, but should also be called
 * directly when creating files outside the normal save flow (e.g. note
 * creator, file explorer "New File") to prevent the watcher from
 * triggering a full rebuild for a file the editor just wrote.
 */
export function markRecentSave(path: string): void {
	const existing = recentSaves.get(path);
	if (existing) clearTimeout(existing);
	const timer = setTimeout(() => {
		recentSaves.delete(path);
	}, RECENT_SAVE_TIMEOUT_MS);
	recentSaves.set(path, timer);
}

/** Returns true if ALL given paths were recently saved by the editor. */
export function areAllRecentSaves(paths: string[]): boolean {
	return paths.length > 0 && paths.every((p) => recentSaves.has(p));
}

/** Adds an after-save observer. Returns an unsubscribe function. */
export function addAfterSaveObserver(observer: AfterSaveObserver): () => void {
	afterSaveObservers.push(observer);
	debug('HOOKS', `After-save observer added (total: ${afterSaveObservers.length})`);
	return () => {
		const idx = afterSaveObservers.indexOf(observer);
		if (idx >= 0) afterSaveObservers.splice(idx, 1);
		debug('HOOKS', `After-save observer removed (total: ${afterSaveObservers.length})`);
	};
}

/** Notifies all after-save observers. Errors are caught and logged.
 *  Also marks unlinked mentions as dirty so the BacklinksPanel recomputes on save,
 *  and synchronously refreshes every per-file index so queryjs widgets that
 *  re-render after the cache invalidation below see the saved content. */
export function notifyAfterSave(filePath: string, content: string): void {
	markRecentSave(filePath);
	backlinksStore.markUnlinkedDirty();

	// The note-change owner refreshes every per-file index SYNCHRONOUSLY for
	// the 'save' source (its policy row has no yield), which is what lets the
	// queryjs cache invalidation below see fresh indexes. The +layout.svelte
	// content-effect also runs these, but with a 1 s debounce - if the user
	// switches tabs within that window the pending setTimeout is cleared and
	// the just-saved file never gets indexed (the watcher also skips it,
	// because areAllRecentSaves sees the markRecentSave above).
	//
	// The 'save' policy row deliberately fires the Rust IPC even on a dedupe
	// hit while skipping the TS consumers - see SOURCE_POLICY.
	void applyNoteChange({ kind: 'upsert', source: 'save', path: filePath, content });

	invalidateQueryjsCache();
	clearLinkedContentCache();
	debug('HOOKS', `Notifying ${afterSaveObservers.length} after-save observer(s) for:`, filePath);
	for (const observer of afterSaveObservers) {
		try {
			observer(filePath, content);
		} catch (err) {
			error('HOOKS', 'afterSave observer error:', err);
		}
	}
}

/** Removes all hooks and observers. Used in tests and teardown. */
export function resetHooks(): void {
	debug('HOOKS', 'Resetting all hooks and observers');
	afterSaveObservers.length = 0;
	for (const timer of recentSaves.values()) clearTimeout(timer);
	recentSaves.clear();
	clearAllIndexed();
}
