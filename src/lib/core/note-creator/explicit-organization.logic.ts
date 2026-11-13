/**
 * Settings > Types & Lifecycle > "Explicit organization": while it is on, a
 * new note starts with `_organized: false` so it shows in the Inbox until the
 * user organizes it. Each covered creation path opts in by passing its final
 * content through {@link applyExplicitOrganization}; periodic notes, non-Markdown
 * files, type definitions and templates never call it (ADR 0026, Lifecycle).
 *
 * Kept out of `note-creator.service.ts` on purpose: test files mock that whole
 * module with only `openOrCreateNote`, which would leave these undefined.
 */

const UNORGANIZED_LINE = '_organized: false';

/** Same shape as `FRONTMATTER_REGEX` in `properties.logic.ts`: needs a line between the delimiters. */
const FRONTMATTER_BLOCK = /^---\r?\n([\s\S]*?)\r?\n---/;
/** The empty `---`/`---` block, which `FRONTMATTER_BLOCK` does not match. */
const EMPTY_BLOCK = /^---\r?\n---(?:\r?\n|$)/;
/** A top-level `_organized:` key or its `organized:` alias (`utils/frontmatter-aliases.ts`). */
const ORGANIZED_KEY_LINE = /^_?organized\s*:/;

/**
 * Returns `content` with `_organized: false` in its frontmatter, unless a
 * top-level `_organized:` / `organized:` line is already there (whatever its
 * value). The line goes right after the opening `---` with that line's ending,
 * so the rest of the block is kept byte for byte; an empty `---`/`---` block
 * receives it; content without frontmatter gets a block holding only the key.
 * Never parses YAML and never throws, so unparseable frontmatter still gets it.
 */
export function withUnorganizedFlag(content: string): string {
	const insertAfterOpen = () =>
		content.replace(/^---(\r?\n)/, (open, eol: string) => `${open}${UNORGANIZED_LINE}${eol}`);
	if (EMPTY_BLOCK.test(content)) return insertAfterOpen();
	const block = content.match(FRONTMATTER_BLOCK);
	if (!block) return `---\n${UNORGANIZED_LINE}\n---\n${content}`;
	if (block[1].split(/\r?\n/).some((line) => ORGANIZED_KEY_LINE.test(line))) return content;
	return insertAfterOpen();
}

/**
 * The switch: {@link withUnorganizedFlag} of `content` when `enabled`
 * (`settingsStore.explicitOrganization`), `content` unchanged otherwise.
 */
export function applyExplicitOrganization(content: string, enabled: boolean): string {
	return enabled ? withUnorganizedFlag(content) : content;
}
