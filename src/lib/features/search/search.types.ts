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
	source: 'text' | 'semantic' | 'both';
}
