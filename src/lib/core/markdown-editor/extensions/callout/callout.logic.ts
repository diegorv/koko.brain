/**
 * The one callout header matcher: `> [!type]` with an optional `+`/`-` fold
 * marker and title, behind one or more `>` prefixes (`> > [!type]` is a
 * nested callout). Group 1 is the `>`-prefix through the whitespace after the
 * type, so its length is where the title starts, even when the title has
 * trailing spaces.
 */
const CALLOUT_HEADER_RE = /^((?:>\s*)+\[!([\w-]+)\]([+-])?\s*)(.*)$/;

/** A line that `matchCalloutHeader` accepts, before any colour lookup. */
export interface CalloutHeaderMatch {
	/** Lower-cased callout type */
	type: string;
	/** Fold marker after `]`, or null */
	foldable: '+' | '-' | null;
	/** Text after the marker, untrimmed (may carry trailing spaces) */
	rawTitle: string;
	/** Length of the `> [!type]+ ` marker, including the whitespace before the title */
	markerLength: number;
}

/**
 * Matches a callout header line. Every callout recogniser (the live-preview
 * callout parser, the blockquote parser's callout exclusion and the source-mode
 * `calloutDecoration`) goes through here so they agree on what a callout is.
 */
export function matchCalloutHeader(lineText: string): CalloutHeaderMatch | null {
	const match = lineText.match(CALLOUT_HEADER_RE);
	if (!match) return null;
	return {
		type: match[2].toLowerCase(),
		foldable: (match[3] as '+' | '-' | undefined) ?? null,
		rawTitle: match[4],
		markerLength: match[1].length,
	};
}

export const CALLOUT_COLORS: Record<string, string> = {
	note: 'var(--callout-note)',
	tip: 'var(--callout-tip)',
	important: 'var(--callout-important)',
	warning: 'var(--callout-warning)',
	caution: 'var(--callout-caution)',
	abstract: 'var(--callout-note)',
	summary: 'var(--callout-note)',
	info: 'var(--callout-note)',
	todo: 'var(--callout-note)',
	success: 'var(--callout-tip)',
	check: 'var(--callout-tip)',
	done: 'var(--callout-tip)',
	question: 'var(--callout-warning)',
	help: 'var(--callout-warning)',
	faq: 'var(--callout-warning)',
	failure: 'var(--callout-caution)',
	fail: 'var(--callout-caution)',
	missing: 'var(--callout-caution)',
	danger: 'var(--callout-caution)',
	error: 'var(--callout-caution)',
	bug: 'var(--callout-caution)',
	example: 'var(--callout-important)',
	quote: 'var(--callout-quote)',
	cite: 'var(--callout-quote)',
};

export interface CalloutMatch {
	type: string;
	color: string;
}

export function parseCalloutLine(lineText: string): CalloutMatch | null {
	const match = matchCalloutHeader(lineText);
	if (!match) return null;

	const type = match.type;
	const color = CALLOUT_COLORS[type] || 'var(--callout-note)';
	return { type, color };
}
