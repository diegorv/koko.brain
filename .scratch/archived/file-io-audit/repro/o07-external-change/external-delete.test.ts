import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Fake disk. `writeTextFile` mirrors tauri-plugin-fs 2.7.1 `write_file_inner`:
 * options None -> create: true, truncate: true; `create: false` refuses a
 * missing file.
 */
const disk = new Map<string, string>();

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(async (p: string) => {
		if (!disk.has(p)) throw new Error(`No such file: ${p}`);
		return disk.get(p)!;
	}),
	writeTextFile: vi.fn(async (p: string, c: string, opts?: { create?: boolean }) => {
		if (opts?.create === false && !disk.has(p)) throw new Error(`No such file: ${p}`);
		disk.set(p, c);
	}),
	exists: vi.fn(async (p: string) => disk.has(p)),
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(async () => ({ changed: false, version: 0, upserted: [], removed: [], fullRescan: false })),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
	ask: vi.fn(async () => true),
}));

import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import {
	onContentChange,
	reloadExternallyChangedTabs,
	resetEditor,
} from '#lib/core/editor/editor.service.js';
import { updateNoteFrontmatter } from '#lib/core/frontmatter/frontmatter-write.service.js';
import { resetHooks } from '#lib/core/editor/editor.hooks.js';

const A = '/vault/a.md';
const B = '/vault/b.md';
const SAVED = '---\ndate: 2026-11-02\n---\n# A\nBody.\n';

describe('repro o07: note deleted or renamed outside the app while its tab is open', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		disk.clear();
		resetHooks();
		editorStore.reset();
		disk.set(A, SAVED);
		editorStore.addTab({ path: A, name: 'a', content: SAVED, savedContent: SAVED });
	});

	afterEach(() => {
		resetEditor();
		vi.useRealTimers();
	});

	it('external-change-5 / save-pipeline-7: an external delete is not undone by the next autosave', async () => {
		// git checkout / Finder / sync deletes the note.
		disk.delete(A);
		// Watcher batch reaches the editor; the read rejects.
		await reloadExternallyChangedTabs([A]);
		// User keeps typing in the still-open tab; autosave fires.
		onContentChange(SAVED + 'more\n');
		await vi.advanceTimersByTimeAsync(2500);

		// Correct behavior: the deleted file is not silently recreated.
		expect(disk.has(A)).toBe(false);
	});

	it('external-change-5 / save-pipeline-7: an external rename does not leave a duplicate at the old path', async () => {
		// Finder / git mv renames a.md -> b.md.
		disk.set(B, disk.get(A)!);
		disk.delete(A);
		await reloadExternallyChangedTabs([A, B]);
		onContentChange(SAVED + 'more\n');
		await vi.advanceTimersByTimeAsync(2500);

		expect(disk.has(A)).toBe(false);
	});

	it('calendar-2: a calendar frontmatter write does not recreate an externally deleted open note', async () => {
		disk.delete(A);
		await reloadExternallyChangedTabs([A]);
		await updateNoteFrontmatter(A, (props) =>
			props.map((p) => (p.key === 'date' ? { ...p, value: '2026-11-05' } : p)),
		).catch(() => undefined);

		// Correct behavior: the write is refused, like the closed-note branch (`create: false`).
		expect(disk.has(A)).toBe(false);
	});
});
