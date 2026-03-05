import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
}));

vi.mock('$lib/features/backlinks/backlinks.service', () => ({
	updateIndexForFile: vi.fn(),
}));

vi.mock('$lib/utils/debug', () => ({
	error: vi.fn(),
}));

// No mocks for stores or logic files — use real implementations per CLAUDE.md

import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { noteIndexStore } from '$lib/features/backlinks/note-index.store.svelte';
import { updateIndexForFile } from '$lib/features/backlinks/backlinks.service';
import { updateLinksAfterRename, updateTabAfterRenameOrMove } from '$lib/core/filesystem/link-updater.service';

describe('updateLinksAfterRename', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
		noteIndexStore.reset();
	});

	it('skips when old and new names are the same (pure move)', async () => {
		await updateLinksAfterRename('/vault/a/note.md', '/vault/b/note.md');

		// extractNoteName produces 'note' for both → same name → early return
		expect(readTextFile).not.toHaveBeenCalled();
	});

	it('skips when names differ only by case', async () => {
		await updateLinksAfterRename('/vault/Note.md', '/vault/note.md');

		// extractNoteName: 'Note' vs 'note' → toLowerCase() match → early return
		expect(readTextFile).not.toHaveBeenCalled();
	});

	it('updates links in affected files when name changes', async () => {
		// Real findFilesLinkingTo scans noteContents for wikilinks to 'old-name'
		noteIndexStore.setNoteContents(new Map([
			['/vault/other.md', 'link to [[old-name]]'],
		]));

		vi.mocked(readTextFile).mockResolvedValue('link to [[old-name]]');

		await updateLinksAfterRename('/vault/old-name.md', '/vault/new-name.md');

		// Real replaceWikilinks replaces [[old-name]] → [[new-name]]
		expect(readTextFile).toHaveBeenCalledWith('/vault/other.md');
		expect(writeTextFile).toHaveBeenCalledWith('/vault/other.md', 'link to [[new-name]]');
		// Verify real store state: updateTabContentByPath was called on the real store
		// (no open tab for /vault/other.md, so the store won't have a tab to update)
		expect(updateIndexForFile).toHaveBeenCalledWith('/vault/other.md', 'link to [[new-name]]');
	});

	it('preserves heading fragments and aliases when updating links', async () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/ref.md', 'See [[old-name#Section|click here]] and [[old-name]]'],
		]));

		vi.mocked(readTextFile).mockResolvedValue('See [[old-name#Section|click here]] and [[old-name]]');

		await updateLinksAfterRename('/vault/old-name.md', '/vault/new-name.md');

		expect(writeTextFile).toHaveBeenCalledWith(
			'/vault/ref.md',
			'See [[new-name#Section|click here]] and [[new-name]]',
		);
	});

	it('skips write when content is unchanged (stale index)', async () => {
		// Index thinks the file links to old-name, but actual file content doesn't
		noteIndexStore.setNoteContents(new Map([
			['/vault/other.md', 'has [[old-name]]'],
		]));

		vi.mocked(readTextFile).mockResolvedValue('no links here');

		await updateLinksAfterRename('/vault/old-name.md', '/vault/new-name.md');

		// Real replaceWikilinks finds no [[old-name]] → content unchanged → no write
		expect(writeTextFile).not.toHaveBeenCalled();
	});

	it('does not update links in the renamed file itself', async () => {
		// Self-reference should be excluded by findFilesLinkingTo
		noteIndexStore.setNoteContents(new Map([
			['/vault/old-name.md', 'Self-link [[old-name]]'],
			['/vault/other.md', 'Link to [[old-name]]'],
		]));

		vi.mocked(readTextFile).mockResolvedValue('Link to [[old-name]]');

		await updateLinksAfterRename('/vault/old-name.md', '/vault/new-name.md');

		// Only /vault/other.md should be read, not the renamed file itself
		expect(readTextFile).toHaveBeenCalledTimes(1);
		expect(readTextFile).toHaveBeenCalledWith('/vault/other.md');
	});

	it('continues processing remaining files when one read fails', async () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/a.md', '[[old-name]]'],
			['/vault/b.md', '[[old-name]]'],
		]));

		vi.mocked(readTextFile)
			.mockRejectedValueOnce(new Error('read error'))
			.mockResolvedValueOnce('[[old-name]]');

		await updateLinksAfterRename('/vault/old-name.md', '/vault/new-name.md');

		// Should still process the second file despite the first one failing
		expect(writeTextFile).toHaveBeenCalledWith('/vault/b.md', '[[new-name]]');
	});

	it('handles no affected files gracefully', async () => {
		// No files link to old-name
		noteIndexStore.setNoteContents(new Map([
			['/vault/other.md', 'links to [[unrelated]]'],
		]));

		await updateLinksAfterRename('/vault/old-name.md', '/vault/new-name.md');

		expect(readTextFile).not.toHaveBeenCalled();
		expect(writeTextFile).not.toHaveBeenCalled();
	});

	it('uses in-memory content when tab has unsaved edits', async () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/other.md', '[[old-name]]'],
		]));

		// Simulate dirty tab: content differs from savedContent
		editorStore.addTab({
			path: '/vault/other.md',
			name: 'other.md',
			content: 'unsaved edit with [[old-name]]',
			savedContent: 'original',
		});

		await updateLinksAfterRename('/vault/old-name.md', '/vault/new-name.md');

		// Should NOT read from disk — uses in-memory content
		expect(readTextFile).not.toHaveBeenCalled();
		// Should write the updated in-memory content to disk
		expect(writeTextFile).toHaveBeenCalledWith(
			'/vault/other.md',
			'unsaved edit with [[new-name]]',
		);
		// Verify real store state: tab content and savedContent should be synced
		const tab = editorStore.tabs.find((t) => t.path === '/vault/other.md');
		expect(tab).toBeDefined();
		expect(tab!.content).toBe('unsaved edit with [[new-name]]');
		expect(tab!.savedContent).toBe('unsaved edit with [[new-name]]');
	});

	it('reads from disk when tab is clean', async () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/other.md', '[[old-name]]'],
		]));

		// Clean tab: content equals savedContent
		editorStore.addTab({
			path: '/vault/other.md',
			name: 'other.md',
			content: 'link to [[old-name]]',
			savedContent: 'link to [[old-name]]',
		});

		vi.mocked(readTextFile).mockResolvedValue('link to [[old-name]]');

		await updateLinksAfterRename('/vault/old-name.md', '/vault/new-name.md');

		// Should read from disk since tab is clean
		expect(readTextFile).toHaveBeenCalledWith('/vault/other.md');
		// Verify real store state: tab content and savedContent should be updated
		const tab = editorStore.tabs.find((t) => t.path === '/vault/other.md');
		expect(tab).toBeDefined();
		expect(tab!.content).toBe('link to [[new-name]]');
		expect(tab!.savedContent).toBe('link to [[new-name]]');
	});

	it('reads from disk when file has no open tab', async () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/other.md', '[[old-name]]'],
		]));

		// No tabs open
		vi.mocked(readTextFile).mockResolvedValue('link to [[old-name]]');

		await updateLinksAfterRename('/vault/old-name.md', '/vault/new-name.md');

		expect(readTextFile).toHaveBeenCalledWith('/vault/other.md');
		expect(writeTextFile).toHaveBeenCalledWith('/vault/other.md', 'link to [[new-name]]');
		// No tab to update, so tabs should still be empty
		expect(editorStore.tabs).toHaveLength(0);
	});
});

describe('updateTabAfterRenameOrMove', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
		noteIndexStore.reset();
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

	it('re-keys noteIndex from old path to new path', () => {
		const links = [{ target: 'other', alias: null, heading: null, position: 0, original: '[[other]]' }];
		noteIndexStore.setNoteIndex(new Map([['/vault/old.md', links]]));

		updateTabAfterRenameOrMove('/vault/old.md', '/vault/new.md');

		// Verify real store state
		expect(noteIndexStore.noteIndex.has('/vault/old.md')).toBe(false);
		expect(noteIndexStore.noteIndex.get('/vault/new.md')).toBe(links);
	});

	it('re-keys noteContents from old path to new path', () => {
		noteIndexStore.setNoteContents(new Map([['/vault/old.md', 'content']]));

		updateTabAfterRenameOrMove('/vault/old.md', '/vault/new.md');

		// Verify real store state
		expect(noteIndexStore.noteContents.has('/vault/old.md')).toBe(false);
		expect(noteIndexStore.noteContents.get('/vault/new.md')).toBe('content');
	});

	it('does not modify noteIndex when old path not in index', () => {
		const originalIndex = new Map();
		noteIndexStore.setNoteIndex(originalIndex);

		updateTabAfterRenameOrMove('/vault/old.md', '/vault/new.md');

		// noteIndex should remain empty
		expect(noteIndexStore.noteIndex.size).toBe(0);
	});

	it('does not modify noteContents when old path not in contents', () => {
		const originalContents = new Map();
		noteIndexStore.setNoteContents(originalContents);

		updateTabAfterRenameOrMove('/vault/old.md', '/vault/new.md');

		// noteContents should remain empty
		expect(noteIndexStore.noteContents.size).toBe(0);
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
		// Tab outside the moved folder — should be untouched
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
		// Unrelated tab untouched
		expect(editorStore.tabs[2].path).toBe('/vault/other.md');
	});

	it('re-keys child backlinks index entries when a folder is moved', () => {
		const linksA = [{ target: 'x', alias: null, heading: null, position: 0 }];
		const linksB = [{ target: 'y', alias: null, heading: null, position: 0 }];
		const linksOther = [{ target: 'z', alias: null, heading: null, position: 0 }];
		noteIndexStore.setNoteIndex(new Map([
			['/vault/projects/a.md', linksA],
			['/vault/projects/sub/b.md', linksB],
			['/vault/other.md', linksOther],
		]));

		updateTabAfterRenameOrMove('/vault/projects', '/vault/archive/projects');

		expect(noteIndexStore.noteIndex.has('/vault/projects/a.md')).toBe(false);
		expect(noteIndexStore.noteIndex.has('/vault/projects/sub/b.md')).toBe(false);
		expect(noteIndexStore.noteIndex.get('/vault/archive/projects/a.md')).toBe(linksA);
		expect(noteIndexStore.noteIndex.get('/vault/archive/projects/sub/b.md')).toBe(linksB);
		// Unrelated entry untouched
		expect(noteIndexStore.noteIndex.get('/vault/other.md')).toBe(linksOther);
	});

	it('re-keys child backlinks contents when a folder is moved', () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/projects/a.md', 'content a'],
			['/vault/projects/sub/b.md', 'content b'],
			['/vault/other.md', 'other'],
		]));

		updateTabAfterRenameOrMove('/vault/projects', '/vault/archive/projects');

		expect(noteIndexStore.noteContents.has('/vault/projects/a.md')).toBe(false);
		expect(noteIndexStore.noteContents.has('/vault/projects/sub/b.md')).toBe(false);
		expect(noteIndexStore.noteContents.get('/vault/archive/projects/a.md')).toBe('content a');
		expect(noteIndexStore.noteContents.get('/vault/archive/projects/sub/b.md')).toBe('content b');
		// Unrelated entry untouched
		expect(noteIndexStore.noteContents.get('/vault/other.md')).toBe('other');
	});

	it('handles folder move with no matching tabs or backlinks', () => {
		editorStore.addTab({
			path: '/vault/unrelated.md',
			name: 'unrelated.md',
			content: 'content',
			savedContent: 'content',
		});
		noteIndexStore.setNoteIndex(new Map([['/vault/unrelated.md', []]]));

		updateTabAfterRenameOrMove('/vault/empty-folder', '/vault/moved-folder');

		// Nothing should change
		expect(editorStore.tabs[0].path).toBe('/vault/unrelated.md');
		expect(noteIndexStore.noteIndex.has('/vault/unrelated.md')).toBe(true);
	});
});
