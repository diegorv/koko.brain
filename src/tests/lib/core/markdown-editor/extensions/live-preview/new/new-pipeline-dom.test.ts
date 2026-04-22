// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { GFM } from '@lezer/markdown';

import { MathExtension } from '$lib/core/markdown-editor/extensions/lezer/math-extension';
import { HighlightExtension } from '$lib/core/markdown-editor/extensions/lezer/highlight-extension';
import { newInlineExtensions } from '$lib/core/markdown-editor/extensions/live-preview/new/new-inline-extensions';
import { _clearInlineHandlers } from '$lib/core/markdown-editor/extensions/live-preview/new/inline-formatting-plugin';

/**
 * Snapshot-style DOM checks — the only way to assert that
 * syntaxHighlighting(mdStyle) actually emits `cm-lp-*` classes, since
 * HighlightStyle runs inside CodeMirror's render pipeline rather than
 * through the decoration set we can inspect programmatically.
 */
function mount(doc: string): EditorView {
	const view = new EditorView({
		state: EditorState.create({
			doc,
			extensions: [
				markdown({ extensions: [GFM, MathExtension, HighlightExtension] }),
				...newInlineExtensions(),
			],
		}),
		parent: document.body,
	});
	return view;
}

function classesOf(view: EditorView): string[] {
	const out: string[] = [];
	view.dom.querySelectorAll('[class]').forEach((el) => {
		for (const c of el.classList) out.push(c);
	});
	return out;
}

describe('newInlineExtensions — DOM snapshot (flag-on rendering)', () => {
	let view: EditorView | null = null;

	beforeEach(() => {
		_clearInlineHandlers();
	});

	afterEach(() => {
		view?.destroy();
		view = null;
		document.body.innerHTML = '';
	});

	it('renders cm-lp-bold on StrongEmphasis content', () => {
		view = mount('**bold text**');
		expect(classesOf(view)).toContain('cm-lp-bold');
	});

	it('renders cm-lp-italic on Emphasis content', () => {
		view = mount('*italic text*');
		expect(classesOf(view)).toContain('cm-lp-italic');
	});

	it('renders cm-lp-strikethrough on Strikethrough content', () => {
		view = mount('~~struck~~');
		expect(classesOf(view)).toContain('cm-lp-strikethrough');
	});

	it('renders cm-lp-code on InlineCode content', () => {
		view = mount('here is `code` inline');
		expect(classesOf(view)).toContain('cm-lp-code');
	});

	it('renders cm-lp-h1 through cm-lp-h6 for headings', () => {
		view = mount('# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6');
		const classes = classesOf(view);
		for (const lvl of [1, 2, 3, 4, 5, 6]) {
			expect(classes).toContain(`cm-lp-h${lvl}`);
		}
	});

	it('renders cm-lp-highlight via HighlightStyle t.special(t.content)', () => {
		view = mount('==highlighted text==');
		expect(classesOf(view)).toContain('cm-lp-highlight');
	});

	it('applies bold and italic together for ***text***', () => {
		view = mount('***both***');
		const classes = classesOf(view);
		expect(classes).toContain('cm-lp-bold');
		expect(classes).toContain('cm-lp-italic');
	});

	it('does not emit any cm-lp-* class on plain text', () => {
		view = mount('just a plain sentence with no markdown.');
		const classes = classesOf(view);
		const lpClasses = classes.filter((c) => c.startsWith('cm-lp-'));
		expect(lpClasses).toEqual([]);
	});

	it('renders cm-lp-blockquote on > lines via the handler', () => {
		view = mount('> a quoted line\n');
		expect(classesOf(view)).toContain('cm-lp-blockquote');
	});

	it('renders cm-lp-blockquote-2 and -3 at nested depths', () => {
		view = mount('> > two\n> > > three\n');
		const classes = classesOf(view);
		expect(classes).toContain('cm-lp-blockquote-2');
		expect(classes).toContain('cm-lp-blockquote-3');
	});

	it('covers every class the retired plugins emitted', () => {
		// Single comprehensive document mapping each legacy emission to a line,
		// so a future regression in any tag→class rule shows up here.
		view = mount(
			'# Heading One\n' +
				'## Heading Two\n' +
				'### Heading Three\n' +
				'#### Heading Four\n' +
				'##### Heading Five\n' +
				'###### Heading Six\n\n' +
				'Combined **bold** and *italic* and ~~strike~~ and `code` and ==highlight== text.\n\n' +
				'> quote depth 1\n> > quote depth 2\n> > > quote depth 3\n',
		);
		const classes = new Set(classesOf(view));
		for (const expected of [
			'cm-lp-bold',
			'cm-lp-italic',
			'cm-lp-strikethrough',
			'cm-lp-code',
			'cm-lp-highlight',
			'cm-lp-h1',
			'cm-lp-h2',
			'cm-lp-h3',
			'cm-lp-h4',
			'cm-lp-h5',
			'cm-lp-h6',
			'cm-lp-blockquote',
			'cm-lp-blockquote-2',
			'cm-lp-blockquote-3',
		]) {
			expect(classes.has(expected)).toBe(true);
		}
	});
});
