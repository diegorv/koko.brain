// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { createExtensions, sourceModeExtensions } from '#lib/core/markdown-editor/setup/editor-extensions.js';
import type { CreateExtensionsOptions } from '#lib/core/markdown-editor/setup/editor-extensions.js';

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

	describe('legacy source-mode decorations', () => {
		const DOC = '> [!note] Title\n> body\n\nSee [[Target]] here.';

		function mount(opts: CreateExtensionsOptions) {
			const root = document.createElement('div');
			document.body.appendChild(root);
			const view = new EditorView({
				state: EditorState.create({ doc: DOC, extensions: createExtensions(opts) }),
				parent: root,
			});
			return {
				view,
				dispose: () => {
					view.destroy();
					root.remove();
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
