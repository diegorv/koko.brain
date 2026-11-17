export type {
	FtsSearchResult,
	SemanticResult as SemanticSearchResult,
	IndexStats as SearchIndexStats,
	SemanticStats,
	SemanticProgress,
} from '#lib/contracts/index.js';

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
	/**
	 * Which search found the note. Set only by the legacy FTS + semantic merge,
	 * where it varies per card; the single `search_hybrid` command leaves it out.
	 */
	source?: 'text' | 'semantic' | 'both';
}
