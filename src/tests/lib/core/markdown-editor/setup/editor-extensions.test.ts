// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { completionStatus, currentCompletions, startCompletion } from '@codemirror/autocomplete';

import {
	COPY_BLOCK_LINK_SHORTCUT,
	createExtensions,
	editorModeEffects,
	sourceModeExtensions,
} from '#lib/core/markdown-editor/setup/editor-extensions.js';
import type { CreateExtensionsOptions } from '#lib/core/markdown-editor/setup/editor-extensions.js';
import { editorHost, NOOP_HOST, type EditorHost } from '#lib/core/markdown-editor/editor-host.js';
import { fencedBlockRenderers } from '#lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.js';
import { livePreviewCompartment } from '#lib/core/markdown-editor/extensions/live-preview/live-preview.js';
import { fakeBlockRenderer, mountMarkdownView } from '../test-helpers';

function makeOptions(overrides: Partial<CreateExtensionsOptions> = {}): CreateExtensionsOptions {
	return {
		isLivePreview: false,
		fontFamily: 'Menlo, monospace',
		fontSize: 16,
		lineHeight: 1.6,
		contentWidth: 0,
		paragraphSpacing: 0,
		dark: true,
		sourceModeCompartment: new Compartment(),
		editorThemeCompartment: new Compartment(),
		languageCompartment: new Compartment(),
		highlightStyleCompartment: new Compartment(),
		host: NOOP_HOST,
		renderers: [],
		disabledDecorators: {},
		copyBlockLink: vi.fn(),
		onDocChanged: vi.fn(),
		isTabSwitching: () => false,
		isExternalEdit: () => false,
		...overrides,
	};
}

describe('createExtensions', () => {
	describe('editor host', () => {
		const host: EditorHost = { ...NOOP_HOST, resolveLink: () => '/vault/x.md' };

		it('installs the given host in both modes', () => {
			for (const isLivePreview of [true, false]) {
				const state = EditorState.create({ doc: '', extensions: createExtensions(makeOptions({ host, isLivePreview })) });
				expect(state.facet(editorHost), `isLivePreview=${isLivePreview}`).toBe(host);
			}
		});

		it('keeps the host through a mode switch, outside every compartment', () => {
			const sourceModeCompartment = new Compartment();
			let state = EditorState.create({
				doc: '',
				extensions: createExtensions(makeOptions({ host, isLivePreview: true, sourceModeCompartment })),
			});
			state = state.update({ effects: editorModeEffects(false, sourceModeCompartment, {}) }).state;
			expect(state.facet(editorHost)).toBe(host);
			state = state.update({ effects: editorModeEffects(true, sourceModeCompartment, {}) }).state;
			expect(state.facet(editorHost)).toBe(host);
		});
	});

	describe('theme mode', () => {
		it('passes the dark option to the editor theme', () => {
			for (const dark of [false, true]) {
				const state = EditorState.create({ doc: '', extensions: createExtensions(makeOptions({ dark })) });
				expect(state.facet(EditorView.darkTheme), `dark=${dark}`).toBe(dark);
			}
		});
	});

	describe('completion sources', () => {
		const host: EditorHost = {
			...NOOP_HOST,
			listTags: () => Promise.resolve([{ name: 'area/sub', count: 1 }]),
			listLinkCandidates: () =>
				Promise.resolve({ files: [{ name: 'Alpha.md', nameWithoutExt: 'Alpha', path: '/vault/Alpha.md' }], notes: [] }),
		};

		/** The completion labels the shared autocompletion instance shows for `doc`, cursor at the end. */
		async function labelsFor(doc: string, isLivePreview: boolean): Promise<string[]> {
			const view = mountMarkdownView(doc, {
				extensions: createExtensions(makeOptions({ host, isLivePreview })),
				cursor: doc.length,
			});
			try {
				startCompletion(view);
				await vi.waitFor(() => expect(completionStatus(view.state)).toBe('active'));
				return currentCompletions(view.state).map((c) => c.label);
			} finally {
				view.destroy();
			}
		}

		it('offers the host tags after # and the host files after [[, in both modes', async () => {
			for (const isLivePreview of [true, false]) {
				expect(await labelsFor('see #ar', isLivePreview), `isLivePreview=${isLivePreview}`).toEqual(['area/sub']);
				expect(await labelsFor('see [[Alp', isLivePreview), `isLivePreview=${isLivePreview}`).toEqual(['Alpha']);
			}
		});
	});

	describe('fenced-block renderers', () => {
		const queryjs = fakeBlockRenderer('queryjs');
		const collection = fakeBlockRenderer('collection');

		it('installs the given renderers by language', () => {
			const state = EditorState.create({
				doc: '',
				extensions: createExtensions(makeOptions({ renderers: [queryjs, collection], isLivePreview: true })),
			});
			expect(state.facet(fencedBlockRenderers).get('queryjs')).toBe(queryjs);
			expect(state.facet(fencedBlockRenderers).get('collection')).toBe(collection);
		});

		it('keeps the renderers through a mode switch and an emptied live-preview compartment', () => {
			const sourceModeCompartment = new Compartment();
			let state = EditorState.create({
				doc: '',
				extensions: createExtensions(makeOptions({ renderers: [queryjs], isLivePreview: true, sourceModeCompartment })),
			});
			state = state.update({ effects: editorModeEffects(false, sourceModeCompartment, {}) }).state;
			expect(state.facet(fencedBlockRenderers).get('queryjs')).toBe(queryjs);
			state = state.update({ effects: livePreviewCompartment.reconfigure([]) }).state;
			expect(state.facet(fencedBlockRenderers).get('queryjs')).toBe(queryjs);
		});

		it('installs none when given none', () => {
			const state = EditorState.create({ doc: '', extensions: createExtensions(makeOptions()) });
			expect(state.facet(fencedBlockRenderers).size).toBe(0);
		});
	});

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

	it('leaves Mod-d to the app (Favorite): it does not select the next occurrence and is not consumed', () => {
		const state = EditorState.create({
			doc: 'foo bar foo',
			selection: { anchor: 0, head: 3 },
			extensions: createExtensions(makeOptions()),
		});
		const root = document.createElement('div');
		document.body.appendChild(root);
		const view = new EditorView({ state, parent: root });

		try {
			// jsdom is not macOS, so CodeMirror's `Mod` is Ctrl here.
			const event = new KeyboardEvent('keydown', { key: 'd', ctrlKey: true, bubbles: true, cancelable: true });
			view.contentDOM.dispatchEvent(event);

			expect(view.state.selection.ranges).toHaveLength(1);
			expect(event.defaultPrevented).toBe(false);
		} finally {
			view.destroy();
			root.remove();
		}
	});

	it('binds COPY_BLOCK_LINK_SHORTCUT (Cmd+Shift+L) to copy the link to the block', () => {
		expect(COPY_BLOCK_LINK_SHORTCUT).toEqual({ meta: true, shift: true, key: 'l' });
		const copyBlockLink = vi.fn();
		const state = EditorState.create({ doc: 'foo', extensions: createExtensions(makeOptions({ copyBlockLink })) });
		const root = document.createElement('div');
		document.body.appendChild(root);
		const view = new EditorView({ state, parent: root });

		try {
			// jsdom is not macOS, so CodeMirror's `Mod` is Ctrl here. CodeMirror
			// maps a shifted letter back to its base key through `keyCode`.
			const event = new KeyboardEvent('keydown', { key: 'L', keyCode: 76, ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true });
			view.contentDOM.dispatchEvent(event);

			expect(copyBlockLink).toHaveBeenCalledWith(view);
			expect(event.defaultPrevented).toBe(true);
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
					const root = view.dom.parentElement;
					view.destroy();
					root?.remove();
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

				view.dispatch({ effects: editorModeEffects(false, sourceModeCompartment, {}) });
				expect(view.contentDOM.querySelector('[class*="cm-lp-h"]')).toBeNull();
				expect(singleOwner(sourceOwner)).toEqual(all);

				view.dispatch({ effects: editorModeEffects(true, sourceModeCompartment, {}) });
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

	describe('active-line background', () => {
		/** Frontmatter, then the blank line the cursor lands on when a note opens, then the title. */
		const DOC = '---\ntags: [a]\n---\n\n# Title\n';
		const BODY_START = DOC.indexOf('\n\n') + 1;

		function mount(opts: CreateExtensionsOptions) {
			const view = mountMarkdownView(DOC, { extensions: createExtensions(opts), cursor: BODY_START });
			return {
				view,
				dispose: () => {
					const root = view.dom.parentElement;
					view.destroy();
					root?.remove();
				},
			};
		}

		/** The line holding the cursor; the class stays in both modes (E2E specs locate the caret by it). */
		function activeLine(view: EditorView): HTMLElement {
			const line = view.contentDOM.querySelector<HTMLElement>('.cm-activeLine');
			if (!line) throw new Error('no .cm-activeLine');
			return line;
		}

		/** How jsdom reports a computed `transparent`. */
		const TRANSPARENT = 'rgba(0, 0, 0, 0)';
		const SOURCE_FILL = 'var(--syntax-active-line)';

		const background = (view: EditorView) => getComputedStyle(activeLine(view)).backgroundColor;

		it('live preview paints no background on the blank cursor line under the frontmatter', () => {
			const { view, dispose } = mount(makeOptions({ isLivePreview: true }));
			try {
				expect(activeLine(view).textContent).toBe('');
				expect(background(view)).toBe(TRANSPARENT);
			} finally {
				dispose();
			}
		});

		it('source mode paints the cursor line, also while a live-preview editor is mounted', () => {
			// Live preview's styles stay in the document once mounted, so a rule
			// scoped to every editor would clear the source-mode fill here.
			const livePreview = mount(makeOptions({ isLivePreview: true }));
			const source = mount(makeOptions({ isLivePreview: false }));
			try {
				expect(background(source.view)).toBe(SOURCE_FILL);
				expect(background(livePreview.view)).toBe(TRANSPARENT);
			} finally {
				source.dispose();
				livePreview.dispose();
			}
		});

		it('the editor mode toggle swaps the active-line background', () => {
			const sourceModeCompartment = new Compartment();
			const { view, dispose } = mount(makeOptions({ isLivePreview: true, sourceModeCompartment }));
			try {
				view.dispatch({ effects: editorModeEffects(false, sourceModeCompartment, {}) });
				expect(background(view)).toBe(SOURCE_FILL);

				view.dispatch({ effects: editorModeEffects(true, sourceModeCompartment, {}) });
				expect(background(view)).toBe(TRANSPARENT);
			} finally {
				dispose();
			}
		});

		// The cleared fill must not take the line's own tint with it, or the
		// cursor line becomes an untinted stripe inside the box.
		it.each([
			['a blockquote', '> quote\n', 'var(--lp-blockquote-bg)'],
			['a depth-2 blockquote', '> > quote\n', 'var(--lp-blockquote-bg2)'],
			['a depth-3 blockquote', '> > > quote\n', 'var(--lp-blockquote-bg3)'],
			['a callout', '> [!note] Title\n> body\n', 'color-mix(in srgb, var(--callout-note) 7%, transparent)'],
		])('live preview keeps the line tint when the cursor is inside %s', (_label, doc, tint) => {
			const view = mountMarkdownView(doc, {
				extensions: createExtensions(makeOptions({ isLivePreview: true })),
				cursor: doc.length - 2,
			});
			try {
				expect(background(view)).toBe(tint);
			} finally {
				const root = view.dom.parentElement;
				view.destroy();
				root?.remove();
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
					const root = view.dom.parentElement;
					view.destroy();
					root?.remove();
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
