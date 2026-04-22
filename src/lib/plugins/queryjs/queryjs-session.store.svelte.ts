/**
 * Session-scoped state for the QueryJS execution model.
 *
 * Replaces the legacy module-level `scriptResultCache` + `cacheVersion` in
 * queryjs-block-widget.ts with three co-ordinated pieces:
 *
 *   - `resultCache: Map<contentHash, HTMLElement>` — a LIVE reference to the
 *     rendered DOM (not a deep clone). CodeMirror destroys and recreates
 *     widgets as they enter/leave the viewport; when the cache hits, the
 *     same element is moved into the new container, preserving `<canvas>`
 *     pixel buffers, `<iframe>` / `<video>` playback state and any other
 *     mutable DOM state. This deletes the legacy clone+exclusion dance.
 *
 *   - `autoRunOnFirstOpen: Set<notePath>` — tracks which notes have already
 *     had their queryjs blocks auto-executed in this session. The
 *     `'first-open'` policy (default) runs blocks once per note per session
 *     and then serves from cache on subsequent opens.
 *
 *   - `pathByHash: Map<contentHash, Set<notePath>>` — reverse index keeping
 *     the path → hash relation so when a note is closed we can invalidate
 *     only that note's entries. Multiple notes can share the same hash
 *     (same script copied around), so the value is a Set.
 */

/** LIVE DOM reference keyed by content hash. See module JSDoc for semantics. */
const resultCache = new Map<string, HTMLElement>();

/** Notes that already auto-ran this session. */
const autoRunOnFirstOpen = new Set<string>();

/** Reverse index: content hash → set of note paths using it. */
const pathByHash = new Map<string, Set<string>>();

export const queryjsSessionStore = {
	/** Returns the cached rendered DOM for a content hash, or null. */
	getCached(contentHash: string): HTMLElement | null {
		return resultCache.get(contentHash) ?? null;
	},

	/** Stores the rendered DOM element for a content hash. Also records path→hash. */
	setCached(contentHash: string, notePath: string, element: HTMLElement): void {
		resultCache.set(contentHash, element);
		let paths = pathByHash.get(contentHash);
		if (!paths) {
			paths = new Set<string>();
			pathByHash.set(contentHash, paths);
		}
		paths.add(notePath);
	},

	/** Drops a single entry by hash (used when a block's content changes). */
	invalidate(contentHash: string): void {
		resultCache.delete(contentHash);
		pathByHash.delete(contentHash);
	},

	/** Drops every cache entry tied to the given note path. Called when a tab closes. */
	invalidatePath(notePath: string): void {
		autoRunOnFirstOpen.delete(notePath);
		for (const [hash, paths] of pathByHash) {
			if (!paths.has(notePath)) continue;
			paths.delete(notePath);
			if (paths.size === 0) {
				resultCache.delete(hash);
				pathByHash.delete(hash);
			}
		}
	},

	/** Returns true if the note has already had at least one auto-run this session. */
	hasAutoRun(notePath: string): boolean {
		return autoRunOnFirstOpen.has(notePath);
	},

	/** Marks the note as having auto-run at least one block this session. */
	markAutoRun(notePath: string): void {
		autoRunOnFirstOpen.add(notePath);
	},

	/** Clears every session entry. Called on vault teardown. */
	reset(): void {
		resultCache.clear();
		autoRunOnFirstOpen.clear();
		pathByHash.clear();
	},

	/** @internal Diagnostic snapshot for tests. */
	_snapshot(): { cacheSize: number; autoRunCount: number } {
		return { cacheSize: resultCache.size, autoRunCount: autoRunOnFirstOpen.size };
	},
};
