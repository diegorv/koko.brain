/**
 * Session-scoped state for the QueryJS execution model (Phase 12 of the
 * Híbrido D refactor).
 *
 * Two parallel structures:
 *
 *   resultCache       — Map<filePath + jsContent, HTMLElement>
 *                       The rendered DOM produced by a queryjs block, keyed
 *                       by the note it ran in plus the script's content: a
 *                       shared script reads `kb.current()`, so two notes with
 *                       the same block text render different results (ADR
 *                       0010, amendment 2026-11-03). **Holds the live element
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
 *   - `invalidate(filePath, jsContent)` — drop a single result.
 *   - `clearResults()` — drop every result, keep the autoRun markers (called
 *     on every content invalidation, e.g. after a save).
 *   - `invalidatePath(filePath)` — drop the file's autoRun marker (called
 *     by closeTab and closeTabsForDeletedPath so reopening the file
 *     re-runs first-open auto-execution).
 *   - `reset()` — wipe everything (called by app-lifecycle teardownVault).
 *
 * Every drop destroys the Chart.js charts of the dropped result (see
 * `queryjs-charts.ts`) unless it is still on screen.
 */

import { destroyChartsIn } from './queryjs-charts';

let resultCache = $state<Map<string, HTMLElement>>(new Map());
let autoRunOnFirstOpen = $state<Set<string>>(new Set());

/**
 * Disposes a result that left the cache. A result still on screen keeps its
 * charts: destroying them would blank a visible block on every save. Its
 * widget's `destroy()` disposes it once CodeMirror removes it.
 */
function dropResult(element: HTMLElement): void {
	if (!element.isConnected) destroyChartsIn(element);
}

/** Cache key of one block's result: a NUL cannot appear in a path, so the pair cannot collide. */
function resultKey(filePath: string, jsContent: string): string {
	return `${filePath}\0${jsContent}`;
}

export const queryjsSessionStore = {
	/** All cached rendered results — for inspection and tests. */
	get resultCache() {
		return resultCache;
	},
	/** All file paths that have had at least one auto-execute this session. */
	get autoRunOnFirstOpen() {
		return autoRunOnFirstOpen;
	},

	/** True if this script already has a cached result in this file. */
	hasResult(filePath: string, jsContent: string): boolean {
		return resultCache.has(resultKey(filePath, jsContent));
	},

	/** Returns the cached rendered DOM of this script in this file, or undefined if absent. */
	getResult(filePath: string, jsContent: string): HTMLElement | undefined {
		return resultCache.get(resultKey(filePath, jsContent));
	},

	/**
	 * Stores a rendered result. Live element reference, not cloned — see the
	 * file header for the canvas/video/iframe rationale.
	 */
	setResult(filePath: string, jsContent: string, element: HTMLElement): void {
		const key = resultKey(filePath, jsContent);
		const previous = resultCache.get(key);
		if (previous && previous !== element) dropResult(previous);
		resultCache.set(key, element);
		// Reassign so Svelte runes notice the mutation
		resultCache = resultCache;
	},

	/** Drops one cached result (called when its source content changes). */
	invalidate(filePath: string, jsContent: string): void {
		const key = resultKey(filePath, jsContent);
		const element = resultCache.get(key);
		if (element) {
			resultCache.delete(key);
			dropResult(element);
			resultCache = resultCache;
		}
	},

	/** True if `element` is a cached result, under any key. */
	holdsResult(element: HTMLElement): boolean {
		for (const cached of resultCache.values()) {
			if (cached === element) return true;
		}
		return false;
	},

	/**
	 * Drops every cached result while keeping the autoRunOnFirstOpen markers
	 * intact. Called by `notifyAfterSave` so subsequent toDOM() calls miss
	 * the cache and the `'first-open'` policy renders ▶ Run instead of
	 * silently auto-executing the saved-but-still-marked file.
	 */
	clearResults(): void {
		const dropped = resultCache;
		resultCache = new Map();
		for (const element of dropped.values()) dropResult(element);
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
		const dropped = resultCache;
		resultCache = new Map();
		autoRunOnFirstOpen = new Set();
		for (const element of dropped.values()) dropResult(element);
	},
};
