import type {
	SearchResult,
	SearchMode,
	FtsSearchResult,
	SemanticSearchResult,
	HybridSearchResult,
	SearchIndexStats,
	SemanticStats,
	SemanticProgress,
} from './search.types';

let query = $state('');
let results = $state<SearchResult[]>([]);
let isSearching = $state(false);
let isOpen = $state(false);

/** Advanced search state */
let mode = $state<SearchMode>('text');
let fuzzyEnabled = $state(true);
let ftsResults = $state<FtsSearchResult[]>([]);
let semanticResults = $state<SemanticSearchResult[]>([]);
let hybridResults = $state<HybridSearchResult[]>([]);
let indexStats = $state<SearchIndexStats | null>(null);
let isIndexing = $state(false);
let semanticStats = $state<SemanticStats | null>(null);
let isSemanticIndexing = $state(false);
let semanticProgress = $state<SemanticProgress | null>(null);
let modelAvailable = $state(false);

export const searchStore = {
	get query() { return query; },
	get results() { return results; },
	get isSearching() { return isSearching; },
	get isOpen() { return isOpen; },
	get mode() { return mode; },
	get fuzzyEnabled() { return fuzzyEnabled; },
	get ftsResults() { return ftsResults; },
	get semanticResults() { return semanticResults; },
	get hybridResults() { return hybridResults; },
	get indexStats() { return indexStats; },
	get isIndexing() { return isIndexing; },
	get semanticStats() { return semanticStats; },
	get isSemanticIndexing() { return isSemanticIndexing; },
	get semanticProgress() { return semanticProgress; },
	get modelAvailable() { return modelAvailable; },

	setQuery(q: string) { query = q; },
	setResults(r: SearchResult[]) { results = r; },
	setSearching(s: boolean) { isSearching = s; },
	setOpen(open: boolean) { isOpen = open; },
	setMode(m: SearchMode) { mode = m; },
	setFuzzyEnabled(enabled: boolean) { fuzzyEnabled = enabled; },
	setFtsResults(r: FtsSearchResult[]) { ftsResults = r; },
	setSemanticResults(r: SemanticSearchResult[]) { semanticResults = r; },
	setHybridResults(r: HybridSearchResult[]) { hybridResults = r; },
	setIndexStats(s: SearchIndexStats | null) { indexStats = s; },
	setIsIndexing(v: boolean) { isIndexing = v; },
	setSemanticStats(s: SemanticStats | null) { semanticStats = s; },
	setIsSemanticIndexing(v: boolean) { isSemanticIndexing = v; },
	setSemanticProgress(p: SemanticProgress | null) { semanticProgress = p; },
	setModelAvailable(v: boolean) { modelAvailable = v; },

	toggle() {
		isOpen = !isOpen;
	},

	reset() {
		query = '';
		results = [];
		isSearching = false;
		isOpen = false;
		mode = 'text';
		fuzzyEnabled = true;
		ftsResults = [];
		semanticResults = [];
		hybridResults = [];
		indexStats = null;
		isIndexing = false;
		semanticStats = null;
		isSemanticIndexing = false;
		semanticProgress = null;
		modelAvailable = false;
	},
};
