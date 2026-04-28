import { describe, it, expect, beforeEach } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import {
	markHandlers,
	escapeHandler,
} from '$lib/core/markdown-editor/extensions/live-preview/new/handlers/mark-handlers';
import { buildInlineDecorations } from '$lib/core/markdown-editor/extensions/live-preview/new/inline-formatting-plugin';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { createMarkdownState } from '../../../../test-helpers';

interface DecoSpec { from: number; to: number; class: string }

function build(doc: string, cursor?: number): DecoSpec[] {
	const state = createMarkdownState(doc).update({
		selection: cursor !== undefined ? EditorSelection.single(cursor) : undefined,
	}).state;
	const set = buildInlineDecorations(
		state,
		[{ from: 0, to: state.doc.length }],
		{ nodeHandlers: [...markHandlers, escapeHandler], lineHandlers: [] },
	);
	const result: DecoSpec[] = [];
	const iter = set.iter();
	while (iter.value) {
		result.push({ from: iter.from, to: iter.to, class: (iter.value.spec as { class: string }).class });
		iter.next();
	}
	return result;
}

describe('markHandlers', () => {
	beforeEach(() => settingsStore.reset());

	describe('EmphasisMark (** for bold, * for italic)', () => {
		it('hides ** when cursor is outside the bold span', () => {
			const decos = build('**bold** plain', 10); // cursor at "plain"
			const hiddenMarks = decos.filter((d) => d.class === 'cm-formatting-inline');
			// Two marks (open + close)
			expect(hiddenMarks.length).toBeGreaterThanOrEqual(2);
		});

		it('reveals ** when cursor is inside the bold span', () => {
			const decos = build('**bold** plain', 4); // cursor inside "bold"
			const visibleMarks = decos.filter((d) => d.class === 'cm-formatting-inline cm-formatting-inline-visible');
			expect(visibleMarks.length).toBeGreaterThanOrEqual(2);
		});

		it('hides * for italic when cursor outside', () => {
			const decos = build('*italic* plain', 10);
			const hiddenMarks = decos.filter((d) => d.class === 'cm-formatting-inline');
			expect(hiddenMarks.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe('CodeMark (`)', () => {
		it('hides backticks when cursor outside', () => {
			const decos = build('`code` plain', 8);
			const hidden = decos.filter((d) => d.class === 'cm-formatting-inline');
			expect(hidden.length).toBeGreaterThanOrEqual(2);
		});

		it('reveals backticks when cursor inside', () => {
			const decos = build('`code` plain', 3);
			const visible = decos.filter((d) => d.class === 'cm-formatting-inline cm-formatting-inline-visible');
			expect(visible.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe('StrikethroughMark (~~)', () => {
		it('hides ~~ when cursor outside', () => {
			const decos = build('~~strike~~ plain', 12);
			const hidden = decos.filter((d) => d.class === 'cm-formatting-inline');
			expect(hidden.length).toBeGreaterThanOrEqual(2);
		});

		it('reveals ~~ when cursor inside', () => {
			const decos = build('~~strike~~ plain', 5);
			const visible = decos.filter((d) => d.class === 'cm-formatting-inline cm-formatting-inline-visible');
			expect(visible.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe('HighlightMark (==) — flipped from line-handler to Lezer node match', () => {
		it('hides == when cursor outside', () => {
			const decos = build('==hi== plain', 8);
			const hidden = decos.filter((d) => d.class === 'cm-formatting-inline');
			expect(hidden.length).toBeGreaterThanOrEqual(2);
		});

		it('reveals == when cursor inside', () => {
			const decos = build('==hi== plain', 3);
			const visible = decos.filter((d) => d.class === 'cm-formatting-inline cm-formatting-inline-visible');
			expect(visible.length).toBeGreaterThanOrEqual(2);
		});
	});
});

describe('escapeHandler', () => {
	beforeEach(() => settingsStore.reset());

	it('hides the \\ character of an escape sequence when cursor outside', () => {
		const decos = build('text \\* asterisk\nnext line', 20);
		const hidden = decos.find((d) => d.class === 'cm-formatting-inline');
		expect(hidden).toBeDefined();
		// Only 1 character hidden (the backslash), not the * itself
		expect(hidden!.to - hidden!.from).toBe(1);
	});

	it('reveals the \\ when cursor is inside the escape', () => {
		const doc = 'text \\* asterisk';
		const decos = build(doc, doc.indexOf('\\') + 1);
		const visible = decos.find((d) => d.class === 'cm-formatting-inline cm-formatting-inline-visible');
		expect(visible).toBeDefined();
	});

	it('shows escapes raw under raw mode', () => {
		settingsStore.updateEditor({ rawMode: true });
		const decos = build('text \\* asterisk\nnext', 18);
		const hidden = decos.find((d) => d.class === 'cm-formatting-inline');
		expect(hidden).toBeUndefined();
	});
});

describe('block context skip', () => {
	beforeEach(() => settingsStore.reset());

	it('does not decorate marks inside a fenced code block', () => {
		expect(build('```\n**bold**\n```')).toEqual([]);
	});
});
