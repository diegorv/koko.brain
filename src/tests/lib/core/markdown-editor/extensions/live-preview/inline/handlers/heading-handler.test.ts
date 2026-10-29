import { describe, it, expect, beforeEach } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import { headingHandlers } from '#lib/core/markdown-editor/extensions/live-preview/inline/handlers/heading-handler.js';
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
		{ nodeHandlers: [...headingHandlers], lineHandlers: [] },
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

		it('replaces the # marks when cursor is away', () => {
			// Multi-line doc so cursor can be away from the heading line
			const decos = build('# Heading\n\nplain', 12); // cursor on "plain"
			const hidden = decos.filter((d) => d.class === 'replace');
			expect(hidden).toEqual([{ from: 0, to: 2, class: 'replace' }]);
			expect(decos.find((d) => d.class === 'cm-formatting-block')).toBeUndefined();
		});

		it('reveals the # marks with no replace when cursor is on the heading line', () => {
			const decos = build('# Heading\n\nplain', 3); // cursor inside "Heading"
			expect(decos.filter((d) => d.class === 'replace')).toEqual([]);
			const markDeco = decos.find((d) => d.class === 'cm-formatting-block');
			expect(markDeco).toEqual({ from: 0, to: 2, class: 'cm-formatting-block' });
		});

		it('hidden range covers the # plus the trailing space', () => {
			const decos = build('# Heading\n\nplain', 12);
			const markDeco = decos.find((d) => d.class === 'replace');
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
			const decos = build(doc + '\n\nplain', doc.length + 2); // cursor away
			const lineDeco = decos.find((d) => d.class === 'cm-lp-h1');
			const markDeco = decos.find((d) => d.class === 'replace');
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
			expect(decos.filter((d) => d.class === 'replace')).toEqual([]);
			const markDeco = decos.find((d) => d.class === 'cm-formatting-block');
			expect(markDeco).toEqual({ from: doc.indexOf('='), to: doc.length, class: 'cm-formatting-block' });
		});
	});

	describe('block context skip', () => {
		it('does not decorate a "# heading-looking" line inside a fenced code block', () => {
			const decos = build('```\n# fake\n```');
			expect(decos).toEqual([]);
		});
	});
});
