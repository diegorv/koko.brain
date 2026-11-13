import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage } from '../../../fixtures/localStorage.fixture';

// `vaultStore.open` persists the recent-vaults list.
setupLocalStorage();

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { areAllRecentSaves, resetHooks } from '#lib/core/editor/editor.hooks.js';
import {
	registerContentInvalidationListener,
	registerNoteChangeConsumer,
} from '#lib/core/filesystem/note-change.service.js';
import { settleTaskWrite } from '#lib/core/filesystem/task-write.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';

describe('settleTaskWrite', () => {
	let upserts: [string, string][] = [];
	/** `upserts.length` at each invalidation, to pin the consumer fan-out ahead of the signal. */
	let upsertsAtInvalidation: number[] = [];
	let unregister: (() => void)[] = [];

	beforeEach(() => {
		upserts = [];
		upsertsAtInvalidation = [];
		resetHooks();
		editorStore.reset();
		vaultStore.open('/vault');
		// Every command answers with a promise: the note-change owner chains `.catch` on each.
		vi.mocked(invoke).mockImplementation(() => Promise.resolve(undefined));
		unregister = [
			registerNoteChangeConsumer({
				name: 'probe',
				upsert: (path, content) => upserts.push([path, content]),
				remove: () => {},
			}),
			registerContentInvalidationListener('probe', () => upsertsAtInvalidation.push(upserts.length)),
		];
	});

	afterEach(() => {
		for (const u of unregister) u();
		unregister = [];
		vaultStore.close();
		resetHooks();
		editorStore.reset();
		vi.mocked(invoke).mockReset();
	});

	it('reaches search, the per-file consumers before the invalidation signal, and the self-save guard', () => {
		settleTaskWrite('/vault/a.md', '- [x] task\n');

		expect(invoke).toHaveBeenCalledWith('update_search_index_file', {
			filePath: 'a.md',
			content: '- [x] task\n',
			vaultPath: '/vault',
		});
		expect(upserts).toEqual([['/vault/a.md', '- [x] task\n']]);
		expect(upsertsAtInvalidation).toEqual([1]);
		expect(areAllRecentSaves(['/vault/a.md'])).toBe(true);
	});

	it('does not refresh the Rust index, which the task command already updated', () => {
		settleTaskWrite('/vault/a.md', '- [x] task\n');

		expect(vi.mocked(invoke).mock.calls.map((c) => c[0])).not.toContain('update_note_in_index');
	});

	it('marks an open tab of the note saved with the written content', () => {
		editorStore.addTab({ path: '/vault/a.md', name: 'a', content: '- [ ] task\n', savedContent: '- [ ] task\n' });

		settleTaskWrite('/vault/a.md', '- [x] task\n');

		const tab = editorStore.tabs.find((t) => t.path === '/vault/a.md');
		expect(tab?.content).toBe('- [x] task\n');
		expect(tab?.savedContent).toBe('- [x] task\n');
	});

	it('skips the search leg when no vault is open', () => {
		vaultStore.close();

		settleTaskWrite('/vault/a.md', '- [x] task\n');

		expect(vi.mocked(invoke).mock.calls.map((c) => c[0])).not.toContain('update_search_index_file');
		expect(upserts).toEqual([['/vault/a.md', '- [x] task\n']]);
	});
});
