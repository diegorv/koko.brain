/**
 * Wraps an async function so that concurrent calls sharing the same
 * derived key collapse into a single in-flight Promise. Once the promise
 * settles (success OR rejection), the cache entry is cleared and the
 * next call fires a fresh invocation.
 *
 * Use case: Phase 11 made every panel a reactive consumer of
 * `vault-index-updated`, so a tab switch + a save-driven version bump
 * landing in the same JS turn can fan out duplicate IPCs for the same
 * path (e.g. `+layout.svelte` and `BacklinksPanel.svelte` both calling
 * `fetchBacklinksV2(path)` within milliseconds of each other). The
 * 2026-04-29 dogfood log captured `fetchBacklinksV2` taking 51 ms
 * because it was queued behind another in-flight `fetchBacklinksV2` for
 * the same path. Dedup-by-key collapses these without changing the
 * caller-facing contract — every caller still gets a Promise that
 * resolves to the same result.
 *
 * Key choice is the consumer's responsibility. Path-only is safe when
 * the function is a pure projection of Rust `VaultIndex` state for
 * that path (`fetchBacklinksV2`, `computeUnlinkedMentionsForFile`).
 * Functions that also depend on a per-keystroke argument (e.g.
 * `fetchOutgoingLinksV2(path, content)`) accept that the in-flight
 * window may briefly serve a slightly stale content snapshot — the
 * window is bounded by the IPC roundtrip and the next reactive trigger
 * will fire a fresh invocation.
 */
export function dedupeInflight<TArgs extends unknown[], TResult>(
	fn: (...args: TArgs) => Promise<TResult>,
	keyFn: (...args: TArgs) => string,
): (...args: TArgs) => Promise<TResult> {
	const inflight = new Map<string, Promise<TResult>>();
	return (...args: TArgs) => {
		const key = keyFn(...args);
		const existing = inflight.get(key);
		if (existing) return existing;
		const promise = fn(...args).finally(() => {
			// Defensive identity check: only clear if we're still the
			// stored entry. A pathological caller could overwrite the map
			// directly (we don't expose that, but belt-and-braces).
			if (inflight.get(key) === promise) {
				inflight.delete(key);
			}
		});
		inflight.set(key, promise);
		return promise;
	};
}

/** A memoized async read whose cache entry is keyed on a caller-supplied version. */
export interface VersionGated<T> {
	/** Returns the cached Promise for the current version, fetching once per version. */
	get(): Promise<T>;
	/** Drops the cached Promise so the next `get()` fetches again at the same version. */
	invalidate(): void;
}

/**
 * Memoizes a single-value async read, keyed on a monotonic version the
 * caller supplies. While the version is unchanged every `get()` shares the
 * SAME Promise: in-flight callers dedupe and settled callers get the cached
 * snapshot without a second round trip. A version change makes the next
 * `get()` fetch fresh.
 *
 * A rejection is never cached: the failed entry is dropped (under the same
 * identity guard `dedupeInflight` uses, so a settle handler from a
 * superseded version cannot clear the current entry) and the next `get()`
 * retries.
 *
 * The version counter alone is not enough to scope the cache when the
 * counter is process-global and never rewound, so `invalidate()` exists for
 * the lifecycle events that change what the version MEANS (in this repo:
 * a vault open or close).
 *
 * `versionOf` is a callback rather than a store read so this module stays
 * side-effect free per the `utils/` layer rule.
 */
export function versionGated<T>(fn: () => Promise<T>, versionOf: () => number): VersionGated<T> {
	let cached: Promise<T> | null = null;
	let cachedVersion = -1;

	const invalidate = () => {
		cached = null;
		cachedVersion = -1;
	};

	return {
		get() {
			const version = versionOf();
			if (cached !== null && cachedVersion === version) return cached;
			const promise = fn();
			cached = promise;
			cachedVersion = version;
			promise.catch(() => {
				// Identity guard: a rejection from a superseded version must
				// not evict the entry a newer `get()` already installed.
				if (cached === promise) invalidate();
			});
			return promise;
		},
		invalidate,
	};
}

/**
 * Returns true when the IPC result fetched for `fetchedPath` is still
 * relevant to `currentPath` (the active tab): either no tab is active
 * (e.g. headless tests) or the active tab still matches.
 *
 * Used by the panel-fetch services as a stale-result guard: when the user
 * switches tabs while a fetch is in flight, the in-flight call's result is
 * discarded instead of briefly overwriting the new tab's panel data, the
 * "pisca o backlink" race observed during the 2026-04-29 dogfood after the
 * wikilink cmd-click flow.
 *
 * The active path is a parameter, not a store read, so this module stays
 * side-effect free per the `utils/` layer rule.
 */
export function isStillCurrentPath(fetchedPath: string, currentPath: string | null): boolean {
	return currentPath == null || currentPath === fetchedPath;
}
