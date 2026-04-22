import { describe, it, expect, beforeEach } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';

import {
	buildInlineDecorations,
	registerInlineHandler,
	_clearInlineHandlers,
} from '$lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin';
import { simpleWidgetHandlers } from '$lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers';
import { createMarkdownState } from '../../../../test-helpers';

function collect(decoSet: DecorationSet) {
	const result: { from: number; to: number; spec: Record<string, unknown> }[] = [];
	const iter = decoSet.iter();
	while (iter.value) {
		result.push({ from: iter.from, to: iter.to, spec: iter.value.spec as Record<string, unknown> });
		iter.next();
	}
	return result;
}

function build(doc: string, cursor?: number) {
	const state = createMarkdownState(doc).update({
		selection: cursor !== undefined ? EditorSelection.single(cursor) : undefined,
	}).state;
	return collect(buildInlineDecorations(state, [{ from: 0, to: state.doc.length }]));
}

describe('simpleWidgetHandlers', () => {
	beforeEach(() => {
		_clearInlineHandlers();
		for (const h of simpleWidgetHandlers) registerInlineHandler(h);
	});

	describe('horizontal rule', () => {
		it('emits cm-formatting-hr mark + cm-lp-hr-line line deco', () => {
			// Cursor on another line so HR is in non-touched mode
			const decos = build('---\ntext', 5);
			const hrMark = decos.find((d) => d.spec.class === 'cm-formatting-hr');
			const hrLine = decos.find((d) => d.spec.class === 'cm-lp-hr-line');
			expect(hrMark).toBeDefined();
			expect(hrLine).toBeDefined();
		});

		it('skips when cursor is on the HR line', () => {
			const decos = build('---', 1);
			expect(decos).toEqual([]);
		});
	});

	describe('ordered list', () => {
		it('replaces the mark with a widget (via widget spec)', () => {
			// Cursor away from the list
			const decos = build('1. item\n\ntext', 10);
			const widget = decos.find((d) => d.spec.widget);
			expect(widget).toBeDefined();
		});
	});

	describe('unordered list', () => {
		it('emits cm-formatting-ul-marker mark', () => {
			const decos = build('- item\n\ntext', 10);
			const mark = decos.find((d) => d.spec.class === 'cm-formatting-ul-marker');
			expect(mark).toBeDefined();
		});

		it('skips orphan [x] pattern to avoid hiding "- " and leaving "[x]"', () => {
			// If Lezer parses "- [x]" as BulletList+text (no TaskMarker)
			const decos = build('- [x]\n\ntext', 10);
			// Should NOT produce a ul-marker decoration
			const mark = decos.find((d) => d.spec.class === 'cm-formatting-ul-marker');
			expect(mark).toBeUndefined();
		});
	});

	describe('task list', () => {
		it('replaces [ ] with a checkbox widget', () => {
			const decos = build('- [ ] task\n\ntext', 15);
			const widget = decos.find((d) => d.spec.widget);
			expect(widget).toBeDefined();
		});

		it('hides the "- " marker alongside the checkbox', () => {
			const decos = build('- [ ] task\n\ntext', 15);
			const taskMarker = decos.find((d) => d.spec.class === 'cm-formatting-task-marker');
			expect(taskMarker).toBeDefined();
		});
	});

	describe('hard break', () => {
		it('emits cm-formatting-hard-break for trailing backslash', () => {
			const decos = build('line\\\nnext', 9);
			const mark = decos.find((d) => d.spec.class === 'cm-formatting-hard-break');
			expect(mark).toBeDefined();
		});
	});

	describe('inline math', () => {
		it('replaces $x$ with a widget when cursor is away', () => {
			const decos = build('text $a+b$ more', 0);
			const widget = decos.find((d) => d.spec.widget);
			expect(widget).toBeDefined();
		});

		it('leaves $x$ alone when cursor is inside', () => {
			const decos = build('text $a+b$ more', 7);
			expect(decos.find((d) => d.spec.widget)).toBeUndefined();
		});
	});

	describe('dedup', () => {
		it('emits the same decoration once even when ranges overlap', () => {
			const state = createMarkdownState('---\ntext').update({
				selection: EditorSelection.single(5),
			}).state;
			// Two overlapping ranges around the HR
			const decoSet = buildInlineDecorations(state, [
				{ from: 0, to: 5 },
				{ from: 0, to: state.doc.length },
			]);
			const decos = collect(decoSet);
			const hrMarks = decos.filter((d) => d.spec.class === 'cm-formatting-hr');
			expect(hrMarks).toHaveLength(1);
		});
	});
});
