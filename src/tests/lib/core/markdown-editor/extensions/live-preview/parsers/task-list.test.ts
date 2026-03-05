import { describe, it, expect } from 'vitest';
import { findTaskMarkerRange } from '$lib/core/markdown-editor/extensions/live-preview/parsers/task-list';
import { createMarkdownState } from '../../../test-helpers';

describe('findTaskMarkerRange', () => {
	it('detects unchecked task marker - [ ]', () => {
		const state = createMarkdownState('- [ ] Todo item');
		const result = findTaskMarkerRange(state, 0, 15);
		expect(result).not.toBeNull();
		expect(result!.markerFrom).toBe(2);
		expect(result!.markerTo).toBe(5);
		expect(result!.checked).toBe(false);
	});

	it('detects checked task marker - [x]', () => {
		const state = createMarkdownState('- [x] Done item');
		const result = findTaskMarkerRange(state, 0, 15);
		expect(result).not.toBeNull();
		expect(result!.markerFrom).toBe(2);
		expect(result!.markerTo).toBe(5);
		expect(result!.checked).toBe(true);
	});

	it('detects uppercase [X] as checked', () => {
		const state = createMarkdownState('- [X] Done item');
		const result = findTaskMarkerRange(state, 0, 15);
		expect(result).not.toBeNull();
		expect(result!.checked).toBe(true);
	});

	it('works with * list marker', () => {
		const state = createMarkdownState('* [ ] Todo');
		const result = findTaskMarkerRange(state, 0, 10);
		expect(result).not.toBeNull();
		expect(result!.markerFrom).toBe(2);
		expect(result!.markerTo).toBe(5);
		expect(result!.checked).toBe(false);
	});

	it('works with + list marker', () => {
		const state = createMarkdownState('+ [x] Done');
		const result = findTaskMarkerRange(state, 0, 10);
		expect(result).not.toBeNull();
		expect(result!.checked).toBe(true);
	});

	it('works with indented task markers', () => {
		const doc = '- parent\n  - [ ] Nested todo';
		const state = createMarkdownState(doc);
		const line = state.doc.line(2);
		const result = findTaskMarkerRange(state, line.from, line.to);
		expect(result).not.toBeNull();
		expect(result!.markerFrom).toBe(13);
		expect(result!.markerTo).toBe(16);
		expect(result!.checked).toBe(false);
	});

	it('returns null for regular list items', () => {
		const state = createMarkdownState('- Regular item');
		expect(findTaskMarkerRange(state, 0, 14)).toBeNull();
	});

	it('returns null for plain text', () => {
		const state = createMarkdownState('Just text');
		expect(findTaskMarkerRange(state, 0, 9)).toBeNull();
	});

	it('returns null for empty lines', () => {
		const state = createMarkdownState('');
		expect(findTaskMarkerRange(state, 0, 0)).toBeNull();
	});

	it('applies offset correctly', () => {
		const doc = 'a'.repeat(100) + '\n- [ ] Todo';
		const state = createMarkdownState(doc);
		const line = state.doc.line(2);
		const result = findTaskMarkerRange(state, line.from, line.to);
		expect(result).not.toBeNull();
		expect(result!.markerFrom).toBe(103);
		expect(result!.markerTo).toBe(106);
	});

	it('does not match task markers inside fenced code blocks', () => {
		const doc = '```\n- [ ] not a task\n```';
		const state = createMarkdownState(doc);
		expect(findTaskMarkerRange(state, 0, doc.length)).toBeNull();
	});

	it('rejects invalid task marker states', () => {
		const doc1 = '- [?] invalid';
		const state1 = createMarkdownState(doc1);
		expect(findTaskMarkerRange(state1, 0, doc1.length)).toBeNull();

		const doc2 = '- [/] invalid';
		const state2 = createMarkdownState(doc2);
		expect(findTaskMarkerRange(state2, 0, doc2.length)).toBeNull();
	});
});
