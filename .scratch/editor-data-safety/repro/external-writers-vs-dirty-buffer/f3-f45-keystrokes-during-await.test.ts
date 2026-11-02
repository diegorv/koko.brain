/**
 * Audit repro F3 and F45: an external writer snapshots a tab, awaits disk I/O,
 * then calls syncExternalContentToEditor(markSaved=true) without checking that
 * the tab content is still the snapshot. Keystrokes that land during the await
 * (onContentChange -> editorStore.updateContent) must survive (correct
 * behavior); today they are overwritten.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
	ask: vi.fn(),
}));

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('#lib/utils/debug.js', () => ({
	debug: vi.fn(),
	error: vi.fn(),
	timeAsync: vi.fn(async (_tag: string, _label: string, fn: () => Promise<unknown>) => fn()),
	timeSync: vi.fn((_tag: string, _label: string, fn: () => unknown) => fn()),
	perfStart: vi.fn(() => 0),
	perfEnd: vi.fn(),
	perfBaseline: vi.fn(),
}));

// Side-effect service (index fan-out): not under test here.
vi.mock('#lib/core/filesystem/note-change.service.js', () => ({
	applyNoteChange: vi.fn(() => Promise.resolve()),
}));

import { invoke } from '@tauri-apps/api/core';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { onContentChange, reloadExternallyChangedTabs, resetEditor } from '#lib/core/editor/editor.service.js';
import { updateLinksAfterRename } from '#lib/core/filesystem/link-updater.service.js';

function deferred<T>() {
	let resolve!: (v: T) => void;
	const promise = new Promise<T>((r) => { resolve = r; });
	return { promise, resolve };
}

async function flushMicrotasks() {
	for (let i = 0; i < 10; i++) await Promise.resolve();
}

describe('F3: watcher reload vs keystrokes typed during the disk read', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
		resetEditor();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('does not overwrite keystrokes that land while readTextFile is in flight', async () => {
		const path = '/vault/n.md';
		editorStore.addTab({ path, name: 'n.md', content: 'v1', savedContent: 'v1' });
		const read = deferred<string>();
		vi.mocked(readTextFile).mockReturnValueOnce(read.promise);

		const reload = reloadExternallyChangedTabs([path]);
		await flushMicrotasks();
		expect(readTextFile).toHaveBeenCalledWith(path);

		// User types while the IPC read is pending.
		onContentChange('v1 typed', false);

		read.resolve('v2 from another device');
		await reload;

		const tab = editorStore.tabs[0];
		expect(tab.content).toContain('typed');
	});
});

describe('F45: link rewrite on rename vs keystrokes typed during the IPC', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
		resetEditor();
		vi.mocked(invoke).mockImplementation(async (cmd: string) => {
			if (cmd === 'get_backlinks_v2') return [{ path: '/vault/y.md' }];
			return undefined;
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('dirty tab: keystrokes typed during writeTextFile survive the sync', async () => {
		const path = '/vault/y.md';
		editorStore.addTab({ path, name: 'y.md', content: 'see [[X]] draft', savedContent: 'see [[X]]' });
		const write = deferred<void>();
		vi.mocked(writeTextFile).mockReturnValueOnce(write.promise);

		const rename = updateLinksAfterRename('/vault/X.md', '/vault/Z.md');
		await flushMicrotasks();
		expect(writeTextFile).toHaveBeenCalledWith(path, 'see [[Z]] draft');

		onContentChange('see [[X]] draft more', false);

		write.resolve();
		await rename;

		const tab = editorStore.tabs[0];
		// Sanity: the rewrite reached the tab (true with or without the bug).
		expect(tab.content).toContain('[[Z]]');
		expect(tab.content).toContain('more');
	});

	it('clean tab: keystrokes typed during readTextFile survive the sync', async () => {
		const path = '/vault/y.md';
		editorStore.addTab({ path, name: 'y.md', content: 'see [[X]]', savedContent: 'see [[X]]' });
		const read = deferred<string>();
		vi.mocked(readTextFile).mockReturnValueOnce(read.promise);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		const rename = updateLinksAfterRename('/vault/X.md', '/vault/Z.md');
		await flushMicrotasks();
		expect(readTextFile).toHaveBeenCalledWith(path);

		onContentChange('see [[X]] more', false);

		read.resolve('see [[X]]');
		await rename;

		const tab = editorStore.tabs[0];
		expect(tab.content).toContain('[[Z]]');
		expect(tab.content).toContain('more');
	});
});
