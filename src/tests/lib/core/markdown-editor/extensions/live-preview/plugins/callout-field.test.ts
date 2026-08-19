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
	// ensureSyntaxTree finishes the parse on the mutable ParseContext but never
	// refreshes the Language state field's tree snapshot, and syntaxTree() reads that
	// snapshot. Without the empty transaction, a parse that blew the 20 ms Work.Apply
	// budget of EditorState.create stays truncated for every consumer.
	return state.update({}).state;
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
		// Phase 17: every callout gets type-switcher + fold chevron widgets.
		// Header line: lineDeco + type-switcher + mark marker + fold chevron + mark title = 5
		// Content line: lineDeco + replace prefix = 2
		// Total: 7
		expect(decos).toHaveLength(7);
	});

	it('uses visible marks when cursor is inside the callout', () => {
		const doc = '> [!note] Title\n> content';
		const state = createState(doc, 3); // cursor inside header
		const decos = collectDecos(state);
		// Cursor inside → !isTouched is false → no type-switcher / fold chevron.
		// Header: lineDeco + mark(visible) on marker + mark on title = 3
		// Content: lineDeco + mark(visible) on prefix = 2
		// Total: 5
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
		// Phase 17: type-switcher + fold chevron added.
		// Header: lineDeco + type-switcher + mark marker + fold chevron = 4
		// Content: lineDeco + replace prefix = 2
		// Total: 6
		expect(decos).toHaveLength(6);
	});

	it('handles header-only callout (no content lines)', () => {
		const doc = 'text\n> [!tip] Just a tip';
		const state = createState(doc, 0);
		const decos = collectDecos(state);
		// Header only: lineDeco + type-switcher + mark marker + fold chevron + mark title = 5
		expect(decos).toHaveLength(5);
	});

	it('handles multiple callouts', () => {
		const doc = 'text\n> [!note] A\n> body\n\n> [!warning] B';
		const state = createState(doc, 0);
		const decos = collectDecos(state);
		// Callout 1: 5 header (line + ts + mark + chevron + title) + 2 content = 7
		// Callout 2: 5 header-only (line + ts + mark + chevron + title) = 5
		// Total: 12
		expect(decos).toHaveLength(12);
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
		// Header: lineDeco + type-switcher + mark + fold chevron + title mark = 5
		// Content: lineDeco + replace prefix = 2
		// Total: 7
		expect(decos).toHaveLength(7);
	});

	it('collapses content lines for foldable callout with - (default closed)', () => {
		const doc = 'text\n> [!tip]- Collapsed\n> hidden content\n> more hidden';
		const state = createState(doc, 0);
		const decos = collectDecos(state);
		// Header: lineDeco + type-switcher + mark + fold chevron + title mark = 5
		// Content line 1: hiddenLineDeco + hidden-line class = 2
		// Content line 2: hiddenLineDeco + hidden-line class = 2
		// Total: 9
		expect(decos).toHaveLength(9);
	});

	it('Phase 17: every callout (foldable or not) gets a fold widget + type-switcher', () => {
		const doc = 'text\n> [!note] Title\n> content';
		const state = createState(doc, 0);
		const decos = collectDecos(state);
		// Even without `+`/`-`, the callout gets the chevron + type-switcher.
		// Header: lineDeco + type-switcher + mark + fold chevron + title mark = 5
		// Content: lineDeco + replace prefix = 2
		// Total: 7
		expect(decos).toHaveLength(7);
	});

	it('toggles fold state from expanded to collapsed', () => {
		const doc = 'text\n> [!tip]+ Open\n> visible content';
		const state = createState(doc, 0);

		// Initially expanded (+ = default open)
		expect(collectDecos(state)).toHaveLength(7);

		// Toggle fold on line 2 (the callout start line)
		const toggled = state.update({ effects: toggleCalloutFold.of(2) });
		const decosAfter = collectDecos(toggled.state);
		// After toggle: + becomes collapsed
		// Header: lineDeco + type-switcher + mark + fold chevron + title mark = 5
		// Content: hiddenLineDeco + hidden-line class = 2
		// Total: 7 (same count but content is hidden instead of shown)
		expect(decosAfter).toHaveLength(7);
	});

	it('toggles fold state from collapsed to expanded', () => {
		const doc = 'text\n> [!tip]- Closed\n> hidden content';
		const state = createState(doc, 0);

		// Initially collapsed (- = default closed)
		// Header: lineDeco + type-switcher + mark + fold chevron + title mark = 5
		// Content: hiddenLineDeco + hidden-line class = 2
		// Total: 7
		expect(collectDecos(state)).toHaveLength(7);

		// Toggle fold on line 2 — should expand
		const toggled = state.update({ effects: toggleCalloutFold.of(2) });
		const decosAfter = collectDecos(toggled.state);
		// After toggle: - becomes expanded
		// Header: lineDeco + type-switcher + mark + fold chevron + title mark = 5
		// Content: lineDeco + replace prefix = 2
		// Total: 7
		expect(decosAfter).toHaveLength(7);
	});

	it('header-only foldable callout has fold widget + type-switcher but no content to collapse', () => {
		const doc = 'text\n> [!tip]+ Just a tip';
		const state = createState(doc, 0);
		const decos = collectDecos(state);
		// Header: lineDeco + type-switcher + mark + fold chevron + title mark = 5
		expect(decos).toHaveLength(5);
	});
});
