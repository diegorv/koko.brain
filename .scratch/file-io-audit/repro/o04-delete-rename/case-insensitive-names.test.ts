/**
 * Repro (o04: rename-move-delete-2, rename-move-delete-7).
 *
 * The fake plugin-fs runs in case-insensitive mode, the macOS APFS default:
 * `exists` (Rust `Path::exists`) matches a name that differs only in case,
 * and `copyFile` (Rust `std::fs::copy`, documented to overwrite `to`)
 * truncates the existing entry. Only `@tauri-apps/*` is mocked. The tests
 * assert the CORRECT behavior and fail while the bugs exist.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
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

import { duplicateItem, renameItem } from '#lib/core/filesystem/fs.service.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';

describe('o04 repro: case-insensitive volume', () => {
	beforeEach(() => {
		clearLocalStorage();
		fake.fs.reset();
		fake.fs.caseInsensitive = true;
		fsStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
	});

	it('Duplicate does not overwrite a sibling whose name differs only in case', async () => {
		fake.fs.put('/vault/note.md', 'source note body');
		fake.fs.put('/vault/Note copy.md', 'a different note the user wrote');

		const newPath = await duplicateItem('/vault/note.md', false);

		// CORRECT: the unrelated note keeps its bytes and the copy gets a free name.
		expect(fake.fs.read('/vault/Note copy.md')).toBe('a different note the user wrote');
		expect(newPath.toLowerCase()).not.toBe('/vault/note copy.md');
	});

	it('a case-only rename succeeds', async () => {
		fake.fs.put('/vault/meeting notes.md', 'body');

		// CORRECT: changing only the casing is allowed on a case-insensitive volume.
		await expect(renameItem('/vault/meeting notes.md', 'Meeting Notes.md')).resolves.toBe('/vault/Meeting Notes.md');
		expect(fake.fs.listPaths()).toContain('/vault/Meeting Notes.md');
	});
});
