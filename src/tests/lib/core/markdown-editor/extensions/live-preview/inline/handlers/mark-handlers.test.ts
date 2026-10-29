import { describe, it, expect, beforeEach } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import {
	markHandlers,
	escapeHandler,
} from '#lib/core/markdown-editor/extensions/live-preview/inline/handlers/mark-handlers.js';
import { buildInlineDecorations } from '#lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
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
		// A point decoration spanning text is a `Decoration.replace`: the syntax is
		// removed from the DOM, reported here as the `replace` sentinel class.
		const cls = iter.value.point && iter.from < iter.to ? 'replace' : (iter.value.spec as { class: string }).class;
		result.push({ from: iter.from, to: iter.to, class: cls });
		iter.next();
	}
	return result;
}

describe('markHandlers', () => {
	beforeEach(() => settingsStore.reset());

	describe('EmphasisMark (** for bold, * for italic)', () => {
		it('replaces ** when cursor is outside the bold span', () => {
			const decos = build('**bold** plain\nnext', 19); // cursor on the next line
			const hiddenMarks = decos.filter((d) => d.class === 'replace');
			// Two marks (open + close)
			expect(hiddenMarks.length).toBeGreaterThanOrEqual(2);
		});

		it('emits no replace for ** when cursor is inside the bold span', () => {
			const decos = build('**bold** plain', 4); // cursor inside "bold"
			expect(decos.filter((d) => d.class === 'replace')).toEqual([]);
		});

		it('reveals both runs of `**one** and **two**` wherever the cursor is on the line', () => {
			const doc = '**one** and **two**\nnext';
			const lineEnd = doc.indexOf('\n');
			for (let pos = 0; pos <= lineEnd; pos++) {
				expect(build(doc, pos).filter((d) => d.class === 'replace')).toEqual([]);
			}
			// Cursor on the next line hides all four marks
			expect(build(doc, doc.length).filter((d) => d.class === 'replace')).toHaveLength(4);
		});

		it('hides * for italic when cursor outside', () => {
			const decos = build('*italic* plain\nnext', 19);
			const hiddenMarks = decos.filter((d) => d.class === 'replace');
			expect(hiddenMarks.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe('CodeMark (`)', () => {
		it('hides backticks when cursor outside', () => {
			const decos = build('`code` plain\nnext', 17);
			const hidden = decos.filter((d) => d.class === 'replace');
			expect(hidden.length).toBeGreaterThanOrEqual(2);
		});

		it('reveals backticks when cursor inside', () => {
			const decos = build('`code` plain', 3);
			expect(decos.filter((d) => d.class === 'replace')).toEqual([]);
		});
	});

	describe('StrikethroughMark (~~)', () => {
		it('hides ~~ when cursor outside', () => {
			const decos = build('~~strike~~ plain\nnext', 21);
			const hidden = decos.filter((d) => d.class === 'replace');
			expect(hidden.length).toBeGreaterThanOrEqual(2);
		});

		it('reveals ~~ when cursor inside', () => {
			const decos = build('~~strike~~ plain', 5);
			expect(decos.filter((d) => d.class === 'replace')).toEqual([]);
		});
	});

	describe('HighlightMark (==) — flipped from line-handler to Lezer node match', () => {
		it('hides == when cursor outside', () => {
			const decos = build('==hi== plain\nnext', 17);
			const hidden = decos.filter((d) => d.class === 'replace');
			expect(hidden.length).toBeGreaterThanOrEqual(2);
		});

		it('reveals == when cursor inside', () => {
			const decos = build('==hi== plain', 3);
			expect(decos.filter((d) => d.class === 'replace')).toEqual([]);
		});
	});
});

describe('escapeHandler', () => {
	beforeEach(() => settingsStore.reset());

	it('hides the \\ character of an escape sequence when cursor outside', () => {
		const decos = build('text \\* asterisk\nnext line', 20);
		const hidden = decos.find((d) => d.class === 'replace');
		expect(hidden).toBeDefined();
		// Only 1 character hidden (the backslash), not the * itself
		expect(hidden!.to - hidden!.from).toBe(1);
	});

	it('reveals the \\ when the cursor is elsewhere on its line', () => {
		const decos = build('text \\* asterisk\nnext line', 2);
		expect(decos.filter((d) => d.class === 'replace')).toEqual([]);
	});

	it('reveals the \\ when cursor is inside the escape', () => {
		const doc = 'text \\* asterisk';
		const decos = build(doc, doc.indexOf('\\') + 1);
		expect(decos.filter((d) => d.class === 'replace')).toEqual([]);
	});

});

describe('block context skip', () => {
	beforeEach(() => settingsStore.reset());

	it('does not decorate marks inside a fenced code block', () => {
		expect(build('```\n**bold**\n```')).toEqual([]);
	});
});
