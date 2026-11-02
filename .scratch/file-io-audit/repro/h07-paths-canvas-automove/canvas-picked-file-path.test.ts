import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('@tauri-apps/plugin-fs', () => ({
	readFile: vi.fn(),
}));

import { readFile } from '@tauri-apps/plugin-fs';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { flattenFileTree } from '#lib/core/filesystem/file-entries.logic.js';
import { resolveImageSrc } from '#lib/features/canvas/canvas-image.service.js';

/**
 * CanvasFilePicker hands `file.path` to the canvas node, and that path comes
 * from the file tree, which holds absolute paths (lib.rs scan_vault: "Absolute
 * path on disk"). ImageNode then calls resolveImageSrc, which prefixes the
 * vault path again. A file picked from the picker must resolve to the file it
 * names.
 */
describe('a canvas image node built from a picker selection', () => {
	const createObjectURL = vi.fn((_blob: Blob) => 'blob:mock-url');

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		(URL as unknown as { createObjectURL: typeof createObjectURL }).createObjectURL = createObjectURL;
	});

	it('reads the picked file at its absolute path, not under the vault twice', async () => {
		vaultStore.open('/vault');
		vi.mocked(readFile).mockResolvedValue(new Uint8Array([1, 2, 3]));

		const tree = [
			{
				name: 'pic.png',
				path: '/vault/assets/pic.png',
				isDirectory: false,
			},
		];
		const [picked] = flattenFileTree(tree as Parameters<typeof flattenFileTree>[0]);

		await resolveImageSrc(picked.path);

		expect(readFile).toHaveBeenCalledWith('/vault/assets/pic.png');
	});
});
