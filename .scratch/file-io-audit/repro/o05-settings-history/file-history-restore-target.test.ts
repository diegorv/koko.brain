// @vitest-environment jsdom
// Repro for o05 recovery-3 and save-pipeline-11. Asserts the CORRECT behavior,
// so each test fails while the bug exists. Only Tauri APIs are mocked; the
// editor service, editor store, file-history service and store are real, and
// the editor is a real CodeMirror EditorView wired like MarkdownEditor.svelte
// (updateListener -> onContentChange, tab-switch replace suppressed).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	mkdir: vi.fn(),
	exists: vi.fn(),
	readDir: vi.fn(),
}));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn(() => Promise.resolve(true)) }));

import { EditorState, Transaction } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { invoke } from '@tauri-apps/api/core';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { closeActiveTab, onContentChange, switchToNextTab } from '#lib/core/editor/editor.service.js';
import { fileHistoryStore } from '#lib/features/file-history/file-history.store.svelte.js';
import { openFileHistory, restoreSnapshot } from '#lib/features/file-history/file-history.service.js';

const VAULT = '/vault';
const A = '/vault/a.md';
const B = '/vault/b.md';
const A_SNAPSHOT_TEXT = 'A old version from last month\n';
const B_TEXT = 'B: my important note\n';
const A_TEXT = 'A current\n';

/** Disk as the mocked plugin-fs sees it. */
let disk: Map<string, string>;
let isTabSwitching = false;

function installMocks() {
	vi.mocked(readTextFile).mockImplementation(async (p) => {
		const v = disk.get(String(p));
		if (v === undefined) throw new Error('ENOENT ' + String(p));
		return v;
	});
	vi.mocked(writeTextFile).mockImplementation(async (p, c) => {
		disk.set(String(p), String(c));
	});
	vi.mocked(invoke).mockImplementation(async (cmd: string, args?: any) => {
		switch (cmd) {
			case 'get_file_history':
				return args.filePath === 'a.md' ? [{ id: 11, timestamp: Date.now() - 86_400_000, size: 10 }] : [];
			case 'get_snapshot_content':
				return args.snapshotId === 11 ? A_SNAPSHOT_TEXT : '';
			case 'compute_diff':
				return [];
			default:
				return undefined;
		}
	});
}

/** One shared view, like MarkdownEditor: the doc follows the active tab. */
function mountEditor(): EditorView {
	const view = new EditorView({
		state: EditorState.create({
			doc: editorStore.activeTab!.content,
			extensions: [
				EditorView.updateListener.of((u) => {
					if (u.docChanged && !isTabSwitching) onContentChange(u.state.doc.toString());
				}),
			],
		}),
		parent: document.body,
	});
	editorStore.setEditorView(view);
	return view;
}

/** What MarkdownEditor's activeTabPath effect does on a tab switch. */
function followActiveTab(view: EditorView) {
	isTabSwitching = true;
	view.dispatch({
		changes: { from: 0, to: view.state.doc.length, insert: editorStore.activeTab!.content },
		annotations: Transaction.addToHistory.of(false),
	});
	isTabSwitching = false;
}

describe('o05 recovery-3: File History restore must target the note the dialog shows', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		fileHistoryStore.reset();
		editorStore.reset();
		vaultStore._reset();
		vaultStore.open(VAULT);
		disk = new Map([[A, A_TEXT], [B, B_TEXT]]);
		installMocks();
		editorStore.addTab({ path: B, name: 'b.md', content: B_TEXT, savedContent: B_TEXT });
		editorStore.addTab({ path: A, name: 'a.md', content: A_TEXT, savedContent: A_TEXT });
	});

	it('Cmd+W while the dialog for A is open, then Restore: B is not overwritten with A\'s snapshot', async () => {
		expect(editorStore.activeTabPath).toBe(A);
		const view = mountEditor();

		await openFileHistory(A);
		expect(fileHistoryStore.selectedSnapshot?.id).toBe(11);

		// Cmd+W reaches the document keydown listener while the modal is open.
		await closeActiveTab();
		expect(editorStore.activeTabPath).toBe(B);
		followActiveTab(view);
		expect(fileHistoryStore.isOpen).toBe(true);

		await restoreSnapshot(11);

		expect(disk.get(B)).toBe(B_TEXT);
		expect(editorStore.tabs.find((t) => t.path === B)?.content).toBe(B_TEXT);
	});

	it('re-opening the dialog for B (no history) clears A\'s selected snapshot', async () => {
		const view = mountEditor();
		await openFileHistory(A);
		expect(fileHistoryStore.selectedSnapshot?.id).toBe(11);

		// Cmd+Shift+] then Cmd+Shift+H while the dialog is still open.
		switchToNextTab();
		expect(editorStore.activeTabPath).toBe(B);
		followActiveTab(view);
		await openFileHistory(editorStore.activeTabPath!);

		expect(fileHistoryStore.filePath).toBe(B);
		expect(fileHistoryStore.snapshots).toEqual([]);
		// The Restore button renders while selectedSnapshot is set.
		expect(fileHistoryStore.selectedSnapshot).toBeNull();
	});
});

describe('o05 save-pipeline-11: Restore on a board tab must not report success while writing nothing', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		fileHistoryStore.reset();
		editorStore.reset();
		vaultStore._reset();
		vaultStore.open(VAULT);
	});

	it('restoring a .kanban board in board view either writes the snapshot or rejects', async () => {
		const K = '/vault/board.kanban';
		const BOARD_NOW = '## Todo\n';
		disk = new Map([[K, BOARD_NOW]]);
		installMocks();
		vi.mocked(invoke).mockImplementation(async (cmd: string) => {
			if (cmd === 'get_file_history') return [{ id: 21, timestamp: Date.now() - 3_600_000, size: 30 }];
			if (cmd === 'get_snapshot_content') return '## Todo\n- [ ] the card I deleted\n';
			if (cmd === 'compute_diff') return [];
			return undefined;
		});
		editorStore.addTab({ path: K, name: 'board.kanban', content: BOARD_NOW, savedContent: BOARD_NOW, fileType: 'kanban' });
		// Board view: no MarkdownEditor is mounted, so no EditorView.
		editorStore.setEditorView(null);

		await openFileHistory(K);
		let rejected = false;
		try {
			await restoreSnapshot(21);
		} catch {
			rejected = true;
		}

		const restoredOnDisk = disk.get(K) === '## Todo\n- [ ] the card I deleted\n';
		expect(restoredOnDisk || rejected).toBe(true);
	});
});
