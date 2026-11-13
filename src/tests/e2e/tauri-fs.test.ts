import { afterEach, describe, expect, it } from 'vitest';
import { stat, writeTextFile } from '../../../e2e/mocks/tauri-fs';
import { virtualFS } from '../../../e2e/mocks/virtual-fs';

describe('E2E filesystem text writes', () => {
	afterEach(() => virtualFS.reset());

	it('creates an append target and retains earlier buffered writes', async () => {
		await writeTextFile('/logs/session.log', 'start\n', { append: true });
		await writeTextFile('/logs/session.log', 'done\n', { append: true });
		expect(virtualFS.readFile('/logs/session.log')).toBe('start\ndone\n');
	});

	it('keeps existing content when appending empty text', async () => {
		virtualFS.populate({ '/logs/session.log': 'start\n' });
		await writeTextFile('/logs/session.log', '', { append: true });
		expect(virtualFS.readFile('/logs/session.log')).toBe('start\n');
	});

	it.each([undefined, { append: false }])('still overwrites without append mode: %j', async (options) => {
		virtualFS.populate({ '/vault/note.md': 'before' });
		await writeTextFile('/vault/note.md', 'after', options);
		expect(virtualFS.readFile('/vault/note.md')).toBe('after');
	});
});

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
