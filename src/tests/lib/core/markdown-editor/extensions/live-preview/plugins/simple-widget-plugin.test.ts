import { describe, it, expect } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import { buildSimpleWidgetDecorations } from '$lib/core/markdown-editor/extensions/live-preview/plugins/simple-widget-plugin';
import { createMarkdownState } from '../../../test-helpers';

function collectDecos(decoSet: ReturnType<typeof buildSimpleWidgetDecorations>) {
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

function buildDecos(doc: string, cursor?: number) {
	const baseState = createMarkdownState(doc);
	const safeCursor =
		cursor !== undefined ? Math.min(cursor, baseState.doc.length) : undefined;
	const state = baseState.update({
		selection: safeCursor !== undefined ? EditorSelection.single(safeCursor) : undefined,
	}).state;
	return collectDecos(buildSimpleWidgetDecorations(state, [{ from: 0, to: state.doc.length }]));
}

// --- Task Marker ---

describe('simpleWidgetPlugin — task markers', () => {
	it('hides list marker and replaces task marker with widget when cursor is outside', () => {
		const doc = '- [ ] todo\ntext';
		const decos = buildDecos(doc, 13);
		// 1 mark (hide "- ") + 1 widget (checkbox for "[ ]") = 2
		expect(decos).toHaveLength(2);
		expect(decos[0].hasWidget).toBe(false); // "- " hidden via CSS
		expect(decos[1].hasWidget).toBe(true);  // checkbox widget
	});

	it('shows source when cursor is on the task line', () => {
		const doc = '- [ ] todo';
		const decos = buildDecos(doc, 5);
		expect(decos).toHaveLength(0);
	});

	it('handles checked tasks', () => {
		const doc = '- [x] done\ntext';
		const decos = buildDecos(doc, 13);
		expect(decos).toHaveLength(2); // mark + widget
		const widgets = decos.filter(d => d.hasWidget);
		expect(widgets).toHaveLength(1);
	});

	it('handles multiple tasks', () => {
		const doc = '- [ ] one\n- [x] two\ntext';
		const decos = buildDecos(doc, 22);
		// 2 tasks × (1 mark + 1 widget) = 4
		expect(decos).toHaveLength(4);
	});

	it('produces no decorations inside fenced code blocks', () => {
		const doc = '```\n- [ ] not a task\n```';
		const decos = buildDecos(doc, 0);
		expect(decos).toHaveLength(0);
	});

	it('per-element: only shows source for task under cursor', () => {
		const doc = '- [ ] first\n- [ ] second\ntext';
		const decos = buildDecos(doc, 5);
		// First task shows source (0 decos), second task has mark + widget = 2
		expect(decos).toHaveLength(2);
		const state = createMarkdownState(doc);
		const line2 = state.doc.line(2);
		expect(decos[0].from).toBeGreaterThanOrEqual(line2.from);
	});

	describe('same-line cursor optimization premise', () => {
		it('decorations are identical when cursor moves within the same task line', () => {
			const doc = '- [ ] a longer task item\ntext';
			const decos1 = buildDecos(doc, 6);
			const decos2 = buildDecos(doc, 15);
			expect(decos1).toEqual(decos2);
		});

		it('decorations are identical when cursor moves within the same non-task line', () => {
			const doc = '- [ ] task\nsome longer text here';
			const decos1 = buildDecos(doc, 15);
			const decos2 = buildDecos(doc, 25);
			expect(decos1).toEqual(decos2);
		});

		it('decorations DIFFER when cursor moves from task line to non-task line', () => {
			const doc = '- [ ] task\ntext';
			const decosOnTask = buildDecos(doc, 6);
			const decosOnText = buildDecos(doc, 13);
			expect(decosOnTask).toHaveLength(0);
			// mark (hide "- ") + widget (checkbox) = 2
			expect(decosOnText).toHaveLength(2);
			expect(decosOnText.some(d => d.hasWidget)).toBe(true);
		});
	});
});

// --- Horizontal Rule ---

describe('simpleWidgetPlugin — horizontal rules', () => {
	it('hides --- via CSS mark and adds line decoration when cursor is outside', () => {
		const doc = 'text\n\n---\nmore';
		const decos = buildDecos(doc, 0);
		// 1 mark (hide text) + 1 line (border-bottom) = 2
		expect(decos).toHaveLength(2);
		expect(decos.every(d => !d.hasWidget)).toBe(true);
	});

	it('hides *** via CSS mark', () => {
		const doc = 'text\n\n***\nmore';
		const decos = buildDecos(doc, 0);
		expect(decos).toHaveLength(2);
	});

	it('shows source when cursor is on the HR line', () => {
		const doc = 'text\n\n---\nmore';
		const decos = buildDecos(doc, 7);
		expect(decos).toHaveLength(0);
	});

	it('produces no decorations for non-HR lines', () => {
		const doc = 'plain text';
		const decos = buildDecos(doc, 0);
		expect(decos).toHaveLength(0);
	});

	it('produces no decorations inside fenced code blocks', () => {
		const doc = '```\n---\n```';
		const decos = buildDecos(doc, 0);
		expect(decos).toHaveLength(0);
	});
});

// --- Ordered List ---

describe('simpleWidgetPlugin — ordered list markers', () => {
	it('replaces ordered list marker with widget when cursor is outside', () => {
		const doc = '1. first\ntext';
		const decos = buildDecos(doc, 11);
		expect(decos).toHaveLength(1);
		expect(decos[0].hasWidget).toBe(true);
		expect(decos[0].from).toBe(0);
		expect(decos[0].to).toBe(3);
	});

	it('shows source when cursor is on the list item line', () => {
		const doc = '1. first';
		const decos = buildDecos(doc, 5);
		expect(decos).toHaveLength(0);
	});

	it('handles multiple ordered list items', () => {
		const doc = '1. first\n2. second\ntext';
		const decos = buildDecos(doc, 20);
		expect(decos).toHaveLength(2);
	});

	it('produces no decorations inside fenced code blocks', () => {
		const doc = '```\n1. not a list\n```';
		const decos = buildDecos(doc, 0);
		expect(decos).toHaveLength(0);
	});

	it('per-element: only shows source for item under cursor', () => {
		const doc = '1. first\n2. second\ntext';
		const decos = buildDecos(doc, 5);
		expect(decos).toHaveLength(1);
		const state = createMarkdownState(doc);
		const line2 = state.doc.line(2);
		expect(decos[0].from).toBe(line2.from);
	});
});

// --- Unordered List ---

describe('simpleWidgetPlugin — unordered list markers', () => {
	it('hides dash marker via CSS mark when cursor is outside', () => {
		const doc = '- first\ntext';
		const decos = buildDecos(doc, 10);
		expect(decos).toHaveLength(1);
		expect(decos[0].hasWidget).toBe(false);
		expect(decos[0].from).toBe(0);
		expect(decos[0].to).toBe(2);
	});

	it('hides asterisk marker via CSS mark', () => {
		const doc = '* first\ntext';
		const decos = buildDecos(doc, 10);
		expect(decos).toHaveLength(1);
		expect(decos[0].hasWidget).toBe(false);
	});

	it('hides plus marker via CSS mark', () => {
		const doc = '+ first\ntext';
		const decos = buildDecos(doc, 10);
		expect(decos).toHaveLength(1);
		expect(decos[0].hasWidget).toBe(false);
	});

	it('shows source when cursor is on the list item line', () => {
		const doc = '- first';
		const decos = buildDecos(doc, 3);
		expect(decos).toHaveLength(0);
	});

	it('handles multiple unordered list items', () => {
		const doc = '- first\n- second\ntext';
		const decos = buildDecos(doc, 19);
		expect(decos).toHaveLength(2);
	});

	it('does not produce unordered bullet for ordered list items', () => {
		const doc = '1. item\ntext';
		const decos = buildDecos(doc, 10);
		// The merged plugin produces an ordered list widget (not a bullet)
		expect(decos).toHaveLength(1);
		// Verify it covers the "1. " mark range, not a bullet
		expect(decos[0].from).toBe(0);
		expect(decos[0].to).toBe(3);
	});

	it('produces no decorations inside fenced code blocks', () => {
		const doc = '```\n- not a list\n```';
		const decos = buildDecos(doc, 0);
		expect(decos).toHaveLength(0);
	});

	it('per-element: only shows source for item under cursor', () => {
		const doc = '- first\n- second\ntext';
		const decos = buildDecos(doc, 3);
		expect(decos).toHaveLength(1);
		const state = createMarkdownState(doc);
		const line2 = state.doc.line(2);
		expect(decos[0].from).toBe(line2.from);
	});
});

// --- Hard Break ---

describe('simpleWidgetPlugin — hard breaks', () => {
	it('hides trailing backslash via CSS mark when cursor is outside', () => {
		const doc = 'line one\\\nline two';
		const decos = buildDecos(doc, 15);
		const hardBreaks = decos.filter(d => d.from >= 8);
		expect(hardBreaks.length).toBeGreaterThanOrEqual(1);
		expect(hardBreaks[0].hasWidget).toBe(false);
	});

	it('shows source when cursor is on the hard break itself', () => {
		const doc = 'line one\\\nline two';
		const decos = buildDecos(doc, 8); // cursor on the backslash
		const hardBreaks = decos.filter(d => d.from === 8);
		expect(hardBreaks).toHaveLength(0);
	});

	it('produces no decorations for lines without hard breaks', () => {
		const doc = 'plain text\nno breaks here';
		const decos = buildDecos(doc, 0);
		expect(decos).toHaveLength(0);
	});
});

// --- Inline Math ---

describe('simpleWidgetPlugin — inline math', () => {
	it('replaces $formula$ with widget when cursor is outside', () => {
		const doc = 'text $E=mc^2$ more';
		const decos = buildDecos(doc, 0);
		const mathDecos = decos.filter(d => d.hasWidget);
		expect(mathDecos.length).toBeGreaterThanOrEqual(1);
	});

	it('shows source when cursor is on the math expression', () => {
		const doc = 'text $E=mc^2$ more';
		const decos = buildDecos(doc, 8); // cursor inside formula
		// When cursor is inside the math, source is shown (no widget)
		const mathRange = decos.filter(d => d.from >= 5 && d.to <= 13);
		expect(mathRange).toHaveLength(0);
	});

	it('produces no decorations inside fenced code blocks', () => {
		const doc = '```\n$E=mc^2$\n```';
		const decos = buildDecos(doc, 0);
		expect(decos).toHaveLength(0);
	});
});

// --- Overlapping Ranges (Deduplication) ---

describe('simpleWidgetPlugin — overlapping ranges deduplication', () => {
	function buildDecosWithRanges(doc: string, ranges: { from: number; to: number }[], cursor?: number) {
		const baseState = createMarkdownState(doc);
		const safeCursor =
			cursor !== undefined ? Math.min(cursor, baseState.doc.length) : undefined;
		const state = baseState.update({
			selection: safeCursor !== undefined ? EditorSelection.single(safeCursor) : undefined,
		}).state;
		return collectDecos(buildSimpleWidgetDecorations(state, ranges));
	}

	it('produces no duplicate decorations when ranges overlap for unordered lists', () => {
		const doc = '- first\n- second\ntext';
		const len = doc.length;
		// Simulate expandedVisibleRanges returning overlapping ranges
		const overlapping = [
			{ from: 0, to: len },
			{ from: 0, to: len },
			{ from: 0, to: len },
		];
		const single = [{ from: 0, to: len }];
		const decosOverlap = buildDecosWithRanges(doc, overlapping, len - 1);
		const decosSingle = buildDecosWithRanges(doc, single, len - 1);
		expect(decosOverlap).toEqual(decosSingle);
	});

	it('produces no duplicate decorations when ranges overlap for ordered lists', () => {
		const doc = '1. first\n2. second\ntext';
		const len = doc.length;
		const overlapping = [
			{ from: 0, to: len },
			{ from: 0, to: len },
		];
		const single = [{ from: 0, to: len }];
		const decosOverlap = buildDecosWithRanges(doc, overlapping, len - 1);
		const decosSingle = buildDecosWithRanges(doc, single, len - 1);
		expect(decosOverlap).toEqual(decosSingle);
	});

	it('produces no duplicate decorations when ranges overlap for horizontal rules', () => {
		const doc = 'text\n\n---\nmore';
		const len = doc.length;
		const overlapping = [
			{ from: 0, to: len },
			{ from: 0, to: len },
		];
		const single = [{ from: 0, to: len }];
		const decosOverlap = buildDecosWithRanges(doc, overlapping, 0);
		const decosSingle = buildDecosWithRanges(doc, single, 0);
		expect(decosOverlap).toEqual(decosSingle);
	});

	it('produces no duplicate decorations for mixed document with overlapping ranges', () => {
		const doc = '- [ ] task\n1. ordered\n- bullet\n\n---\ntext';
		const len = doc.length;
		const overlapping = [
			{ from: 0, to: len },
			{ from: 0, to: len },
			{ from: 0, to: len },
		];
		const single = [{ from: 0, to: len }];
		const decosOverlap = buildDecosWithRanges(doc, overlapping, len - 1);
		const decosSingle = buildDecosWithRanges(doc, single, len - 1);
		expect(decosOverlap).toEqual(decosSingle);
	});
});

// --- Mixed Document (Integration Test) ---

describe('simpleWidgetPlugin — mixed document', () => {
	it('handles all 6 element types in a single document', () => {
		const doc = [
			'- [ ] a task',
			'',
			'---',
			'',
			'1. ordered item',
			'- unordered item',
			'text',
		].join('\n');

		// Cursor on last line (outside all elements)
		const decos = buildDecos(doc, doc.length - 1);

		// task: 1 mark (hide "- ") + 1 widget (checkbox)
		// HR: 1 mark (hide text) + 1 line (border)
		// ordered: 1 widget
		// unordered: 1 mark (bullet)
		const widgets = decos.filter(d => d.hasWidget);
		const marks = decos.filter(d => !d.hasWidget);
		expect(widgets.length).toBe(2); // task checkbox + ordered list marker
		expect(marks.length).toBe(4); // task "- " + HR mark + HR line + UL mark
	});

	it('cursor on one element only shows source for that element', () => {
		const doc = '- [ ] task\n1. ordered\n- unordered\ntext';

		// Cursor on task line — task shows source, others have decorations
		const decos = buildDecos(doc, 5);
		// Task has no decoration (source shown), ordered has widget, unordered has mark
		expect(decos.length).toBe(2); // ordered widget + unordered mark
	});
});
