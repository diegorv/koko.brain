/**
 * Repro (h05: calendar-7 and rename-move-delete-5, one root cause).
 *
 * `updateLinksAfterRename` snapshots an affected open note (a clean tab is
 * read from disk, a dirty tab uses `tab.content`), awaits the write, then
 * replaces the tab's content and savedContent with the rewritten snapshot via
 * `syncExternalContentToEditor(..., true)`. Keystrokes typed while the read or
 * the write is in flight are not in that snapshot, so they are dropped from
 * the buffer and from the disk.
 *
 * The tests simulate a keystroke during the IPC (the store write that
 * `onContentChange` performs) and assert the CORRECT behavior: the typed text
 * survives in the buffer. They fail while the bug exists.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

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

import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { updateLinksAfterRename } from '#lib/core/filesystem/link-updater.service.js';
import { clearAllIndexed } from '#lib/utils/index-dedupe.js';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';

const OTHER = '/vault/other.md';
const LINK = 'link to [[old-name]]';
const REWRITTEN = 'link to [[new-name]]';

/** `get_backlinks_v2` answers with one note that links to the renamed one; other commands resolve. */
function serveBacklinks(): void {
	vi.mocked(invoke).mockImplementation(async (cmd: string) => {
		if (cmd === 'get_backlinks_v2') return [{ path: OTHER } as unknown as NoteEntryV2];
		return undefined;
	});
}

describe('h05 repro: wikilink rewrite drops keystrokes typed in the rewritten note', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
		clearAllIndexed();
		serveBacklinks();
	});

	it('keeps a keystroke typed while the rewrite reads a clean open note', async () => {
		editorStore.addTab({ path: OTHER, name: 'other.md', content: LINK, savedContent: LINK });
		vi.mocked(readTextFile).mockImplementationOnce(async () => {
			// Keystroke while the rewrite's disk read is in flight (the tab is clean at the check).
			editorStore.updateContent(`${LINK} typed`);
			return LINK;
		});

		await updateLinksAfterRename('/vault/old-name.md', '/vault/new-name.md');

		expect(editorStore.tabs[0].content).toContain('typed');
	});

	it('keeps a keystroke typed while the rewrite writes a dirty open note', async () => {
		// Dirty: savedContent differs, so the rewrite snapshots `tab.content` synchronously.
		editorStore.addTab({ path: OTHER, name: 'other.md', content: LINK, savedContent: '' });
		vi.mocked(writeTextFile).mockImplementationOnce(async () => {
			// Keystroke while the rewrite's disk write is in flight.
			editorStore.updateContent(`${LINK} typed`);
		});

		await updateLinksAfterRename('/vault/old-name.md', '/vault/new-name.md');

		expect(editorStore.tabs[0].content).toContain('typed');
		// Sanity: the rewrite itself still happened on the snapshot.
		expect(vi.mocked(writeTextFile)).toHaveBeenCalledWith(OTHER, REWRITTEN);
	});
});
