import { describe, it, expect, beforeEach } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import { wikilinkHandler } from '$lib/core/markdown-editor/extensions/live-preview/new/handlers/wikilink-handler';
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
		{ nodeHandlers: [], lineHandlers: [wikilinkHandler] },
	);
	const result: DecoSpec[] = [];
	const iter = set.iter();
	while (iter.value) {
		result.push({ from: iter.from, to: iter.to, class: (iter.value.spec as { class: string }).class });
		iter.next();
	}
	return result;
}

describe('wikilinkHandler', () => {
	beforeEach(() => settingsStore.reset());

	it('decorates `[[Target]]` with cm-lp-wikilink + cm-formatting-inline brackets', () => {
		const doc = 'See [[Target]] note\n\nplain';
		const decos = build(doc, doc.length);
		const wikilink = decos.find((d) => d.class === 'cm-lp-wikilink');
		const formatting = decos.filter((d) => d.class === 'cm-formatting-inline');
		expect(wikilink).toBeDefined();
		expect(formatting).toHaveLength(2);
	});

	it('decorates `[[Target|Display]]` showing only the display text', () => {
		const doc = 'See [[Target|My Display]] here\n\nplain';
		const decos = build(doc, doc.length);
		const wikilink = decos.find((d) => d.class === 'cm-lp-wikilink');
		expect(wikilink).toBeDefined();
		// The wikilink decoration should cover only the display range, not "Target|"
		const docText = doc.substring(wikilink!.from, wikilink!.to);
		expect(docText).toBe('My Display');
	});

	it('decorates `[[Target#Heading]]` covering target + heading', () => {
		const doc = 'See [[Target#Section]] here';
		const decos = build(doc, doc.length);
		const wikilink = decos.find((d) => d.class === 'cm-lp-wikilink');
		expect(wikilink).toBeDefined();
		const docText = doc.substring(wikilink!.from, wikilink!.to);
		expect(docText).toBe('Target#Section');
	});

	it('decorates `[[Target#^block-id]]` covering target + block-id', () => {
		const doc = 'See [[Target#^abc-123]] here';
		const decos = build(doc, doc.length);
		const wikilink = decos.find((d) => d.class === 'cm-lp-wikilink');
		expect(wikilink).toBeDefined();
		const docText = doc.substring(wikilink!.from, wikilink!.to);
		expect(docText).toBe('Target#^abc-123');
	});

	it('shows source when cursor is inside the wikilink', () => {
		const doc = 'See [[Target]] note';
		const decos = build(doc, 8); // cursor inside Target
		expect(decos.find((d) => d.class === 'cm-lp-wikilink')).toBeUndefined();
	});

	it('reveals source under raw mode', () => {
		settingsStore.updateEditor({ rawMode: true });
		const doc = 'See [[Target]] note\n\nplain';
		const decos = build(doc, doc.length);
		expect(decos.find((d) => d.class === 'cm-lp-wikilink')).toBeUndefined();
	});

	it('emits no decoration for plain text', () => {
		expect(build('plain text without wikilinks')).toEqual([]);
	});

	it('skips wikilinks inside a fenced code block', () => {
		expect(build('```\n[[Fake]]\n```')).toEqual([]);
	});
});
