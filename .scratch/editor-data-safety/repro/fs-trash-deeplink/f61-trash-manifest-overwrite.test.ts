/**
 * F61: a manifest that fails to load (truncated JSON, or a read error) is
 * treated as an empty Trash, and the next trash operation overwrites it with
 * only the new entry. The earlier trashed notes stay on disk but nothing
 * references them any more, so they cannot be restored and Empty Trash deletes
 * them. The fs mock is an in-memory disk.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const files = new Map<string, string>();
const dirs = new Set<string>();

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(() => Promise.resolve(undefined)) }));
vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(async (p: string) => {
		if (!files.has(p)) throw new Error('ENOENT ' + p);
		return files.get(p)!;
	}),
	writeTextFile: vi.fn(async (p: string, c: string) => { files.set(p, c); }),
	mkdir: vi.fn(async (p: string) => { dirs.add(p); }),
	remove: vi.fn(async (p: string) => {
		for (const k of [...files.keys()]) if (k === p || k.startsWith(p + '/')) files.delete(k);
		for (const k of [...dirs]) if (k === p || k.startsWith(p + '/')) dirs.delete(k);
	}),
	rename: vi.fn(async (from: string, to: string) => {
		files.set(to, files.get(from)!);
		files.delete(from);
	}),
	exists: vi.fn(async (p: string) => files.has(p) || dirs.has(p) || [...files.keys()].some((k) => k.startsWith(p + '/'))),
}));
vi.mock('#lib/utils/debug.js', () => ({
	debug: vi.fn(),
	error: vi.fn(),
	timeAsync: vi.fn((_t: string, _l: string, fn: () => Promise<unknown>) => fn()),
	timeSync: vi.fn((_t: string, _l: string, fn: () => unknown) => fn()),
}));
vi.mock('#lib/core/filesystem/fs.service.js', () => ({ refreshTree: vi.fn() }));

import { trashStore } from '#lib/core/trash/trash.store.svelte.js';
import { loadTrash, moveToTrash } from '#lib/core/trash/trash.service.js';
import { getTrashManifestPath, parseTrashManifest } from '#lib/core/trash/trash.logic.js';

const VAULT = '/v';
const MANIFEST = getTrashManifestPath(VAULT);

function seedTrash(): string {
	const items = ['A', 'B', 'C'].map((n, i) => ({
		id: `id-${n}`,
		originalPath: `${n}.md`,
		fileName: `${n}.md`,
		isDirectory: false,
		trashedAt: 1000 + i,
	}));
	for (const it of items) files.set(`${VAULT}/.kokobrain/trash/items/${it.id}/${it.fileName}`, `content of ${it.fileName}`);
	return JSON.stringify(items, null, 2);
}

describe('F61 trash manifest overwrite after a failed load', () => {
	beforeEach(() => {
		files.clear();
		dirs.clear();
		trashStore.clear();
		files.set(`${VAULT}/D.md`, 'note D');
	});

	it('a truncated manifest is not silently replaced by the next move to trash', async () => {
		const good = seedTrash();
		files.set(MANIFEST, good.slice(0, good.length - 20)); // torn write
		await loadTrash(VAULT);
		await moveToTrash(VAULT, `${VAULT}/D.md`, false);

		// Correct behavior: A, B, C stay reachable (recovered, kept, or backed up).
		const listed = parseTrashManifest(files.get(MANIFEST)!).map((i) => i.fileName);
		const backupKept = [...files.keys()].some((k) => k !== MANIFEST && k.includes('trash-manifest'));
		expect(listed.includes('A.md') || backupKept).toBe(true);
	});

	it('a one-off read error does not wipe a valid manifest on the next move to trash', async () => {
		const good = seedTrash();
		files.set(MANIFEST, good);
		const fs = await import('@tauri-apps/plugin-fs');
		vi.mocked(fs.readTextFile).mockRejectedValueOnce(new Error('EIO'));
		await loadTrash(VAULT);
		await moveToTrash(VAULT, `${VAULT}/D.md`, false);

		const listed = parseTrashManifest(files.get(MANIFEST)!).map((i) => i.fileName).sort();
		expect(listed).toEqual(['A.md', 'B.md', 'C.md', 'D.md']);
	});
});
