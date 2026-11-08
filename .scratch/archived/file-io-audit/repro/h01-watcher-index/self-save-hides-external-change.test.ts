import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../fixtures/localStorage.fixture';
setupLocalStorage();

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { markRecentSave, resetHooks } from '#lib/core/editor/editor.hooks.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { clearAllIndexed } from '#lib/utils/index-dedupe.js';
import { rebuildAllIndexes } from '#lib/app/lifecycle/watcher-handler.service.js';

/**
 * Repro for h01 external-change-6. `rebuildAllIndexes` returns early when every
 * changed file is in the editor's recent-save set (watcher-handler.service.ts:41),
 * and `markRecentSave` keeps a path in that set for 15 s (editor.hooks.ts:24,
 * :37-44). The watcher cannot tell the app's own write from an external one, so an
 * external rewrite or delete inside that window never reaches the Rust index.
 *
 * Only the Tauri boundary is mocked; the recent-save set is the real module.
 */
const NOTE = '/vault/n.md';
const EXTERNAL = '---\nstatus: changed-by-sync\n---\n# N\nRewritten outside the app.\n';

describe('repro h01 external-change-6: an external change to a just-saved note', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vaultStore.open('/vault');
		// The app saved NOTE moments ago; the watcher batch that follows is the
		// one the skip must not swallow when the change came from outside.
		markRecentSave(NOTE);
	});

	afterEach(() => {
		resetHooks();
		clearAllIndexed();
		clearLocalStorage();
	});

	it('an external rewrite of the note reaches the Rust index', async () => {
		vi.mocked(invoke).mockImplementation(async (cmd: string) => {
			if (cmd === 'read_files_batch') {
				return [{ path: NOTE, content: EXTERNAL, error: null }];
			}
			return undefined;
		});

		await rebuildAllIndexes([NOTE]);

		expect(invoke).toHaveBeenCalledWith('read_files_batch', { vaultPath: '/vault', paths: [NOTE] });
		expect(invoke).toHaveBeenCalledWith('update_note_in_index', { path: NOTE, content: EXTERNAL });
	});

	it('an external delete of the note is removed from the Rust index', async () => {
		vi.mocked(invoke).mockImplementation(async (cmd: string) => {
			if (cmd === 'read_files_batch') {
				return [{ path: NOTE, content: null, error: 'Failed to resolve path: No such file or directory (os error 2)' }];
			}
			return undefined;
		});

		await rebuildAllIndexes([NOTE]);

		expect(invoke).toHaveBeenCalledWith('remove_note_from_index', { path: NOTE });
	});
});
