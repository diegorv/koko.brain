export interface WikiLink {
	target: string;
	alias: string | null;
	heading: string | null;
	position: number;
}

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
