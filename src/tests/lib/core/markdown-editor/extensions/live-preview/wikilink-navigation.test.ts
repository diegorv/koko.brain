// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/core/editor/editor.service', () => ({
	openFileInEditor: vi.fn(),
}));

vi.mock('$lib/core/filesystem/fs.service', () => ({
	createFile: vi.fn(),
}));

vi.mock('$lib/plugins/periodic-notes/periodic-notes.service', () => ({
	openOrCreatePeriodicNoteForDate: vi.fn(),
}));

// periodic-notes.logic is pure logic (CLAUDE.md: never mock .logic) — the real
// detectPeriodicNoteType returns null for these non-periodic targets, so the
// "not a periodic note" branch is exercised with the real implementation.

import { openWikilinkTarget } from '$lib/core/markdown-editor/extensions/live-preview/wikilink-navigation';
import { openFileInEditor } from '$lib/core/editor/editor.service';
import { createFile } from '$lib/core/filesystem/fs.service';
import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import type { FileTreeNode } from '$lib/core/filesystem/fs.types';

function makeFile(path: string): FileTreeNode {
	const segments = path.split('/');
	return { name: segments[segments.length - 1], path, isDirectory: false };
}

beforeEach(() => {
	vi.clearAllMocks();
	fsStore.setFileTree([]);
	vaultStore.close();
});

describe('openWikilinkTarget', () => {
	it('opens a resolved markdown wikilink target via openFileInEditor', async () => {
		fsStore.setFileTree([makeFile('/vault/Notes/note.md')]);

		await openWikilinkTarget('note');

		expect(openFileInEditor).toHaveBeenCalledWith('/vault/Notes/note.md');
		expect(createFile).not.toHaveBeenCalled();
	});

	it('does not call openFileInEditor for image targets — silent no-op', async () => {
		fsStore.setFileTree([makeFile('/vault/Resources/img.png')]);

		await openWikilinkTarget('img.png');

		expect(openFileInEditor).not.toHaveBeenCalled();
		expect(createFile).not.toHaveBeenCalled();
	});

	it('does not call openFileInEditor for full-path image targets', async () => {
		fsStore.setFileTree([makeFile('/vault/Resources/9902bb9ff321.png')]);

		await openWikilinkTarget('Resources/9902bb9ff321.png');

		expect(openFileInEditor).not.toHaveBeenCalled();
	});

	it('does not call openFileInEditor for audio / video / pdf targets', async () => {
		fsStore.setFileTree([
			makeFile('/vault/song.mp3'),
			makeFile('/vault/clip.mp4'),
			makeFile('/vault/spec.pdf'),
		]);

		await openWikilinkTarget('song.mp3');
		await openWikilinkTarget('clip.mp4');
		await openWikilinkTarget('spec.pdf');

		expect(openFileInEditor).not.toHaveBeenCalled();
		expect(createFile).not.toHaveBeenCalled();
	});

	it('skips binary guard regardless of casing', async () => {
		fsStore.setFileTree([makeFile('/vault/Photo.PNG')]);

		await openWikilinkTarget('Photo.PNG');

		expect(openFileInEditor).not.toHaveBeenCalled();
	});
});
