import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';

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
