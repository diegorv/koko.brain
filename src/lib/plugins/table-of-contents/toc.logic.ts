import { HEADING_RE } from '$lib/core/markdown-editor/extensions/wikilink';
import type { TocHeading } from './toc.types';

const FENCE_RE = /^(?:```|~~~)/;

// Order matters: bracketed forms first (they may contain pipe/spaces), then
// emphasis (which can be nested), then inline code (so backticks inside other
// runs of formatting aren't yanked first and break a `*` pairing), then
// emojis. Each regex is global to strip every occurrence on the line.
const WIKILINK_ALIAS_RE = /\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g;
const MD_LINK_RE = /\[([^\]]+)\]\([^)]*\)/g;
const BOLD_STAR_RE = /\*\*([^*]+)\*\*/g;
const BOLD_UNDER_RE = /__([^_]+)__/g;
const ITALIC_STAR_RE = /(?<!\*)\*([^*]+)\*(?!\*)/g;
const ITALIC_UNDER_RE = /(?<!_)_([^_]+)_(?!_)/g;
const STRIKE_RE = /~~([^~]+)~~/g;
const INLINE_CODE_RE = /`([^`]+)`/g;
// Strip pictographic codepoints + variation selectors + ZWJ glue around them.
// `\p{Extended_Pictographic}` covers modern emojis; the variation selector
// (️ / ︎) and ZWJ (‍) are removed afterwards to clear the
// "skeleton" of composite emoji sequences (e.g. 👨‍💻).
const EMOJI_RE = /\p{Extended_Pictographic}|[‍︎️]/gu;
const MULTI_SPACE_RE = /\s+/g;

/**
 * Strips markdown chrome (bold/italic/strike/inline-code, wikilinks, regular
 * markdown links) and emoji codepoints from a heading text so the TOC panel
 * shows the cleaned title only. Whitespace is collapsed to single spaces.
 *
 * Examples:
 *   `**Intro** 🔥`           → `Intro`
 *   `## See [[guide|how-to]]` → `See how-to`
 *   `*Foo* and \`bar\``       → `Foo and bar`
 */
export function stripHeadingChrome(raw: string): string {
	return raw
		.replace(WIKILINK_ALIAS_RE, '$1')
		.replace(MD_LINK_RE, '$1')
		.replace(BOLD_STAR_RE, '$1')
		.replace(BOLD_UNDER_RE, '$1')
		.replace(ITALIC_STAR_RE, '$1')
		.replace(ITALIC_UNDER_RE, '$1')
		.replace(STRIKE_RE, '$1')
		.replace(INLINE_CODE_RE, '$1')
		.replace(EMOJI_RE, '')
		.replace(MULTI_SPACE_RE, ' ')
		.trim();
}

/**
 * Extracts every ATX heading (H1-H6) from markdown `content`.
 *
 * Lines inside fenced code blocks (delimited by ``` or ~~~) are skipped so a
 * `# comment` inside example code is not mistaken for a real heading. The
 * fence detector only looks at the line's leading delimiter and toggles a
 * boolean; closing fence languages, indented fences, and tilde-bang variants
 * are not supported because CodeMirror's markdown grammar does not produce
 * them in our editor.
 *
 * Returned in document order. `pos` is the character offset of the start of
 * the heading line; `line` is the zero-based line index.
 */
export function extractTocHeadings(content: string): TocHeading[] {
	if (!content) return [];

	const headings: TocHeading[] = [];
	const lines = content.split('\n');
	let pos = 0;
	let inFence = false;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		if (FENCE_RE.test(line)) {
			inFence = !inFence;
		} else if (!inFence) {
			const match = HEADING_RE.exec(line);
			if (match) {
				const hashes = line.match(/^#+/)?.[0] ?? '';
				headings.push({
					level: hashes.length,
					text: stripHeadingChrome(match[1]),
					line: i,
					pos,
				});
			}
		}

		pos += line.length + 1;
	}

	return headings;
}
