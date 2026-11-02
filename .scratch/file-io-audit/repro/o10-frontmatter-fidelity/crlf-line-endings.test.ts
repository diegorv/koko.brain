// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

const disk = new Map<string, string>();

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(async (p: string) => disk.get(p) ?? ''),
	writeTextFile: vi.fn(async (p: string, c: string) => {
		disk.set(p, c);
	}),
	exists: vi.fn(async (p: string) => disk.has(p)),
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(async () => undefined),
}));

import { createExtensions } from '#lib/core/markdown-editor/setup/editor-extensions.js';
import { NOOP_HOST } from '#lib/core/markdown-editor/editor-host.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { onContentChange, resetEditor, saveFileByPath } from '#lib/core/editor/editor.service.js';

const NOTE = '/vault/windows.md';
const CRLF = '---\r\ntitle: Win\r\n---\r\n# Heading\r\n\r\nLine one\r\nLine two\r\n';

describe('repro o10 fidelity-4: a CRLF note keeps its line endings through an edit', () => {
	beforeEach(() => {
		disk.clear();
		resetEditor();
	});

	it('type one character and delete it: the saved file is byte-identical', async () => {
		disk.set(NOTE, CRLF);
		editorStore.addTab({ path: NOTE, name: 'windows.md', content: CRLF, savedContent: CRLF });

		// The app's own extension set, wired to the real onContentChange like MarkdownEditor.svelte.
		const extensions = createExtensions({
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
			host: NOOP_HOST,
			renderers: [],
			disabledDecorators: {},
			copyBlockLink: vi.fn(),
			onDocChanged: (content, fm) => onContentChange(content, fm),
			isTabSwitching: () => false,
			isExternalEdit: () => false,
		});
		const view = new EditorView({
			state: EditorState.create({ doc: CRLF, extensions }),
			parent: document.body.appendChild(document.createElement('div')),
		});

		const end = view.state.doc.length;
		view.dispatch({ changes: { from: end, insert: 'x' } });
		view.dispatch({ changes: { from: end, to: end + 1, insert: '' } });

		await saveFileByPath(NOTE);
		expect(JSON.stringify(disk.get(NOTE))).toBe(JSON.stringify(CRLF));
		view.destroy();
	});
});
