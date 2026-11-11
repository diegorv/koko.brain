import { applyNoteChange, notifyContentInvalidated } from '#lib/core/filesystem/note-change.service.js';
import { clearAllIndexed } from '#lib/utils/index-dedupe.js';
import { debug, error } from '#lib/utils/debug.js';

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
 *  Also synchronously refreshes every per-file index, then fires the
 *  content-invalidation signal (unlinked mentions dirty, queryjs and kanban
 *  caches cleared), so queryjs widgets that re-render after it see the saved
 *  content. */
export function notifyAfterSave(filePath: string, content: string): void {
	markRecentSave(filePath);

	// The note-change owner refreshes every per-file index SYNCHRONOUSLY for
	// the 'save' source (its policy row has no yield), which is what lets the
	// queryjs cache cleared by the content-invalidation signal below re-render
	// from fresh indexes. The +layout.svelte content-effect also runs these,
	// but with a 1 s debounce - if the user switches tabs within that window
	// the pending setTimeout is cleared and the just-saved file never gets
	// indexed (the watcher also skips it, because areAllRecentSaves sees the
	// markRecentSave above).
	//
	// The 'save' policy row deliberately fires the Rust IPC even on a dedupe
	// hit while skipping the TS consumers - see SOURCE_POLICY.
	void applyNoteChange({ kind: 'upsert', source: 'save', path: filePath, content });

	notifyContentInvalidated();
	debug('HOOKS', `Notifying ${afterSaveObservers.length} after-save observer(s) for:`, filePath);
	for (const observer of afterSaveObservers) {
		try {
			observer(filePath, content);
		} catch (err) {
			error('HOOKS', 'afterSave observer error:', err);
		}
	}
}

/**
 * Called with the absolute path of a note an app note creator made, once that
 * creator is done, its tab-open step included. Errors are caught and logged.
 */
export type NoteCreatedObserver = (filePath: string) => void;

/** Registered note-created observers */
const noteCreatedObservers: NoteCreatedObserver[] = [];

/** Adds a note-created observer. Returns an unsubscribe function. */
export function addNoteCreatedObserver(observer: NoteCreatedObserver): () => void {
	noteCreatedObservers.push(observer);
	return () => {
		const idx = noteCreatedObservers.indexOf(observer);
		if (idx >= 0) noteCreatedObservers.splice(idx, 1);
	};
}

/**
 * Notifies the note-created observers. A creator calls it after it has
 * finished, including opening the note's tab when it opens one: an observer
 * that writes the note then reaches the open tab instead of losing the write
 * to the tab's next autosave. Only the creators listed in the mods docs
 * (`help/documentation/mods/07-events-and-reactivity.md`) call it.
 */
export function notifyNoteCreated(filePath: string): void {
	for (const observer of [...noteCreatedObservers]) {
		try {
			observer(filePath);
		} catch (err) {
			error('HOOKS', 'noteCreated observer error:', err);
		}
	}
}

/** Removes all hooks and observers. Used in tests and teardown. */
export function resetHooks(): void {
	debug('HOOKS', 'Resetting all hooks and observers');
	afterSaveObservers.length = 0;
	noteCreatedObservers.length = 0;
	for (const timer of recentSaves.values()) clearTimeout(timer);
	recentSaves.clear();
	clearAllIndexed();
}
