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
import { undo, redo, undoDepth } from '@codemirror/commands';
import MarkdownEditor from '#lib/core/markdown-editor/MarkdownEditor.svelte';
import { NOOP_HOST } from '#lib/core/markdown-editor/editor-host.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { closeTab, resetEditor, syncExternalContentToEditor } from '#lib/core/editor/editor.service.js';
import { findTabIndex } from '#lib/core/editor/editor.logic.js';
import { updateTabAfterRenameOrMove } from '#lib/core/filesystem/link-updater.service.js';
import { appBlockLinks, appFencedBlockRenderers } from '#lib/app/editor-host.js';

/**
 * One EditorView serves every markdown tab. Undo history must belong to a
 * note: Cmd+Z / Cmd+Shift+Z never move text between notes, and an external
 * content sync never lets an undo land at the end of the doc.
 */

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

function doc(): string {
	return view().state.doc.toString();
}

function tabContent(path: string): string {
	return editorStore.tabs[findTabIndex(editorStore.tabs, path)].content;
}

function mountEditor() {
	target = document.body.appendChild(document.createElement('div'));
	component = mount(MarkdownEditor, {
		target,
		props: { host: NOOP_HOST, renderers: appFencedBlockRenderers, blockLinks: appBlockLinks },
	});
	flushSync();
}

function openTabs(...tabs: [string, string][]) {
	for (const [path, content] of tabs) {
		editorStore.addTab({ path, name: path.split('/').pop()!, content, savedContent: content });
	}
	editorStore.setActiveIndex(0);
	flushSync();
}

function activate(path: string) {
	editorStore.setActiveIndex(findTabIndex(editorStore.tabs, path));
	flushSync();
}

/** A user deletion of `text`, the way CodeMirror's delete commands annotate it. */
function deleteText(text: string) {
	const from = doc().indexOf(text);
	if (from < 0) throw new Error(`"${text}" not in doc`);
	view().dispatch({ changes: { from, to: from + text.length }, userEvent: 'delete.selection' });
	flushSync();
}

function undoTimes(n: number) {
	for (let i = 0; i < n; i++) undo(view());
	flushSync();
}

describe('undo history across notes in the shared MarkdownEditor view', () => {
	beforeEach(() => {
		editorStore.reset();
		flushSync();
	});
	afterEach(() => {
		if (component) unmount(component);
		component = null;
		target?.remove();
		// Edits armed the debounced auto-save; cancel it so it does not fire after the test.
		resetEditor();
	});

	it('Cmd+Z in note B never inserts text that was deleted in note A', () => {
		openTabs([A, A_CONTENT], [B, B_CONTENT]);
		mountEditor();
		expect(doc()).toBe(A_CONTENT);

		deleteText(SECRET);
		expect(tabContent(A)).not.toContain('SECRET');

		activate(B);
		expect(doc()).toBe(B_CONTENT);

		view().dispatch({ changes: { from: 0, insert: 'X' }, userEvent: 'input.type' });
		undoTimes(3);

		// The store (what autosave writes to B.md) must not carry A's text.
		expect(tabContent(B)).toBe(B_CONTENT);
		expect(doc()).toBe(B_CONTENT);
	});

	it('a note seen for the first time has no undo depth', () => {
		openTabs([A, A_CONTENT], [B, B_CONTENT]);
		mountEditor();
		deleteText(SECRET);

		activate(B);

		expect(undoDepth(view().state)).toBe(0);
	});

	it('round trip A -> B -> A, then Cmd+Z undoes A\'s own edit at its original position', () => {
		openTabs([A, A_CONTENT], [B, B_CONTENT]);
		mountEditor();
		deleteText(SECRET);

		activate(B);
		activate(A);
		expect(doc()).toBe(A_CONTENT.replace(SECRET, ''));

		undoTimes(1);

		expect(doc()).toBe(A_CONTENT);
		expect(tabContent(A)).toBe(A_CONTENT);
		expect(tabContent(B)).toBe(B_CONTENT);
	});

	it('Cmd+Shift+Z in note B never redoes an edit undone in note A', () => {
		openTabs([A, 'Note A'], [B, B_CONTENT]);
		mountEditor();
		view().dispatch({ changes: { from: 6, insert: ' secret' }, userEvent: 'input.type' });
		undoTimes(1);
		expect(doc()).toBe('Note A');

		activate(B);
		redo(view());
		flushSync();

		expect(doc()).toBe(B_CONTENT);
		expect(tabContent(B)).toBe(B_CONTENT);
	});

	it('a background tab changed by an external write keeps its history mapped to the new content', () => {
		openTabs([A, A_CONTENT], [B, B_CONTENT]);
		mountEditor();
		deleteText(SECRET);
		activate(B);

		// Task toggle / link rewrite on the background tab A prepends a line.
		syncExternalContentToEditor(A, `Top line\n${tabContent(A)}`, true, 'none');
		activate(A);
		expect(doc()).toBe(`Top line\n${A_CONTENT.replace(SECRET, '')}`);

		undoTimes(1);

		expect(doc()).toBe(`Top line\n${A_CONTENT}`);
	});

	it('Cmd+Z after a Properties-panel rewrite does not append the deleted sentence at the end', () => {
		const NOTE = '/vault/N.md';
		const SENT = 'Deleted sentence. ';
		const content = `---\ntitle: x\n---\nPara one.\n\nPara two ${SENT}rest.\n\nLast para.\n`;
		openTabs([NOTE, content]);
		mountEditor();

		deleteText(SENT);
		const rewritten = doc().replace('title: x', 'title: y');
		syncExternalContentToEditor(NOTE, rewritten, false, 'frontmatter');
		flushSync();
		expect(doc()).toBe(rewritten);

		undoTimes(1);

		expect(doc()).toBe(content.replace('title: x', 'title: y'));
	});

	it('Cmd+Z after a task toggle restores the deleted text in place, not after the synced doc', () => {
		const NOTE = '/vault/T.md';
		openTabs([NOTE, 'abc foo def\n- [ ] task']);
		mountEditor();

		deleteText('foo ');
		syncExternalContentToEditor(NOTE, 'abc def\n- [x] task', true, 'none');
		flushSync();
		undoTimes(1);

		expect(doc()).toBe('abc foo def\n- [x] task');
	});

	it('closing a tab drops its history: reopening the note starts with none', async () => {
		openTabs([A, A_CONTENT], [B, B_CONTENT]);
		mountEditor();
		deleteText(SECRET);
		activate(B);

		// Closing the background tab A (dirty: the discard dialog is mocked to
		// confirm), then reopening it from disk.
		await closeTab(findTabIndex(editorStore.tabs, A));
		flushSync();
		const reopened = A_CONTENT.replace(SECRET, '');
		editorStore.addTab({ path: A, name: 'A.md', content: reopened, savedContent: reopened });
		flushSync();
		expect(doc()).toBe(reopened);

		expect(undoDepth(view().state)).toBe(0);
		undoTimes(1);
		expect(doc()).toBe(reopened);
	});

	// Closing the active tab A activates B. When B's content equals A's doc,
	// that must still read as a tab switch, not as a rename of A to B.
	const SAME = 'Same body\n';
	const TYPED = 'typed in A\n';

	it('closing the active tab onto a tab with the same content does not hand it A\'s history', async () => {
		openTabs([A, SAME + TYPED], [B, SAME]);
		mountEditor();
		deleteText(TYPED);

		await closeTab(findTabIndex(editorStore.tabs, A));
		flushSync();
		expect(editorStore.activeTabPath).toBe(B);

		expect(undoDepth(view().state)).toBe(0);
		undoTimes(3);
		expect(tabContent(B)).toBe(SAME);
		expect(doc()).toBe(SAME);
	});

	it('closing the active tab onto a visited tab with the same content restores that tab\'s own state', async () => {
		openTabs([A, SAME + TYPED], [B, SAME]);
		mountEditor();
		activate(B);
		activate(A);
		deleteText(TYPED);

		await closeTab(findTabIndex(editorStore.tabs, A));
		flushSync();
		expect(editorStore.activeTabPath).toBe(B);

		expect(undoDepth(view().state)).toBe(0);
		undoTimes(3);
		expect(tabContent(B)).toBe(SAME);
		expect(doc()).toBe(SAME);
	});

	it('renaming a background tab keeps its undo history under the new path', () => {
		const RENAMED = '/vault/Renamed.md';
		openTabs([A, A_CONTENT], [B, B_CONTENT]);
		mountEditor();
		deleteText(SECRET);
		activate(B);

		updateTabAfterRenameOrMove(A, RENAMED);
		activate(RENAMED);
		undoTimes(1);

		expect(doc()).toBe(A_CONTENT);
		expect(tabContent(RENAMED)).toBe(A_CONTENT);
	});

	it('renaming the active tab keeps its undo history', () => {
		const RENAMED = '/vault/Renamed.md';
		openTabs([A, A_CONTENT], [B, B_CONTENT]);
		mountEditor();
		deleteText(SECRET);

		updateTabAfterRenameOrMove(A, RENAMED);
		flushSync();
		activate(B);
		activate(RENAMED);
		undoTimes(1);

		expect(doc()).toBe(A_CONTENT);
	});
});
