import { describe, it, expect } from 'vitest';
import { EditorState, EditorSelection } from '@codemirror/state';
import { shouldShowSource } from '$lib/core/markdown-editor/extensions/live-preview/core/should-show-source';

function createState(doc: string, cursor: number): EditorState {
	return EditorState.create({ doc, selection: EditorSelection.single(cursor) });
}

function createStateWithSelection(doc: string, anchor: number, head: number): EditorState {
	return EditorState.create({ doc, selection: EditorSelection.single(anchor, head) });
}

function createStateMultiCursor(doc: string, cursors: number[]): EditorState {
	const ranges = cursors.map((c) => EditorSelection.cursor(c));
	return EditorState.create({
		doc,
		selection: EditorSelection.create(ranges, 0),
		extensions: [EditorState.allowMultipleSelections.of(true)],
	});
}

describe('shouldShowSource', () => {
	it('returns true when cursor is inside range', () => {
		const state = createState('hello world', 3);
		expect(shouldShowSource(state, 0, 11)).toBe(true);
	});

	it('returns false when cursor is outside range', () => {
		const doc = 'line one\nline two\nline three';
		const state = createState(doc, 0); // cursor at position 0
		// range covers "line three"
		const line3From = doc.indexOf('line three');
		expect(shouldShowSource(state, line3From, doc.length)).toBe(false);
	});

	it('returns true when cursor is at range boundary (from)', () => {
		const state = createState('hello world', 5);
		expect(shouldShowSource(state, 5, 11)).toBe(true);
	});

	it('returns true when cursor is at range boundary (to)', () => {
		const state = createState('hello world', 5);
		expect(shouldShowSource(state, 0, 5)).toBe(true);
	});

	it('returns true when cursor is inside multi-line range', () => {
		const doc = 'line one\nline two\nline three';
		const line2Start = doc.indexOf('line two');
		const state = createState(doc, line2Start + 2); // cursor on line 2
		expect(shouldShowSource(state, 0, doc.length)).toBe(true);
	});

	it('returns true when any selection range overlaps', () => {
		const doc = 'line one\nline two\nline three';
		const line3Start = doc.indexOf('line three');
		// cursor 1 on line 1, cursor 2 on line 3
		const state = createStateMultiCursor(doc, [0, line3Start + 2]);
		expect(shouldShowSource(state, line3Start, doc.length)).toBe(true);
	});

	it('returns false when no selection range overlaps', () => {
		const doc = 'line one\nline two\nline three';
		const line3Start = doc.indexOf('line three');
		// cursors on line 1 and line 2
		const state = createStateMultiCursor(doc, [0, doc.indexOf('line two') + 2]);
		expect(shouldShowSource(state, line3Start, doc.length)).toBe(false);
	});

	it('handles single-character range', () => {
		const state = createState('abcdef', 3);
		expect(shouldShowSource(state, 3, 4)).toBe(true);
	});

	it('returns false when cursor is just before range', () => {
		const doc = 'line one\nline two';
		const state = createState(doc, 7); // position 7, before \n
		// range is line 2 starting at position 9
		expect(shouldShowSource(state, 9, doc.length)).toBe(false);
	});

	it('returns true when selection spans into range', () => {
		const doc = 'hello **bold** world';
		// Selection from pos 2 to pos 10 (overlaps with bold range 6-14)
		const state = createStateWithSelection(doc, 2, 10);
		expect(shouldShowSource(state, 6, 14)).toBe(true);
	});

	it('returns true when selection fully contains range', () => {
		const doc = 'hello **bold** world';
		// Selection from pos 0 to pos 19 (contains bold range 6-14)
		const state = createStateWithSelection(doc, 0, 19);
		expect(shouldShowSource(state, 6, 14)).toBe(true);
	});

	it('returns false when selection ends before range starts', () => {
		const doc = 'hello **bold** world';
		// Selection from pos 0 to pos 5 (before bold range 6-14)
		const state = createStateWithSelection(doc, 0, 5);
		expect(shouldShowSource(state, 6, 14)).toBe(false);
	});

	it('handles frontmatter block with cursor inside', () => {
		const doc = '---\ntitle: test\n---\ncontent';
		const state = createState(doc, 1); // cursor inside frontmatter
		expect(shouldShowSource(state, 0, doc.indexOf('---\ncontent') - 1)).toBe(true);
	});

	it('handles frontmatter block with cursor after block', () => {
		const doc = '---\ntitle: test\n---\ncontent';
		const contentStart = doc.indexOf('content');
		const state = createState(doc, contentStart + 2);
		expect(shouldShowSource(state, 0, doc.indexOf('---\ncontent') - 1)).toBe(false);
	});

	// Per-element granularity: cursor on same line but different element
	it('returns false when cursor is on same line but outside element range', () => {
		// "hello **bold** world" - cursor at pos 1 (in "hello"), bold is at 6-14
		const doc = 'hello **bold** world';
		const state = createState(doc, 1);
		expect(shouldShowSource(state, 6, 14)).toBe(false);
	});

	it('returns true when cursor is exactly on element', () => {
		// "hello **bold** world" - cursor at pos 8 (inside bold), bold is at 6-14
		const doc = 'hello **bold** world';
		const state = createState(doc, 8);
		expect(shouldShowSource(state, 6, 14)).toBe(true);
	});
});
