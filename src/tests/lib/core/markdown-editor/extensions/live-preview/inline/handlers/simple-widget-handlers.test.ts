import { describe, it, expect, beforeEach } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import { simpleWidgetHandlers } from '$lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers';
import { buildInlineDecorations } from '$lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { createMarkdownState } from '../../../../test-helpers';

interface DecoSpec { from: number; to: number; class: string; kind?: string; displayMode?: boolean }

function build(doc: string, cursor?: number): DecoSpec[] {
	const state = createMarkdownState(doc).update({
		selection: cursor !== undefined ? EditorSelection.single(cursor) : undefined,
	}).state;
	const set = buildInlineDecorations(
		state,
		[{ from: 0, to: state.doc.length }],
		{ nodeHandlers: [...simpleWidgetHandlers], lineHandlers: [] },
	);
	const result: DecoSpec[] = [];
	const iter = set.iter();
	while (iter.value) {
		const spec = iter.value.spec as {
			class?: string;
			widget?: { constructor: { name: string }; displayMode?: boolean };
		};
		result.push({
			from: iter.from,
			to: iter.to,
			class: spec.class ?? '',
			kind: spec.widget?.constructor.name,
			displayMode: spec.widget?.displayMode,
		});
		iter.next();
	}
	return result;
}

describe('simpleWidgetHandlers', () => {
	beforeEach(() => settingsStore.reset());

	describe('TaskMarker', () => {
		it('replaces unchecked [ ] with TaskCheckboxWidget when cursor away', () => {
			const doc = '- [ ] task one\n\nplain';
			const decos = build(doc, doc.length);
			const checkbox = decos.find((d) => d.kind === 'TaskCheckboxWidget');
			expect(checkbox).toBeDefined();
		});

		it('replaces checked [x] with TaskCheckboxWidget', () => {
			const doc = '- [x] task one\n\nplain';
			const decos = build(doc, doc.length);
			const checkbox = decos.find((d) => d.kind === 'TaskCheckboxWidget');
			expect(checkbox).toBeDefined();
		});

		it('does not replace [ ] when cursor is on the task line', () => {
			const decos = build('- [ ] task one', 5);
			const checkbox = decos.find((d) => d.kind === 'TaskCheckboxWidget');
			expect(checkbox).toBeUndefined();
		});
	});

	describe('HorizontalRule', () => {
		it('hides --- text and adds line border when cursor away', () => {
			const decos = build('para\n\n---\n\nmore', 0);
			const hideMark = decos.find((d) => d.class === 'cm-formatting-hr');
			const lineDeco = decos.find((d) => d.class === 'cm-lp-hr-line');
			expect(hideMark).toBeDefined();
			expect(lineDeco).toBeDefined();
		});

		it('shows --- raw when cursor is on the rule line', () => {
			const doc = 'para\n\n---\n\nmore';
			const decos = build(doc, doc.indexOf('---') + 1);
			const hideMark = decos.find((d) => d.class === 'cm-formatting-hr');
			expect(hideMark).toBeUndefined();
		});
	});

	describe('ListMark — bullet', () => {
		it('replaces `- ` with UnorderedListMarkerWidget when cursor away', () => {
			const doc = '- item one\n\nplain';
			const decos = build(doc, doc.length);
			const widget = decos.find((d) => d.kind === 'UnorderedListMarkerWidget');
			expect(widget).toBeDefined();
		});

		it('does not replace bullet when cursor is on the list line', () => {
			const decos = build('- item one\n\nplain', 5);
			const widget = decos.find((d) => d.kind === 'UnorderedListMarkerWidget');
			expect(widget).toBeUndefined();
		});
	});

	describe('ListMark — task list', () => {
		it('hides `- ` (task-marker variant) when cursor away from task line', () => {
			const doc = '- [ ] task\n\nplain';
			const decos = build(doc, doc.length);
			const taskMark = decos.find((d) => d.class === 'cm-formatting-task-marker');
			expect(taskMark).toBeDefined();
		});
	});

	describe('ListMark — ordered', () => {
		it('replaces `1. ` with OrderedListMarkerWidget when cursor away', () => {
			const doc = '1. one\n2. two\n\nplain';
			const decos = build(doc, doc.length);
			const widget = decos.find((d) => d.kind === 'OrderedListMarkerWidget');
			expect(widget).toBeDefined();
		});
	});

	describe('HardBreak', () => {
		it('hides trailing-space hard break when cursor away', () => {
			// Two trailing spaces before newline → HardBreak in Lezer
			const doc = 'line one  \nline two\n\nplain';
			const decos = build(doc, doc.length);
			const breakMark = decos.find((d) => d.class === 'cm-formatting-hard-break');
			expect(breakMark).toBeDefined();
		});

		it('shows hard break raw when cursor is inside the hard-break range', () => {
			// Hard break = the 2 trailing spaces (positions 8-10 in "line one  ")
			const doc = 'line one  \nline two';
			const decos = build(doc, 9); // cursor between the two spaces
			const breakMark = decos.find((d) => d.class === 'cm-formatting-hard-break');
			expect(breakMark).toBeUndefined();
		});
	});

	describe('InlineMath', () => {
		it('replaces $x^2$ with an inline MathWidget when cursor away', () => {
			const doc = 'paragraph $x^2$ more\n\nplain';
			const decos = build(doc, doc.length);
			const widget = decos.find((d) => d.kind === 'MathWidget');
			expect(widget).toBeDefined();
			// Inline sites must construct the widget in inline mode (span + inline KaTeX).
			expect(widget?.displayMode).toBe(false);
		});
	});

	describe('block context skip', () => {
		it('does not decorate `---` inside a fenced code block', () => {
			const decos = build('```\n---\n```');
			expect(decos.find((d) => d.class === 'cm-formatting-hr')).toBeUndefined();
		});
	});
});
