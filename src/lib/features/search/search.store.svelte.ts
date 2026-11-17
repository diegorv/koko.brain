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
/** Message of the last failed search, or null; the panel shows an error state with Retry while set */
let searchError = $state<string | null>(null);
/**
 * Per mode: true when the search that wrote that mode's list got back as many
 * rows as its cap asked for, so more matches may exist. Kept per mode because a
 * mode switch shows the target mode's older list until the new search lands.
 */
let resultsCapped = $state<Record<SearchMode, boolean>>({ text: false, semantic: false, hybrid: false });
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
	/** Message of the last failed search, or null when the last search did not fail */
	get searchError() { return searchError; },
	/** True when the current mode's list reached a result cap; the panel then reads "N+ results" */
	get resultsCapped() { return resultsCapped[mode]; },
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
	/** Records a failed search (a message) or clears it (null) */
	setSearchError(e: string | null) { searchError = e; },
	/** Records whether the search that wrote `forMode`'s list reached a result cap */
	setResultsCapped(forMode: SearchMode, capped: boolean) { resultsCapped[forMode] = capped; },
	/** Clears the cap flag of every mode, for a search that empties every list */
	clearResultsCapped() { resultsCapped = { text: false, semantic: false, hybrid: false }; },
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
		searchError = null;
		resultsCapped = { text: false, semantic: false, hybrid: false };
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
