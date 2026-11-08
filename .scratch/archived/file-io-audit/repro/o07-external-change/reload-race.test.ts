import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const disk = new Map<string, string>();
/** When set, the next readTextFile waits on this promise (models IPC latency). */
let readGate: Promise<void> | null = null;

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(async (p: string) => {
		if (readGate) await readGate;
		if (!disk.has(p)) throw new Error(`No such file: ${p}`);
		return disk.get(p)!;
	}),
	writeTextFile: vi.fn(async (p: string, c: string) => {
		disk.set(p, c);
	}),
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
import { resetHooks } from '#lib/core/editor/editor.hooks.js';

const NOTE = '/vault/note.md';
const SAVED = '# Note\nLine one.\n';
const EXTERNAL = '# Note\nLine one.\nExternal line.\n';

describe('repro o07: keystrokes typed while the watcher reload read is pending', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		disk.clear();
		resetHooks();
		editorStore.reset();
		disk.set(NOTE, SAVED);
		editorStore.addTab({ path: NOTE, name: 'note', content: SAVED, savedContent: SAVED });
	});

	afterEach(() => {
		readGate = null;
		resetEditor();
		vi.useRealTimers();
	});

	it('external-change-2 / save-pipeline-13: text typed during the read is not replaced by the disk version', async () => {
		let release!: () => void;
		readGate = new Promise<void>((r) => (release = r));
		disk.set(NOTE, EXTERNAL);

		// Clean tab: eligible, readTextFile starts and is pending.
		const reload = reloadExternallyChangedTabs([NOTE]);
		// User types while the read is in flight (sync store write).
		onContentChange(SAVED + 'abc');
		release();
		await reload;
		await vi.advanceTimersByTimeAsync(2500);

		const tab = editorStore.tabs.find((t) => t.path === NOTE)!;
		// Correct behavior: the typed 'abc' survives in the tab (and so reaches disk).
		expect(tab.content).toContain('abc');
	});
});
