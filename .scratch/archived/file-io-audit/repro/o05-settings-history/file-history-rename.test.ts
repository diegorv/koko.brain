// Repro for o05 recovery-8. Asserts the CORRECT behavior (a note's history
// follows it on rename), so it fails while the bug exists. Only Tauri APIs are
// mocked. The fake Rust side keys snapshots by vault-relative path, as
// history_repo.rs does; a re-key is modelled for any history/snapshot command
// issued during the path change (Rust `rename_note` does not touch the
// `snapshots` table: only history_repo.rs and schema.rs reference it).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(async () => () => {}) }));
vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(async (p: string) => (String(p).endsWith('.json') ? '{}' : 'note body\n')),
	writeTextFile: vi.fn(),
	mkdir: vi.fn(),
	exists: vi.fn(async () => true),
	readDir: vi.fn(async () => []),
	rename: vi.fn(),
	remove: vi.fn(),
}));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn(async () => true) }));
vi.mock('@tauri-apps/plugin-opener', () => ({ revealItemInDir: vi.fn() }));

import { invoke } from '@tauri-apps/api/core';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { applyPathChange } from '#lib/core/filesystem/path-change.service.js';
import { fileHistoryStore } from '#lib/features/file-history/file-history.store.svelte.js';
import { openFileHistory } from '#lib/features/file-history/file-history.service.js';

describe('o05 recovery-8: File History after rename', () => {
	let table: Map<string, { id: number; timestamp: number; size: number }[]>;

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		editorStore.reset();
		fsStore.reset();
		fileHistoryStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
		table = new Map([['inbox/idea.md', [{ id: 1, timestamp: Date.now() - 3_600_000, size: 9 }]]]);
		vi.mocked(invoke).mockImplementation(async (cmd: string, args?: any) => {
			if (cmd === 'get_file_history') return table.get(args.filePath) ?? [];
			if (cmd === 'get_snapshot_content') return 'old body\n';
			if (cmd === 'compute_diff') return [];
			if (/history|snapshot/.test(cmd) && args) {
				// Any history re-key leg a fix might add.
				const from = String(args.from ?? args.oldPath ?? '').replace('/vault/', '');
				const to = String(args.to ?? args.newPath ?? '').replace('/vault/', '');
				if (from && to && table.has(from)) {
					table.set(to, table.get(from)!);
					table.delete(from);
				}
				return undefined;
			}
			return [];
		});
	});

	it('the renamed note still lists the snapshots it had before the rename', async () => {
		await applyPathChange({
			from: '/vault/inbox/idea.md',
			to: '/vault/projects/idea.md',
			isDirectory: false,
			diskOp: async () => {},
		});

		await openFileHistory('/vault/projects/idea.md');

		expect(fileHistoryStore.snapshots.map((s) => s.id)).toEqual([1]);
	});
});
