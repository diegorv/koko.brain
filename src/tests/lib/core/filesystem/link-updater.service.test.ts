import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('$lib/utils/debug', () => ({
	error: vi.fn(),
}));

// No mocks for stores or logic files — use real implementations per CLAUDE.md.

import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { updateLinksAfterRename, updateTabAfterRenameOrMove } from '$lib/core/filesystem/link-updater.service';
import type { NoteEntryV2 } from '$lib/types/vault-v2.types';

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

describe('updateLinksAfterRename', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
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
		// `syncExternalContentToEditor(path, content, true)` updates both
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
});
