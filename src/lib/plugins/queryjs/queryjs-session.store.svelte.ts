/**
 * Session-scoped state for the QueryJS execution model (Phase 12 of the
 * Híbrido D refactor).
 *
 * Two parallel structures:
 *
 *   resultCache       — Map<contentHash, HTMLElement>
 *                       The rendered DOM produced by a queryjs block, keyed
 *                       by the script's content. **Holds the live element
 *                       reference, not a clone**, so `<canvas>` pixel
 *                       buffers, `<video>` playback state, and `<iframe>`
 *                       loaded content survive the CodeMirror widget being
 *                       destroyed and re-mounted (CM destroys the widget,
 *                       but the underlying DOM lives on because we hold the
 *                       ref; re-mount re-attaches the same node).
 *
 *   autoRunOnFirstOpen — Set<filePath>
 *                       Tracks which files have already had their queryjs
 *                       blocks auto-executed at least once this session.
 *                       Drives the `'first-open'` policy: a file outside
 *                       this set triggers auto-execute on render; a file
 *                       inside it shows the ▶ Run button on cache miss.
 *                       **Manual mode never adds to this set** — clicking
 *                       Run for the first time doesn't promote the file to
 *                       "auto-run". Invariant captured in the policy
 *                       matrix in widget.ts and ADR 0010.
 *
 * Invalidation hooks:
 *   - `invalidate(contentHash)` — drop a single result (called by
 *     notifyAfterSave for blocks the user just edited).
 *   - `invalidatePath(filePath)` — drop the file's autoRun marker (called
 *     by closeTab and closeTabsForDeletedPath so reopening the file
 *     re-runs first-open auto-execution).
 *   - `reset()` — wipe everything (called by app-lifecycle teardownVault).
 */

let resultCache = $state<Map<string, HTMLElement>>(new Map());
let autoRunOnFirstOpen = $state<Set<string>>(new Set());

export const queryjsSessionStore = {
	/** All cached rendered results — for inspection and tests. */
	get resultCache() {
		return resultCache;
	},
	/** All file paths that have had at least one auto-execute this session. */
	get autoRunOnFirstOpen() {
		return autoRunOnFirstOpen;
	},

	/** True if a script with this content already has a cached result. */
	hasResult(contentHash: string): boolean {
		return resultCache.has(contentHash);
	},

	/** Returns the cached rendered DOM for a content hash, or undefined if absent. */
	getResult(contentHash: string): HTMLElement | undefined {
		return resultCache.get(contentHash);
	},

	/**
	 * Stores a rendered result. Live element reference, not cloned — see the
	 * file header for the canvas/video/iframe rationale.
	 */
	setResult(contentHash: string, element: HTMLElement): void {
		resultCache.set(contentHash, element);
		// Reassign so Svelte runes notice the mutation
		resultCache = resultCache;
	},

	/** Drops one cached result (called when its source content changes). */
	invalidate(contentHash: string): void {
		if (resultCache.delete(contentHash)) {
			resultCache = resultCache;
		}
	},

	/**
	 * Drops every cached result while keeping the autoRunOnFirstOpen markers
	 * intact. Called by `notifyAfterSave` so subsequent toDOM() calls miss
	 * the cache and the `'first-open'` policy renders ▶ Run instead of
	 * silently auto-executing the saved-but-still-marked file.
	 */
	clearResults(): void {
		resultCache = new Map();
	},

	/** True if this file path has already auto-run at least once this session. */
	hasAutoRun(filePath: string): boolean {
		return autoRunOnFirstOpen.has(filePath);
	},

	/** Marks the file as having auto-executed at least once. */
	markAutoRun(filePath: string): void {
		if (!autoRunOnFirstOpen.has(filePath)) {
			autoRunOnFirstOpen.add(filePath);
			autoRunOnFirstOpen = autoRunOnFirstOpen;
		}
	},

	/**
	 * Drops the auto-run marker for a path. Called when a tab closes or a
	 * file is deleted — reopening should restart the first-open policy.
	 */
	invalidatePath(filePath: string): void {
		if (autoRunOnFirstOpen.delete(filePath)) {
			autoRunOnFirstOpen = autoRunOnFirstOpen;
		}
	},

	/** Wipes the entire session — called by vault teardown. */
	reset(): void {
		resultCache = new Map();
		autoRunOnFirstOpen = new Set();
	},
};
