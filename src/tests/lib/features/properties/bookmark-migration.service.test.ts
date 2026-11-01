import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	exists: vi.fn(),
	remove: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

// `vaultStore.open` persists the recent-vaults list; the node test env has no localStorage.
function localStorageStub() {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] ?? null,
		setItem: (key: string, value: string) => { store[key] = value; },
		removeItem: (key: string) => { delete store[key]; },
		clear: () => { store = {}; },
	};
}

import { readTextFile, writeTextFile, exists, remove } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'svelte-sonner';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { resetHooks } from '#lib/core/editor/editor.hooks.js';
import { clearAllIndexed } from '#lib/utils/index-dedupe.js';
import { _resetParseFrontmatterCache, parseFrontmatterProperties } from '#lib/features/properties/properties.logic.js';
import { isFavorite } from '#lib/features/properties/lifecycle.logic.js';
import { migrateBookmarksToFavorites } from '#lib/features/properties/bookmark-migration.service.js';

const VAULT = '/vault';
const BOOKMARKS = `${VAULT}/.kokobrain/bookmarks.json`;

/** In-memory disk behind the mocked `@tauri-apps/plugin-fs`. Folders are keys ending in `/`. */
const disk = new Map<string, string>();

/** A bookmarks.json entry as the removed bookmarks feature wrote it. */
function bookmark(path: string, isDirectory = false) {
	return { path, name: path.split('/').pop(), isDirectory, createdAt: 1 };
}

/** Whether the note on disk carries `_favorite: true`. */
function favoriteOnDisk(path: string): boolean {
	return isFavorite(parseFrontmatterProperties(disk.get(path) ?? ''));
}

/** Every toast message shown, across all levels. */
function toastMessages(): string[] {
	return [toast.error, toast.success, toast.info, toast.warning].flatMap((fn) =>
		vi.mocked(fn).mock.calls.map((call) => String(call[0])),
	);
}

describe('migrateBookmarksToFavorites', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal('localStorage', localStorageStub());
		disk.clear();
		editorStore.reset();
		vaultStore._reset();
		vaultStore.open(VAULT);
		resetHooks();
		clearAllIndexed();
		_resetParseFrontmatterCache();
		vi.mocked(invoke).mockResolvedValue(undefined);
		vi.mocked(readTextFile).mockImplementation(async (p) => {
			const path = String(p);
			if (!disk.has(path)) throw new Error(`No such file: ${path}`);
			return disk.get(path)!;
		});
		vi.mocked(writeTextFile).mockImplementation(async (p, data) => {
			disk.set(String(p), String(data));
		});
		vi.mocked(exists).mockImplementation(async (p) => disk.has(String(p)) || disk.has(`${String(p)}/`));
		vi.mocked(remove).mockImplementation(async (p) => {
			disk.delete(String(p));
		});
	});

	afterEach(() => {
		editorStore.reset();
		vaultStore._reset();
		resetHooks();
		vi.unstubAllGlobals();
	});

	it('favorites the markdown bookmarks, names the others in one toast and deletes the bookmarks file', async () => {
		disk.set(`${VAULT}/Plain.md`, '# Plain\n');
		disk.set(`${VAULT}/Tagged.md`, '---\nstatus: open\n---\n# Tagged\n');
		disk.set(`${VAULT}/Projects/`, '');
		disk.set(`${VAULT}/Board.canvas`, '{}');
		disk.set(BOOKMARKS, JSON.stringify([
			bookmark(`${VAULT}/Plain.md`),
			bookmark(`${VAULT}/Projects`, true),
			bookmark(`${VAULT}/Tagged.md`),
			bookmark(`${VAULT}/Board.canvas`),
		]));

		await migrateBookmarksToFavorites(VAULT);

		expect(favoriteOnDisk(`${VAULT}/Plain.md`)).toBe(true);
		expect(favoriteOnDisk(`${VAULT}/Tagged.md`)).toBe(true);
		expect(disk.get(`${VAULT}/Tagged.md`)).toContain('status: open');
		expect(disk.get(`${VAULT}/Tagged.md`)).toContain('# Tagged');
		expect(disk.get(`${VAULT}/Board.canvas`)).toBe('{}');
		expect(disk.has(BOOKMARKS)).toBe(false);
		const messages = toastMessages();
		expect(messages).toHaveLength(1);
		expect(messages[0]).toContain('Projects');
		expect(messages[0]).toContain('Board.canvas');
		expect(messages[0]).not.toContain('Plain.md');
	});

	it('does nothing on a second run', async () => {
		disk.set(`${VAULT}/Plain.md`, '# Plain\n');
		disk.set(`${VAULT}/Board.canvas`, '{}');
		disk.set(BOOKMARKS, JSON.stringify([bookmark(`${VAULT}/Plain.md`), bookmark(`${VAULT}/Board.canvas`)]));
		await migrateBookmarksToFavorites(VAULT);
		const after = new Map(disk);
		vi.clearAllMocks();

		await migrateBookmarksToFavorites(VAULT);

		expect(new Map(disk)).toEqual(after);
		expect(writeTextFile).not.toHaveBeenCalled();
		expect(remove).not.toHaveBeenCalled();
		expect(toastMessages()).toEqual([]);
	});

	it('shows no toast and writes nothing when the vault has no bookmarks file', async () => {
		disk.set(`${VAULT}/Plain.md`, '# Plain\n');

		await migrateBookmarksToFavorites(VAULT);

		expect(disk.get(`${VAULT}/Plain.md`)).toBe('# Plain\n');
		expect(writeTextFile).not.toHaveBeenCalled();
		expect(remove).not.toHaveBeenCalled();
		expect(toastMessages()).toEqual([]);
	});

	it('deletes an empty bookmarks list without a toast', async () => {
		disk.set(BOOKMARKS, '[]');

		await migrateBookmarksToFavorites(VAULT);

		expect(disk.has(BOOKMARKS)).toBe(false);
		expect(toastMessages()).toEqual([]);
	});

	it('treats an unparseable bookmarks file as empty: logged, deleted, no toast', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		disk.set(BOOKMARKS, '{not json');

		await migrateBookmarksToFavorites(VAULT);

		expect(disk.has(BOOKMARKS)).toBe(false);
		expect(toastMessages()).toEqual([]);
		expect(consoleError.mock.calls.map((c) => c.join(' ')).join('\n')).toContain('BOOKMARKS');
		consoleError.mockRestore();
	});

	it('keeps the bookmarks file and shows a toast when a frontmatter write fails', async () => {
		disk.set(`${VAULT}/Good.md`, '# Good\n');
		// YAML comments make the rewrite lossy, so `updateNoteFrontmatter` refuses it.
		disk.set(`${VAULT}/Lossy.md`, '---\nstatus: open # keep me\n---\n# Lossy\n');
		disk.set(`${VAULT}/Board.canvas`, '{}');
		const content = JSON.stringify([
			bookmark(`${VAULT}/Good.md`),
			bookmark(`${VAULT}/Lossy.md`),
			bookmark(`${VAULT}/Board.canvas`),
		]);
		disk.set(BOOKMARKS, content);

		await migrateBookmarksToFavorites(VAULT);

		expect(disk.get(BOOKMARKS)).toBe(content);
		expect(favoriteOnDisk(`${VAULT}/Good.md`)).toBe(true);
		expect(disk.get(`${VAULT}/Lossy.md`)).toBe('---\nstatus: open # keep me\n---\n# Lossy\n');
		expect(toast.error).toHaveBeenCalledTimes(1);
		const messages = toastMessages();
		expect(messages).toHaveLength(1);
		expect(messages[0]).toContain('Lossy.md');
		expect(messages[0]).not.toContain('Good.md');
	});

	it('finishes on the next open once the failing note is fixed', async () => {
		disk.set(`${VAULT}/Good.md`, '# Good\n');
		disk.set(`${VAULT}/Lossy.md`, '---\nstatus: open # keep me\n---\n# Lossy\n');
		disk.set(BOOKMARKS, JSON.stringify([bookmark(`${VAULT}/Good.md`), bookmark(`${VAULT}/Lossy.md`)]));
		await migrateBookmarksToFavorites(VAULT);
		disk.set(`${VAULT}/Lossy.md`, '---\nstatus: open\n---\n# Lossy\n');
		vi.clearAllMocks();

		await migrateBookmarksToFavorites(VAULT);

		expect(favoriteOnDisk(`${VAULT}/Good.md`)).toBe(true);
		expect(favoriteOnDisk(`${VAULT}/Lossy.md`)).toBe(true);
		expect(disk.has(BOOKMARKS)).toBe(false);
		expect(toastMessages()).toEqual([]);
	});

	it('drops a markdown bookmark whose note no longer exists and names it', async () => {
		disk.set(`${VAULT}/Plain.md`, '# Plain\n');
		disk.set(BOOKMARKS, JSON.stringify([bookmark(`${VAULT}/Plain.md`), bookmark(`${VAULT}/Gone.md`)]));

		await migrateBookmarksToFavorites(VAULT);

		expect(favoriteOnDisk(`${VAULT}/Plain.md`)).toBe(true);
		expect(disk.has(`${VAULT}/Gone.md`)).toBe(false);
		expect(disk.has(BOOKMARKS)).toBe(false);
		const messages = toastMessages();
		expect(messages).toHaveLength(1);
		expect(messages[0]).toContain('Gone.md');
	});

	it('keeps an open tab\'s unsaved edits while favoriting its note', async () => {
		const path = `${VAULT}/Open.md`;
		disk.set(path, '# Open\n');
		editorStore.addTab({ path, name: 'Open.md', content: '# Open\nunsaved\n', savedContent: '# Open\n' });
		disk.set(BOOKMARKS, JSON.stringify([bookmark(path)]));

		await migrateBookmarksToFavorites(VAULT);

		expect(favoriteOnDisk(path)).toBe(true);
		expect(disk.get(path)).toContain('unsaved');
		expect(editorStore.tabs.find((t) => t.path === path)?.content).toContain('unsaved');
		expect(disk.has(BOOKMARKS)).toBe(false);
	});

	it('never touches a bookmarked note outside the open vault and names it', async () => {
		const foreign = '/other-vault/Note.md';
		disk.set(`${VAULT}/Plain.md`, '# Plain\n');
		disk.set(foreign, '# Note\n');
		// A sibling folder whose name starts with the vault's must not pass as inside it.
		disk.set('/vault-copy/Sibling.md', '# Sibling\n');
		disk.set(BOOKMARKS, JSON.stringify([
			bookmark(`${VAULT}/Plain.md`),
			bookmark(foreign),
			bookmark('/vault-copy/Sibling.md'),
		]));

		await migrateBookmarksToFavorites(VAULT);

		expect(favoriteOnDisk(`${VAULT}/Plain.md`)).toBe(true);
		expect(disk.get(foreign)).toBe('# Note\n');
		expect(disk.get('/vault-copy/Sibling.md')).toBe('# Sibling\n');
		expect(vi.mocked(exists).mock.calls.map((c) => String(c[0]))).not.toContain(foreign);
		expect(vi.mocked(writeTextFile).mock.calls.map((c) => String(c[0]))).toEqual([`${VAULT}/Plain.md`]);
		expect(disk.has(BOOKMARKS)).toBe(false);
		const messages = toastMessages();
		expect(messages).toHaveLength(1);
		expect(messages[0]).toContain('Note.md');
		expect(messages[0]).toContain('Sibling.md');
	});

	it('stops without a toast and keeps the bookmarks file when the vault switches mid-migration', async () => {
		disk.set(`${VAULT}/Plain.md`, '# Plain\n');
		const content = JSON.stringify([bookmark(`${VAULT}/Plain.md`)]);
		disk.set(BOOKMARKS, content);
		vi.mocked(readTextFile).mockImplementation(async (p) => {
			const path = String(p);
			if (path === `${VAULT}/Plain.md`) vaultStore.open('/next-vault');
			if (!disk.has(path)) throw new Error(`No such file: ${path}`);
			return disk.get(path)!;
		});

		await migrateBookmarksToFavorites(VAULT);

		expect(disk.get(BOOKMARKS)).toBe(content);
		expect(toastMessages()).toEqual([]);
	});

	it('stops without a toast and keeps the bookmarks file when the vault switches between two bookmarks', async () => {
		disk.set(`${VAULT}/First.md`, '# First\n');
		disk.set(`${VAULT}/Second.md`, '# Second\n');
		disk.set(`${VAULT}/Board.canvas`, '{}');
		const content = JSON.stringify([
			bookmark(`${VAULT}/First.md`),
			bookmark(`${VAULT}/Second.md`),
			bookmark(`${VAULT}/Board.canvas`),
		]);
		disk.set(BOOKMARKS, content);
		let firstWritten = false;
		vi.mocked(writeTextFile).mockImplementation(async (p, data) => {
			disk.set(String(p), String(data));
			if (String(p) === `${VAULT}/First.md`) firstWritten = true;
		});
		// The switch lands after the first note's write finished, before the second note's write starts.
		vi.mocked(exists).mockImplementation(async (p) => {
			const path = String(p);
			if (path === `${VAULT}/Second.md` && firstWritten) vaultStore.open('/next-vault');
			return disk.has(path) || disk.has(`${path}/`);
		});

		await migrateBookmarksToFavorites(VAULT);

		expect(favoriteOnDisk(`${VAULT}/First.md`)).toBe(true);
		expect(disk.get(`${VAULT}/Second.md`)).toBe('# Second\n');
		expect(disk.get(BOOKMARKS)).toBe(content);
		expect(toastMessages()).toEqual([]);
	});

	it('keeps the bookmarks file and shows no toast when the vault switches while checking the last bookmark', async () => {
		disk.set(`${VAULT}/Plain.md`, '# Plain\n');
		const content = JSON.stringify([bookmark(`${VAULT}/Plain.md`), bookmark(`${VAULT}/Gone.md`)]);
		disk.set(BOOKMARKS, content);
		vi.mocked(exists).mockImplementation(async (p) => {
			const path = String(p);
			if (path === `${VAULT}/Gone.md`) vaultStore.open('/next-vault');
			return disk.has(path) || disk.has(`${path}/`);
		});

		await migrateBookmarksToFavorites(VAULT);

		expect(disk.get(BOOKMARKS)).toBe(content);
		expect(toastMessages()).toEqual([]);
	});

	it('shows no toast when the vault switches while the bookmarks file is deleted', async () => {
		disk.set(`${VAULT}/Board.canvas`, '{}');
		disk.set(BOOKMARKS, JSON.stringify([bookmark(`${VAULT}/Board.canvas`)]));
		vi.mocked(remove).mockImplementation(async (p) => {
			disk.delete(String(p));
			vaultStore.open('/next-vault');
		});

		await migrateBookmarksToFavorites(VAULT);

		expect(disk.has(BOOKMARKS)).toBe(false);
		expect(toastMessages()).toEqual([]);
	});

	it('drops a bookmark whose path climbs out of the vault with `..`', async () => {
		const escaped = `${VAULT}/../other/Note.md`;
		disk.set('/other/Note.md', '# Note\n');
		disk.set(escaped, '# Note\n');
		disk.set(BOOKMARKS, JSON.stringify([bookmark(escaped)]));

		await migrateBookmarksToFavorites(VAULT);

		expect(disk.get(escaped)).toBe('# Note\n');
		expect(disk.get('/other/Note.md')).toBe('# Note\n');
		expect(writeTextFile).not.toHaveBeenCalled();
		expect(disk.has(BOOKMARKS)).toBe(false);
		const messages = toastMessages();
		expect(messages).toHaveLength(1);
		expect(messages[0]).toContain('Note.md');
	});

	it('keeps the bookmarks file and toasts when it cannot be read', async () => {
		disk.set(BOOKMARKS, '[]');
		vi.mocked(readTextFile).mockRejectedValueOnce(new Error('EACCES'));

		await expect(migrateBookmarksToFavorites(VAULT)).resolves.toBeUndefined();

		expect(disk.has(BOOKMARKS)).toBe(true);
		expect(toast.error).toHaveBeenCalledTimes(1);
	});

	it('toasts and keeps going when the bookmarks file cannot be deleted', async () => {
		disk.set(`${VAULT}/Plain.md`, '# Plain\n');
		disk.set(BOOKMARKS, JSON.stringify([bookmark(`${VAULT}/Plain.md`)]));
		vi.mocked(remove).mockRejectedValueOnce(new Error('EBUSY'));

		await expect(migrateBookmarksToFavorites(VAULT)).resolves.toBeUndefined();

		expect(favoriteOnDisk(`${VAULT}/Plain.md`)).toBe(true);
		expect(disk.has(BOOKMARKS)).toBe(true);
		expect(toast.error).toHaveBeenCalledTimes(1);
	});
});
