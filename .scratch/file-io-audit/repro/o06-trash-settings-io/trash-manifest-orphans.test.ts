// Repro for o06 cross-cutting-8 / recovery-2 / vault-lifecycle-4 / recovery-9.
// Each test asserts the CORRECT behaviour, so it fails while the bug exists.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(() => Promise.resolve(undefined)),
}));

/**
 * In-memory filesystem shaped after tauri-plugin-fs v2 desktop semantics:
 * `remove` fails on a missing path (symlink_metadata error), `writeTextFile`
 * truncates and writes in place, `rename` fails on a missing source.
 */
const fsState = vi.hoisted(() => {
	const files = new Map<string, string>();
	const dirs = new Set<string>();
	const under = (p: string, root: string) => p === root || p.startsWith(root + '/');
	return { files, dirs, under };
});

vi.mock('@tauri-apps/plugin-fs', () => {
	const { files, dirs, under } = fsState;
	return {
		exists: vi.fn(async (p: string) => files.has(p) || dirs.has(p)),
		readTextFile: vi.fn(async (p: string) => {
			const c = files.get(p);
			if (c === undefined) throw new Error(`ENOENT: ${p}`);
			return c;
		}),
		writeTextFile: vi.fn(async (p: string, c: string) => {
			files.set(p, c);
		}),
		mkdir: vi.fn(async (p: string) => {
			dirs.add(p);
		}),
		remove: vi.fn(async (p: string) => {
			if (!files.has(p) && !dirs.has(p)) {
				throw new Error(`failed to get metadata of path: ${p} with error: No such file or directory (os error 2)`);
			}
			for (const f of [...files.keys()]) if (under(f, p)) files.delete(f);
			for (const d of [...dirs]) if (under(d, p)) dirs.delete(d);
		}),
		rename: vi.fn(async (from: string, to: string) => {
			if (!files.has(from) && !dirs.has(from)) throw new Error(`ENOENT: ${from}`);
			for (const f of [...files.keys()]) {
				if (under(f, from)) {
					files.set(to + f.slice(from.length), files.get(f)!);
					files.delete(f);
				}
			}
			for (const d of [...dirs]) {
				if (under(d, from)) {
					dirs.add(to + d.slice(from.length));
					dirs.delete(d);
				}
			}
		}),
	};
});

vi.mock('#lib/utils/debug.js', () => ({
	debug: vi.fn(),
	error: vi.fn(),
	timeAsync: vi.fn((_t: string, _l: string, fn: () => Promise<unknown>) => fn()),
	timeSync: vi.fn((_t: string, _l: string, fn: () => unknown) => fn()),
}));

vi.mock('#lib/core/filesystem/fs.service.js', () => ({
	refreshTree: vi.fn(),
}));

import { readTextFile } from '@tauri-apps/plugin-fs';
import { trashStore } from '#lib/core/trash/trash.store.svelte.js';
import type { TrashItem } from '#lib/core/trash/trash.types.js';
import { loadTrash, moveToTrash, deletePermanently, emptyTrash } from '#lib/core/trash/trash.service.js';

const VAULT = '/vault';
const TRASH = `${VAULT}/.kokobrain/trash`;
const ITEMS = `${TRASH}/items`;
const MANIFEST = `${TRASH}/trash-manifest.json`;

function item(id: string, originalPath: string): TrashItem {
	return { id, originalPath, fileName: originalPath.split('/').pop()!, isDirectory: false, trashedAt: 1 };
}

/** Puts a trashed note on disk: its container dir and its bytes. */
function putTrashed(t: TrashItem, content: string): void {
	fsState.dirs.add(`${ITEMS}/${t.id}`);
	fsState.files.set(`${ITEMS}/${t.id}/${t.fileName}`, content);
}

function manifestIds(): string[] {
	return (JSON.parse(fsState.files.get(MANIFEST)!) as TrashItem[]).map((i) => i.id);
}

beforeEach(() => {
	fsState.files.clear();
	fsState.dirs.clear();
	fsState.dirs.add(VAULT);
	fsState.dirs.add(`${VAULT}/.kokobrain`);
	fsState.dirs.add(TRASH);
	fsState.dirs.add(ITEMS);
	trashStore.clear();
});

describe('o06 trash manifest: the next write rebuilds the manifest from a stale/empty store', () => {
	it('a transient manifest read failure at load does not make the next delete drop earlier entries', async () => {
		const earlier = [item('a', 'notes/a.md'), item('b', 'notes/b.md'), item('c', 'notes/c.md')];
		for (const t of earlier) putTrashed(t, `# ${t.id}`);
		fsState.files.set(MANIFEST, JSON.stringify(earlier));
		fsState.files.set(`${VAULT}/notes/x.md`, '# x');

		vi.mocked(readTextFile).mockRejectedValueOnce(new Error('EIO: transient read failure'));
		await loadTrash(VAULT);
		await moveToTrash(VAULT, `${VAULT}/notes/x.md`, false);

		// The three earlier entries were valid on disk the whole time.
		expect(manifestIds()).toEqual(expect.arrayContaining(['a', 'b', 'c']));
	});

	it('a manifest updated on disk after load (sync from another machine) survives the next delete', async () => {
		const a = item('a', 'notes/a.md');
		putTrashed(a, '# a');
		fsState.files.set(MANIFEST, JSON.stringify([a]));
		await loadTrash(VAULT);

		// Another device trashed b; the vault sync brought its container and manifest.
		const b = item('b', 'notes/b.md');
		putTrashed(b, '# b');
		fsState.files.set(MANIFEST, JSON.stringify([b, a]));

		fsState.files.set(`${VAULT}/notes/x.md`, '# x');
		await moveToTrash(VAULT, `${VAULT}/notes/x.md`, false);

		expect(manifestIds()).toContain('b');
	});

	it('a stale loadTrash (TrashSection mount) that resolves after a delete does not drop the new entry from the store', async () => {
		fsState.files.set(MANIFEST, JSON.stringify([]));
		fsState.files.set(`${VAULT}/notes/x.md`, '# x');

		let releaseRead!: () => void;
		vi.mocked(readTextFile).mockImplementationOnce(
			() => new Promise((resolve) => { releaseRead = () => resolve('[]'); }),
		);
		const load = loadTrash(VAULT);
		await moveToTrash(VAULT, `${VAULT}/notes/x.md`, false);
		releaseRead();
		await load;

		expect(trashStore.items.map((i) => i.originalPath)).toContain('notes/x.md');
	});
});

describe('o06 Empty Trash deletes containers the confirm did not count', () => {
	it('keeps a trashed note whose container is not listed in the manifest', async () => {
		const listed = item('a', 'notes/a.md');
		const orphan = item('o', 'notes/orphan.md');
		putTrashed(listed, '# a');
		putTrashed(orphan, '# orphan, only copy');
		fsState.files.set(MANIFEST, JSON.stringify([listed]));
		await loadTrash(VAULT);
		// The dialog says "Permanently delete all 1 item".
		expect(trashStore.count).toBe(1);

		await emptyTrash(VAULT);

		expect(fsState.files.get(`${ITEMS}/o/orphan.md`)).toBe('# orphan, only copy');
	});
});

describe('o06 phantom entry (container gone, manifest still lists it)', () => {
	it('Delete permanently clears the phantom entry instead of failing forever', async () => {
		const phantom = item('p', 'notes/p.md');
		fsState.files.set(MANIFEST, JSON.stringify([phantom]));
		await loadTrash(VAULT);

		await expect(deletePermanently(VAULT, phantom)).resolves.toBe(true);
		expect(trashStore.items).toEqual([]);
	});
});
