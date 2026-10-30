import { describe, it, expect } from 'vitest';
import type { EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { computeCallouts } from '#lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.js';
import { calloutFoldState, toggleCalloutFold } from '#lib/core/markdown-editor/extensions/live-preview/core/effects.js';
import { createMarkdownState, withFullParse } from '../../../test-helpers';

function createState(doc: string, cursor?: number): EditorState {
	return createMarkdownState(doc, { extensions: [markdown(), calloutFoldState], cursor });
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

	it('uses dim marks when cursor is inside the callout', () => {
		const doc = '> [!note] Title\n> content';
		const state = createState(doc, 3); // cursor inside header
		const decos = collectDecos(state);
		// Cursor inside → !isTouched is false → no type-switcher / fold chevron.
		// Header: lineDeco + dim mark on marker + mark on title = 3
		// Content: lineDeco + dim mark on prefix = 2
		// Total: 5
		expect(decos).toHaveLength(5);
	});

	it('replaces the marker and content prefix when cursor is outside', () => {
		const doc = 'text\n> [!note] Title\n> content line';
		const state = createState(doc, 0);
		const hidden: { from: number; to: number }[] = [];
		const iter = computeCallouts(state).iter();
		while (iter.value) {
			// A point decoration spanning text is a `Decoration.replace`
			if (iter.value.point && iter.from < iter.to) hidden.push({ from: iter.from, to: iter.to });
			iter.next();
		}
		const header = doc.indexOf('> [!note]');
		const content = doc.indexOf('> content');
		expect(hidden).toEqual([
			{ from: header, to: header + '> [!note] '.length }, // marker includes the trailing space
			{ from: content, to: content + 2 },
		]);
	});

	it('emits no replace and a dim cm-formatting-block mark when cursor is inside', () => {
		const doc = '> [!note] Title\n> content';
		const state = createState(doc, 3);
		const classes: string[] = [];
		const iter = computeCallouts(state).iter();
		while (iter.value) {
			expect(iter.value.point && iter.from < iter.to).toBe(false);
			const cls = (iter.value.spec as { class?: string }).class;
			if (cls) classes.push(cls);
			iter.next();
		}
		expect(classes.filter((c) => c === 'cm-formatting-block')).toHaveLength(2);
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

		const next = withFullParse(() =>
			state.update({
				changes: {
					from: 0,
					to: state.doc.length,
					insert: 'text\n> [!note] Title\n> content',
				},
			}).state,
		);
		expect(collectDecos(next).length).toBeGreaterThan(0);
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
		// Content line 1: hiddenLineDeco = 1
		// Content line 2: hiddenLineDeco = 1
		// Total: 7
		expect(decos).toHaveLength(7);
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
		// Content: hiddenLineDeco = 1
		// Total: 6
		expect(decosAfter).toHaveLength(6);
	});

	it('toggles fold state from collapsed to expanded', () => {
		const doc = 'text\n> [!tip]- Closed\n> hidden content';
		const state = createState(doc, 0);

		// Initially collapsed (- = default closed)
		// Header: lineDeco + type-switcher + mark + fold chevron + title mark = 5
		// Content: hiddenLineDeco = 1
		// Total: 6
		expect(collectDecos(state)).toHaveLength(6);

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

	describe('nested callouts', () => {
		const doc = 'text\n> [!warning] W\n> > [!note] N\n> > inner\n>\n> outer tail';

		/** Line decorations (`cm-lp-callout` / hidden) per line number, plus widget and replace ranges. */
		function inspect(state: EditorState) {
			const lineClasses = new Map<number, string[]>();
			const widgets: { from: number; name: string }[] = [];
			const replaces: { from: number; to: number }[] = [];
			const iter = computeCallouts(state).iter();
			while (iter.value) {
				const spec = iter.value.spec as { class?: string; widget?: object };
				if (spec.widget) widgets.push({ from: iter.from, name: spec.widget.constructor.name });
				else if (iter.value.point && iter.from < iter.to) replaces.push({ from: iter.from, to: iter.to });
				else if (iter.from === iter.to && spec.class) {
					const n = state.doc.lineAt(iter.from).number;
					lineClasses.set(n, [...(lineClasses.get(n) ?? []), spec.class]);
				}
				iter.next();
			}
			return { lineClasses, widgets, replaces };
		}

		it('renders both callouts without throwing', () => {
			const state = createState(doc, 0);
			const { lineClasses, widgets } = inspect(state);
			const switchers = widgets.filter((w) => w.name === 'CalloutTypeSwitcherWidget');
			expect(switchers.map((w) => state.doc.lineAt(w.from).number)).toEqual([2, 3]);
			// Every callout line carries exactly one callout line decoration
			for (const n of [2, 3, 4, 5, 6]) expect(lineClasses.get(n)).toEqual(['cm-lp-callout']);
		});

		it('hides the whole nested marker and both quote prefixes of nested content', () => {
			const state = createState(doc, 0);
			const { replaces } = inspect(state);
			const at = (n: number) => state.doc.line(n).from;
			expect(replaces).toEqual([
				{ from: at(2), to: at(2) + '> [!warning] '.length },
				{ from: at(3), to: at(3) + '> > [!note] '.length },
				{ from: at(4), to: at(4) + '> > '.length },
				{ from: at(5), to: at(5) + '>'.length },
				{ from: at(6), to: at(6) + '> '.length },
			]);
		});

		it('hides the nested callout with its collapsed parent', () => {
			const state = createState(doc.replace('[!warning]', '[!warning]-'), 0);
			const { lineClasses, widgets } = inspect(state);
			expect(widgets.filter((w) => w.name === 'CalloutTypeSwitcherWidget')).toHaveLength(1);
			for (const n of [3, 4, 5, 6]) expect(new Set(lineClasses.get(n))).toEqual(new Set(['cm-lp-hidden-line']));
		});

		it('reveals the nested callout when its parent is revealed', () => {
			const state = createState(doc, doc.indexOf('W')); // cursor on the outer header
			const { widgets, replaces } = inspect(state);
			expect(widgets).toEqual([]);
			expect(replaces).toEqual([]);
		});
	});
});
