import type { UnlistenFn } from '@tauri-apps/api/event';
import { EVENT_NAMES } from '#lib/contracts/events.js';
import { call, on } from '#lib/contracts/ipc.js';
import { searchStore } from './search.store.svelte';
import { isViewFile } from '#lib/core/filesystem/fs.logic.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { addAfterSaveObserver } from '#lib/core/editor/editor.hooks.js';
import { mergeResults } from './search-hybrid.logic';
import {
	parseSearchQuery,
	performSearchOverFiles,
	performOperatorOnlySearch,
	matchesPathFilter,
	matchesIndexTag,
	FTS_MAX_RESULTS,
	FTS_OPERATOR_CANDIDATE_LIMIT,
	SEMANTIC_MAX_RESULTS,
	HYBRID_MAX_RESULTS,
	OPERATOR_ONLY_MAX_RESULTS,
	FALLBACK_MAX_RESULTS,
} from './search.logic';
import { stem, vaultRelativeKey } from '#lib/utils/path.js';
import { debug, error, timeAsync } from '#lib/utils/debug.js';
import type { SemanticProgress } from './search.types';

/**
 * Loads a fresh `Map<absolutePath, content>` by snapshotting the Rust
 * `VaultIndex` for paths and using `read_files_batch` for content.
 *
 * Used only by the `FTS failed` fallback in `performSearch`. It reads
 * every note through a sync Tauri command, which blocks the app main
 * thread for the whole read on a large vault, so keep it off common
 * paths: an operator-only query (a Tags-tab click) reads `entry.tags`
 * instead.
 */
async function loadVaultContentMap(vaultPath: string): Promise<Map<string, string>> {
	const entries = await call('get_all_vault_entries_v2');
	const paths = entries.map((e) => e.path).filter((path) => !isViewFile(path));
	const results = await call('read_files_batch', {
		vaultPath,
		paths,
	});
	const map = new Map<string, string>();
	for (const r of results) {
		if (r.content !== null) map.set(r.path, r.content);
	}
	return map;
}

/**
 * Builds a `Map<absolutePath, tags>` for the FTS-with-operators tag
 * filter. Tags come from `entry.tags` (Rust pre-parsed, the set a tag
 * click filters), never from the FTS row's looser `tags` column; no
 * content read needed. Phase 11.5h.
 */
async function loadVaultTagMap(): Promise<Map<string, string[]>> {
	const entries = await call('get_all_vault_entries_v2');
	const map = new Map<string, string[]>();
	for (const e of entries) {
		map.set(e.path, e.tags);
	}
	return map;
}

/** Active listener for semantic progress events */
let progressUnlisten: UnlistenFn | null = null;

/** Throttle window (ms) for propagating progress updates to the store. Rust emits
 *  one event per 4-chunk batch (~16/s during indexing); flooding the store would
 *  cause SearchStatus / SearchPanel / SearchSection to re-render on every batch. */
const PROGRESS_THROTTLE_MS = 500;

/** Trailing-edge throttle state for the progress listener */
let progressThrottleTimer: ReturnType<typeof setTimeout> | null = null;
let pendingProgress: SemanticProgress | null = null;
let lastPropagatedProgress: SemanticProgress | null = null;

/** Propagates the latest pending payload to the store and resets throttle state. */
function flushSemanticProgress(): void {
	if (progressThrottleTimer) {
		clearTimeout(progressThrottleTimer);
		progressThrottleTimer = null;
	}
	if (pendingProgress) {
		searchStore.setSemanticProgress(pendingProgress);
		lastPropagatedProgress = pendingProgress;
		pendingProgress = null;
	}
}

/** Version counter to discard results from stale search calls */
let searchVersion = 0;

/** Starts listening for semantic-index-progress events from Rust. */
export async function startSemanticProgressListener(): Promise<void> {
	if (progressUnlisten) return; // Already listening
	debug('SEARCH', 'Starting semantic progress listener');
	progressUnlisten = await on(EVENT_NAMES.SEMANTIC_INDEX_PROGRESS, (payload) => {
		pendingProgress = payload;

		// Phase transitions (e.g. "downloading" → "embedding" → "complete") must
		// reach the UI immediately so state changes are visible without the
		// throttle delay. Within a phase, coalesce updates. We log only the
		// transition — per-batch logs would mirror the Rust-side `EMBEDDER`
		// log and cost a Tauri plugin-fs IPC write each time.
		const phaseChanged = !lastPropagatedProgress || lastPropagatedProgress.phase !== payload.phase;
		if (phaseChanged) {
			debug('SEARCH', 'Semantic progress phase:', payload.phase, payload.message);
			flushSemanticProgress();
			return;
		}

		if (!progressThrottleTimer) {
			progressThrottleTimer = setTimeout(flushSemanticProgress, PROGRESS_THROTTLE_MS);
		}
	});
}

/** Stops listening for semantic progress events. */
export function stopSemanticProgressListener(): void {
	debug('SEARCH', 'Stopping semantic progress listener');
	if (progressUnlisten) {
		progressUnlisten();
		progressUnlisten = null;
	}
	if (progressThrottleTimer) {
		clearTimeout(progressThrottleTimer);
		progressThrottleTimer = null;
	}
	pendingProgress = null;
	lastPropagatedProgress = null;
	searchStore.setSemanticProgress(null);
}

/**
 * Performs search based on current mode (text/semantic/hybrid).
 * In text mode, uses FTS5 backend for BM25-ranked results with optional fuzzy matching.
 * Falls back to in-memory search if FTS5 index is not available.
 * Sets `searchStore.searchError` when a Semantic-mode search or the search
 * as a whole fails (the fallbacks above are not failures), and clears it on
 * every call.
 */
export async function performSearch(): Promise<void> {
	const version = ++searchVersion;
	const raw = searchStore.query;
	searchStore.setSearchError(null);
	if (!raw.trim()) {
		searchStore.setFtsResults([]);
		searchStore.setSemanticResults([]);
		searchStore.setHybridResults([]);
		searchStore.setResults([]);
		searchStore.clearResultsCapped();
		// The older in-flight call's `finally` no longer owns the version, so
		// it would leave "Searching..." over the empty box.
		searchStore.setSearching(false);
		return;
	}

	searchStore.setSearching(true);
	debug('SEARCH', `performSearch() mode=${searchStore.mode} query="${raw}" fuzzy=${searchStore.fuzzyEnabled}`);
	try {
		const mode = searchStore.mode;
		// Whether the request behind each list reached the cap it asked for;
		// written with the results, per list, since a mode switch shows a list
		// another mode's search wrote.
		let textCapped = false;
		let semanticCapped = false;

		// Hybrid is now a single Rust command: FTS + semantic → RRF → rerank.
		// Bypass the per-source JS merge entirely.
		if (mode === 'hybrid') {
			try {
				const parsed = parseSearchQuery(raw);
				const semanticQuery = parsed.text.trim() || raw;
				debug('SEARCH', 'Calling search_hybrid...');
				const results = await call('search_hybrid', {
					query: semanticQuery,
					maxResults: HYBRID_MAX_RESULTS,
				});
				if (searchVersion !== version) return;
				debug('SEARCH', `Hybrid returned ${results.length} results`, results.slice(0, 3));
				// Surface as semantic results for the chunk-shaped UI panes. Map
				// onto the legacy HybridSearchResult shape for any consumer that
				// still expects it (the chunk has no path/title/snippet split;
				// derive them from sourcePath + content head). No `source`: every
				// card would carry the same one.
				searchStore.setSemanticResults(results);
				const adapted = results.map((r) => ({
					path: r.sourcePath,
					title: stem(r.sourcePath),
					combinedScore: r.score,
					semanticScore: r.score,
					snippet: r.content.slice(0, 200),
					heading: r.heading ?? undefined,
					lineStart: r.lineStart,
				}));
				searchStore.setHybridResults(adapted);
				// Text mode shows these lists, empty now: an older Text search's
				// rows or "+" would read as this query's.
				searchStore.setFtsResults([]);
				searchStore.setResults([]);
				searchStore.setResultsCapped('text', false);
				const hybridCapped = results.length >= HYBRID_MAX_RESULTS;
				searchStore.setResultsCapped('hybrid', hybridCapped);
				// The semantic list now holds these chunks too
				searchStore.setResultsCapped('semantic', hybridCapped);
				return;
			} catch (hybErr) {
				if (searchVersion !== version) return;
				debug('SEARCH', 'Hybrid search failed, falling back to legacy FTS+semantic merge:', hybErr);
				// Fall through to the legacy path below.
			}
		}

		if (mode === 'text' || mode === 'hybrid') {
			try {
				debug('SEARCH', 'Calling search_fts...');
				const query = parseSearchQuery(raw);
				const hasOperators = query.tags.length > 0 || query.paths.length > 0;
				const ftsQuery = hasOperators ? query.text : raw;
				const vaultPath = vaultStore.path ?? '';

				if (hasOperators && !ftsQuery.trim()) {
					// Operator-only query (e.g., "tag:javascript", sent by a Tags-tab
					// click): filter the index entries, no content read.
					const entries = await call('get_all_vault_entries_v2');
					if (searchVersion !== version) return;
					const results = performOperatorOnlySearch(entries, query, vaultPath, OPERATOR_ONLY_MAX_RESULTS);
					textCapped = results.length >= OPERATOR_ONLY_MAX_RESULTS;
					debug('SEARCH', `Operator-only query: ${results.length} results`);
					searchStore.setResults(results);
					searchStore.setFtsResults([]);
				} else {
					// Rust applies its LIMIT before the operators below filter the
					// rows, so with operators ask for every candidate and cap after.
					const fetchFts = (maxResults: number) =>
						call('search_fts', { query: ftsQuery, maxResults, fuzzy: searchStore.fuzzyEnabled });
					const results = hasOperators
						? await timeAsync('SEARCH', 'search_fts operator candidates', () => fetchFts(FTS_OPERATOR_CANDIDATE_LIMIT))
						: await fetchFts(FTS_MAX_RESULTS);
					if (searchVersion !== version) return;

					if (hasOperators) {
						// Tags come from Rust-pre-parsed `entry.tags` (no content
						// read), matched like a tag click: `tag:a` also finds `a/b`.
						const tagMap = query.tags.length > 0 ? await loadVaultTagMap() : null;
						if (searchVersion !== version) return;
						const filtered = results.filter((r) => {
							const fullPath = `${vaultPath}/${r.path}`;
							if (query.tags.length > 0 && tagMap) {
								const tags = tagMap.get(fullPath) ?? [];
								if (!query.tags.every((tag) => matchesIndexTag(tags, tag))) return false;
							}
							if (query.paths.length > 0) {
								if (!query.paths.some((p) => matchesPathFilter(r.path, p))) return false;
							}
							return true;
						});
						textCapped = filtered.length > FTS_MAX_RESULTS || results.length >= FTS_OPERATOR_CANDIDATE_LIMIT;
						debug('SEARCH', `FTS returned ${results.length}, filtered to ${filtered.length} with operators`);
						searchStore.setFtsResults(filtered.slice(0, FTS_MAX_RESULTS));
					} else {
						textCapped = results.length >= FTS_MAX_RESULTS;
						debug('SEARCH', `FTS returned ${results.length} results`, results.slice(0, 3));
						searchStore.setFtsResults(results);
					}
					// An operator-only query's list; Text mode falls back to it
					// when `ftsResults` is empty.
					searchStore.setResults([]);
				}
			} catch (ftsErr) {
				if (searchVersion !== version) return;
				debug('SEARCH', 'FTS failed, falling back to in-memory search:', ftsErr);
				const query = parseSearchQuery(raw);
				const vaultPath = vaultStore.path ?? '';
				const noteContents = await loadVaultContentMap(vaultPath);
				if (searchVersion !== version) return;
				const results = performSearchOverFiles(noteContents, query, vaultPath, FALLBACK_MAX_RESULTS);
				textCapped = results.length >= FALLBACK_MAX_RESULTS;
				debug('SEARCH', `In-memory fallback returned ${results.length} results`);
				searchStore.setResults(results);
				searchStore.setFtsResults([]);
			}
		}

		if (mode === 'semantic' || mode === 'hybrid') {
			try {
				// Strip operator prefixes (tag:, path:) so semantic embedding only receives plain text
				const parsed = parseSearchQuery(raw);
				const semanticQuery = parsed.text.trim() || raw;
				debug('SEARCH', 'Calling search_semantic...');
				const results = await call('search_semantic', {
					query: semanticQuery,
					maxResults: SEMANTIC_MAX_RESULTS,
					minScore: 0.3,
				});
				if (searchVersion !== version) return;
				debug('SEARCH', `Semantic returned ${results.length} results`, results.slice(0, 3));
				searchStore.setSemanticResults(results);
				semanticCapped = results.length >= SEMANTIC_MAX_RESULTS;
			} catch (semErr) {
				if (searchVersion !== version) return;
				searchStore.setSemanticResults([]);
				// In Hybrid this is the legacy fallthrough, which still shows the
				// text results: not an error for the user.
				if (mode === 'semantic') {
					error('SEARCH', 'Semantic search failed:', semErr);
					searchStore.setSearchError(String(semErr));
				} else {
					debug('SEARCH', 'Semantic search failed:', semErr);
				}
			}
		}

		if (mode === 'hybrid') {
			const merged = mergeResults(searchStore.ftsResults, searchStore.semanticResults);
			debug('SEARCH', `Hybrid merge: ${searchStore.ftsResults.length} FTS + ${searchStore.semanticResults.length} semantic → ${merged.length} merged`);
			searchStore.setHybridResults(merged);
			// In the legacy merge, either source reaching its cap counts.
			searchStore.setResultsCapped('hybrid', textCapped || semanticCapped);
		}
		if (mode === 'text' || mode === 'hybrid') searchStore.setResultsCapped('text', textCapped);
		if (mode === 'semantic' || mode === 'hybrid') searchStore.setResultsCapped('semantic', semanticCapped);
	} catch (err) {
		error('SEARCH', 'Search failed:', err);
		if (searchVersion === version) {
			// Drop whatever a step wrote before the throw: no partial results.
			searchStore.setFtsResults([]);
			searchStore.setSemanticResults([]);
			searchStore.setHybridResults([]);
			searchStore.setResults([]);
			searchStore.clearResultsCapped();
			searchStore.setSearchError(String(err));
		}
	} finally {
		if (searchVersion === version) {
			searchStore.setSearching(false);
		}
	}
}

/** Builds the FTS5 search index. Called on vault open. */
export async function buildSearchIndex(): Promise<void> {
	const vaultPath = vaultStore.path;
	if (!vaultPath) return;
	debug('SEARCH', 'buildSearchIndex() starting for', vaultPath);
	searchStore.setIsIndexing(true);
	const t0 = performance.now();
	try {
		const stats = await call('build_search_index', { vaultPath });
		debug('SEARCH', `FTS index built in ${(performance.now() - t0).toFixed(1)}ms:`, stats);
		searchStore.setIndexStats(stats);
	} catch (err) {
		debug('SEARCH', 'FTS index build failed:', err);
		error('SEARCH', 'Index build failed:', err);
	} finally {
		searchStore.setIsIndexing(false);
	}
}

/**
 * Registers AfterSaveObserver for incremental FTS5 + semantic index updates.
 * Returns an unsubscribe function.
 */
export function registerSearchIndexHook(): () => void {
	debug('SEARCH', 'Registering after-save hook for incremental index updates');
	return addAfterSaveObserver((filePath, content) => {
		if (!filePath.endsWith('.md') && !filePath.endsWith('.markdown')) return;

		const vaultPath = vaultStore.path;
		if (!vaultPath) return;
		// Same nullable derivation `applyNoteChange` uses. A path outside the
		// vault has no valid key: writing the ABSOLUTE path here would create a
		// row that the vault-relative `remove_*` commands can never delete.
		const relativePath = vaultRelativeKey(vaultPath, filePath);
		if (relativePath === null) {
			debug('SEARCH', 'Path outside the vault prefix - skipping index update:', filePath);
			return;
		}

		debug('SEARCH', 'Incremental index update for:', relativePath);

		// Update FTS5 index
		call('update_search_index_file', { filePath: relativePath, content, vaultPath }).catch((err) => {
			debug('SEARCH', 'FTS5 incremental update failed:', err);
			error('SEARCH', 'FTS5 index update failed:', err);
		});

		// Update semantic index (if embedder is loaded)
		call('update_semantic_file', { filePath: relativePath, content, vaultPath }).catch((err) => {
			debug('SEARCH', 'Semantic incremental update skipped:', err);
		});
	});
}

/**
 * Initializes semantic search — loads model if available.
 *
 * `fetchStats: false` skips the `get_semantic_stats` read for a caller that
 * runs `buildSemanticIndex()` right after: the build returns the same stats,
 * and the extra read waits on the shared semantic DB mutex.
 */
export async function initSemanticSearch({ fetchStats = true }: { fetchStats?: boolean } = {}): Promise<void> {
	const vaultPath = vaultStore.path;
	if (!vaultPath) return;

	debug('SEARCH', 'initSemanticSearch() starting for', vaultPath);
	try {
		const available = await call('is_semantic_model_available', { vaultPath });
		debug('SEARCH', 'Model available:', available);
		searchStore.setModelAvailable(available);

		if (available) {
			debug('SEARCH', 'Loading ONNX model + tokenizer...');
			const loaded = await call('init_semantic_search', { vaultPath });
			debug('SEARCH', 'Model loaded:', loaded);
			if (loaded && fetchStats) {
				const stats = await call('get_semantic_stats');
				debug('SEARCH', 'Semantic stats:', stats);
				searchStore.setSemanticStats(stats);
			}
		}
	} catch (err) {
		debug('SEARCH', 'Semantic init failed:', err);
		error('SEARCH', 'Semantic init failed:', err);
	}
}

/** In-flight build promise — prevents concurrent invocations from the frontend. */
let activeBuildPromise: Promise<void> | null = null;
/**
 * Bumped on every vault teardown. A build started for the previous vault
 * captures the generation at launch and, on completion, discards its result
 * (and skips clearing the shared flags/promise) if the generation has moved on.
 * Without this, a build kicked off for vault A could resolve after the user
 * switched to vault B and write A's stats into B's store.
 */
let buildGeneration = 0;

/** Builds the semantic index — chunks and embeds all files. */
export async function buildSemanticIndex(): Promise<void> {
	if (activeBuildPromise) {
		debug('SEARCH', 'buildSemanticIndex() already running — reusing existing promise');
		return activeBuildPromise;
	}

	const vaultPath = vaultStore.path;
	if (!vaultPath) return;

	const generation = buildGeneration;
	debug('SEARCH', 'buildSemanticIndex() starting — chunking + embedding all files...');
	searchStore.setIsSemanticIndexing(true);

	activeBuildPromise = (async () => {
		try {
			const stats = await call('build_semantic_index', { vaultPath });
			if (generation !== buildGeneration) {
				debug('SEARCH', 'Semantic build finished for a torn-down vault — discarding stats');
				return;
			}
			debug('SEARCH', 'Semantic index built:', stats);
			searchStore.setSemanticStats(stats);
		} catch (err) {
			if (generation !== buildGeneration) return;
			debug('SEARCH', 'Semantic index build failed:', err);
			error('SEARCH', 'Semantic index build failed:', err);
		} finally {
			// Only the build that still owns the current generation may clear the
			// shared flags/promise — a stale build must not stomp the new vault's.
			if (generation === buildGeneration) {
				searchStore.setIsSemanticIndexing(false);
				searchStore.setSemanticProgress(null);
				activeBuildPromise = null;
			}
		}
	})();

	return activeBuildPromise;
}

/** Resets search state. Called during vault teardown. */
export function resetSearch() {
	debug('SEARCH', 'resetSearch() — clearing all search state');
	// Invalidate any in-flight build for the outgoing vault and release the
	// dedup slot so the next vault can start its own build.
	buildGeneration++;
	activeBuildPromise = null;
	searchStore.reset();
}
