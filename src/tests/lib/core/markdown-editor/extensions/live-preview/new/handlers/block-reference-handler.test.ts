import { describe, it, expect, beforeEach } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import { blockReferenceHandler } from '$lib/core/markdown-editor/extensions/live-preview/new/handlers/block-reference-handler';
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
		{ nodeHandlers: [], lineHandlers: [blockReferenceHandler] },
	);
	const result: DecoSpec[] = [];
	const iter = set.iter();
	while (iter.value) {
		result.push({ from: iter.from, to: iter.to, class: (iter.value.spec as { class: string }).class });
		iter.next();
	}
	return result;
}

describe('blockReferenceHandler', () => {
	beforeEach(() => settingsStore.reset());

	it('hides ^block-id when cursor is on a different line', () => {
		const doc = 'paragraph text ^id-abc\nplain';
		const decos = build(doc, doc.length); // cursor on line 2
		const hidden = decos.find((d) => d.class === 'cm-lp-block-ref cm-lp-block-ref-hidden');
		expect(hidden).toBeDefined();
	});

	it('shows ^block-id dimmed when cursor is on the same line', () => {
		const doc = 'paragraph text ^id-abc\nplain';
		const decos = build(doc, 5); // cursor inside line 1
		const visible = decos.find((d) => d.class === 'cm-lp-block-ref');
		expect(visible).toBeDefined();
	});

	it('reveals ^block-id under raw mode regardless of cursor', () => {
		settingsStore.updateEditor({ rawMode: true });
		const doc = 'paragraph text ^id-abc\nplain';
		const decos = build(doc, doc.length);
		const visible = decos.find((d) => d.class === 'cm-lp-block-ref');
		expect(visible).toBeDefined();
	});

	it('emits no decoration for a line without a block reference', () => {
		const decos = build('plain text without ref');
		expect(decos).toEqual([]);
	});

	it('only matches a ^id at the end of the line, not in the middle', () => {
		const decos = build('text ^mid more text');
		expect(decos).toEqual([]);
	});

	it('skips a block-ref-looking line inside a fenced code block', () => {
		const decos = build('```\ntext ^fake\n```');
		expect(decos).toEqual([]);
	});
});
