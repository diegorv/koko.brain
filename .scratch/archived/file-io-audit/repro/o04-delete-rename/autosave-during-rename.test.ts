/**
 * Repro (o04: rename-move-delete-8, save-pipeline-12).
 *
 * The 2 s body autosave fires while the rename IPC's response is in flight:
 * Tauri has already run the sync `rename` command, but `applyPathChange` has
 * not yet reached `updateTabAfterRenameOrMove`, so `saveFileByPath` writes the
 * OLD path, and plugin-fs `write_text_file` defaults to `create: true`.
 *
 * The fake plugin-fs applies the rename when it is called and holds only the
 * response (`renameGate`). Only `@tauri-apps/*` is mocked. The test asserts
 * the CORRECT behavior and fails while the bug exists.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../fixtures/localStorage.fixture';

setupLocalStorage();

const fake = vi.hoisted(() => ({ fs: null as unknown as import('./fake-fs').FakeFs }));

vi.mock('@tauri-apps/plugin-fs', async () => {
	const mod = await import('./fake-fs');
	fake.fs = mod.createFakeFs();
	return mod.pluginFsMock(fake.fs);
});
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(async () => []) }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(async () => () => {}) }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn(async () => true) }));
vi.mock('@tauri-apps/plugin-opener', () => ({ revealItemInDir: vi.fn() }));

import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { onContentChange } from '#lib/core/editor/editor.service.js';
import { renameItem } from '#lib/core/filesystem/fs.service.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';

const OLD = '/vault/old.md';
const NEW = '/vault/new.md';

describe('o04 repro: autosave firing during the rename IPC', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		clearLocalStorage();
		fake.fs.reset();
		editorStore.reset();
		fsStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('does not recreate the old path, and the new path ends with the newest text', async () => {
		fake.fs.put(OLD, 'v1');
		editorStore.addTab({ path: OLD, name: 'old.md', content: 'v1', savedContent: 'v1' });
		onContentChange('v2'); // arms the 2 s autosave at t=0

		let openGate!: () => void;
		fake.fs.renameGate = new Promise<void>((r) => { openGate = r; });

		await vi.advanceTimersByTimeAsync(1999);
		const renaming = renameItem(OLD, 'new.md');
		await vi.advanceTimersByTimeAsync(5); // the 2 s timer fires while the rename response is pending
		openGate();
		await renaming;
		await vi.advanceTimersByTimeAsync(6000);

		// CORRECT: one note, at the new path, holding the newest text.
		expect.soft(fake.fs.listPaths().filter((p) => !p.includes('/.kokobrain/'))).toEqual([NEW]);
		expect({ new: fake.fs.read(NEW), old: fake.fs.read(OLD) }).toEqual({ new: 'v2', old: undefined });
	});
});
