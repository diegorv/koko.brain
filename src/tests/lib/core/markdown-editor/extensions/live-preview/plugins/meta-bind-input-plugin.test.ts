import { describe, it, expect } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import { buildMetaBindInputDecorations } from '$lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin';
import { createMarkdownState } from '../../../test-helpers';

function collectDecos(decoSet: ReturnType<typeof buildMetaBindInputDecorations>) {
	const result: { from: number; to: number; hasWidget: boolean }[] = [];
	const iter = decoSet.iter();
	while (iter.value) {
		result.push({
			from: iter.from,
			to: iter.to,
			hasWidget: !!(iter.value.spec as { widget?: unknown }).widget,
		});
		iter.next();
	}
	return result;
}

function buildInputs(doc: string, cursor?: number) {
	const baseState = createMarkdownState(doc);
	const safeCursor =
		cursor !== undefined ? Math.min(cursor, baseState.doc.length) : undefined;
	const state = baseState.update({
		selection: safeCursor !== undefined ? EditorSelection.single(safeCursor) : undefined,
	}).state;
	return collectDecos(buildMetaBindInputDecorations(state, [{ from: 0, to: state.doc.length }]));
}

describe('metaBindInputPlugin — buildMetaBindInputDecorations', () => {
	it('replaces INPUT field with widget when cursor is outside', () => {
		const doc = 'text `INPUT[inlineSelect(option(1, one), option(2, two)):rating]` more';
		const decos = buildInputs(doc, 0);
		expect(decos).toHaveLength(1);
		expect(decos[0].hasWidget).toBe(true);
	});

	it('shows source when cursor is on the INPUT field', () => {
		const doc = 'text `INPUT[inlineSelect(option(1, one), option(2, two)):rating]` more';
		const decos = buildInputs(doc, 20); // cursor inside INPUT
		expect(decos).toHaveLength(0);
	});

	it('produces no decorations for plain text', () => {
		const doc = 'just normal text';
		const decos = buildInputs(doc, 0);
		expect(decos).toHaveLength(0);
	});

	it('produces no decorations inside fenced code blocks', () => {
		const doc = '```\n`INPUT[inlineSelect(option(1, one)):rating]`\n```';
		const decos = buildInputs(doc, 0);
		expect(decos).toHaveLength(0);
	});

	it('reads frontmatter properties for current value', () => {
		const doc = '---\nrating: 2\n---\n`INPUT[inlineSelect(option(1, one), option(2, two)):rating]`';
		const decos = buildInputs(doc, 0);
		// The INPUT field is after frontmatter, but cursor is at 0 (in frontmatter)
		// The plugin should find the INPUT and create a widget
		expect(decos).toHaveLength(1);
		expect(decos[0].hasWidget).toBe(true);
	});

	it('handles multiple INPUT fields on different lines', () => {
		const doc = '`INPUT[inlineSelect(option(a, A)):f1]`\n`INPUT[inlineSelect(option(b, B)):f2]`\ntext';
		const decos = buildInputs(doc, doc.length); // cursor on "text" line
		expect(decos).toHaveLength(2);
	});
});

/** Reads the widget instances off a decoration set (spec.widget). */
function collectWidgets(decoSet: ReturnType<typeof buildMetaBindInputDecorations>) {
	const widgets: { currentValue: string | null }[] = [];
	const iter = decoSet.iter();
	while (iter.value) {
		widgets.push((iter.value.spec as { widget: { currentValue: string | null } }).widget);
		iter.next();
	}
	return widgets;
}

describe('metaBindInputPlugin — frontmatter parse does not materialize the full document', () => {
	const INPUT_LINE = '`INPUT[inlineSelect(option(1, one), option(2, two)):rating]`';

	it('never slices beyond the closing frontmatter fence during a rebuild', () => {
		const fm = '---\nrating: 2\n---';
		const doc = `${fm}\n${INPUT_LINE}\n${'lorem ipsum dolor sit amet\n'.repeat(500)}`;
		const state = createMarkdownState(doc);

		// Spy on sliceString: it is the single materialization primitive —
		// Text.toString() delegates to sliceString(0) — so bounding every
		// recorded span bounds every string allocation from the doc.
		const spans: { from: number; to: number }[] = [];
		const origSlice = state.doc.sliceString.bind(state.doc);
		state.doc.sliceString = (from: number, to?: number, lineSep?: string) => {
			spans.push({ from, to: to ?? state.doc.length });
			return origSlice(from, to, lineSep);
		};

		const decos = collectDecos(
			buildMetaBindInputDecorations(state, [{ from: 0, to: state.doc.length }]),
		);

		// The fix must still parse frontmatter (widget produced), just without
		// copying the whole document.
		expect(decos).toHaveLength(1);
		for (const span of spans) {
			expect(span.to).toBeLessThanOrEqual(fm.length);
		}
	});

	it('feeds the frontmatter value to the widget', () => {
		const doc = `---\nrating: 2\n---\n${INPUT_LINE}`;
		const state = createMarkdownState(doc);
		const widgets = collectWidgets(
			buildMetaBindInputDecorations(state, [{ from: 0, to: state.doc.length }]),
		);
		expect(widgets).toHaveLength(1);
		expect(widgets[0].currentValue).toBe('2');
	});

	it('yields null current value when the document has no frontmatter', () => {
		const doc = `text first\n${INPUT_LINE}`;
		const state = createMarkdownState(doc);
		const widgets = collectWidgets(
			buildMetaBindInputDecorations(state, [{ from: 0, to: state.doc.length }]),
		);
		expect(widgets).toHaveLength(1);
		expect(widgets[0].currentValue).toBeNull();
	});

	it('yields null current value when the frontmatter fence never closes', () => {
		const doc = `---\nrating: 2\n${INPUT_LINE}`;
		const state = createMarkdownState(doc);
		const widgets = collectWidgets(
			buildMetaBindInputDecorations(state, [{ from: 0, to: state.doc.length }]),
		);
		expect(widgets).toHaveLength(1);
		expect(widgets[0].currentValue).toBeNull();
	});
});
