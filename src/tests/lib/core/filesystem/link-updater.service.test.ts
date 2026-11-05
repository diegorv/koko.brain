import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage } from '../../../fixtures/localStorage.fixture';

// `vaultStore.open` persists the recent-vaults list.
setupLocalStorage();

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('#lib/utils/debug.js', () => ({
	debug: vi.fn(),
	error: vi.fn(),
	timeSync: vi.fn((_tag: string, _label: string, fn: () => unknown) => fn()),
	timeAsync: vi.fn((_tag: string, _label: string, fn: () => Promise<unknown>) => fn()),
}));

// No mocks for stores or logic files — use real implementations per CLAUDE.md.

import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { updateLinksAfterRename, updateTabAfterRenameOrMove } from '#lib/core/filesystem/link-updater.service.js';
import { registerCollectionNoteChangeConsumer } from '#lib/features/collection/collection.service.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import { clearAllIndexed } from '#lib/utils/index-dedupe.js';
import { EditorState } from '@codemirror/state';
import {
	clearAllTabViewStates,
	getTabEditorState,
	getTabViewState,
	saveTabEditorState,
	saveTabViewState,
} from '#lib/core/markdown-editor/tab-view-state.js';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';

/** Builds a minimal `NoteEntryV2` for `get_backlinks_v2` mocks. */
function entry(path: string, title?: string): NoteEntryV2 {
	return {
		path,
		title: title ?? path.split('/').pop()?.replace(/\.md$/, '') ?? path,
		frontmatter: {},
		outgoingLinks: [],
		tags: [],
		modifiedAt: 0,
		createdAt: 0,
		size: 0,
		wordCount: 0,
		snippet: '',
		tasks: [],
		isA: null,
		organized: false,
		archived: false,
		favorite: false,
		belongsTo: [],
		relatedTo: [],
		hasMany: [],
		relationships: {},
	};
}

/** Type-safe shorthand for the mocked `invoke` function. */
function mockedInvoke() {
	return vi.mocked(invoke);
}

/** Configures `invoke` to return `entries` for `get_backlinks_v2` and resolve for everything else. */
function mockBacklinksV2(entries: NoteEntryV2[]): void {
	mockedInvoke().mockImplementation(async (cmd: string) => {
		if (cmd === 'get_backlinks_v2') return entries as unknown;
		// `update_note_in_index` and any other command resolve to undefined.
		return undefined;
	});
}

/** A file node of the vault tree. */
function file(path: string): FileTreeNode {
	return { name: path.split('/').pop() ?? path, path, isDirectory: false };
}

/** A directory node of the vault tree. */
function dir(path: string, children: FileTreeNode[]): FileTreeNode {
	return { name: path.split('/').pop() ?? path, path, isDirectory: true, children };
}

describe('updateLinksAfterRename', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
		fsStore.reset();
		vaultStore._reset();
	});

	it('skips when old and new names are the same (pure move)', async () => {
		await updateLinksAfterRename('/vault/a/note.md', '/vault/b/note.md');

		// extractNoteName produces 'note' for both → same name → early return.
		expect(invoke).not.toHaveBeenCalled();
		expect(readTextFile).not.toHaveBeenCalled();
	});

	it('skips when names differ only by case', async () => {
		await updateLinksAfterRename('/vault/Note.md', '/vault/note.md');

		// extractNoteName: 'Note' vs 'note' → toLowerCase() match → early return.
		expect(invoke).not.toHaveBeenCalled();
		expect(readTextFile).not.toHaveBeenCalled();
	});

	it('queries get_backlinks_v2 and updates affected files', async () => {
		mockBacklinksV2([entry('/vault/other.md')]);
		vi.mocked(readTextFile).mockResolvedValue('link to [[old-name]]');

		await updateLinksAfterRename('/vault/old-name.md', '/vault/new-name.md');

		expect(invoke).toHaveBeenCalledWith('get_backlinks_v2', { path: '/vault/old-name.md' });
		expect(readTextFile).toHaveBeenCalledWith('/vault/other.md');
		expect(writeTextFile).toHaveBeenCalledWith('/vault/other.md', 'link to [[new-name]]');
		// Rust index gets a fresh update for the rewritten file so consumers see
		// the new outgoing-link target ahead of the watcher debounce.
		expect(invoke).toHaveBeenCalledWith('update_note_in_index', {
			path: '/vault/other.md',
			content: 'link to [[new-name]]',
		});
	});

	it('preserves heading fragments and aliases when updating links', async () => {
		mockBacklinksV2([entry('/vault/ref.md')]);
		vi.mocked(readTextFile).mockResolvedValue('See [[old-name#Section|click here]] and [[old-name]]');

		await updateLinksAfterRename('/vault/old-name.md', '/vault/new-name.md');

		expect(writeTextFile).toHaveBeenCalledWith(
			'/vault/ref.md',
			'See [[new-name#Section|click here]] and [[new-name]]',
		);
	});

	it('skips write when content is unchanged (stale Rust index)', async () => {
		mockBacklinksV2([entry('/vault/other.md')]);
		// Rust index thinks /vault/other.md links to old-name, but the file no
		// longer does (e.g. user already manually replaced the link).
		vi.mocked(readTextFile).mockResolvedValue('no links here');

		await updateLinksAfterRename('/vault/old-name.md', '/vault/new-name.md');

		expect(writeTextFile).not.toHaveBeenCalled();
		// No write means we also don't bump the Rust index for this file.
		expect(invoke).toHaveBeenCalledTimes(1);
		expect(invoke).toHaveBeenCalledWith('get_backlinks_v2', { path: '/vault/old-name.md' });
	});

	it('does not update links in the renamed file itself', async () => {
		// `get_backlinks_v2` should never return the source path itself, but the
		// service defensively filters anyway. Simulate a malformed return for the
		// guarantee.
		mockBacklinksV2([entry('/vault/old-name.md'), entry('/vault/other.md')]);
		vi.mocked(readTextFile).mockResolvedValue('Link to [[old-name]]');

		await updateLinksAfterRename('/vault/old-name.md', '/vault/new-name.md');

		expect(readTextFile).toHaveBeenCalledTimes(1);
		expect(readTextFile).toHaveBeenCalledWith('/vault/other.md');
	});

	it('continues processing remaining files when one read fails', async () => {
		mockBacklinksV2([entry('/vault/a.md'), entry('/vault/b.md')]);
		vi.mocked(readTextFile)
			.mockRejectedValueOnce(new Error('read error'))
			.mockResolvedValueOnce('[[old-name]]');

		await updateLinksAfterRename('/vault/old-name.md', '/vault/new-name.md');

		expect(writeTextFile).toHaveBeenCalledWith('/vault/b.md', '[[new-name]]');
	});

	it('handles no affected files gracefully', async () => {
		mockBacklinksV2([]);

		await updateLinksAfterRename('/vault/old-name.md', '/vault/new-name.md');

		expect(readTextFile).not.toHaveBeenCalled();
		expect(writeTextFile).not.toHaveBeenCalled();
	});

	it('uses in-memory content when tab has unsaved edits', async () => {
		mockBacklinksV2([entry('/vault/other.md')]);
		editorStore.addTab({
			path: '/vault/other.md',
			name: 'other.md',
			content: 'unsaved edit with [[old-name]]',
			savedContent: 'original',
		});

		await updateLinksAfterRename('/vault/old-name.md', '/vault/new-name.md');

		// Should NOT read from disk — uses in-memory content.
		expect(readTextFile).not.toHaveBeenCalled();
		expect(writeTextFile).toHaveBeenCalledWith(
			'/vault/other.md',
			'unsaved edit with [[new-name]]',
		);
		// `syncExternalContentToEditor(path, content, true, 'none')` updates both
		// content and savedContent so the dirty flag clears.
		const tab = editorStore.tabs.find((t) => t.path === '/vault/other.md');
		expect(tab).toBeDefined();
		expect(tab!.content).toBe('unsaved edit with [[new-name]]');
		expect(tab!.savedContent).toBe('unsaved edit with [[new-name]]');
	});

	it('reads from disk when tab is clean', async () => {
		mockBacklinksV2([entry('/vault/other.md')]);
		editorStore.addTab({
			path: '/vault/other.md',
			name: 'other.md',
			content: 'link to [[old-name]]',
			savedContent: 'link to [[old-name]]',
		});
		vi.mocked(readTextFile).mockResolvedValue('link to [[old-name]]');

		await updateLinksAfterRename('/vault/old-name.md', '/vault/new-name.md');

		expect(readTextFile).toHaveBeenCalledWith('/vault/other.md');
		const tab = editorStore.tabs.find((t) => t.path === '/vault/other.md');
		expect(tab).toBeDefined();
		expect(tab!.content).toBe('link to [[new-name]]');
		expect(tab!.savedContent).toBe('link to [[new-name]]');
	});

	it('rewrites a path-qualified link on disk and in the open tab', async () => {
		mockBacklinksV2([entry('/v/ref.md')]);
		editorStore.addTab({
			path: '/v/ref.md',
			name: 'ref.md',
			content: 'See [[folder/Old]]',
			savedContent: 'See [[folder/Old]]',
		});
		vi.mocked(readTextFile).mockResolvedValue('See [[folder/Old]]');

		await updateLinksAfterRename('/v/folder/Old.md', '/v/folder/New.md');

		expect(writeTextFile).toHaveBeenCalledWith('/v/ref.md', 'See [[folder/New]]');
		const tab = editorStore.tabs.find((t) => t.path === '/v/ref.md');
		expect(tab?.content).toBe('See [[folder/New]]');
		expect(tab?.savedContent).toBe('See [[folder/New]]');
	});

	it('keeps a rewritten link on the renamed note when another note owns the new stem', async () => {
		vaultStore.open('/v');
		fsStore.setFileTree([
			dir('/v/B', [file('/v/B/Old.md'), file('/v/B/Other.md')]),
			dir('/v/A', [file('/v/A/Old.md')]),
			file('/v/ref.md'),
		]);
		mockBacklinksV2([entry('/v/ref.md')]);
		editorStore.addTab({
			path: '/v/ref.md',
			name: 'ref.md',
			content: '[[A/Old.md]] and [[Old]] and [[A/Old]]',
			savedContent: '[[A/Old.md]] and [[Old]] and [[A/Old]]',
		});
		vi.mocked(readTextFile).mockResolvedValue('[[A/Old.md]] and [[Old]] and [[A/Old]]');

		await updateLinksAfterRename('/v/A/Old.md', '/v/A/Other.md');

		// Bare `[[Old]]`, and `[[A/Old]]` through its basename, resolve to B/Old (first
		// path wins) and stay. `[[A/Other.md]]` is written because `[[A/Other]]` would
		// resolve to B/Other.
		const expected = '[[A/Other.md]] and [[Old]] and [[A/Old]]';
		expect(writeTextFile).toHaveBeenCalledWith('/v/ref.md', expected);
		const tab = editorStore.tabs.find((t) => t.path === '/v/ref.md');
		expect(tab?.content).toBe(expected);
		expect(tab?.savedContent).toBe(expected);
	});

	it('reads from disk when file has no open tab', async () => {
		mockBacklinksV2([entry('/vault/other.md')]);
		vi.mocked(readTextFile).mockResolvedValue('link to [[old-name]]');

		await updateLinksAfterRename('/vault/old-name.md', '/vault/new-name.md');

		expect(readTextFile).toHaveBeenCalledWith('/vault/other.md');
		expect(writeTextFile).toHaveBeenCalledWith('/vault/other.md', 'link to [[new-name]]');
		expect(editorStore.tabs).toHaveLength(0);
	});
});

describe('updateTabAfterRenameOrMove', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
	});

	it('updates the tab path and display name', () => {
		editorStore.addTab({
			path: '/vault/old.md',
			name: 'old.md',
			content: 'content',
			savedContent: 'content',
		});

		updateTabAfterRenameOrMove('/vault/old.md', '/vault/new.md');

		const tab = editorStore.tabs[0];
		expect(tab.path).toBe('/vault/new.md');
		expect(tab.name).toBe('new.md');
	});

	it('extracts display name from nested path', () => {
		editorStore.addTab({
			path: '/vault/a/b/old.md',
			name: 'old.md',
			content: 'content',
			savedContent: 'content',
		});

		updateTabAfterRenameOrMove('/vault/a/b/old.md', '/vault/c/d/renamed.md');

		const tab = editorStore.tabs[0];
		expect(tab.path).toBe('/vault/c/d/renamed.md');
		expect(tab.name).toBe('renamed.md');
	});

	it('does not invoke any IPC commands (Rust re-key happens via watcher + remove_note_from_index)', () => {
		editorStore.addTab({
			path: '/vault/old.md',
			name: 'old.md',
			content: 'content',
			savedContent: 'content',
		});

		updateTabAfterRenameOrMove('/vault/old.md', '/vault/new.md');

		// updateTabAfterRenameOrMove is now editor-tabs-only; no IPC. Rust
		// VaultIndex re-keying is the responsibility of fs.service.ts (which
		// fires `remove_note_from_index` for the old path) plus the file
		// watcher (which fires `update_note_in_index` for the new path).
		expect(invoke).not.toHaveBeenCalled();
	});

	it('updates child file tabs when a folder is moved', () => {
		editorStore.addTab({
			path: '/vault/projects/note-a.md',
			name: 'note-a.md',
			content: 'content a',
			savedContent: 'content a',
		});
		editorStore.addTab({
			path: '/vault/projects/sub/note-b.md',
			name: 'note-b.md',
			content: 'content b',
			savedContent: 'content b',
		});
		editorStore.addTab({
			path: '/vault/other.md',
			name: 'other.md',
			content: 'other',
			savedContent: 'other',
		});

		updateTabAfterRenameOrMove('/vault/projects', '/vault/archive/projects');

		expect(editorStore.tabs[0].path).toBe('/vault/archive/projects/note-a.md');
		expect(editorStore.tabs[0].name).toBe('note-a.md');
		expect(editorStore.tabs[1].path).toBe('/vault/archive/projects/sub/note-b.md');
		expect(editorStore.tabs[1].name).toBe('note-b.md');
		// Unrelated tab untouched.
		expect(editorStore.tabs[2].path).toBe('/vault/other.md');
	});

	it('handles folder move with no matching tabs', () => {
		editorStore.addTab({
			path: '/vault/unrelated.md',
			name: 'unrelated.md',
			content: 'content',
			savedContent: 'content',
		});

		updateTabAfterRenameOrMove('/vault/empty-folder', '/vault/moved-folder');

		expect(editorStore.tabs[0].path).toBe('/vault/unrelated.md');
	});

	it('moves the saved view and editor state of each renamed tab, including folder children', () => {
		clearAllTabViewStates();
		for (const path of ['/vault/projects/note-a.md', '/vault/other.md']) {
			editorStore.addTab({ path, name: path.split('/').pop()!, content: 'c', savedContent: 'c' });
		}
		const noteA = EditorState.create({ doc: 'a' });
		const other = EditorState.create({ doc: 'o' });
		saveTabEditorState('/vault/projects/note-a.md', noteA);
		saveTabViewState('/vault/projects/note-a.md', { scrollTop: 7, scrollLeft: 0, cursorPos: 1 });
		saveTabEditorState('/vault/other.md', other);

		updateTabAfterRenameOrMove('/vault/projects', '/vault/archive/projects');

		expect(getTabEditorState('/vault/archive/projects/note-a.md')).toBe(noteA);
		expect(getTabViewState('/vault/archive/projects/note-a.md')?.scrollTop).toBe(7);
		expect(getTabEditorState('/vault/projects/note-a.md')).toBeUndefined();
		expect(getTabEditorState('/vault/other.md')).toBe(other);
		clearAllTabViewStates();
	});
});

describe('updateLinksAfterRename note-change indexing (issue 29)', () => {
	let unregister: (() => void) | null = null;

	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
		clearAllIndexed();
		collectionStore.reset();
		unregister = registerCollectionNoteChangeConsumer();
	});

	afterEach(() => {
		unregister?.();
		unregister = null;
		collectionStore.reset();
	});

	it('rebuilds the rewritten source note in the real property index', async () => {
		mockBacklinksV2([entry('/vault/other.md')]);
		// The property index still holds what the last full build projected.
		collectionStore.updateRecord('/vault/other.md', {
			path: '/vault/other.md', name: 'other.md', basename: 'other', folder: '/vault',
			ext: '.md', mtime: 11, ctime: 22, size: 33,
			properties: new Map<string, unknown>([['status', 'stale']]),
		});
		vi.mocked(readTextFile).mockResolvedValue('---\nstatus: fresh\n---\nlink to [[old-name]]');

		await updateLinksAfterRename('/vault/old-name.md', '/vault/new-name.md');

		const record = collectionStore.propertyIndex.get('/vault/other.md');
		expect(record?.properties.get('status')).toBe('fresh');
		// File metadata from the previous build survives the rebuild.
		expect(record?.mtime).toBe(11);
		expect(record?.ctime).toBe(22);
		expect(record?.size).toBe(33);
	});

	it('leaves the property index alone when no link was rewritten', async () => {
		mockBacklinksV2([entry('/vault/other.md')]);
		vi.mocked(readTextFile).mockResolvedValue('---\nstatus: fresh\n---\nno links here');

		await updateLinksAfterRename('/vault/old-name.md', '/vault/new-name.md');

		expect(collectionStore.propertyIndex.has('/vault/other.md')).toBe(false);
	});
});
