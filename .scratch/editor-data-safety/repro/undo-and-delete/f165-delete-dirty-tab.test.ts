/**
 * AUDIT REPRO F165: deleting a note whose tab holds an unsaved edit. The
 * explorer / note-list / action-bar paths call `deleteItem` directly, and
 * `applyPathChange` force-closes the tab (`closeTabsForDeletedPath`, no dirty
 * check, no save) BEFORE the Trash move. The Trash keeps only the disk bytes.
 *
 * Real stores, real editor/fs/path-change/trash services; only the Tauri APIs
 * are mocked, backed by a tiny in-memory disk. Each test asserts the CORRECT
 * behavior and fails today.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../fixtures/localStorage.fixture';

setupLocalStorage();

const disk = new Map<string, string>();
let renameShouldFail = false;

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn() }));
vi.mock('@tauri-apps/plugin-opener', () => ({ revealItemInDir: vi.fn() }));
vi.mock('svelte-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(async (p: string) => {
		if (!disk.has(p)) throw new Error(`not found: ${p}`);
		return disk.get(p)!;
	}),
	writeTextFile: vi.fn(async (p: string, c: string) => {
		disk.set(p, c);
	}),
	mkdir: vi.fn(async () => {}),
	remove: vi.fn(async (p: string) => {
		disk.delete(p);
	}),
	rename: vi.fn(async (from: string, to: string) => {
		if (renameShouldFail) throw new Error('EPERM: operation not permitted');
		disk.set(to, disk.get(from)!);
		disk.delete(from);
	}),
	exists: vi.fn(async (p: string) => disk.has(p)),
	copyFile: vi.fn(),
	readDir: vi.fn(async () => []),
}));

import { invoke } from '@tauri-apps/api/core';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { deleteItem } from '#lib/core/filesystem/fs.service.js';

const NOTE = '/vault/note.md';
const SAVED = 'old body';
const UNSAVED = 'old body\n\nA paragraph typed less than 2 s ago.';

function openDirtyTab() {
	disk.set(NOTE, SAVED);
	editorStore.addTab({ path: NOTE, name: 'note.md', content: UNSAVED, savedContent: SAVED });
}

/** The edit is recoverable if it is still in an open tab or in some file on disk. */
function unsavedEditSurvives(): boolean {
	const inTab = editorStore.tabs.some((t) => t.content === UNSAVED);
	const onDisk = [...disk.values()].some((c) => c === UNSAVED);
	return inTab || onDisk;
}

describe('AUDIT F165: deleting a note with an unsaved buffer', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		disk.clear();
		renameShouldFail = false;
		editorStore.reset();
		fsStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
		vi.mocked(invoke).mockResolvedValue([]);
	});

	it('a FAILED Trash move must not throw away the unsaved edit', async () => {
		openDirtyTab();
		renameShouldFail = true;

		await expect(deleteItem(NOTE, false)).rejects.toThrow(/EPERM/);

		// The note was not deleted: it is still on disk with the OLD bytes.
		expect(disk.get(NOTE)).toBe(SAVED);
		// Correct behavior: the edit is still somewhere (tab kept open, or flushed to disk).
		expect(unsavedEditSurvives()).toBe(true);
	});

	it('a successful Trash move must put the latest buffer in the Trash, not the stale disk bytes', async () => {
		openDirtyTab();

		await deleteItem(NOTE, false);

		const trashed = [...disk.entries()].filter(([p]) => p.includes('/.kokobrain/trash/') && p.endsWith('/note.md'));
		expect(trashed).toHaveLength(1);
		// Correct behavior (what event-calendar deleteNow does by saving first):
		// restoring from Trash brings back what the user last saw.
		expect(trashed[0][1]).toBe(UNSAVED);
	});
});
