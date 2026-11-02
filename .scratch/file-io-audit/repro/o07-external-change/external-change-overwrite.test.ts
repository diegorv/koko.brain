import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Fake disk. `writeTextFile` mirrors tauri-plugin-fs 2.7.1 `write_file_inner`:
 * with no options (or `create` omitted) it creates + truncates; with
 * `create: false` it refuses a missing file.
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

const NOTE = '/vault/note.md';
const SAVED = '---\ndate: 2026-11-02\n---\n# Note\nLine one.\n';
const EXTERNAL = '---\ndate: 2026-11-02\n---\n# Note\nLine one.\nLINE WRITTEN BY PHONE SYNC.\n';

/** True when some file on the fake disk still holds the external line. */
function externalVersionSurvives(): boolean {
	return [...disk.values()].some((c) => c.includes('LINE WRITTEN BY PHONE SYNC.'));
}

describe('repro o07: external change vs. tab buffer', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		disk.clear();
		resetHooks();
		editorStore.reset();
		disk.set(NOTE, SAVED);
		editorStore.addTab({ path: NOTE, name: 'note', content: SAVED, savedContent: SAVED });
	});

	afterEach(() => {
		resetEditor();
		vi.useRealTimers();
	});

	it('external-change-1 / save-pipeline-8: an external rewrite of a dirty note is not silently destroyed by autosave', async () => {
		// User types one character: tab is dirty, 2 s body autosave armed.
		onContentChange(SAVED + 'x');
		// A sync tool rewrites the note on disk.
		disk.set(NOTE, EXTERNAL);
		// The watcher batch reaches the editor (dirty tab is skipped).
		await reloadExternallyChangedTabs([NOTE]);
		// Autosave fires.
		await vi.advanceTimersByTimeAsync(2500);

		// Correct behavior: the external version is kept somewhere (on disk at
		// the note path, a conflict copy, or loaded into the tab).
		expect(externalVersionSurvives()).toBe(true);
	});

	it('calendar-1: a frontmatter write on a clean tab does not overwrite an external edit still in the reload window', async () => {
		// A sync tool rewrites the note; the watcher has not delivered it yet
		// (500 ms Rust debounce + 300 ms TS debounce + tree rescan).
		disk.set(NOTE, EXTERNAL);
		// User drags the calendar event for this note.
		await updateNoteFrontmatter(NOTE, (props) =>
			props.map((p) => (p.key === 'date' ? { ...p, value: '2026-11-05' } : p)),
		);
		// The watcher batch arrives afterwards.
		await reloadExternallyChangedTabs([NOTE]);

		expect(disk.get(NOTE)).toContain('2026-11-05');
		// Correct behavior: the external line is not lost.
		expect(externalVersionSurvives()).toBe(true);
	});
});
