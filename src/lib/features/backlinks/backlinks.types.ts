export type { WikiLink } from '#lib/contracts/index.js';

export interface ContextSnippet {
	text: string;
	linkStart: number;
	linkEnd: number;
}

export interface BacklinkEntry {
	sourcePath: string;
	sourceName: string;
	snippets: ContextSnippet[];
}
