import { HEADING_RE } from '$lib/core/markdown-editor/extensions/wikilink';
import type { TocHeading } from './toc.types';

const FENCE_RE = /^(?:```|~~~)/;

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
					text: match[1].trim(),
					line: i,
					pos,
				});
			}
		}

		pos += line.length + 1;
	}

	return headings;
}
