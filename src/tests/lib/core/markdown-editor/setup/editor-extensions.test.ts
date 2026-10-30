// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { createExtensions, editorModeEffects, sourceModeExtensions } from '#lib/core/markdown-editor/setup/editor-extensions.js';
import type { CreateExtensionsOptions } from '#lib/core/markdown-editor/setup/editor-extensions.js';
import { mountMarkdownView } from '../test-helpers';

function makeOptions(overrides: Partial<CreateExtensionsOptions> = {}): CreateExtensionsOptions {
	return {
		isLivePreview: false,
		fontFamily: 'Menlo, monospace',
		fontSize: 16,
		lineHeight: 1.6,
		contentWidth: 0,
		paragraphSpacing: 0,
		sourceModeCompartment: new Compartment(),
		editorThemeCompartment: new Compartment(),
		languageCompartment: new Compartment(),
		highlightStyleCompartment: new Compartment(),
		onDocChanged: vi.fn(),
		isTabSwitching: () => false,
		isExternalEdit: () => false,
		...overrides,
	};
}

describe('createExtensions', () => {
	it('returns a non-empty array of extensions', () => {
		const extensions = createExtensions(makeOptions());
		expect(extensions).toBeInstanceOf(Array);
		expect(extensions.length).toBeGreaterThan(0);
	});

	it('returns extensions when live preview is enabled', () => {
		const extensions = createExtensions(makeOptions({ isLivePreview: true }));
		expect(extensions).toBeInstanceOf(Array);
		expect(extensions.length).toBeGreaterThan(0);
	});

	it('returns extensions when live preview is disabled', () => {
		const extensions = createExtensions(makeOptions({ isLivePreview: false }));
		expect(extensions).toBeInstanceOf(Array);
		expect(extensions.length).toBeGreaterThan(0);
	});

	it('returns a new array on each call', () => {
		const opts = makeOptions();
		const a = createExtensions(opts);
		const b = createExtensions(opts);
		expect(a).not.toBe(b);
	});

	it('handles different font settings', () => {
		const a = createExtensions(makeOptions({ fontFamily: 'Menlo', fontSize: 14, lineHeight: 1.4 }));
		const b = createExtensions(makeOptions({ fontFamily: 'Monaco', fontSize: 18, lineHeight: 2.0 }));
		expect(a.length).toBe(b.length);
	});

	it('suppresses onDocChanged while an external-content doc replace is in flight', () => {
		const onDocChanged = vi.fn();
		let isExternalEdit = false;
		const state = EditorState.create({
			doc: 'hello',
			extensions: createExtensions(makeOptions({ onDocChanged, isExternalEdit: () => isExternalEdit })),
		});
		const root = document.createElement('div');
		document.body.appendChild(root);
		const view = new EditorView({ state, parent: root });

		try {
			// A user edit reports normally.
			view.dispatch({ changes: { from: 5, insert: '!' } });
			expect(onDocChanged).toHaveBeenCalledTimes(1);

			// The doc replace driven by `syncExternalContentToEditor` must NOT
			// re-enter the keystroke pipeline — the caller's explicit `schedule`
			// owns the auto-save timer for external writes.
			isExternalEdit = true;
			view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: 'external' } });
			expect(onDocChanged).toHaveBeenCalledTimes(1);
		} finally {
			view.destroy();
			root.remove();
		}
	});

	it('uses the same compartment references passed in options', () => {
		const sourceModeCompartment = new Compartment();
		const editorThemeCompartment = new Compartment();
		const languageCompartment = new Compartment();
		const highlightStyleCompartment = new Compartment();

		const extensions = createExtensions(makeOptions({
			sourceModeCompartment,
			editorThemeCompartment,
			languageCompartment,
			highlightStyleCompartment,
		}));

		// The extensions array should contain the compartment configurations
		expect(extensions.length).toBeGreaterThan(0);
	});

	describe('heading font size has one owner per mode', () => {
		const HEADINGS = '# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6\n';
		/** Matches a `font-size` declaration (not `--x-font-size` custom properties). */
		const FONT_SIZE_DECL = /(?:^|[{;\s])font-size\s*:/;

		/** Every plain mounted style rule that declares `font-size`. */
		function fontSizeRules(): CSSStyleRule[] {
			const rules: CSSStyleRule[] = [];
			for (const sheet of Array.from(document.styleSheets)) {
				for (const rule of Array.from(sheet.cssRules)) {
					if (
						rule instanceof CSSStyleRule &&
						!rule.selectorText.includes('::') &&
						FONT_SIZE_DECL.test(rule.cssText)
					) {
						rules.push(rule);
					}
				}
			}
			return rules;
		}

		/** The font-size rules matching each heading line or anything inside it, per level. */
		function ownersByLevel(view: EditorView): CSSStyleRule[][] {
			const rules = fontSizeRules();
			const lines = Array.from(view.contentDOM.querySelectorAll('.cm-line')).slice(0, 6);
			return lines.map((line) => {
				const els = [line, ...Array.from(line.querySelectorAll('*'))];
				return rules.filter((rule) => els.some((el) => el.matches(rule.selectorText)));
			});
		}

		function mount(opts: CreateExtensionsOptions) {
			const view = mountMarkdownView(HEADINGS, { extensions: createExtensions(opts) });
			return {
				view,
				dispose: () => {
					view.destroy();
					view.dom.parentElement?.remove();
				},
			};
		}

		it('source mode sizes each heading through exactly one rule, from the heading size setting', () => {
			const { view, dispose } = mount(makeOptions({ isLivePreview: false }));
			try {
				const owners = ownersByLevel(view);
				expect(owners).toHaveLength(6);
				owners.forEach((rules, i) => {
					expect(rules, `H${i + 1}`).toHaveLength(1);
					expect(rules[0].cssText, `H${i + 1}`).toContain(`--heading-h${i + 1}-font-size`);
				});
			} finally {
				dispose();
			}
		});

		it('the editor mode toggle keeps one heading size owner per level in each mode', () => {
			const sourceModeCompartment = new Compartment();
			const { view, dispose } = mount(makeOptions({ isLivePreview: true, sourceModeCompartment }));
			/** Per level: true when exactly one rule sizes the heading and it is that level's owner. */
			const singleOwner = (owner: (level: number) => string) =>
				ownersByLevel(view).map((rules, i) => rules.length === 1 && rules[0].cssText.includes(owner(i + 1)));
			const livePreviewOwner = (level: number) => `.cm-lp-h${level}`;
			const sourceOwner = (level: number) => `--heading-h${level}-font-size`;
			const all = [true, true, true, true, true, true];
			try {
				expect(singleOwner(livePreviewOwner)).toEqual(all);

				view.dispatch({ effects: editorModeEffects(false, sourceModeCompartment) });
				expect(view.contentDOM.querySelector('[class*="cm-lp-h"]')).toBeNull();
				expect(singleOwner(sourceOwner)).toEqual(all);

				view.dispatch({ effects: editorModeEffects(true, sourceModeCompartment) });
				expect(singleOwner(livePreviewOwner)).toEqual(all);
			} finally {
				dispose();
			}
		});

		it('leaving source mode drops the source-mode heading size rule', () => {
			const sourceModeCompartment = new Compartment();
			const { view, dispose } = mount(makeOptions({ isLivePreview: false, sourceModeCompartment }));
			try {
				view.dispatch({ effects: sourceModeCompartment.reconfigure([]) });
				for (const rules of ownersByLevel(view)) {
					expect(rules).toEqual([]);
				}
			} finally {
				dispose();
			}
		});
	});

	describe('legacy source-mode decorations', () => {
		const DOC = '> [!note] Title\n> body\n\nSee [[Target]] here.';

		function mount(opts: CreateExtensionsOptions) {
			const view = mountMarkdownView(DOC, { extensions: createExtensions(opts) });
			return {
				view,
				dispose: () => {
					view.destroy();
					view.dom.parentElement?.remove();
				},
			};
		}

		function legacyClasses(view: EditorView) {
			return {
				wikilinkTarget: view.contentDOM.querySelectorAll('.cm-wikilink-target').length,
				callout: view.contentDOM.querySelectorAll('.cm-callout').length,
				gutter: view.dom.querySelectorAll('.cm-lineNumbers').length,
			};
		}

		it('source mode installs the legacy wikilink and callout decorations', () => {
			const { view, dispose } = mount(makeOptions({ isLivePreview: false }));
			try {
				expect(legacyClasses(view)).toEqual({ wikilinkTarget: 1, callout: 1, gutter: 1 });
			} finally {
				dispose();
			}
		});

		it('live preview does not install the legacy wikilink and callout decorations', () => {
			const { view, dispose } = mount(makeOptions({ isLivePreview: true }));
			try {
				expect(legacyClasses(view)).toEqual({ wikilinkTarget: 0, callout: 0, gutter: 0 });
			} finally {
				dispose();
			}
		});

		it('toggling the mode through the compartment swaps the legacy decorations', () => {
			const sourceModeCompartment = new Compartment();
			const { view, dispose } = mount(makeOptions({ isLivePreview: true, sourceModeCompartment }));
			try {
				view.dispatch({ effects: sourceModeCompartment.reconfigure(sourceModeExtensions()) });
				expect(legacyClasses(view)).toEqual({ wikilinkTarget: 1, callout: 1, gutter: 1 });

				view.dispatch({ effects: sourceModeCompartment.reconfigure([]) });
				expect(legacyClasses(view)).toEqual({ wikilinkTarget: 0, callout: 0, gutter: 0 });
			} finally {
				dispose();
			}
		});
	});
});
