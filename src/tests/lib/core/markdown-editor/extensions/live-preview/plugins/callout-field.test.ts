import { describe, it, expect } from 'vitest';
import { EditorState, EditorSelection } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { ensureSyntaxTree } from '@codemirror/language';
import { computeCallouts } from '$lib/core/markdown-editor/extensions/live-preview/plugins/callout-field';
import { calloutFoldState, toggleCalloutFold } from '$lib/core/markdown-editor/extensions/live-preview/core/effects';

function createState(doc: string, cursor?: number): EditorState {
	const state = EditorState.create({
		doc,
		extensions: [markdown(), calloutFoldState],
		selection: cursor !== undefined ? EditorSelection.single(cursor) : undefined,
	});
	ensureSyntaxTree(state, state.doc.length, 5000);
	return state;
}

function collectDecos(state: EditorState): { from: number; to: number }[] {
	const val = computeCallouts(state);
	const result: { from: number; to: number }[] = [];
	const iter = val.iter();
	while (iter.value) {
		result.push({ from: iter.from, to: iter.to });
		iter.next();
	}
	return result;
}

describe('calloutField', () => {
	it('decorates a callout when cursor is outside', () => {
		const doc = 'text\n> [!note] Title\n> content line';
		const state = createState(doc, 0); // cursor on "text"
		const decos = collectDecos(state);
		// Header line: lineDeco + replace marker + mark title = 3
		// Content line: lineDeco + replace prefix = 2
		// Total: 5
		expect(decos).toHaveLength(5);
	});

	it('uses visible marks when cursor is inside the callout', () => {
		const doc = '> [!note] Title\n> content';
		const state = createState(doc, 3); // cursor inside header
		const decos = collectDecos(state);
		// Header: lineDeco + mark(visible) on marker + mark on title = 3
		// Content: lineDeco + mark(visible) on prefix = 2
		// Total: 5 (marks are visible, no fold widget)
		expect(decos).toHaveLength(5);
	});

	it('produces no decorations without callouts', () => {
		const state = createState('plain text\nno callouts', 0);
		expect(collectDecos(state)).toHaveLength(0);
	});

	it('handles callout without title', () => {
		const doc = 'text\n> [!warning]\n> content';
		const state = createState(doc, 0);
		const decos = collectDecos(state);
		// Header: lineDeco + replace marker (no title mark) = 2
		// Content: lineDeco + replace prefix = 2
		// Total: 4
		expect(decos).toHaveLength(4);
	});

	it('handles header-only callout (no content lines)', () => {
		const doc = 'text\n> [!tip] Just a tip';
		const state = createState(doc, 0);
		const decos = collectDecos(state);
		// Header only: lineDeco + replace marker + mark title = 3
		expect(decos).toHaveLength(3);
	});

	it('handles multiple callouts', () => {
		const doc = 'text\n> [!note] A\n> body\n\n> [!warning] B';
		const state = createState(doc, 0);
		const decos = collectDecos(state);
		// Callout 1: 3 (header) + 2 (content) = 5
		// Callout 2: 3 (header only) = 3
		// Total: 8
		expect(decos).toHaveLength(8);
	});

	it('does not match plain blockquotes as callouts', () => {
		const doc = 'text\n> just a quote\n> another line';
		const state = createState(doc, 0);
		expect(collectDecos(state)).toHaveLength(0);
	});

	it('updates when document changes', () => {
		const state = createState('plain text', 0);
		expect(collectDecos(state)).toHaveLength(0);

		const tr = state.update({
			changes: {
				from: 0,
				to: state.doc.length,
				insert: 'text\n> [!note] Title\n> content',
			},
		});
		expect(collectDecos(tr.state).length).toBeGreaterThan(0);
	});

	it('adds fold widget for foldable callout with +', () => {
		const doc = 'text\n> [!tip]+ Pro tip\n> content';
		const state = createState(doc, 0);
		const decos = collectDecos(state);
		// Header: lineDeco + replace marker + widget (fold chevron) + mark title = 4
		// Content: lineDeco + replace prefix = 2
		// Total: 6
		expect(decos).toHaveLength(6);
	});

	it('collapses content lines for foldable callout with - (default closed)', () => {
		const doc = 'text\n> [!tip]- Collapsed\n> hidden content\n> more hidden';
		const state = createState(doc, 0);
		const decos = collectDecos(state);
		// Header: lineDeco + replace marker + widget (fold chevron) + mark title = 4
		// Content line 1: hiddenLineDeco + hidden-line class = 2
		// Content line 2: hiddenLineDeco + hidden-line class = 2
		// Total: 8
		expect(decos).toHaveLength(8);
	});

	it('does not add fold widget for non-foldable callout', () => {
		const doc = 'text\n> [!note] Title\n> content';
		const state = createState(doc, 0);
		const decos = collectDecos(state);
		// Header: lineDeco + replace marker + mark title = 3 (no widget)
		// Content: lineDeco + replace prefix = 2
		// Total: 5
		expect(decos).toHaveLength(5);
	});

	it('toggles fold state from expanded to collapsed', () => {
		const doc = 'text\n> [!tip]+ Open\n> visible content';
		const state = createState(doc, 0);

		// Initially expanded (+ = default open): 6 decos
		expect(collectDecos(state)).toHaveLength(6);

		// Toggle fold on line 2 (the callout start line)
		const toggled = state.update({ effects: toggleCalloutFold.of(2) });
		const decosAfter = collectDecos(toggled.state);
		// After toggle: + becomes collapsed
		// Header: lineDeco + replace marker + widget + mark title = 4
		// Content: hiddenLineDeco + hidden-line class = 2
		// Total: 6 (same count but content is hidden instead of shown)
		expect(decosAfter).toHaveLength(6);
	});

	it('toggles fold state from collapsed to expanded', () => {
		const doc = 'text\n> [!tip]- Closed\n> hidden content';
		const state = createState(doc, 0);

		// Initially collapsed (- = default closed)
		// Header: lineDeco + replace marker + widget + mark title = 4
		// Content: hiddenLineDeco + hidden-line class = 2
		// Total: 6
		expect(collectDecos(state)).toHaveLength(6);

		// Toggle fold on line 2 — should expand
		const toggled = state.update({ effects: toggleCalloutFold.of(2) });
		const decosAfter = collectDecos(toggled.state);
		// After toggle: - becomes expanded
		// Header: lineDeco + replace marker + widget + mark title = 4
		// Content: lineDeco + replace prefix = 2
		// Total: 6
		expect(decosAfter).toHaveLength(6);
	});

	it('header-only foldable callout has fold widget but no content to collapse', () => {
		const doc = 'text\n> [!tip]+ Just a tip';
		const state = createState(doc, 0);
		const decos = collectDecos(state);
		// Header: lineDeco + replace marker + widget + mark title = 4
		expect(decos).toHaveLength(4);
	});
});
