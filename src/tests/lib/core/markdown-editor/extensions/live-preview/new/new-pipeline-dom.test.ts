// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { syntaxHighlighting } from '@codemirror/language';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { livePreviewExtensions } from '$lib/core/markdown-editor/extensions/live-preview/live-preview';
import { markdownLanguage, markdownHighlight } from '$lib/core/markdown-editor/highlight-styles';

const SAMPLE = '**bold** *italic* ~~strike~~ `code` ==hi==';
const HEADINGS = '# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6\n';

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

describe('new pipeline — DOM snapshot (jsdom)', () => {
	let cleanup: (() => void) | null = null;

	beforeEach(() => {
		settingsStore.reset();
	});

	afterEach(() => {
		cleanup?.();
		cleanup = null;
		document.body.innerHTML = '';
	});

	it('flag OFF: legacy plugin emits cm-lp-bold/italic/strikethrough/code/highlight', () => {
		expect(settingsStore.experimental.newLivePreview).toBe(false);
		const { view, root } = mountView(SAMPLE);
		cleanup = () => view.destroy();

		const classes = classesIn(root);
		expect(classes.has('cm-lp-bold')).toBe(true);
		expect(classes.has('cm-lp-italic')).toBe(true);
		expect(classes.has('cm-lp-strikethrough')).toBe(true);
		expect(classes.has('cm-lp-code')).toBe(true);
		expect(classes.has('cm-lp-highlight')).toBe(true);
	});

	it('flag ON: new pipeline emits the same classes verbatim', () => {
		settingsStore.updateExperimental({ newLivePreview: true });
		const { view, root } = mountView(SAMPLE);
		cleanup = () => view.destroy();

		const classes = classesIn(root);
		expect(classes.has('cm-lp-bold')).toBe(true);
		expect(classes.has('cm-lp-italic')).toBe(true);
		expect(classes.has('cm-lp-strikethrough')).toBe(true);
		expect(classes.has('cm-lp-code')).toBe(true);
		expect(classes.has('cm-lp-highlight')).toBe(true);
	});

	it('flag ON: cm-lp-bold spans cover the bold range (**bold**) and nothing else', () => {
		settingsStore.updateExperimental({ newLivePreview: true });
		const { view, root } = mountView(SAMPLE);
		cleanup = () => view.destroy();

		// Lezer's `StrongEmphasis/...` style applies tags.strong to all descendants
		// (both `**` marks AND the inner content), so multiple spans share the
		// class. Their concatenated text spans the full **bold** marker range.
		const boldEls = root.querySelectorAll('.cm-lp-bold');
		expect(boldEls.length).toBeGreaterThan(0);
		const boldText = Array.from(boldEls).map((el) => el.textContent ?? '').join('');
		expect(boldText).toContain('bold');
		// And does not bleed into the italic word
		expect(boldText).not.toContain('italic');
		expect(boldText).not.toContain('strike');
	});

	it('flag ON: cm-lp-highlight covers the ==hi== range', () => {
		settingsStore.updateExperimental({ newLivePreview: true });
		const { view, root } = mountView(SAMPLE);
		cleanup = () => view.destroy();

		const hlEls = root.querySelectorAll('.cm-lp-highlight');
		expect(hlEls.length).toBeGreaterThan(0);
		const hlText = Array.from(hlEls).map((el) => el.textContent ?? '').join('');
		expect(hlText).toContain('hi');
	});

	it('flag OFF: legacy headingPlugin emits cm-lp-h1..h6 line decorations', () => {
		const { view, root } = mountView(HEADINGS);
		cleanup = () => view.destroy();
		const classes = classesIn(root);
		for (const level of [1, 2, 3, 4, 5, 6]) {
			expect(classes.has(`cm-lp-h${level}`)).toBe(true);
		}
	});

	it('flag ON: new heading handlers emit the same cm-lp-h1..h6 line decorations', () => {
		settingsStore.updateExperimental({ newLivePreview: true });
		const { view, root } = mountView(HEADINGS);
		cleanup = () => view.destroy();
		const classes = classesIn(root);
		for (const level of [1, 2, 3, 4, 5, 6]) {
			expect(classes.has(`cm-lp-h${level}`)).toBe(true);
		}
	});
});
