import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { searchStore } from './search.store.svelte';
import { noteIndexStore } from '$lib/features/backlinks/note-index.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { addAfterSaveObserver } from '$lib/core/editor/editor.hooks';
import { mergeResults } from './search-hybrid.logic';
import { parseSearchQuery, performSearchOverFiles, matchesTagFilter, matchesPathFilter } from './search.logic';
import { debug, error } from '$lib/utils/debug';
import type {
	FtsSearchResult,
	SemanticSearchResult,
	SearchIndexStats,
	SemanticStats,
	SemanticProgress,
} from './search.types';

/** Active listener for semantic progress events */
let progressUnlisten: UnlistenFn | null = null;

/** Version counter to discard results from stale search calls */
let searchVersion = 0;

/** Starts listening for semantic-index-progress events from Rust. */
export async function startSemanticProgressListener(): Promise<void> {
	if (progressUnlisten) return; // Already listening
	debug('SEARCH', 'Starting semantic progress listener');
	progressUnlisten = await listen<SemanticProgress>('semantic-index-progress', (event) => {
		debug('SEARCH', 'Semantic progress:', event.payload.phase, event.payload.message);
		searchStore.setSemanticProgress(event.payload);
	});
}

/** Stops listening for semantic progress events. */
export function stopSemanticProgressListener(): void {
	debug('SEARCH', 'Stopping semantic progress listener');
	if (progressUnlisten) {
		progressUnlisten();
		progressUnlisten = null;
	}
	searchStore.setSemanticProgress(null);
}

/**
 * Performs search based on current mode (text/semantic/hybrid).
 * In text mode, uses FTS5 backend for BM25-ranked results with optional fuzzy matching.
 * Falls back to in-memory search if FTS5 index is not available.
 */
export async function performSearch(): Promise<void> {
	const version = ++searchVersion;
	const raw = searchStore.query;
	if (!raw.trim()) {
		searchStore.setFtsResults([]);
		searchStore.setSemanticResults([]);
		searchStore.setHybridResults([]);
		searchStore.setResults([]);
		return;
	}

	searchStore.setSearching(true);
	debug('SEARCH', `performSearch() mode=${searchStore.mode} query="${raw}" fuzzy=${searchStore.fuzzyEnabled}`);
	try {
		const mode = searchStore.mode;

		if (mode === 'text' || mode === 'hybrid') {
			try {
				debug('SEARCH', 'Calling search_fts...');
				const query = parseSearchQuery(raw);
				const hasOperators = query.tags.length > 0 || query.paths.length > 0;
				const ftsQuery = hasOperators ? query.text : raw;

				if (hasOperators && !ftsQuery.trim()) {
					// Operator-only query (e.g., "tag:javascript") — use in-memory search
					if (searchVersion !== version) return;
					const noteContents = noteIndexStore.noteContents;
					const vaultPath = vaultStore.path ?? '';
					const results = performSearchOverFiles(noteContents, query, vaultPath);
					debug('SEARCH', `Operator-only query: ${results.length} results`);
					searchStore.setResults(results);
					searchStore.setFtsResults([]);
				} else {
					const results = await invoke<FtsSearchResult[]>('search_fts', {
						query: ftsQuery,
						maxResults: 50,
						fuzzy: searchStore.fuzzyEnabled,
					});
					if (searchVersion !== version) return;

					if (hasOperators) {
						// Filter FTS results by tag/path operators
						const noteContents = noteIndexStore.noteContents;
						const vaultPath = vaultStore.path ?? '';
						const filtered = results.filter((r) => {
							const fullPath = `${vaultPath}/${r.path}`;
							if (query.tags.length > 0) {
								const content = noteContents.get(fullPath) ?? '';
								if (!query.tags.every((tag) => matchesTagFilter(content, tag))) return false;
							}
							if (query.paths.length > 0) {
								if (!query.paths.some((p) => matchesPathFilter(r.path, p))) return false;
							}
							return true;
						});
						debug('SEARCH', `FTS returned ${results.length}, filtered to ${filtered.length} with operators`);
						searchStore.setFtsResults(filtered);
					} else {
						debug('SEARCH', `FTS returned ${results.length} results`, results.slice(0, 3));
						searchStore.setFtsResults(results);
					}
				}
			} catch (ftsErr) {
				if (searchVersion !== version) return;
				debug('SEARCH', 'FTS failed, falling back to in-memory search:', ftsErr);
				const query = parseSearchQuery(raw);
				const noteContents = noteIndexStore.noteContents;
				const vaultPath = vaultStore.path ?? '';
				const results = performSearchOverFiles(noteContents, query, vaultPath);
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
				const results = await invoke<SemanticSearchResult[]>('search_semantic', {
					query: semanticQuery,
					maxResults: 20,
					minScore: 0.3,
				});
				if (searchVersion !== version) return;
				debug('SEARCH', `Semantic returned ${results.length} results`, results.slice(0, 3));
				searchStore.setSemanticResults(results);
			} catch (semErr) {
				if (searchVersion !== version) return;
				debug('SEARCH', 'Semantic search failed:', semErr);
				searchStore.setSemanticResults([]);
			}
		}

		if (mode === 'hybrid') {
			const merged = mergeResults(searchStore.ftsResults, searchStore.semanticResults);
			debug('SEARCH', `Hybrid merge: ${searchStore.ftsResults.length} FTS + ${searchStore.semanticResults.length} semantic → ${merged.length} merged`);
			searchStore.setHybridResults(merged);
		}
	} catch (err) {
		error('SEARCH', 'Search failed:', err);
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
	try {
		const stats = await invoke<SearchIndexStats>('build_search_index', { vaultPath });
		debug('SEARCH', 'FTS index built:', stats);
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
		const relativePath = filePath.startsWith(vaultPath)
			? filePath.substring(vaultPath.length).replace(/^\//, '')
			: filePath;

		debug('SEARCH', 'Incremental index update for:', relativePath);

		// Update FTS5 index
		invoke('update_search_index_file', { filePath: relativePath, content }).catch((err) => {
			debug('SEARCH', 'FTS5 incremental update failed:', err);
			error('SEARCH', 'FTS5 index update failed:', err);
		});

		// Update semantic index (if embedder is loaded)
		invoke('update_semantic_file', { filePath: relativePath, content, vaultPath }).catch((err) => {
			debug('SEARCH', 'Semantic incremental update skipped:', err);
		});
	});
}

/** Initializes semantic search — loads model if available. */
export async function initSemanticSearch(): Promise<void> {
	const vaultPath = vaultStore.path;
	if (!vaultPath) return;

	debug('SEARCH', 'initSemanticSearch() starting for', vaultPath);
	try {
		const available = await invoke<boolean>('is_semantic_model_available', { vaultPath });
		debug('SEARCH', 'Model available:', available);
		searchStore.setModelAvailable(available);

		if (available) {
			debug('SEARCH', 'Loading ONNX model + tokenizer...');
			const loaded = await invoke<boolean>('init_semantic_search', { vaultPath });
			debug('SEARCH', 'Model loaded:', loaded);
			if (loaded) {
				const stats = await invoke<SemanticStats>('get_semantic_stats');
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

/** Builds the semantic index — chunks and embeds all files. */
export async function buildSemanticIndex(): Promise<void> {
	if (activeBuildPromise) {
		debug('SEARCH', 'buildSemanticIndex() already running — reusing existing promise');
		return activeBuildPromise;
	}

	const vaultPath = vaultStore.path;
	if (!vaultPath) return;

	debug('SEARCH', 'buildSemanticIndex() starting — chunking + embedding all files...');
	searchStore.setIsSemanticIndexing(true);

	activeBuildPromise = (async () => {
		try {
			const stats = await invoke<SemanticStats>('build_semantic_index', { vaultPath });
			debug('SEARCH', 'Semantic index built:', stats);
			searchStore.setSemanticStats(stats);
		} catch (err) {
			debug('SEARCH', 'Semantic index build failed:', err);
			error('SEARCH', 'Semantic index build failed:', err);
		} finally {
			searchStore.setIsSemanticIndexing(false);
			searchStore.setSemanticProgress(null);
			activeBuildPromise = null;
		}
	})();

	return activeBuildPromise;
}

/** Resets search state. Called during vault teardown. */
export function resetSearch() {
	debug('SEARCH', 'resetSearch() — clearing all search state');
	searchStore.reset();
}
