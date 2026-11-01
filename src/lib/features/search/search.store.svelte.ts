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
/** Counts requests to focus the search input; the input refocuses on every change */
let focusRequest = $state(0);
/** The last `focusRequest` the input took focus for; the rail panel skips focus on a mount with nothing newer */
let handledFocusRequest = $state(0);

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
	/** Bumped by `requestFocus`; the search input focuses itself when it changes */
	get focusRequest() { return focusRequest; },
	/** The last `focusRequest` the search input handled; equal to `focusRequest` when none is pending */
	get handledFocusRequest() { return handledFocusRequest; },
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
	/** Asks the mounted search input to take focus, even when Search is already shown */
	requestFocus() { focusRequest++; },
	/** Records that the input took focus for every request so far */
	markFocusHandled() { handledFocusRequest = focusRequest; },
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

	reset() {
		query = '';
		results = [];
		isSearching = false;
		focusRequest = 0;
		handledFocusRequest = 0;
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
