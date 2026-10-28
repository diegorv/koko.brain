import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	exists: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn() },
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

import { readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'svelte-sonner';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { addAfterSaveObserver, areAllRecentSaves, resetHooks } from '$lib/core/editor/editor.hooks';
import { registerNoteChangeConsumer } from '$lib/core/filesystem/note-change.service';
import { clearAllIndexed, isAlreadyIndexed } from '$lib/utils/index-dedupe';
import { _resetParseFrontmatterCache, type LossyFrontmatterReason } from '$lib/features/properties/properties.logic';
import type { Property } from '$lib/features/properties/properties.types';
import {
	FrontmatterWriteError,
	toastFrontmatterWriteError,
	updateNoteFrontmatter,
} from '$lib/features/properties/frontmatter-write.service';

const VAULT = '/vault';

/** In-memory disk behind the mocked `@tauri-apps/plugin-fs`. */
const disk = new Map<string, string>();

/** A note whose frontmatter is already in the serializer's canonical form. */
function note(frontmatter: string, body = 'Body text\n'): string {
	return `---\n${frontmatter}\n---\n${body}`;
}

/** Sets (or adds) `status` to `value`. */
function setStatus(value: string) {
	return (props: Property[]): Property[] => {
		const rest = props.filter((p) => p.key !== 'status');
		return [...rest, { key: 'status', value, type: 'text' }];
	};
}

/** Opens a tab for `path`, dirty when `savedContent` differs from `content`. */
function openTab(path: string, content: string, savedContent = content): void {
	editorStore.addTab({ path, name: path.split('/').pop() ?? path, content, savedContent });
}

/** The tab for `path`, or undefined. */
function tabFor(path: string) {
	return editorStore.tabs.find((t) => t.path === path);
}

/** A promise with its settlers exposed, to hold an `await` open mid-call. */
function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
	return { promise, resolve, reject };
}

/** Lets every queued microtask run. */
async function flush(): Promise<void> {
	for (let i = 0; i < 10; i++) await Promise.resolve();
}

/** The `FrontmatterWriteError` reason `promise` rejects with, or fails the test. */
async function reasonOf(promise: Promise<unknown>): Promise<string> {
	try {
		await promise;
	} catch (err) {
		expect(err).toBeInstanceOf(FrontmatterWriteError);
		return (err as FrontmatterWriteError).reason;
	}
	throw new Error('expected a FrontmatterWriteError');
}

describe('updateNoteFrontmatter', () => {
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
		vi.mocked(exists).mockImplementation(async (p) => disk.has(String(p)));
	});

	afterEach(() => {
		editorStore.reset();
		vaultStore._reset();
		resetHooks();
		vi.unstubAllGlobals();
	});

	// --- Race tests (Notes C2, Q5: written first) ---

	it('keeps unsaved body edits of a dirty open tab, saves the merge and leaves the tab clean', async () => {
		const path = `${VAULT}/dirty.md`;
		const saved = note('status: open', 'Old body\n');
		const edited = note('status: open', 'Unsaved body edit\n');
		disk.set(path, saved);
		openTab(path, edited, saved);

		const result = await updateNoteFrontmatter(path, setStatus('done'));

		expect(result).toBe(note('status: done', 'Unsaved body edit\n'));
		expect(disk.get(path)).toBe(result);
		expect(tabFor(path)?.content).toBe(result);
		expect(tabFor(path)?.savedContent).toBe(result);
		expect(readTextFile).not.toHaveBeenCalled();
	});

	it('takes the tab branch when a tab opens while the read is pending', async () => {
		const path = `${VAULT}/race-open.md`;
		const onDisk = note('status: open', 'Disk body\n');
		const inTab = note('status: open', 'Tab body edit\n');
		disk.set(path, onDisk);
		const read = deferred<string>();
		vi.mocked(readTextFile).mockImplementationOnce(() => read.promise);

		const pending = updateNoteFrontmatter(path, setStatus('done'));
		await flush();
		openTab(path, inTab, onDisk);
		read.resolve(onDisk);
		const result = await pending;

		expect(result).toBe(note('status: done', 'Tab body edit\n'));
		expect(tabFor(path)?.content).toBe(result);
		expect(tabFor(path)?.savedContent).toBe(result);
		expect(disk.get(path)).toBe(result);
		expect(writeTextFile).toHaveBeenCalledTimes(1);
	});

	it('throws missing and writes nothing when the note is deleted between read and write', async () => {
		const path = `${VAULT}/race-delete.md`;
		const onDisk = note('status: open');
		disk.set(path, onDisk);
		const read = deferred<string>();
		vi.mocked(readTextFile).mockImplementationOnce(() => read.promise);

		const pending = updateNoteFrontmatter(path, setStatus('done'));
		await flush();
		disk.delete(path);
		read.resolve(onDisk);

		expect(await reasonOf(pending)).toBe('missing');
		expect(vi.mocked(exists)).toHaveBeenCalledWith(path);
		expect(disk.has(path)).toBe(false);
		expect(writeTextFile).not.toHaveBeenCalled();
	});

	// --- Branches ---

	it('writes a closed note and runs the full after-save path', async () => {
		const path = `${VAULT}/closed.md`;
		disk.set(path, note('status: open'));
		const observed: [string, string][] = [];
		const unobserve = addAfterSaveObserver((p, c) => observed.push([p, c]));
		const upserts: [string, string][] = [];
		const unregister = registerNoteChangeConsumer({
			name: 'test',
			upsert: (p, c) => upserts.push([p, c]),
			remove: () => {},
		});

		try {
			const result = await updateNoteFrontmatter(path, setStatus('done'));

			expect(result).toBe(note('status: done'));
			expect(disk.get(path)).toBe(result);
			expect(isAlreadyIndexed(path, result)).toBe(true);
			expect(areAllRecentSaves([path])).toBe(true);
			expect(vi.mocked(invoke)).toHaveBeenCalledWith('update_note_in_index', { path, content: result });
			expect(observed).toEqual([[path, result]]);
			expect(upserts).toEqual([[path, result]]);
			expect(tabFor(path)).toBeUndefined();
		} finally {
			unobserve();
			unregister();
		}
	});

	it('updates and saves a clean open tab', async () => {
		const path = `${VAULT}/clean.md`;
		const base = note('status: open');
		disk.set(path, base);
		openTab(path, base);

		const result = await updateNoteFrontmatter(path, setStatus('done'));

		expect(result).toBe(note('status: done'));
		expect(disk.get(path)).toBe(result);
		expect(tabFor(path)?.content).toBe(result);
		expect(tabFor(path)?.savedContent).toBe(result);
		expect(isAlreadyIndexed(path, result)).toBe(true);
	});

	it('returns the base without writing when the mutation changes nothing', async () => {
		const path = `${VAULT}/noop.md`;
		const base = note('status: done');
		disk.set(path, base);

		const result = await updateNoteFrontmatter(path, setStatus('done'));

		expect(result).toBe(base);
		expect(writeTextFile).not.toHaveBeenCalled();
		expect(exists).not.toHaveBeenCalled();
		expect(isAlreadyIndexed(path, base)).toBe(false);
	});

	// --- Refusals ---

	const LOSSY: [LossyFrontmatterReason, string][] = [
		['unparseable', 'title: [unclosed'],
		['nested', 'meta:\n  author: Alice'],
		['comments', '# managed by script\ntitle: Hello'],
		['duplicate-keys', 'a: 1\na: 2'],
		['alias-collision', 'color: blue\n_color: red'],
		['anchors', 'base: &x value\nref: *x'],
	];

	it.each(LOSSY)('refuses %s frontmatter: no write, tab untouched', async (reason, frontmatter) => {
		const path = `${VAULT}/lossy-${reason}.md`;
		const saved = note(frontmatter, 'Saved body\n');
		const edited = note(frontmatter, 'Edited body\n');
		disk.set(path, saved);
		openTab(path, edited, saved);

		expect(await reasonOf(updateNoteFrontmatter(path, setStatus('done')))).toBe(reason);
		expect(writeTextFile).not.toHaveBeenCalled();
		expect(disk.get(path)).toBe(saved);
		expect(tabFor(path)?.content).toBe(edited);
		expect(tabFor(path)?.savedContent).toBe(saved);
	});

	it('refuses lossy frontmatter on a closed note without writing', async () => {
		const path = `${VAULT}/lossy-closed.md`;
		const base = note('a: 1\na: 2');
		disk.set(path, base);

		expect(await reasonOf(updateNoteFrontmatter(path, setStatus('done')))).toBe('duplicate-keys');
		expect(writeTextFile).not.toHaveBeenCalled();
		expect(disk.get(path)).toBe(base);
	});

	// --- Failures ---

	it('restores the tab to the base and throws save-failed when the save fails', async () => {
		const path = `${VAULT}/save-fail.md`;
		const saved = note('status: open', 'Saved body\n');
		const edited = note('status: open', 'Edited body\n');
		disk.set(path, saved);
		openTab(path, edited, saved);
		vi.mocked(writeTextFile).mockRejectedValueOnce(new Error('disk full'));

		expect(await reasonOf(updateNoteFrontmatter(path, setStatus('done')))).toBe('save-failed');
		expect(tabFor(path)?.content).toBe(edited);
		expect(tabFor(path)?.savedContent).toBe(saved);
		expect(disk.get(path)).toBe(saved);
		// saveFileByPath already toasted; the writer adds none of its own.
		expect(vi.mocked(toast.error)).toHaveBeenCalledTimes(1);
	});

	it('propagates the read error when the note is missing at read time', async () => {
		const path = `${VAULT}/gone.md`;

		await expect(updateNoteFrontmatter(path, setStatus('done'))).rejects.toThrow('No such file');
		await expect(updateNoteFrontmatter(path, setStatus('done'))).rejects.not.toBeInstanceOf(FrontmatterWriteError);
		expect(writeTextFile).not.toHaveBeenCalled();
		expect(disk.has(path)).toBe(false);
	});

	it('throws vault-changed and writes nothing when the vault switches during the read', async () => {
		const path = `${VAULT}/switch.md`;
		const base = note('status: open');
		disk.set(path, base);
		const read = deferred<string>();
		vi.mocked(readTextFile).mockImplementationOnce(() => read.promise);

		const pending = updateNoteFrontmatter(path, setStatus('done'));
		await flush();
		vaultStore.open('/other-vault');
		read.resolve(base);

		expect(await reasonOf(pending)).toBe('vault-changed');
		expect(writeTextFile).not.toHaveBeenCalled();
		expect(exists).not.toHaveBeenCalled();
		expect(disk.get(path)).toBe(base);
		expect(isAlreadyIndexed(path, base)).toBe(false);
	});

	it('keeps edits made during a failing save instead of restoring the base', async () => {
		const path = `${VAULT}/save-fail-typed.md`;
		const saved = note('status: open', 'Saved body\n');
		disk.set(path, saved);
		openTab(path, saved);
		const write = deferred<void>();
		vi.mocked(writeTextFile).mockImplementationOnce(() => write.promise);

		const pending = updateNoteFrontmatter(path, setStatus('done'));
		await flush();
		const typed = note('status: done', 'Typed during save\n');
		editorStore.updateContent(typed);
		write.reject(new Error('disk full'));

		expect(await reasonOf(pending)).toBe('save-failed');
		expect(tabFor(path)?.content).toBe(typed);
		expect(disk.get(path)).toBe(saved);
	});

	it('throws vault-changed and writes nothing when the vault switches during the exists re-check', async () => {
		const path = `${VAULT}/switch-exists.md`;
		const base = note('status: open');
		disk.set(path, base);
		const check = deferred<boolean>();
		vi.mocked(exists).mockImplementationOnce(() => check.promise);

		const pending = updateNoteFrontmatter(path, setStatus('done'));
		await flush();
		vaultStore.open('/other-vault');
		check.resolve(true);

		expect(await reasonOf(pending)).toBe('vault-changed');
		expect(writeTextFile).not.toHaveBeenCalled();
		expect(disk.get(path)).toBe(base);
	});

	it('throws vault-changed without restoring the tab when the vault switches during the save', async () => {
		const path = `${VAULT}/switch-save.md`;
		const base = note('status: open');
		disk.set(path, base);
		openTab(path, base);
		const write = deferred<void>();
		vi.mocked(writeTextFile).mockImplementationOnce(async (p, data) => {
			await write.promise;
			disk.set(String(p), String(data));
		});

		const pending = updateNoteFrontmatter(path, setStatus('done'));
		await flush();
		vaultStore.open('/other-vault');
		write.resolve();

		const next = note('status: done');
		expect(await reasonOf(pending)).toBe('vault-changed');
		// The save landed before the guard ran: the bytes are on disk.
		expect(disk.get(path)).toBe(next);
		expect(tabFor(path)?.content).toBe(next);
	});

	it('throws vault-changed and skips the after-save path when the vault switches during the write', async () => {
		const path = `${VAULT}/switch-write.md`;
		disk.set(path, note('status: open'));
		const write = deferred<void>();
		vi.mocked(writeTextFile).mockImplementationOnce(async (p, data) => {
			await write.promise;
			disk.set(String(p), String(data));
		});

		const pending = updateNoteFrontmatter(path, setStatus('done'));
		await flush();
		vaultStore.open('/other-vault');
		write.resolve();

		const next = note('status: done');
		expect(await reasonOf(pending)).toBe('vault-changed');
		expect(disk.get(path)).toBe(next);
		expect(isAlreadyIndexed(path, next)).toBe(false);
		expect(vi.mocked(invoke)).not.toHaveBeenCalledWith('update_note_in_index', expect.anything());
	});

	it('syncs a tab opened during the write of a closed note and leaves it clean', async () => {
		const path = `${VAULT}/open-during-write.md`;
		const base = note('status: open');
		disk.set(path, base);
		const write = deferred<void>();
		vi.mocked(writeTextFile).mockImplementationOnce(async (p, data) => {
			await write.promise;
			disk.set(String(p), String(data));
		});

		const pending = updateNoteFrontmatter(path, setStatus('done'));
		await flush();
		openTab(path, base);
		write.resolve();
		const result = await pending;

		expect(result).toBe(note('status: done'));
		expect(tabFor(path)?.content).toBe(result);
		expect(tabFor(path)?.savedContent).toBe(result);
		expect(disk.get(path)).toBe(result);
	});
});

describe('toastFrontmatterWriteError', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('toasts the refusal reason', () => {
		toastFrontmatterWriteError(new FrontmatterWriteError('comments', '/vault/a.md'));

		expect(toast.error).toHaveBeenCalledWith(
			"The note's frontmatter has comments; it cannot be rewritten without losing them",
		);
	});

	it('toasts a vanished note', () => {
		toastFrontmatterWriteError(new FrontmatterWriteError('missing', '/vault/a.md'));

		expect(toast.error).toHaveBeenCalledWith('The note was moved or deleted');
	});

	it('stays silent on save-failed, which the editor already toasted', () => {
		toastFrontmatterWriteError(new FrontmatterWriteError('save-failed', '/vault/a.md'));

		expect(toast.error).not.toHaveBeenCalled();
	});
});
