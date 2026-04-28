import { describe, it, expect, beforeEach } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import { inlineCommentHandler } from '$lib/core/markdown-editor/extensions/live-preview/new/handlers/inline-comment-handler';
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
		{ nodeHandlers: [], lineHandlers: [inlineCommentHandler] },
	);
	const result: DecoSpec[] = [];
	const iter = set.iter();
	while (iter.value) {
		result.push({ from: iter.from, to: iter.to, class: (iter.value.spec as { class: string }).class });
		iter.next();
	}
	return result;
}

describe('inlineCommentHandler', () => {
	beforeEach(() => settingsStore.reset());

	it('hides %%comment%% completely when cursor is away', () => {
		// Doc: "before %%hidden%% after\nplain"
		// Cursor on the second line (away from the comment)
		const doc = 'before %%hidden%% after\nplain';
		const decos = build(doc, doc.length);
		const hidden = decos.find((d) => d.class === 'cm-lp-inline-comment cm-lp-inline-comment-hidden');
		expect(hidden).toBeDefined();
		expect(hidden!.from).toBe(7);
		expect(hidden!.to).toBe(17);
	});

	it('shows %%comment%% dimmed when cursor is inside it', () => {
		const doc = 'before %%inside%% after';
		// Cursor at pos 10 (inside "inside")
		const decos = build(doc, 10);
		const visible = decos.find((d) => d.class === 'cm-lp-inline-comment');
		expect(visible).toBeDefined();
	});

	it('reveals %%comment%% as visible (non-hidden) under raw mode', () => {
		settingsStore.updateEditor({ rawMode: true });
		const doc = 'before %%hidden%% after\nplain';
		const decos = build(doc, doc.length);
		const visible = decos.find((d) => d.class === 'cm-lp-inline-comment');
		expect(visible).toBeDefined();
	});

	it('emits no decoration when there is no %%…%% syntax', () => {
		const decos = build('plain text without comments');
		expect(decos).toEqual([]);
	});

	it('handles multiple comments on the same line', () => {
		const doc = 'a %%one%% b %%two%% c\nplain';
		const decos = build(doc, doc.length); // cursor at end (line 2, away from both comments)
		expect(decos).toHaveLength(2);
		expect(decos[0].class).toContain('cm-lp-inline-comment-hidden');
		expect(decos[1].class).toContain('cm-lp-inline-comment-hidden');
	});

	it('skips comments inside a fenced code block (block-context skip)', () => {
		const decos = build('```\n%%fake%%\n```\nreal %%hi%% line');
		expect(decos).toHaveLength(1); // Only the comment outside the code block
	});
});
