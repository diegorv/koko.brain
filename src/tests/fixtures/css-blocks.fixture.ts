/** One block at the top level of a stylesheet: the text before its `{` and the text inside its braces */
export interface CssBlock {
	/** The selector or at-rule prelude, trimmed (e.g. `@layer base`) */
	header: string;
	/** Everything between the block's outer braces */
	body: string;
}

/**
 * Splits a stylesheet into its top-level blocks by brace depth, after removing
 * comments. A block found here sits outside every `@layer`, `@media` or rule.
 * It does not skip braces inside quoted strings or `url(...)`: a stylesheet with
 * one there splits wrong.
 */
export function topLevelBlocks(css: string): CssBlock[] {
	const source = css.replace(/\/\*[\s\S]*?\*\//g, '');
	const blocks: CssBlock[] = [];
	let depth = 0;
	let headerStart = 0;
	let bodyStart = 0;
	let header = '';
	for (let i = 0; i < source.length; i++) {
		const ch = source[i];
		if (ch === '{') {
			if (depth === 0) {
				header = source.slice(headerStart, i).trim();
				bodyStart = i + 1;
			}
			depth++;
		} else if (ch === '}') {
			depth--;
			if (depth === 0) {
				blocks.push({ header, body: source.slice(bodyStart, i) });
				headerStart = i + 1;
			}
		} else if (ch === ';' && depth === 0) {
			headerStart = i + 1;
		}
	}
	return blocks;
}
