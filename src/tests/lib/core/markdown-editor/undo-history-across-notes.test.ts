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
import { language } from '@codemirror/language';
import MarkdownEditor from '#lib/core/markdown-editor/MarkdownEditor.svelte';
import { NOOP_HOST } from '#lib/core/markdown-editor/editor-host.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { closeTab, resetEditor, syncExternalContentToEditor } from '#lib/core/editor/editor.service.js';
import { findTabIndex } from '#lib/core/editor/editor.logic.js';
import { updateTabAfterRenameOrMove } from '#lib/core/filesystem/link-updater.service.js';
import { appBlockLinks, appFencedBlockRenderers } from '#lib/app/editor-host.js';
import { livePreviewCompartment } from '#lib/core/markdown-editor/extensions/live-preview/index.js';

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

	it('Cmd+Z after a two-site link rewrite restores the sentence between the links, not inside one', () => {
		const NOTE = '/vault/L.md';
		const SENT = 'SENT. ';
		const content = `Top [[x]] line\n\nmid ${SENT}here\n\nBottom [[x]] line\n`;
		openTabs([NOTE, content]);
		mountEditor();

		deleteText(SENT);
		syncExternalContentToEditor(NOTE, doc().replaceAll('[[x]]', '[[yy]]'), true, 'none');
		flushSync();
		undoTimes(1);

		expect(doc()).toBe(content.replaceAll('[[x]]', '[[yy]]'));
	});

	it('a sync that rewrites too many regions to diff clears the note\'s history', () => {
		const NOTE = '/vault/W.md';
		const lines = Array.from({ length: 600 }, (_, i) => `line ${i}\n`);
		const content = lines.join('');
		openTabs([NOTE, content]);
		mountEditor();

		deleteText('line 300\n');
		const rewritten = doc()
			.split('\n')
			.map((l, i) => (i % 2 === 0 && l ? `${l} edited` : l))
			.join('\n');
		syncExternalContentToEditor(NOTE, rewritten, true, 'none');
		flushSync();
		expect(doc()).toBe(rewritten);

		expect(undoDepth(view().state)).toBe(0);
		undoTimes(1);
		expect(doc()).toBe(rewritten);
	});

	it('a sync too large to diff keeps a code file\'s language', async () => {
		const NOTE = '/vault/code.ts';
		const content = Array.from({ length: 600 }, (_, i) => `const v${i} = ${i};\n`).join('');
		openTabs([NOTE, content]);
		mountEditor();
		await vi.waitFor(() => expect(view().state.facet(language)?.name).toBe('typescript'));
		deleteText('const v300 = 300;\n');
		expect(undoDepth(view().state)).toBe(1);

		const rewritten = doc()
			.split('\n')
			.map((l, i) => (i % 2 === 0 && l ? `${l} // edited` : l))
			.join('\n');
		syncExternalContentToEditor(NOTE, rewritten, true, 'none');
		flushSync();
		expect(doc()).toBe(rewritten);
		expect(undoDepth(view().state)).toBe(0);

		expect(view().state.facet(language)?.name).toBe('typescript');
	});

	it('a background tab rewritten in too many regions to diff comes back with no history', () => {
		const lines = Array.from({ length: 600 }, (_, i) => `line ${i}\n`);
		const content = lines.join('');
		openTabs([A, content], [B, B_CONTENT]);
		mountEditor();
		deleteText('line 300\n');
		activate(B);

		const rewritten = tabContent(A)
			.split('\n')
			.map((l, i) => (i % 2 === 0 && l ? `${l} edited` : l))
			.join('\n');
		syncExternalContentToEditor(A, rewritten, true, 'none');
		activate(A);
		expect(doc()).toBe(rewritten);

		expect(undoDepth(view().state)).toBe(0);
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
		openTabs([A, SAME + TYPED], [B, SAME + 'b own\n']);
		mountEditor();
		activate(B);
		deleteText('b own\n');
		activate(A);
		deleteText(TYPED);

		await closeTab(findTabIndex(editorStore.tabs, A));
		flushSync();
		expect(editorStore.activeTabPath).toBe(B);

		// B's own deletion is the only undo event: a fresh state would have none.
		expect(undoDepth(view().state)).toBe(1);
		undoTimes(3);
		expect(tabContent(B)).toBe(SAME + 'b own\n');
		expect(doc()).toBe(SAME + 'b own\n');
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

	it('a rename made while the editor is unmounted is not read as a rename after a remount', () => {
		// Untitled.md is renamed to Ideas.md while a canvas or kanban tab has the
		// editor unmounted; then a new note reuses the free name Untitled.md.
		const UNTITLED = '/vault/Untitled.md';
		const IDEAS = '/vault/Ideas.md';
		const BODY = 'My ideas\n';
		openTabs([UNTITLED, BODY]);
		mountEditor();
		unmount(component!);
		component = null;
		target.remove();

		updateTabAfterRenameOrMove(UNTITLED, IDEAS);
		editorStore.addTab({ path: UNTITLED, name: 'Untitled.md', content: '', savedContent: '' });
		flushSync();
		mountEditor();
		expect(doc()).toBe('');

		activate(IDEAS);
		expect(doc()).toBe(BODY);
		view().dispatch({ changes: { from: 0, insert: 'X' }, userEvent: 'input.type' });
		flushSync();

		expect(tabContent(IDEAS)).toBe('X' + BODY);
		expect(tabContent(UNTITLED)).toBe('');
	});

	it('a rename made while the editor is unmounted is not read as a rename when the reused-path tab is closed', async () => {
		const UNTITLED = '/vault/Untitled.md';
		const IDEAS = '/vault/Ideas.md';
		const BODY = 'My ideas\n';
		openTabs([UNTITLED, BODY]);
		mountEditor();
		unmount(component!);
		component = null;
		target.remove();

		updateTabAfterRenameOrMove(UNTITLED, IDEAS);
		editorStore.addTab({ path: UNTITLED, name: 'Untitled.md', content: 'new note\n', savedContent: 'new note\n' });
		flushSync();
		mountEditor();
		expect(doc()).toBe('new note\n');

		// Closing the new Untitled tab lands on Ideas: the old path is gone from
		// the tabs, so only the cleared record keeps this from reading as a rename.
		await closeTab(findTabIndex(editorStore.tabs, UNTITLED));
		flushSync();
		expect(editorStore.activeTabPath).toBe(IDEAS);
		expect(doc()).toBe(BODY);
		view().dispatch({ changes: { from: 0, insert: 'X' }, userEvent: 'input.type' });
		flushSync();

		expect(tabContent(IDEAS)).toBe('X' + BODY);
	});

	it('a rename and its undo before effects run do not hand the active doc to a tab at the middle path', () => {
		// A -> A2 -> A in one flush leaves both records unconsumed (the active
		// path ends where it started); a note later opened at A2 is a switch.
		const A2 = '/vault/A2.md';
		openTabs([A, A_CONTENT]);
		mountEditor();
		updateTabAfterRenameOrMove(A, A2);
		updateTabAfterRenameOrMove(A2, A);
		flushSync();
		expect(editorStore.activeTabPath).toBe(A);

		editorStore.addTab({ path: A2, name: 'A2.md', content: 'other note\n', savedContent: 'other note\n' });
		flushSync();

		expect(doc()).toBe('other note\n');
	});

	it('a remount drops the saved histories built by the previous editor instance', () => {
		openTabs([A, A_CONTENT], [B, B_CONTENT]);
		mountEditor();
		deleteText(SECRET);
		activate(B);
		// A canvas, kanban or graph tab unmounts the editor; coming back remounts it.
		unmount(component!);
		component = null;
		target.remove();
		mountEditor();

		activate(A);

		expect(doc()).toBe(A_CONTENT.replace(SECRET, ''));
		expect(undoDepth(view().state)).toBe(0);
	});

	it('a revisited tab gets the editor mode chosen while it was in the background', () => {
		openTabs([A, A_CONTENT], [B, B_CONTENT]);
		mountEditor();
		expect(livePreviewCompartment.get(view().state)).not.toEqual([]);
		activate(B);
		editorStore.setLivePreview(false);
		flushSync();

		activate(A);

		expect(livePreviewCompartment.get(view().state)).toEqual([]);
	});

	describe('caret after an external sync', () => {
		const NOTE = '/vault/Caret.md';
		const BODY = '---\ntitle: x\n---\nHello world\n';

		function caretAt(text: string) {
			view().dispatch({ selection: { anchor: doc().indexOf(text) } });
			flushSync();
		}

		it('a frontmatter line added above the caret keeps the caret before the same text', () => {
			openTabs([NOTE, BODY]);
			mountEditor();
			caretAt('world');

			syncExternalContentToEditor(NOTE, '---\ntitle: x\n_favorite: true\n---\nHello world\n', false, 'none');
			flushSync();

			expect(view().state.selection.main.head).toBe(doc().indexOf('world'));
		});

		it('text removed above the caret moves the caret back by the removed length', () => {
			const before = '---\n_organized: false\n---\nHello world\n';
			openTabs([NOTE, before]);
			mountEditor();
			caretAt('world');
			const head = view().state.selection.main.head;

			syncExternalContentToEditor(NOTE, before.replace('false', 'true'), false, 'none');
			flushSync();

			expect(view().state.selection.main.head).toBe(head - 1);
			expect(view().state.selection.main.head).toBe(doc().indexOf('world'));
		});

		it('a body selection survives a frontmatter rewrite with both ends mapped', () => {
			openTabs([NOTE, BODY]);
			mountEditor();
			const from = doc().indexOf('world');
			view().dispatch({ selection: { anchor: from, head: from + 'world'.length } });
			flushSync();

			syncExternalContentToEditor(NOTE, BODY.replace('title: x', 'title: longer\ntags: a'), false, 'frontmatter');
			flushSync();

			const sel = view().state.selection.main;
			expect(doc().slice(sel.anchor, sel.head)).toBe('world');
		});

		it('a change entirely below the caret leaves the caret where it was', () => {
			openTabs([NOTE, BODY]);
			mountEditor();
			caretAt('Hello');
			const head = view().state.selection.main.head;

			syncExternalContentToEditor(NOTE, `${BODY}\nAppended line\n`, true, 'none');
			flushSync();

			expect(view().state.selection.main.head).toBe(head);
		});

		it('a background tab rewritten above its saved caret shows the caret on the same text on return', () => {
			openTabs([NOTE, BODY], [B, B_CONTENT]);
			mountEditor();
			caretAt('world');
			activate(B);

			// Task toggle / link rewrite on the background tab adds text above the caret.
			syncExternalContentToEditor(NOTE, BODY.replace('Hello', '- [x] done\nHello'), true, 'none');
			activate(NOTE);

			expect(view().state.selection.main.head).toBe(doc().indexOf('world'));
		});
	});

	describe('CRLF notes', () => {
		const CRLF = '# Title\r\nalpha\r\nbeta\r\n';
		const LF = '# Title\nalpha\nbeta\n';
		const C = '/vault/C.md';

		it('a tab switch away and back does not add blank lines to a CRLF note', () => {
			openTabs([C, CRLF], [B, B_CONTENT]);
			mountEditor();
			expect(doc()).toBe(LF);

			activate(B);
			activate(C);
			expect(doc()).toBe(LF);
			view().dispatch({ changes: { from: 0, insert: 'X' }, userEvent: 'input.type' });
			flushSync();

			expect(tabContent(C)).toBe('X' + LF);
		});

		it('an external sync of a CRLF note does not add blank lines', () => {
			openTabs([C, CRLF]);
			mountEditor();

			syncExternalContentToEditor(C, '---\r\ntitle: y\r\n---\r\n' + CRLF, false, 'frontmatter');
			flushSync();

			expect(doc()).toBe('---\ntitle: y\n---\n' + LF);
		});

		it('an external sync that shortens a CRLF note below the cursor lands in the view', () => {
			const W = '/vault/W.md';
			openTabs([W, 'aaaa\nbbbb\ncccc\n']);
			mountEditor();
			view().dispatch({ selection: { anchor: 15 } });

			// A reload brings CRLF text whose raw length (12) is past the LF doc's end (10).
			syncExternalContentToEditor(W, 'aaaa\r\nbbbb\r\n', true, 'none');
			flushSync();

			expect(doc()).toBe('aaaa\nbbbb\n');
		});

		it('switching to a short CRLF note never leaves the previous note in the view', () => {
			const F = '/vault/F.md';
			const FM_ONLY = '---\r\ntitle: x\r\ntags: a\r\n---\r\n';
			openTabs([B, B_CONTENT], [F, FM_ONLY]);
			mountEditor();

			activate(F);
			expect(doc()).toBe('---\ntitle: x\ntags: a\n---\n');
			view().dispatch({ changes: { from: 0, insert: 'X' }, userEvent: 'input.type' });
			flushSync();

			expect(tabContent(F)).not.toContain('Line one of B');
			expect(tabContent(B)).toBe(B_CONTENT);
		});
	});
});
