import { invoke } from '@tauri-apps/api/core';
import { backlinksStore } from '$lib/features/backlinks/backlinks.store.svelte';
import { invalidateQueryjsCache } from '$lib/core/markdown-editor/extensions/live-preview/widgets/queryjs-block-widget';
import { clearLinkedContentCache } from '$lib/plugins/kanban/kanban.service';
import { updateNoteInIndex } from '$lib/features/collection/collection.service';
import { updateFrontmatterIconForFile } from '$lib/features/file-icons/file-icons.service';
import { updateCalendarForFile } from '$lib/plugins/calendar/calendar.service';
import { isAlreadyIndexed, markIndexed, clearAllIndexed } from '$lib/utils/index-dedupe';
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

	// Synchronously refresh the per-file indexes before invalidating the
	// queryjs cache. The +layout.svelte content-effect also runs these, but
	// with a 1 s debounce — if the user switches tabs within that window the
	// pending setTimeout is cleared and the just-saved file never gets
	// indexed (the watcher also skips it, because areAllRecentSaves sees
	// the markRecentSave above). Without this block, kb.pages() queries on
	// the next active tab would miss notes the user just created.
	// Skipped when the shared dedupe map reports that this exact
	// (path, content) has already been indexed (typically by the
	// content-effect firing 1 s before the 2 s autosave).
	// Each updater is wrapped individually so one failure doesn't block
	// the rest (mirrors the pattern in index-updater.service.ts).
	if (!isAlreadyIndexed(filePath, content)) {
		markIndexed(filePath, content);
		try { updateNoteInIndex(filePath, content); } catch (err) { error('HOOKS', 'updateNoteInIndex after save failed:', err); }
		try { updateFrontmatterIconForFile(filePath, content); } catch (err) { error('HOOKS', 'updateFrontmatterIconForFile after save failed:', err); }
		try { updateCalendarForFile(filePath, content); } catch (err) { error('HOOKS', 'updateCalendarForFile after save failed:', err); }
	}

	// Update the Rust `VaultIndex` so save-driven `vault-index-updated`
	// events bump `vaultStore.vaultIndexVersion` and `BacklinksPanel.svelte`'s
	// consumer effect re-fetches via `get_backlinks_v2`. Fire-and-forget —
	// errors are logged but never propagated.
	//
	// IMPORTANT: this call sits OUTSIDE the `!isAlreadyIndexed` guard. The
	// TS dedup map tracks whether the *TS* indexers were called for an exact
	// (path, content); the content-effect in `updateIndexesForFile` marks
	// indexed and *also* calls Rust, so a typing-pause-then-save sequence
	// (content-effect at 1 s → autosave at 2 s) still updates Rust on the
	// save side. Calling on every save is cheap (~1-5 ms IPC) and Rust has
	// its own internal change detection via `UpdateResult.changed`.
	invoke('update_note_in_index', { path: filePath, content }).catch((err) => {
		error('HOOKS', 'update_note_in_index after save failed:', err);
	});

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
