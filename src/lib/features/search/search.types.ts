export interface SearchQuery {
	text: string;
	tags: string[];
	paths: string[];
}

export interface SearchMatch {
	position: number;
	lineNumber: number;
}

export interface SearchContextSnippet {
	text: string;
	matchStart: number;
	matchEnd: number;
}

export interface SearchResult {
	filePath: string;
	fileName: string;
	matches: SearchMatch[];
	snippets: SearchContextSnippet[];
}

/** Search mode selection */
export type SearchMode = 'text' | 'semantic' | 'hybrid';

/** Result from FTS5 BM25 Rust backend */
export interface FtsSearchResult {
	path: string;
	title: string;
	score: number;
	snippet: string;
	tags: string;
}

/** Result from semantic (embedding-based) search */
export interface SemanticSearchResult {
	key: string;
	sourcePath: string;
	content: string;
	heading: string | null;
	lineStart: number;
	lineEnd: number;
	score: number;
}

/** Combined result for hybrid mode */
export interface HybridSearchResult {
	path: string;
	title: string;
	combinedScore: number;
	textScore?: number;
	semanticScore?: number;
	snippet: string;
	heading?: string;
	lineStart?: number;
	source: 'text' | 'semantic' | 'both';
}

/** FTS5 index statistics, reported by one reconcile pass at vault open. */
export interface SearchIndexStats {
	/** Rows in `notes_content` after the pass. */
	totalDocuments: number;
	/** Files on disk that had no row and were indexed. */
	added?: number;
	/** Rows whose file differed on disk and got re-indexed. */
	updated?: number;
	/** Rows whose file no longer exists and were dropped. */
	removed?: number;
	/** Rows left alone - their files were never opened. */
	unchanged?: number;
}

/** Semantic index statistics */
export interface SemanticStats {
	totalChunks: number;
	totalSources: number;
	modelLoaded: boolean;
}

/** Progress event from Rust semantic indexing */
export interface SemanticProgress {
	phase: 'downloading' | 'downloading-reranker' | 'chunking' | 'embedding';
	current: number;
	total: number;
	message: string;
}
