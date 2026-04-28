// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { syntaxHighlighting } from '@codemirror/language';
import { livePreviewExtensions } from '$lib/core/markdown-editor/extensions/live-preview/live-preview';
import { markdownLanguage, markdownHighlight } from '$lib/core/markdown-editor/highlight-styles';

const SAMPLE = '**bold** *italic* ~~strike~~ `code` ==hi==';
const HEADINGS = '# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6\n';
const BLOCKQUOTES = '> a\n> > b\n> > > c\n';

/**
 * Mounts an EditorView in jsdom with the same extension stack the production
 * editor uses (markdown language + the existing markdownHighlight + the live-
 * preview extension array). Returns the view's content element so tests can
 * grep its className list.
 */
function mountView(doc: string): { view: EditorView; root: HTMLElement } {
	const state = EditorState.create({
		doc,
		extensions: [
			markdownLanguage(),
			syntaxHighlighting(markdownHighlight),
			livePreviewExtensions(),
		],
	});
	const root = document.body.appendChild(document.createElement('div'));
	const view = new EditorView({ state, parent: root });
	return { view, root };
}

function classesIn(root: HTMLElement): Set<string> {
	const result = new Set<string>();
	root.querySelectorAll('[class]').forEach((el) => {
		(el as HTMLElement).classList.forEach((c) => result.add(c));
	});
	return result;
}

describe('inline pipeline — DOM snapshot (jsdom)', () => {
	let cleanup: (() => void) | null = null;

	afterEach(() => {
		cleanup?.();
		cleanup = null;
		document.body.innerHTML = '';
	});

	it('emits cm-lp-bold/italic/strikethrough/code/highlight on the inline sample', () => {
		const { view, root } = mountView(SAMPLE);
		cleanup = () => view.destroy();
		const classes = classesIn(root);
		expect(classes.has('cm-lp-bold')).toBe(true);
		expect(classes.has('cm-lp-italic')).toBe(true);
		expect(classes.has('cm-lp-strikethrough')).toBe(true);
		expect(classes.has('cm-lp-code')).toBe(true);
		expect(classes.has('cm-lp-highlight')).toBe(true);
	});

	it('cm-lp-bold spans cover the bold range and nothing else', () => {
		const { view, root } = mountView(SAMPLE);
		cleanup = () => view.destroy();
		// Lezer's `StrongEmphasis/...` style applies tags.strong to all descendants
		// (both `**` marks AND the inner content), so multiple spans share the
		// class. Their concatenated text spans the full **bold** marker range.
		const boldEls = root.querySelectorAll('.cm-lp-bold');
		expect(boldEls.length).toBeGreaterThan(0);
		const boldText = Array.from(boldEls).map((el) => el.textContent ?? '').join('');
		expect(boldText).toContain('bold');
		expect(boldText).not.toContain('italic');
		expect(boldText).not.toContain('strike');
	});

	it('cm-lp-highlight covers the ==hi== range', () => {
		const { view, root } = mountView(SAMPLE);
		cleanup = () => view.destroy();
		const hlEls = root.querySelectorAll('.cm-lp-highlight');
		expect(hlEls.length).toBeGreaterThan(0);
		const hlText = Array.from(hlEls).map((el) => el.textContent ?? '').join('');
		expect(hlText).toContain('hi');
	});

	it('emits cm-lp-h1..h6 for ATX heading levels', () => {
		const { view, root } = mountView(HEADINGS);
		cleanup = () => view.destroy();
		const classes = classesIn(root);
		for (const level of [1, 2, 3, 4, 5, 6]) {
			expect(classes.has(`cm-lp-h${level}`)).toBe(true);
		}
	});

	it('emits cm-lp-blockquote / -2 / -3 by depth', () => {
		const { view, root } = mountView(BLOCKQUOTES);
		cleanup = () => view.destroy();
		const classes = classesIn(root);
		expect(classes.has('cm-lp-blockquote')).toBe(true);
		expect(classes.has('cm-lp-blockquote-2')).toBe(true);
		expect(classes.has('cm-lp-blockquote-3')).toBe(true);
	});
});
