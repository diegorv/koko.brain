/** Types of inline markdown segments */
export type InlineSegmentType = 'text' | 'bold' | 'italic' | 'strikethrough' | 'code' | 'link' | 'break';

/** A segment of parsed inline markdown */
export interface InlineSegment {
	/** What the segment renders as. */
	type: InlineSegmentType;
	/** Displayed text, with escapes already resolved. Empty for a `break`. */
	content: string;
	/**
	 * Target URL of a `link` segment, with surrounding `<...>` removed and backslash
	 * escapes resolved (so `\|`, which a table cell needs, becomes `|`). Absent for
	 * every other type.
	 */
	href?: string;
}

/** A backslash followed by one ASCII punctuation character (CommonMark backslash escape). */
const ESCAPE_RE = /\\([!-/:-@[-`{-~])/g;

/**
 * Matches inline markdown patterns in priority order:
 * - `code` (backticks: highest priority, so nothing else parses inside a code span)
 * - `\` + ASCII punctuation (backslash escape: the character loses its markup meaning)
 * - `<br>`, `<br/>`, `<br />` in any letter case (line break)
 * - [text](url) (markdown link: text has no `]`, url has no whitespace and at most
 *   one level of balanced parentheses; a `\x` pair in the url, such as `\)`, never ends it,
 *   and a backslash in the url is only ever read as the start of such a pair, which keeps
 *   the alternatives disjoint so a failed match cannot backtrack exponentially)
 * - **bold** (double asterisks)
 * - *italic* (single asterisks)
 * - ~~strikethrough~~ (double tildes)
 *
 * Emphasis bodies step over `\x` pairs, so an escaped delimiter never closes them.
 * Segments do not nest: link text and emphasis content are plain text.
 */
const INLINE_RE =
	/`([^`]+)`|\\([!-/:-@[-`{-~])|(<[bB][rR] ?\/?>)|\[([^\]]+)\]\(((?:\\\S|[^\s()\\]|\([^\s()]*\))+)\)|\*\*((?:\\.|[^\\])+?)\*\*|\*((?:\\.|[^\\])+?)\*|~~((?:\\.|[^\\])+?)~~/g;

/** Resolves backslash escapes in `text`; a backslash before anything else stays. */
function unescape(text: string): string {
	return text.replace(ESCAPE_RE, '$1');
}

/**
 * Parses inline markdown text into a list of typed segments.
 * Supports bold, italic, strikethrough, inline code, markdown links, `<br>` line
 * breaks and backslash escapes. Inside a code span only `\|` becomes `|` (the GFM
 * table rule). Adjacent text segments are merged. Bare URLs, `<url>` autolinks and
 * any other HTML stay text. Returns an empty array for empty input.
 */
export function renderInlineMarkdown(text: string): InlineSegment[] {
	if (!text) return [];

	const segments: InlineSegment[] = [];
	let lastIndex = 0;

	const pushText = (content: string) => {
		const last = segments[segments.length - 1];
		if (last?.type === 'text') last.content += content;
		else segments.push({ type: 'text', content });
	};

	INLINE_RE.lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = INLINE_RE.exec(text)) !== null) {
		// Add plain text before this match
		if (match.index > lastIndex) {
			pushText(text.slice(lastIndex, match.index));
		}

		if (match[1] !== undefined) {
			segments.push({ type: 'code', content: match[1].replaceAll('\\|', '|') });
		} else if (match[2] !== undefined) {
			pushText(match[2]);
		} else if (match[3] !== undefined) {
			segments.push({ type: 'break', content: '' });
		} else if (match[4] !== undefined) {
			const url = match[5];
			const bare = url.length > 1 && url.startsWith('<') && url.endsWith('>') ? url.slice(1, -1) : url;
			segments.push({ type: 'link', content: unescape(match[4]), href: unescape(bare) });
		} else if (match[6] !== undefined) {
			segments.push({ type: 'bold', content: unescape(match[6]) });
		} else if (match[7] !== undefined) {
			segments.push({ type: 'italic', content: unescape(match[7]) });
		} else if (match[8] !== undefined) {
			segments.push({ type: 'strikethrough', content: unescape(match[8]) });
		}

		lastIndex = match.index + match[0].length;
	}

	// Add remaining plain text
	if (lastIndex < text.length) {
		pushText(text.slice(lastIndex));
	}

	return segments;
}
