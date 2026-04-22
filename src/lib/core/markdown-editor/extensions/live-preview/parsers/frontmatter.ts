/** Range of a YAML frontmatter block at the start of a document. */
export interface FrontmatterBlock {
	/** Line index of the opening `---` fence */
	openIdx: number;
	/** Line index of the closing `---` fence */
	closeIdx: number;
}

/** Matches the opening/closing `---` fence of a YAML frontmatter block */
export const FRONTMATTER_FENCE_RE = /^---\s*$/;

/**
 * Finds a YAML frontmatter block at the beginning of a document.
 * Frontmatter must start on line index 0 with `---` and end with another `---`.
 * Returns null if no valid frontmatter block is found.
 *
 * Only returns the fence range — callers that need typed properties should
 * use `parseFrontmatterProperties` from `$lib/features/properties/properties.logic`
 * on the source text, which parses via js-yaml and preserves real types.
 */
export function findFrontmatterBlock(
	lines: { text: string; from: number; to: number }[],
): FrontmatterBlock | null {
	if (lines.length < 2) return null;

	const firstLine = lines[0];
	if (!FRONTMATTER_FENCE_RE.test(firstLine.text)) return null;

	for (let i = 1; i < lines.length; i++) {
		if (FRONTMATTER_FENCE_RE.test(lines[i].text)) {
			return { openIdx: 0, closeIdx: i };
		}
	}

	return null;
}
