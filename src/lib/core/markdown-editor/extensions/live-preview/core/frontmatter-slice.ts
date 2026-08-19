import type { Text } from '@codemirror/state';

/**
 * Materializes only the frontmatter prefix of the document for property
 * parsing, instead of `doc.toString()` (a full-document string copy per
 * rebuild — typing lag in large notes). Parity contract: the parser's
 * `FRONTMATTER_REGEX` (`/^---\r?\n[\s\S]*?\r?\n---/`) can only match when
 * line 1 is exactly `---`, and its non-greedy body ends at the first line
 * >= 3 whose text starts with `---`. Returning '' when no fence can match
 * yields [] from the parser, exactly as the full text would.
 */
export function frontmatterSlice(doc: Text): string {
	if (doc.lines < 3 || doc.line(1).text !== '---') return '';
	for (let i = 3; i <= doc.lines; i++) {
		const line = doc.line(i);
		if (line.text.startsWith('---')) return doc.sliceString(0, line.to);
	}
	return '';
}
