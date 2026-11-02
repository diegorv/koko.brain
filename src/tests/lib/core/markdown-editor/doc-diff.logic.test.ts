import { describe, it, expect } from 'vitest';
import { docDiff, DOC_DIFF_MAX_EDITS, type DocChange } from '#lib/core/markdown-editor/doc-diff.logic.js';

/** Applies `docDiff` changes to `prev`, the way a CodeMirror change spec does (positions in `prev`). */
function apply(prev: string, next: string): string {
	const changes = docDiff(prev, next);
	if (!changes) throw new Error('docDiff gave up');
	let out = '';
	let pos = 0;
	for (const { from, to, insert } of changes) {
		out += prev.slice(pos, from) + insert;
		pos = to;
	}
	return out + prev.slice(pos);
}

function diff(prev: string, next: string): DocChange[] {
	const changes = docDiff(prev, next);
	if (!changes) throw new Error('docDiff gave up');
	return changes;
}

describe('docDiff', () => {
	it('returns no change for identical docs', () => {
		expect(diff('same text', 'same text')).toEqual([]);
		expect(diff('', '')).toEqual([]);
	});

	it('covers only the changed middle of a one-char toggle', () => {
		expect(diff('- [ ] task', '- [x] task')).toEqual([{ from: 3, to: 4, insert: 'x' }]);
	});

	it('handles a pure insertion and a pure deletion', () => {
		expect(diff('abc', 'abXc')).toEqual([{ from: 2, to: 2, insert: 'X' }]);
		expect(diff('abXc', 'abc')).toEqual([{ from: 2, to: 3, insert: '' }]);
	});

	it('does not let prefix and suffix overlap on repeated characters', () => {
		expect(diff('aaa', 'aaaa')).toEqual([{ from: 3, to: 3, insert: 'a' }]);
		expect(apply('aaaa', 'aa')).toBe('aa');
		expect(apply('abab', 'ab')).toBe('ab');
	});

	it('replaces everything when the docs share nothing, including from or to empty', () => {
		expect(diff('abc', 'xyz')).toEqual([{ from: 0, to: 3, insert: 'xyz' }]);
		expect(diff('', 'new')).toEqual([{ from: 0, to: 0, insert: 'new' }]);
		expect(diff('old', '')).toEqual([{ from: 0, to: 3, insert: '' }]);
	});

	it('reproduces the new doc for a frontmatter rewrite', () => {
		const prev = '---\ntitle: x\n---\nbody\n';
		const next = '---\ntitle: longer\n---\nbody\n';
		expect(apply(prev, next)).toBe(next);
		expect(diff(prev, next)[0].from).toBe(11);
	});

	it('gives one change per changed region, leaving the lines between them out', () => {
		const prev = 'Top [[x]] line\n\nmid here\n\nBottom [[x]] line\n';
		const next = 'Top [[yy]] line\n\nmid here\n\nBottom [[yy]] line\n';
		expect(diff(prev, next)).toEqual([
			{ from: 6, to: 7, insert: 'yy' },
			{ from: 35, to: 36, insert: 'yy' },
		]);
		expect(apply(prev, next)).toBe(next);
	});

	it('handles inserted and deleted lines between changed regions', () => {
		const prev = 'a\nb\nc\nd\ne\n';
		const next = 'A\nb\nnew\nc\ne\nE\n';
		expect(apply(prev, next)).toBe(next);
		const changes = diff(prev, next);
		expect(changes.length).toBe(4);
		// Changes are ordered and do not overlap, as a CodeMirror change spec needs.
		for (let i = 1; i < changes.length; i++) expect(changes[i].from).toBeGreaterThanOrEqual(changes[i - 1].to);
	});

	it('handles a doc without a trailing newline', () => {
		expect(apply('one\ntwo\nthree', 'ONE\ntwo\nTHREE')).toBe('ONE\ntwo\nTHREE');
		expect(apply('one\ntwo', 'one\ntwo\n')).toBe('one\ntwo\n');
	});

	it(`gives up (null) past ${DOC_DIFF_MAX_EDITS} line edits`, () => {
		const lines = Array.from({ length: 2 * DOC_DIFF_MAX_EDITS + 10 }, (_, i) => `line ${i}`);
		const prev = lines.join('\n');
		const next = lines.map((l, i) => (i % 2 === 0 ? `${l}!` : l)).join('\n');
		expect(docDiff(prev, next)).toBeNull();
	});
});
