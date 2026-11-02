import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../fixtures/localStorage.fixture';

setupLocalStorage();

// F53: the Favorite writer (closed note) goes through updateNoteFrontmatter,
// which passes detectLossyFrontmatter and then rewrites every scalar from its
// parsed JS value. Tauri fs/invoke, the editor save and the toast are mocked;
// properties.logic and frontmatter-write.service are real.
vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	exists: vi.fn(),
}));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('#lib/core/editor/editor.service.js', () => ({
	syncExternalContentToEditor: vi.fn(),
	saveFileByPath: vi.fn(),
}));
vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));
vi.mock('svelte-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'svelte-sonner';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { toggleFavoriteForPath } from '#lib/features/properties/lifecycle.service.js';
import { _resetParseFrontmatterCache } from '#lib/core/frontmatter/properties.logic.js';

const PATH = '/vault/note.md';

async function favoriteWith(line: string): Promise<string | null> {
	vi.mocked(readTextFile).mockResolvedValue(`---\ntitle: Note\n${line}\n---\n\nbody\n`);
	await toggleFavoriteForPath(PATH, true);
	const call = vi.mocked(writeTextFile).mock.calls[0];
	return call ? (call[1] as string) : null;
}

describe('F53: Favorite rewrites unquoted scalars from their JS value', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		editorStore.reset();
		_resetParseFrontmatterCache();
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(invoke).mockResolvedValue(undefined as never);
	});
	afterEach(() => {
		vaultStore._reset();
		editorStore.reset();
		clearLocalStorage();
	});

	it.each([
		['id: 0042'],
		['zip: 01234'],
		['phone: 0612345678'],
		['version: 1.0'],
		['price: 9.90'],
		['mask: 0x1F'],
		['done: True'],
		['exp: 1e3'],
	])('keeps the untouched line %s byte for byte', async (line) => {
		const written = await favoriteWith(line);
		// The writer did write (no refusal), so the note on disk is what we inspect.
		expect(written).not.toBeNull();
		expect(written).toContain('_favorite: true');
		const key = line.split(':')[0] + ':';
		expect(written!.split('\n').find((l) => l.startsWith(key))).toBe(line);
	});

	it('control: an unsafe integer is refused, not rewritten (guard exists on this path)', async () => {
		const written = await favoriteWith('tweet_id: 1234567890123456789');
		expect(written).toBeNull();
		expect(toast.error).toHaveBeenCalled();
	});
});
