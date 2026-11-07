import { afterEach, describe, expect, it } from 'vitest';
import { stat } from '../../../e2e/mocks/tauri-fs';
import { virtualFS } from '../../../e2e/mocks/virtual-fs';

describe('E2E filesystem stat', () => {
	afterEach(() => virtualFS.reset());

	it('distinguishes a file from its parent folder', async () => {
		virtualFS.populate({ '/vault/Notes/hello.md': 'Hello' });
		await expect(stat('/vault/Notes/hello.md')).resolves.toMatchObject({ isFile: true, isDirectory: false, isSymlink: false });
		await expect(stat('/vault/Notes')).resolves.toMatchObject({ isFile: false, isDirectory: true, isSymlink: false });
	});

	it('recognizes an empty folder', async () => {
		virtualFS.populate({ '/vault/Empty/': '' });
		await expect(stat('/vault/Empty')).resolves.toMatchObject({ isDirectory: true });
	});

	it.each(['', '/vault/missing'])('rejects a missing path %s', async (path) => {
		await expect(stat(path)).rejects.toThrow('Path not found');
	});
});
