import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Fake disk modelling tauri-plugin-fs 2.7.1 `write_file_inner`
 * (plugins/fs/src/commands.rs, tag fs-v2.7.1): the file is opened with
 * `truncate: true` (create per options, default true), then `write_all` runs.
 * There is no temp file, no rename and no `sync_all`. When `write_all` fails
 * (here: ENOSPC on a full disk) the truncation has already happened, so the
 * file is left at 0 bytes.
 */
const disk = new Map<string, string>();
let diskFull = false;

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(async (p: string) => {
		if (!disk.has(p)) throw new Error(`No such file: ${p}`);
		return disk.get(p)!;
	}),
	exists: vi.fn(async (p: string) => disk.has(p)),
	writeTextFile: vi.fn(async (p: string, c: string, opts?: { create?: boolean }) => {
		const create = opts?.create ?? true;
		if (!disk.has(p) && !create) throw new Error(`failed to open file at path: ${p}`);
		// OpenOptions { truncate: true }: the old bytes are gone from here on.
		disk.set(p, '');
		if (diskFull) {
			throw new Error(`failed to write bytes to file at path: ${p} with error: No space left on device (os error 28)`);
		}
		disk.set(p, c);
	}),
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(async () => undefined),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
	ask: vi.fn(async () => true),
}));

import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { saveFileByPath, onContentChange, resetEditor } from '#lib/core/editor/editor.service.js';
import { updateNoteFrontmatter } from '#lib/core/frontmatter/frontmatter-write.service.js';

const NOTE = '/vault/note.md';
const SAVED = '# Meeting notes\n\nA long body the user wrote over weeks.\n';
const TYPED = SAVED + 'One more line.\n';

describe('repro o08: a failed save must not destroy the previous disk copy', () => {
	beforeEach(() => {
		disk.clear();
		diskFull = false;
		resetEditor();
	});

	it('open tab: ENOSPC during autosave leaves the old note on disk', async () => {
		disk.set(NOTE, SAVED);
		editorStore.addTab({ path: NOTE, name: 'note.md', content: SAVED, savedContent: SAVED });
		editorStore.updateContent(TYPED);

		diskFull = true;
		const ok = await saveFileByPath(NOTE);

		expect(ok).toBe(false);
		// The buffer survives in memory (the tab is still dirty)...
		expect(editorStore.tabs[0].content).toBe(TYPED);
		// ...but the disk copy must still be the last good save.
		expect(disk.get(NOTE)).toBe(SAVED);
	});

	it('closed note: a failed frontmatter rewrite (calendar drag) leaves the note on disk', async () => {
		const base = '---\nstart: 2026-11-02\n---\n# Event\n\nAgenda and minutes.\n';
		disk.set(NOTE, base);

		diskFull = true;
		await expect(
			updateNoteFrontmatter(NOTE, (props) => props.map((p) => (p.key === 'start' ? { ...p, value: '2026-11-03' } : p))),
		).rejects.toThrow(/No space left on device/);

		// No tab is open, so `base` and the rewritten bytes existed only in local
		// variables. The disk copy is the only copy of the note.
		expect(disk.get(NOTE)).toBe(base);
	});

	it('onContentChange path is the same writer (sanity: body autosave reaches writeTextFile)', async () => {
		vi.useFakeTimers();
		try {
			disk.set(NOTE, SAVED);
			editorStore.addTab({ path: NOTE, name: 'note.md', content: SAVED, savedContent: SAVED });
			diskFull = true;
			onContentChange(TYPED);
			await vi.advanceTimersByTimeAsync(2000);
			expect(disk.get(NOTE)).toBe(SAVED);
		} finally {
			resetEditor();
			vi.clearAllTimers();
			vi.useRealTimers();
		}
	});
});
