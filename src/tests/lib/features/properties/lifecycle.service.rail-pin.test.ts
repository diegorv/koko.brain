import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// setTypeRailPin writes a type definition by path: the Tauri boundaries, the
// editor's save and the toast are mocked; the frontmatter writer is real.
vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	exists: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('#lib/core/editor/editor.service.js', () => ({
	syncExternalContentToEditor: vi.fn(),
	saveFileByPath: vi.fn(),
}));

vi.mock('#lib/utils/log.service.js', () => ({
	appendLog: vi.fn(),
}));

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

import { readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'svelte-sonner';
import { saveFileByPath, syncExternalContentToEditor } from '#lib/core/editor/editor.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { setTypeRailPin } from '#lib/features/properties/lifecycle.service.js';
import { registerCollectionNoteChangeConsumer } from '#lib/features/collection/collection.service.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import { clearAllIndexed } from '#lib/utils/index-dedupe.js';

describe('setTypeRailPin', () => {
	let unregister: (() => void) | null = null;

	beforeEach(() => {
		vi.resetAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		editorStore.reset();
		clearAllIndexed();
		collectionStore.reset();
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(saveFileByPath).mockResolvedValue(true);
		vi.mocked(invoke).mockResolvedValue(undefined as never);
		unregister = registerCollectionNoteChangeConsumer();
	});

	afterEach(() => {
		unregister?.();
		unregister = null;
		collectionStore.reset();
		vaultStore._reset();
		editorStore.reset();
		clearLocalStorage();
	});

	it('writes _rail: true into the definition, indexes it and asks for a prompt index refresh', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\n_type: Type\n---\n\n# Project\n');

		await setTypeRailPin('/vault/types/Project.md', true);

		const written = vi.mocked(writeTextFile).mock.calls[0][1] as string;
		expect(written).toContain('_rail: true');
		expect(written).toContain('# Project');
		expect(collectionStore.propertyIndex.get('/vault/types/Project.md')?.properties.get('_rail')).toBe(true);
		expect(vaultStore.takePromptIndexRefresh()).toBe(true);
	});

	it('removes _rail to unpin, whatever its value', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\n_type: Type\n_rail: "true"\n---\n\n# Project\n');

		await setTypeRailPin('/vault/types/Project.md', false);

		const written = vi.mocked(writeTextFile).mock.calls[0][1] as string;
		expect(written).not.toContain('_rail');
		expect(written).toContain('_type: Type');
	});

	it('patches an open definition tab, keeping its unsaved body edit', async () => {
		editorStore.addTab({
			path: '/vault/types/Project.md',
			name: 'Project',
			content: '---\n_type: Type\n---\n\n# Unsaved edit\n',
			savedContent: '---\n_type: Type\n---\n\n# Project\n',
		});

		await setTypeRailPin('/vault/types/Project.md', true);

		const [path, content] = vi.mocked(syncExternalContentToEditor).mock.calls[0];
		expect(path).toBe('/vault/types/Project.md');
		expect(content).toContain('_rail: true');
		expect(content).toContain('# Unsaved edit');
		expect(saveFileByPath).toHaveBeenCalledWith('/vault/types/Project.md');
	});

	it('toasts a frontmatter it cannot rewrite and writes nothing', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\n# keep me\n_type: Type\n---\n');

		await setTypeRailPin('/vault/types/Project.md', true);

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(toast.error).toHaveBeenCalledWith("Project.md: The note's frontmatter has comments; it cannot be rewritten without losing them");
	});

	it('propagates a read error', async () => {
		vi.mocked(readTextFile).mockRejectedValue(new Error('EACCES'));

		await expect(setTypeRailPin('/vault/types/Project.md', true)).rejects.toThrow('EACCES');
		expect(toast.error).not.toHaveBeenCalled();
	});
});
