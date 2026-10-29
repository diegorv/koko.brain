// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { EditorView } from '@codemirror/view';
import { syntaxHighlighting } from '@codemirror/language';
import { livePreviewExtensions } from '#lib/core/markdown-editor/extensions/live-preview/live-preview.js';
import { markdownLanguage, markdownHighlight } from '#lib/core/markdown-editor/highlight-styles.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { createMarkdownState, stepDateNow } from '../../../test-helpers';

const SAMPLE = '**bold** *italic* ~~strike~~ `code` ==hi==';
const HEADINGS = '# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6\n';
const BLOCKQUOTES = '> a\n> > b\n> > > c\n';

/**
 * Mounts an EditorView in jsdom with the same extension stack the production
 * editor uses (markdown language + the existing markdownHighlight + the live-
 * preview extension array). Returns the view's content element so tests can
 * grep its className list.
 *
 * The state comes from `createMarkdownState`, not a bare `EditorState.create`,
 * because the parse `EditorState.create` starts runs under a hardcoded 20 ms
 * budget (`Work.Apply` in `LanguageState.init`) and snapshots whatever tree
 * that produced. Every live-preview decorator that reads the syntax tree builds
 * its decorations in its ViewPlugin constructor from that snapshot, so a
 * truncated tree silently drops the `cm-lp-*` classes of every block past the
 * cut, with no error.
 *
 * The parse must be finished BEFORE the view is constructed. Repairing it
 * afterwards with `forceParsing(view, ...)` does not work here: it does
 * re-snapshot the full tree, but the empty transaction it dispatches to do so
 * carries no doc change, no selection change and no effect, so
 * `checkUpdateAction` returns `'none'` and every live-preview ViewPlugin keeps
 * the decorations it built from the truncated tree.
 */
function mountView(doc: string, cursor?: number): { view: EditorView; root: HTMLElement } {
	const state = createMarkdownState(doc, {
		cursor,
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

/** Matches a `font-size` declaration (not `--x-font-size` custom properties). */
const FONT_SIZE_DECL = /(?:^|[{;\s])font-size\s*:/;

/**
 * Every plain style rule mounted in the document (style-mod writes the
 * HighlightStyle and theme rules into `<style>` elements under jsdom).
 * Pseudo-element selectors are skipped: `Element.matches` rejects them.
 */
function styleRules(): CSSStyleRule[] {
	const rules: CSSStyleRule[] = [];
	for (const sheet of Array.from(document.styleSheets)) {
		for (const rule of Array.from(sheet.cssRules)) {
			if (rule instanceof CSSStyleRule && !rule.selectorText.includes('::')) rules.push(rule);
		}
	}
	return rules;
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

	describe('heading font size has one owner: the cm-lp-hN line class', () => {
		it('exactly one mounted rule sets each level\'s font size, and it matches the heading line', () => {
			const { view, root } = mountView(HEADINGS);
			cleanup = () => view.destroy();
			const rules = styleRules();
			for (const level of [1, 2, 3, 4, 5, 6]) {
				const owners = rules.filter(
					(r) => FONT_SIZE_DECL.test(r.cssText) && r.cssText.includes(`--heading-h${level}-font-size`),
				);
				expect(owners).toHaveLength(1);
				const line = root.querySelector(`.cm-line.cm-lp-h${level}`)!;
				expect(line.matches(owners[0].selectorText)).toBe(true);
			}
		});

		// The heading text sits in a HighlightStyle span inside the line, so an
		// `em` font size on that span multiplies with the line's. No rule may
		// size anything inside the line, with the cursor off it or on it, so the
		// line height depends only on the line class.
		const cursors: [string, number | undefined][] = [
			['off every heading line', undefined],
			...[1, 2, 3, 4, 5, 6].map((level): [string, number] => [
				`on the H${level} line`,
				HEADINGS.indexOf(` H${level}\n`) + 2,
			]),
		];
		for (const [label, cursor] of cursors) {
			it(`no rule sets font-size on an element inside a heading line (cursor ${label})`, () => {
				const { view, root } = mountView(HEADINGS, cursor);
				cleanup = () => view.destroy();
				const rules = styleRules().filter((r) => FONT_SIZE_DECL.test(r.cssText));
				const offenders: string[] = [];
				root.querySelectorAll('.cm-line[class*="cm-lp-h"] *').forEach((el) => {
					for (const rule of rules) {
						if (el.matches(rule.selectorText)) offenders.push(rule.cssText);
					}
				});
				expect(offenders).toEqual([]);
			});
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

	describe('a stalled initial parse must not truncate the decorated tree', () => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('emits cm-lp-blockquote / -2 / -3 when the initial parse budget expires', () => {
			stepDateNow(25);
			const { view, root } = mountView(BLOCKQUOTES);
			cleanup = () => view.destroy();
			const classes = classesIn(root);
			expect(classes.has('cm-lp-blockquote')).toBe(true);
			expect(classes.has('cm-lp-blockquote-2')).toBe(true);
			expect(classes.has('cm-lp-blockquote-3')).toBe(true);
		});
	});

	describe('disabledDecorators wiring through the real settings store', () => {
		afterEach(() => {
			settingsStore.toggleDecorator('heading', false);
			settingsStore.toggleDecorator('markdownStyle', false);
		});

		it('toggling heading off removes cm-lp-h* from a view mounted via livePreviewExtensions()', () => {
			settingsStore.toggleDecorator('heading', true);
			const { view, root } = mountView(HEADINGS);
			cleanup = () => view.destroy();
			const classes = classesIn(root);
			for (const level of [1, 2, 3, 4, 5, 6]) {
				expect(classes.has(`cm-lp-h${level}`)).toBe(false);
			}
		});

		it('toggling markdownStyle off drops content styling but keeps the formatting plugin alive', () => {
			settingsStore.toggleDecorator('markdownStyle', true);
			// The cursor (offset 0) sits on the leading `plain` line, so no line of
			// SAMPLE is revealed.
			const { view, root } = mountView(`plain\n${SAMPLE}`);
			cleanup = () => view.destroy();
			const classes = classesIn(root);
			expect(classes.has('cm-lp-bold')).toBe(false);
			expect(classes.has('cm-lp-highlight')).toBe(false);
			// The formatting plugin must survive the drop: the `~~` delimiters are
			// still replaced.
			expect(root.querySelector('.cm-content')!.textContent).not.toContain('~~');
		});
	});
});

describe('inline pipeline — links whose hidden part crosses a line break (jsdom)', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	// A replace across a line break is illegal from a ViewPlugin, so hiding these
	// links would make `new EditorView` throw a RangeError. The cursor sits on the
	// leading `plain` line, away from the link.
	it.each([
		['newline before the destination', 'plain\n\n[a](\n/url)', '/url'],
		['newline inside the title', 'plain\n\n[a](/url "t\nx")', '/url'],
		['newline inside the reference label', 'plain\n\n[foo][bar\nbaz]\n\n[bar baz]: /url', 'baz]'],
	])('mounts and renders the source for a link with a %s', (_name, doc, visible) => {
		let mounted: { view: EditorView; root: HTMLElement } | null = null;
		expect(() => {
			mounted = mountView(doc);
		}).not.toThrow();
		const { view, root } = mounted!;
		try {
			expect(root.querySelector('.cm-content')!.textContent).toContain(visible);
		} finally {
			view.destroy();
		}
	});
});

describe('image plugin — images that span a line break (jsdom)', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	// The image widget replaces the whole `Image` node; across a line break that
	// replace is illegal from a ViewPlugin. The cursor sits on the leading `plain`
	// line, away from the image.
	it.each([
		['newline before the destination', 'plain\n\n![a](\n/url)', '/url'],
		['newline inside the resolved reference label', 'plain\n\n![a][r\ns]\n\n[r\ns]: /url', 's]'],
	])('mounts and renders the source for an image with a %s', (_name, doc, visible) => {
		let mounted: { view: EditorView; root: HTMLElement } | null = null;
		expect(() => {
			mounted = mountView(doc);
		}).not.toThrow();
		const { view, root } = mounted!;
		try {
			expect(root.querySelector('.cm-content')!.textContent).toContain(visible);
		} finally {
			view.destroy();
		}
	});
});
