import { describe, it, expect } from 'vitest';
import { docDiff } from '#lib/core/markdown-editor/doc-diff.logic.js';

/** Applies a `docDiff` change to `prev`, the way a CodeMirror change spec does. */
function apply(prev: string, next: string): string {
	const { from, to, insert } = docDiff(prev, next);
	return prev.slice(0, from) + insert + prev.slice(to);
}

describe('docDiff', () => {
	it('returns an empty change for identical docs', () => {
		expect(docDiff('same text', 'same text')).toEqual({ from: 9, to: 9, insert: '' });
	});

	it('covers only the changed middle of a one-char toggle', () => {
		expect(docDiff('- [ ] task', '- [x] task')).toEqual({ from: 3, to: 4, insert: 'x' });
	});

	it('handles a pure insertion and a pure deletion', () => {
		expect(docDiff('abc', 'abXc')).toEqual({ from: 2, to: 2, insert: 'X' });
		expect(docDiff('abXc', 'abc')).toEqual({ from: 2, to: 3, insert: '' });
	});

	it('does not let prefix and suffix overlap on repeated characters', () => {
		expect(docDiff('aaa', 'aaaa')).toEqual({ from: 3, to: 3, insert: 'a' });
		expect(apply('aaaa', 'aa')).toBe('aa');
		expect(apply('abab', 'ab')).toBe('ab');
	});

	it('replaces everything when the docs share nothing, including from or to empty', () => {
		expect(docDiff('abc', 'xyz')).toEqual({ from: 0, to: 3, insert: 'xyz' });
		expect(docDiff('', 'new')).toEqual({ from: 0, to: 0, insert: 'new' });
		expect(docDiff('old', '')).toEqual({ from: 0, to: 3, insert: '' });
	});

	it('reproduces the new doc for a frontmatter rewrite', () => {
		const prev = '---\ntitle: x\n---\nbody\n';
		const next = '---\ntitle: longer\n---\nbody\n';
		expect(apply(prev, next)).toBe(next);
		expect(docDiff(prev, next).from).toBe(11);
	});
});
