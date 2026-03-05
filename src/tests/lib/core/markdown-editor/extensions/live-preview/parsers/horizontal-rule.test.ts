import { describe, it, expect } from 'vitest';
import { isHorizontalRule } from '$lib/core/markdown-editor/extensions/live-preview/parsers/horizontal-rule';
import { createMarkdownState } from '../../../test-helpers';

describe('isHorizontalRule', () => {
	it('detects --- horizontal rule', () => {
		const state = createMarkdownState('---');
		expect(isHorizontalRule(state, 0, 3)).toBe(true);
	});

	it('detects *** horizontal rule', () => {
		const state = createMarkdownState('***');
		expect(isHorizontalRule(state, 0, 3)).toBe(true);
	});

	it('detects ___ horizontal rule', () => {
		const state = createMarkdownState('___');
		expect(isHorizontalRule(state, 0, 3)).toBe(true);
	});

	it('detects longer variants', () => {
		const state1 = createMarkdownState('-----');
		expect(isHorizontalRule(state1, 0, 5)).toBe(true);

		const state2 = createMarkdownState('*****');
		expect(isHorizontalRule(state2, 0, 5)).toBe(true);

		const state3 = createMarkdownState('_____');
		expect(isHorizontalRule(state3, 0, 5)).toBe(true);
	});

	it('detects variants with spaces', () => {
		const state1 = createMarkdownState('- - -');
		expect(isHorizontalRule(state1, 0, 5)).toBe(true);

		const state2 = createMarkdownState('* * *');
		expect(isHorizontalRule(state2, 0, 5)).toBe(true);

		const state3 = createMarkdownState('_ _ _');
		expect(isHorizontalRule(state3, 0, 5)).toBe(true);
	});

	it('returns false for plain text', () => {
		const state = createMarkdownState('hello');
		expect(isHorizontalRule(state, 0, 5)).toBe(false);
	});

	it('returns false for too few characters', () => {
		const state1 = createMarkdownState('--');
		expect(isHorizontalRule(state1, 0, 2)).toBe(false);

		const state2 = createMarkdownState('**');
		expect(isHorizontalRule(state2, 0, 2)).toBe(false);

		const state3 = createMarkdownState('__');
		expect(isHorizontalRule(state3, 0, 2)).toBe(false);
	});

	it('returns false for mixed characters', () => {
		const state = createMarkdownState('-*_');
		expect(isHorizontalRule(state, 0, 3)).toBe(false);
	});

	it('detects horizontal rule in multi-line document', () => {
		const doc = 'some text\n\n---\n\nmore text';
		const state = createMarkdownState(doc);
		// '---' starts at position 11 (after 'some text\n\n')
		const line = state.doc.line(3);
		expect(isHorizontalRule(state, line.from, line.to)).toBe(true);
	});

	it('returns false for non-HR line in multi-line document', () => {
		const doc = 'some text\n\n---\n\nmore text';
		const state = createMarkdownState(doc);
		const line = state.doc.line(1);
		expect(isHorizontalRule(state, line.from, line.to)).toBe(false);
	});
});
