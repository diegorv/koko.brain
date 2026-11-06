import { fuzzyMatch } from '#lib/utils/fuzzy-match.js';

/** A `#tag` being typed at the cursor. */
export interface TagMatch {
	/** Offset just past the `#`: the start of the range a suggestion replaces. */
	from: number;
	/**
	 * End of the tag characters from the cursor on, so accepting a suggestion
	 * with the cursor inside a tag (`#pro|ject`) replaces the whole name.
	 */
	to: number;
	/** What was typed after `#`, possibly empty. */
	query: string;
}

/**
 * A `#` and the partial tag name before the cursor, by the indexer's inline
 * tag rule (`INLINE_TAG_REGEX` in `utils/tag-extraction.ts`): `#` at line
 * start or after whitespace, a letter or `_` first. The name is optional so
 * the list opens right after `#`.
 */
const TAG_PREFIX_RE = /(?:^|\s)#([\p{L}_][\p{L}\d_/-]*)?$/u;

/** The tag characters right after the cursor (sticky: set `lastIndex`). */
const TAG_REST_RE = /[\p{L}\d_/-]*/uy;

/** Frontmatter, as the indexer's `FRONTMATTER_REGEX` (`utils/tag-extraction.ts`) finds it. */
const FRONTMATTER_RE = /^---\r?\n[\s\S]*?\r?\n---/;

/**
 * A fenced code block's opening line: its fence run is group 1. Any leading
 * whitespace, so a fence indented in a list item counts, as in the indexer's
 * fence strip.
 */
const CODE_FENCE_OPEN_RE = /^\s*(`{3,}|~{3,})/;

/**
 * Whether `text` (a line up to some column) ends inside an inline code span:
 * a backtick run that opened and was not closed by a run of the same length.
 */
function endsInInlineCode(text: string): boolean {
	let open = 0;
	for (const run of text.matchAll(/`+/g)) {
		if (open === 0) open = run[0].length;
		else if (run[0].length === open) open = 0;
	}
	return open > 0;
}

/**
 * Whether the line starting at `lineStart` sits inside frontmatter or a
 * fenced code block. Frontmatter counts only once its closing `---` exists,
 * as the indexer's frontmatter regex requires. Reads only the lines before
 * `lineStart`.
 */
function inFrontmatterOrFence(docText: string, lineStart: number): boolean {
	const bodyStart = FRONTMATTER_RE.exec(docText)?.[0].length ?? 0;
	if (lineStart < bodyStart) return true;

	let fence: string | null = null;
	for (const line of docText.slice(bodyStart, lineStart).split('\n')) {
		const run = CODE_FENCE_OPEN_RE.exec(line)?.[1];
		if (!run) continue;
		if (fence === null) fence = run;
		else if (run[0] === fence[0] && run.length >= fence.length && line.trim() === run) fence = null;
	}
	return fence !== null;
}

/**
 * The tag being typed at `pos`, or null where no tag can start: after a
 * non-space character (`foo#`), for a heading (`# `, `##`), inside inline
 * code, a fenced code block or frontmatter.
 */
export function detectTagContext(docText: string, pos: number): TagMatch | null {
	const lineStart = docText.lastIndexOf('\n', pos - 1) + 1;
	const before = docText.slice(lineStart, pos);
	const match = TAG_PREFIX_RE.exec(before);
	if (!match) return null;

	const query = match[1] ?? '';
	const hashColumn = before.length - query.length - 1;
	if (endsInInlineCode(before.slice(0, hashColumn))) return null;
	if (inFrontmatterOrFence(docText, lineStart)) return null;

	TAG_REST_RE.lastIndex = pos;
	const rest = TAG_REST_RE.exec(docText)?.[0].length ?? 0;
	return { from: pos - query.length, to: pos + rest, query };
}

/**
 * The tags `query` fuzzy-matches (`utils/fuzzy-match.ts`, as wikilink
 * completion uses), best match first, then the most-used, then by name.
 * An empty query keeps every tag. Returns a new array.
 */
export function rankTags<T extends { name: string; count: number }>(query: string, tags: readonly T[]): T[] {
	return tags
		.map((tag) => ({ tag, ...fuzzyMatch(query, tag.name) }))
		.filter((entry) => entry.match)
		.sort((a, b) => a.score - b.score || b.tag.count - a.tag.count || a.tag.name.localeCompare(b.tag.name))
		.map((entry) => entry.tag);
}
