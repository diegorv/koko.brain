import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('$lib/core/filesystem/fs-rust.service', () => ({
	readText: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('$lib/utils/debug', () => ({
	debug: vi.fn(),
	error: vi.fn(),
}));

import { readText } from '$lib/core/filesystem/fs-rust.service';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
import { resolveTargetContent } from '$lib/core/markdown-editor/extensions/wikilink/completion';
import type { FileTreeNode } from '$lib/core/filesystem/fs.types';

function fileNode(name: string, path: string): FileTreeNode {
	return {
		name,
		path,
		isDirectory: false,
		children: undefined,
	};
}

describe('resolveTargetContent', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		fsStore.reset();
	});

	it('returns null when no vault is open', async () => {
		fsStore.setFileTree([fileNode('Note.md', '/vault/Note.md')]);

		const result = await resolveTargetContent('Note');

		expect(result).toBeNull();
		expect(readText).not.toHaveBeenCalled();
	});

	it('returns null when the wikilink target does not resolve to a file', async () => {
		vaultStore.open('/vault');
		fsStore.setFileTree([fileNode('Other.md', '/vault/Other.md')]);

		const result = await resolveTargetContent('Missing');

		expect(result).toBeNull();
		expect(readText).not.toHaveBeenCalled();
	});

	it('reads through the wrapper with vault + resolved path', async () => {
		vaultStore.open('/vault');
		fsStore.setFileTree([fileNode('Note.md', '/vault/Note.md')]);
		vi.mocked(readText).mockResolvedValue('# Note body');

		const result = await resolveTargetContent('Note');

		expect(readText).toHaveBeenCalledWith('/vault', '/vault/Note.md');
		expect(result).toBe('# Note body');
	});

	it('returns null and logs when readText rejects', async () => {
		vaultStore.open('/vault');
		fsStore.setFileTree([fileNode('Note.md', '/vault/Note.md')]);
		vi.mocked(readText).mockRejectedValue(new Error('disk error'));

		const result = await resolveTargetContent('Note');

		expect(result).toBeNull();
	});
});
