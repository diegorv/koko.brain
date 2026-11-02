import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage } from '../../fixtures/localStorage.fixture';
setupLocalStorage();

// Repro for external-change-7: a watcher batch above INCREMENTAL_THRESHOLD
// (more than 10 markdown files) takes the full-rebuild branch, which never
// reaches the FTS5 / semantic owner leg. Correct behavior: every changed note
// gets its FTS5 row refreshed, whichever branch the batch takes.

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('#lib/features/backlinks/backlinks.service.js', () => ({
	rebuildIndex: vi.fn(() => Promise.resolve()),
}));

vi.mock('#lib/features/collection/collection.service.js', () => ({
	buildPropertyIndex: vi.fn(),
	registerCollectionNoteChangeConsumer: vi.fn(() => () => {}),
}));

vi.mock('#lib/features/file-icons/file-icons.service.js', () => ({
	buildFrontmatterIconIndex: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('#lib/core/editor/editor.hooks.js', () => ({
	areAllRecentSaves: vi.fn(() => false),
}));

vi.mock('#lib/utils/debug.js', () => ({
	debug: vi.fn(),
	error: vi.fn(),
	logProcessMemory: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { rebuildAllIndexes } from '#lib/app/lifecycle/watcher-handler.service.js';

describe('external bulk change updates FTS5 for every changed note', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(invoke).mockResolvedValue(undefined);
		vaultStore.open('/vault');
	});

	it('issues update_search_index_file for each of 12 changed markdown notes', async () => {
		const paths = Array.from({ length: 12 }, (_, i) => `/vault/notes/n${i}.md`);

		await rebuildAllIndexes(paths);

		const ftsCalls = vi
			.mocked(invoke)
			.mock.calls.filter(([cmd]) => cmd === 'update_search_index_file');
		// Expected to FAIL on main: the >10 batch takes the full-rebuild branch,
		// which calls rebuildIndex / buildPropertyIndex / buildFrontmatterIconIndex
		// and notifyContentInvalidated only, so no FTS5 row is refreshed.
		expect(ftsCalls.map(([, args]) => (args as { filePath: string }).filePath)).toHaveLength(12);
	});
});
