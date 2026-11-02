// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Tauri boundaries only. Stores and the real MarkdownEditor (with its real
// CodeMirror history() extension) are used as-is.
vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(async () => ''),
	writeTextFile: vi.fn(async () => {}),
}));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn(async () => true) }));
vi.mock('svelte-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
Element.prototype.scrollTo = () => {};

import { mount, unmount, flushSync } from 'svelte';
import { undo } from '@codemirror/commands';
import MarkdownEditor from '#lib/core/markdown-editor/MarkdownEditor.svelte';
import { NOOP_HOST } from '#lib/core/markdown-editor/editor-host.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { syncExternalContentToEditor } from '#lib/core/editor/editor.service.js';
import { appBlockLinks, appFencedBlockRenderers } from '#lib/app/editor-host.js';

const A = '/vault/A.md';
const B = '/vault/B.md';
const SECRET = 'SECRET PARAGRAPH OF NOTE A\n';
const A_CONTENT = `Intro A\n\n${SECRET}\nOutro A\n`;
const B_CONTENT = 'Line one of B\nLine two of B\n';

let target: HTMLElement;
let component: Record<string, unknown> | null = null;

function view() {
	const v = editorStore.editorView;
	if (!v) throw new Error('editor view not mounted');
	return v;
}

function mountEditor() {
	target = document.body.appendChild(document.createElement('div'));
	component = mount(MarkdownEditor, {
		target,
		props: { host: NOOP_HOST, renderers: appFencedBlockRenderers, blockLinks: appBlockLinks },
	});
	flushSync();
}

describe('o09 cross-cutting-3: undo history across full-doc replaces', () => {
	beforeEach(() => {
		editorStore.reset();
		flushSync();
	});
	afterEach(() => {
		if (component) unmount(component);
		component = null;
		target?.remove();
	});

	it("Cmd+Z in note B never inserts text that was deleted in note A", () => {
		editorStore.addTab({ path: A, name: 'A.md', content: A_CONTENT, savedContent: A_CONTENT });
		editorStore.addTab({ path: B, name: 'B.md', content: B_CONTENT, savedContent: B_CONTENT });
		editorStore.setActiveIndex(0);
		flushSync();
		mountEditor();
		expect(view().state.doc.toString()).toBe(A_CONTENT);

		// User deletes the paragraph in A.
		const from = A_CONTENT.indexOf(SECRET);
		view().dispatch({ changes: { from, to: from + SECRET.length }, userEvent: 'delete.selection' });
		expect(editorStore.tabs[0].content).not.toContain('SECRET');

		// Switch to B (the real tab-switch effect replaces the doc).
		editorStore.setActiveIndex(1);
		flushSync();
		expect(view().state.doc.toString()).toBe(B_CONTENT);

		// User types at the start of B.
		view().dispatch({ changes: { from: 0, insert: 'X' }, userEvent: 'input.type' });

		// User presses Cmd+Z a few times to revert B.
		for (let i = 0; i < 3; i++) undo(view());

		// The store (what autosave writes to B.md) must not carry A's text.
		expect(editorStore.tabs[1].content).not.toContain('SECRET');
		expect(view().state.doc.toString()).not.toContain('SECRET');
	});

	it('Cmd+Z after a Properties-panel rewrite does not append the deleted sentence at the end', () => {
		const NOTE = '/vault/N.md';
		const SENT = 'Deleted sentence. ';
		const content = `---\ntitle: x\n---\nPara one.\n\nPara two ${SENT}rest.\n\nLast para.\n`;
		editorStore.addTab({ path: NOTE, name: 'N.md', content, savedContent: content });
		flushSync();
		mountEditor();

		const from = content.indexOf(SENT);
		view().dispatch({ changes: { from, to: from + SENT.length }, userEvent: 'delete.selection' });
		const afterDelete = view().state.doc.toString();

		// Properties panel rewrites the frontmatter (real external-sync path).
		const rewritten = afterDelete.replace('title: x', 'title: y');
		syncExternalContentToEditor(NOTE, rewritten, false, 'frontmatter');
		flushSync();
		expect(view().state.doc.toString()).toBe(rewritten);

		undo(view());
		const doc = view().state.doc.toString();
		// Correct behavior: either the sentence returns in paragraph two, or undo
		// does nothing. It must never land after "Last para.".
		expect(doc.endsWith(`Last para.\n${SENT}`)).toBe(false);
		expect(doc.indexOf(SENT) === -1 || doc.indexOf(SENT) < doc.indexOf('Last para.')).toBe(true);
	});
});
