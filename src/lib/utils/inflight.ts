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
