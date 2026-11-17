/**
 * Markdown to plain text for one-line previews such as search snippets.
 *
 * The input is usually a fragment: FTS5 cuts it with `...` and callers cut it
 * at a length limit, so every rule tolerates unbalanced syntax instead of
 * parsing. `<mark>` and `</mark>` (FTS5 match highlights) pass through
 * untouched; the caller sanitizes after this runs.
 */

/** Line-start markers: quotes, callouts, headings, list items, checkboxes. */
function stripLineMarkers(line: string): string {
	return line
		.replace(/^\s+/, '')
		.replace(/^(`{3,}|~{3,})\S*/, '')
		.replace(/^(>\s*)+/, '')
		.replace(/^\[![^\]]*\][+-]?\s*/, '')
		.replace(/^#{1,6}(\s+|$)/, '')
		.replace(/^([-*+]|\d+[.)])\s+/, '')
		.replace(/^\[.\](\s+|$)/, '');
}

/** Alias of a wikilink, else the last segment of its target. */
function wikilinkText(inner: string): string {
	const pipe = inner.indexOf('|');
	if (pipe !== -1) return inner.slice(pipe + 1);
	// A `/` preceded by `<` belongs to a `</mark>` tag, not to the path.
	return inner.replace(/^.*(?<!<)\//, '');
}

/**
 * Turns a markdown fragment into plain text, keeping `<mark>` tags.
 * Whitespace, newlines included, collapses to single spaces.
 *
 * @param markdown - A markdown fragment, possibly cut mid-syntax
 * @returns The text without markdown syntax, trimmed
 *
 * @example markdownToPlainText('- [ ] read **[[Books/Dune|Dune]]**') → 'read Dune'
 */
export function markdownToPlainText(markdown: string): string {
	return markdown
		.split('\n')
		.map(stripLineMarkers)
		.join('\n')
		.replace(/!?\[\[([^\]]*)\]\]/g, (_, inner: string) => wikilinkText(inner))
		// The URL may hold one level of parentheses, as in Wikipedia links.
		.replace(/!?\[([^\]]*)\]\((?:[^()]|\([^()]*\))*\)/g, '$1')
		// Unbalanced or deeper parentheses fall back to the URL's first ')'.
		.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/!?\[([^\]]*)\]\([^)]*$/, '$1')
		.replace(/\[\[|\]\]/g, '')
		.replace(/`+/g, '')
		.replace(/\*\*|__|~~|==/g, '')
		.replace(/\*/g, '')
		.replace(/(?<![\p{L}\p{N}])_+|_+(?![\p{L}\p{N}])/gu, '')
		.replace(/\s+/g, ' ')
		.trim();
}
