import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { getAllLines } from '$lib/core/markdown-editor/extensions/live-preview/core/get-all-lines';

function createState(doc: string): EditorState {
	return EditorState.create({ doc });
}

describe('getAllLines', () => {
	it('returns every line with the text/from/to/number fields the parsers read', () => {
		const lines = getAllLines(createState('one\ntwo\nthree'));

		expect(lines.map((l) => l.text)).toEqual(['one', 'two', 'three']);
		expect(lines.map((l) => l.number)).toEqual([1, 2, 3]);
		expect(lines.map((l) => [l.from, l.to])).toEqual([
			[0, 3],
			[4, 7],
			[8, 13],
		]);
	});

	it('returns a single empty line for an empty document', () => {
		const lines = getAllLines(createState(''));

		expect(lines).toHaveLength(1);
		expect(lines[0].text).toBe('');
		expect(lines[0].from).toBe(0);
		expect(lines[0].to).toBe(0);
	});

	it('keeps blank lines so block ranges stay aligned with the document', () => {
		const lines = getAllLines(createState('a\n\nb'));

		expect(lines.map((l) => l.text)).toEqual(['a', '', 'b']);
		expect(lines[1].from).toBe(2);
		expect(lines[1].to).toBe(2);
	});
});
