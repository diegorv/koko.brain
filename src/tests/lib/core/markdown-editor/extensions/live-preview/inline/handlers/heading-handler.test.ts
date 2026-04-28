import { describe, it, expect, beforeEach } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import { headingHandlers } from '$lib/core/markdown-editor/extensions/live-preview/inline/handlers/heading-handler';
import { buildInlineDecorations } from '$lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin';
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
		{ nodeHandlers: [...headingHandlers], lineHandlers: [] },
	);
	const result: DecoSpec[] = [];
	const iter = set.iter();
	while (iter.value) {
		result.push({ from: iter.from, to: iter.to, class: (iter.value.spec as { class: string }).class });
		iter.next();
	}
	return result;
}

describe('headingHandlers', () => {
	beforeEach(() => settingsStore.reset());

	describe('ATX headings', () => {
		it.each([
			[1, '# H1'],
			[2, '## H2'],
			[3, '### H3'],
			[4, '#### H4'],
			[5, '##### H5'],
			[6, '###### H6'],
		])('emits cm-lp-h%i line decoration for %s', (level, doc) => {
			const decos = build(doc);
			const lineDeco = decos.find((d) => d.class === `cm-lp-h${level}`);
			expect(lineDeco).toBeDefined();
		});

		it('hides the # marks when cursor is away (cm-formatting-block, no -visible)', () => {
			// Multi-line doc so cursor can be away from the heading line
			const decos = build('# Heading\n\nplain', 12); // cursor on "plain"
			const markDeco = decos.find((d) => d.class === 'cm-formatting-block');
			expect(markDeco).toBeDefined();
		});

		it('reveals the # marks when cursor is on the heading line', () => {
			const decos = build('# Heading\n\nplain', 3); // cursor inside "Heading"
			const markDeco = decos.find((d) => d.class === 'cm-formatting-block cm-formatting-block-visible');
			expect(markDeco).toBeDefined();
		});

		it('mark range covers the # plus the trailing space', () => {
			const decos = build('# Heading');
			const markDeco = decos.find((d) => d.class.startsWith('cm-formatting-block'));
			expect(markDeco).toBeDefined();
			expect(markDeco!.from).toBe(0);
			// `#` is 1 char, `+1` for the trailing space → marks 0..2
			expect(markDeco!.to).toBe(2);
		});

		it('does not match a non-heading line', () => {
			const decos = build('plain text');
			expect(decos).toEqual([]);
		});
	});

	describe('Setext headings', () => {
		it('emits cm-lp-h1 + hides ===== underline (level 1)', () => {
			const doc = 'Heading\n=======';
			const decos = build(doc, 0);
			const lineDeco = decos.find((d) => d.class === 'cm-lp-h1');
			const markDeco = decos.find((d) => d.class.startsWith('cm-formatting-block'));
			expect(lineDeco).toBeDefined();
			expect(markDeco).toBeDefined();
			expect(markDeco!.from).toBe(doc.indexOf('='));
			expect(markDeco!.to).toBe(doc.length);
		});

		it('emits cm-lp-h2 + hides ----- underline (level 2)', () => {
			const doc = 'Heading\n-------';
			const decos = build(doc, 0);
			const lineDeco = decos.find((d) => d.class === 'cm-lp-h2');
			expect(lineDeco).toBeDefined();
		});

		it('reveals the underline when cursor is on the heading', () => {
			const doc = 'Heading\n=======';
			const decos = build(doc, 3); // cursor on "Heading"
			const markDeco = decos.find((d) => d.class === 'cm-formatting-block cm-formatting-block-visible');
			expect(markDeco).toBeDefined();
		});
	});

	describe('block context skip', () => {
		it('does not decorate a "# heading-looking" line inside a fenced code block', () => {
			const decos = build('```\n# fake\n```');
			expect(decos).toEqual([]);
		});
	});
});
