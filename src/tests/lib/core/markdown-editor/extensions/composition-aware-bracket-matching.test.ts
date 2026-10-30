// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { compositionAwareBracketMatching } from '#lib/core/markdown-editor/extensions/composition-aware-bracket-matching.js';

let view: EditorView | null = null;

function mount(doc: string, selection: EditorSelection): EditorView {
	view = new EditorView({
		state: EditorState.create({
			doc,
			selection,
			extensions: [EditorState.allowMultipleSelections.of(true), compositionAwareBracketMatching()],
		}),
		parent: document.body.appendChild(document.createElement('div')),
	});
	return view;
}

/** Text of every element carrying `cls`, in document order. */
function marked(v: EditorView, cls: string): string[] {
	return Array.from(v.contentDOM.querySelectorAll(`.${cls}`)).map((el) => el.textContent ?? '');
}

afterEach(() => {
	view?.destroy();
	view = null;
	document.body.innerHTML = '';
});

describe('compositionAwareBracketMatching', () => {
	it('marks both brackets when the cursor sits after the closing one', () => {
		const v = mount('a(b)c', EditorSelection.single(4));
		expect(marked(v, 'cm-matchingBracket')).toEqual(['(', ')']);
	});

	it('marks the brackets of every cursor, in document order', () => {
		const v = mount('(a) [b]', EditorSelection.create([EditorSelection.cursor(7), EditorSelection.cursor(0)]));
		expect(marked(v, 'cm-matchingBracket')).toEqual(['(', ')', '[', ']']);
	});

	it('marks an unmatched bracket as non-matching', () => {
		const v = mount('a)b', EditorSelection.single(2));
		expect(marked(v, 'cm-nonmatchingBracket')).toEqual([')']);
		expect(marked(v, 'cm-matchingBracket')).toEqual([]);
	});

	it('marks nothing away from brackets', () => {
		const v = mount('(a) text', EditorSelection.single(6));
		expect(marked(v, 'cm-matchingBracket')).toEqual([]);
	});
});
