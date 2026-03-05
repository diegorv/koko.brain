import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';

export interface MarkdownLinkRange {
	openBracketFrom: number;
	openBracketTo: number;
	textFrom: number;
	textTo: number;
	closeBracketUrlFrom: number;
	closeBracketUrlTo: number;
}

/**
 * Finds all markdown link `[text](url)` ranges using the Lezer syntax tree.
 * Uses Link nodes with LinkMark children for bracket positions.
 */
export function findMarkdownLinkRanges(state: EditorState, from: number, to: number): MarkdownLinkRange[] {
	const ranges: MarkdownLinkRange[] = [];

	syntaxTree(state).iterate({
		from,
		to,
		enter: (node) => {
			if (node.name === 'Link') {
				const marks: { from: number; to: number }[] = [];
				let child = node.node.firstChild;
				while (child) {
					if (child.name === 'LinkMark') {
						marks.push({ from: child.from, to: child.to });
					}
					child = child.nextSibling;
				}

				// LinkMarks: [0]="[", [1]="]", [2]="(", [3]=")"
				if (marks.length >= 4) {
					ranges.push({
						openBracketFrom: marks[0].from,
						openBracketTo: marks[0].to,
						textFrom: marks[0].to,
						textTo: marks[1].from,
						closeBracketUrlFrom: marks[1].from,
						closeBracketUrlTo: marks[marks.length - 1].to,
					});
				}
				return false;
			}
		},
	});

	return ranges;
}

/** Range positions for an `<url>` or `<email>` autolink */
export interface AutolinkRange {
	/** Start of the `<` */
	from: number;
	/** End of the `>` */
	to: number;
	/** The URL or email between the angle brackets */
	url: string;
}

/**
 * Finds all autolink `<url>` / `<email>` ranges using the Lezer syntax tree.
 * Uses `Autolink` nodes from the CommonMark grammar.
 */
export function findAutolinkRanges(state: EditorState, from: number, to: number): AutolinkRange[] {
	const ranges: AutolinkRange[] = [];

	syntaxTree(state).iterate({
		from,
		to,
		enter: (node) => {
			if (node.name !== 'Autolink') return;

			// Autolink content is between < and >
			const text = state.doc.sliceString(node.from, node.to);
			const url = text.slice(1, -1); // strip < and >

			ranges.push({
				from: node.from,
				to: node.to,
				url,
			});
		},
	});

	return ranges;
}

/** Range positions for a bare URL (extended autolink) */
export interface ExtendedAutolinkRange {
	/** Start of the URL */
	from: number;
	/** End of the URL */
	to: number;
	/** The URL text */
	url: string;
}

/**
 * Matches bare URLs: `https://...` or `http://...`
 * Handles balanced parentheses (e.g., Wikipedia URLs).
 * Strips trailing punctuation (`.`, `,`, `:`, `;`, `!`, `?`, `"`, `'`, `)` when unbalanced).
 */
const EXTENDED_AUTOLINK_RE = /(?<=\s|^)(https?:\/\/[^\s<>\[\]]+)/g;

/**
 * Finds all bare URL ranges on a single line (extended autolinks).
 * Does NOT match URLs already inside `[text](url)` or `<url>` syntax.
 */
export function findExtendedAutolinkRanges(text: string, offset: number): ExtendedAutolinkRange[] {
	const ranges: ExtendedAutolinkRange[] = [];
	EXTENDED_AUTOLINK_RE.lastIndex = 0;

	let match: RegExpExecArray | null;
	while ((match = EXTENDED_AUTOLINK_RE.exec(text)) !== null) {
		let url = match[1];
		const from = offset + match.index;

		// Strip trailing punctuation that's not part of the URL
		url = trimTrailingPunctuation(url);

		if (url.length > 0) {
			ranges.push({
				from,
				to: from + url.length,
				url,
			});
		}
	}

	return ranges;
}

/** Strips trailing punctuation from a URL, handling balanced parentheses */
function trimTrailingPunctuation(url: string): string {
	// Strip trailing punctuation that's unlikely to be part of a URL
	const trailingPunctuationRe = /[.,;:!?'"]+$/;
	url = url.replace(trailingPunctuationRe, '');

	// Handle unbalanced trailing parentheses
	let open = 0;
	for (const ch of url) {
		if (ch === '(') open++;
		else if (ch === ')') open--;
	}
	// If more closing than opening, strip trailing )'s
	while (open < 0 && url.endsWith(')')) {
		url = url.slice(0, -1);
		open++;
	}

	return url;
}

/**
 * Finds the URL of a markdown link at a given document position using the Lezer tree.
 * Returns the URL string if the position is within a link's text, or null otherwise.
 */
export function findMarkdownLinkUrlAtPosition(
	state: EditorState,
	from: number,
	to: number,
	docPos: number,
): string | null {
	let result: string | null = null;

	syntaxTree(state).iterate({
		from,
		to,
		enter: (node) => {
			if (node.name === 'Link') {
				const marks: { from: number; to: number }[] = [];
				const urlNode = node.node.getChild('URL');
				let child = node.node.firstChild;
				while (child) {
					if (child.name === 'LinkMark') {
						marks.push({ from: child.from, to: child.to });
					}
					child = child.nextSibling;
				}

				// Check if docPos is within the link text (between [ and ])
				if (marks.length >= 2 && urlNode) {
					const textStart = marks[0].to;
					const textEnd = marks[1].from;
					if (docPos >= textStart && docPos <= textEnd) {
						result = state.doc.sliceString(urlNode.from, urlNode.to);
					}
				}
				return false;
			}
		},
	});

	return result;
}
