/**
 * In-memory vault behind the Calendar write tests: a `disk` Map served by the
 * mocked `@tauri-apps/plugin-fs`, `invoke` (`create_note`, `scan_vault`,
 * `get_all_vault_entries_v2`) and `renameItem`, with an index refresh that
 * bumps `vaultIndexVersion` and re-runs `loadEvents`. Stores and `.logic.ts`
 * stay real.
 *
 * Prerequisite: the test file mocks, before importing this fixture,
 * `@tauri-apps/api/core` (`invoke`), `@tauri-apps/plugin-fs` (`readTextFile`,
 * `writeTextFile`, `exists`, `readDir`, `mkdir`, `rename`, `remove`) and
 * `#lib/core/filesystem/fs.service.js` with `renameItem: vi.fn()`.
 */
import { vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { exists, mkdir, readDir, readTextFile, remove, rename, writeTextFile } from '@tauri-apps/plugin-fs';
import { resetHooks } from '#lib/core/editor/editor.hooks.js';
import { renameItem } from '#lib/core/filesystem/fs.service.js';
import { trashStore } from '#lib/core/trash/trash.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { drainEventCalendarWrites, loadEvents } from '#lib/features/event-calendar/event-calendar.service.js';
import { _resetParseFrontmatterCache } from '#lib/core/frontmatter/properties.logic.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';
import { clearAllIndexed } from '#lib/utils/index-dedupe.js';
import { eventEntryFromContent, eventNote } from './event-notes.fixture';

/** A promise whose resolution the test controls. */
export function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

/** Event note content with the given raw frontmatter fields, on 2026-11-10 at 09:30-10:00 by default. */
export function eventFile(fields: Record<string, string> = {}): string {
	return eventNote({ _type: 'Event', date: '2026-11-10', start: '09:30', end: '10:00', ...fields }, 'Body\n');
}

/** One write or index update, with the vault open when it ran. */
export interface VaultLogEntry {
	/** Absolute note path. */
	path: string;
	/** `vaultStore.path` at the call. */
	vault: string | null;
	/** Position of the call across both logs, so a write and its index update can be ordered. */
	seq: number;
}

/** Entries the index serves for `files`: Rust skips dot-folders, so the Trash under `.kokobrain/` is never indexed. */
function entriesOf(files: Iterable<[string, string]>, overrides: Partial<NoteEntryV2> = {}): NoteEntryV2[] {
	return [...files].filter(([path]) => !path.includes('/.')).map(([path, content]) => eventEntryFromContent(path, content, overrides));
}

/**
 * Creates the in-memory vault. Call `install` in a `beforeEach` and
 * `teardown` in the matching `afterEach`.
 */
export function createCalendarVault() {
	/** In-memory disk behind the mocked `@tauri-apps/plugin-fs`. */
	const disk = new Map<string, string>();
	/** Note writes (`writeTextFile` outside dot-folders), in call order. */
	const writes: VaultLogEntry[] = [];
	/** `update_note_in_index` calls, in call order. */
	const indexed: VaultLogEntry[] = [];
	/** Next `seq` of a log entry. */
	let seq = 0;
	/** Index version the next `refresh` bumps to. */
	let version = 0;
	/** Copy of the disk the index serves while frozen, else null. */
	let frozen: Map<string, string> | null = null;
	/** Whether the next entries read bumps the index version while it runs. */
	let bumpOnRead = false;

	/** Sets `vaultIndexVersion` to the next version without reloading the Calendar. */
	function bump(): void {
		version += 1;
		vaultStore.bumpVaultIndexVersion(version);
	}

	/** Logs a note write with the vault open at the call. */
	function logWrite(p: unknown): void {
		const path = String(p);
		if (!path.includes('/.')) writes.push({ path, vault: vaultStore.path, seq: seq++ });
	}

	/** Bumps the index version and re-projects the disk (one index refresh), `times` times. */
	async function refresh(times = 1): Promise<void> {
		for (let i = 0; i < times; i++) {
			bump();
			await loadEvents();
		}
	}

	return {
		disk,
		writes,
		indexed,
		/** Index version of the latest bump. */
		get version() {
			return version;
		},

		/** Clears the disk and the logs, resets the hooks, caches, Trash and types, and installs the mock impls. */
		install(): void {
			disk.clear();
			writes.length = 0;
			indexed.length = 0;
			seq = 0;
			version = 0;
			frozen = null;
			bumpOnRead = false;
			resetHooks();
			clearAllIndexed();
			_resetParseFrontmatterCache();
			trashStore.clear();
			typeDefinitionsStore.reset();
			vi.mocked(invoke).mockImplementation(async (cmd, args) => {
				// `create_note` writes the note; `scan_vault` feeds `refreshTree` an empty tree.
				if (cmd === 'create_note') {
					const { path, content } = args as { path: string; content: string };
					disk.set(path, content);
					return undefined;
				}
				if (cmd === 'update_note_in_index') indexed.push({ path: (args as { path: string }).path, vault: vaultStore.path, seq: seq++ });
				if (cmd === 'scan_vault') return [];
				if (cmd !== 'get_all_vault_entries_v2') return undefined;
				const served = entriesOf((frozen ?? disk).entries());
				if (bumpOnRead) {
					bumpOnRead = false;
					bump();
				}
				return served;
			});
			vi.mocked(readTextFile).mockImplementation(async (p) => {
				const path = String(p);
				if (!disk.has(path)) throw new Error(`No such file: ${path}`);
				return disk.get(path)!;
			});
			vi.mocked(writeTextFile).mockImplementation(async (p, data) => {
				logWrite(p);
				disk.set(String(p), String(data));
			});
			vi.mocked(exists).mockImplementation(async (p) => disk.has(String(p)));
			vi.mocked(mkdir).mockResolvedValue(undefined);
			vi.mocked(rename).mockImplementation(async (from, to) => {
				if (!disk.has(String(from))) throw new Error(`No such file: ${String(from)}`);
				disk.set(String(to), disk.get(String(from))!);
				disk.delete(String(from));
			});
			vi.mocked(remove).mockImplementation(async (p) => {
				const prefix = `${String(p)}/`;
				for (const key of [...disk.keys()]) if (key === String(p) || key.startsWith(prefix)) disk.delete(key);
			});
			vi.mocked(readDir).mockImplementation(async (dir) => {
				const prefix = `${String(dir)}/`;
				return [...disk.keys()]
					.filter((p) => p.startsWith(prefix) && !p.slice(prefix.length).includes('/'))
					.map((p) => ({ name: p.slice(prefix.length), isFile: true, isDirectory: false, isSymlink: false }));
			});
			// The real `renameItem` runs the full path-change owner (tree refresh,
			// link rewrite, Rust re-key); this one is a move on the disk.
			vi.mocked(renameItem).mockImplementation(async (from, newName) => {
				const to = `${from.slice(0, from.lastIndexOf('/'))}/${newName}`;
				if (!disk.has(from)) throw new Error(`No such file: ${from}`);
				if (disk.has(to)) throw new Error(`"${newName}" already exists in this folder`);
				disk.set(to, disk.get(from)!);
				disk.delete(from);
				return to;
			});
		},

		/** Waits for the calendar writes, then resets the mocks `install` replaced. */
		async teardown(): Promise<void> {
			await drainEventCalendarWrites();
			vi.mocked(invoke).mockReset();
			vi.mocked(writeTextFile).mockReset();
			vi.mocked(exists).mockReset();
			vi.mocked(renameItem).mockReset();
			vi.mocked(rename).mockReset();
		},

		refresh,

		/** One index refresh that serves `files` instead of the disk (an index that has not caught up). */
		async refreshWith(files: Record<string, string>, overrides: Partial<NoteEntryV2> = {}): Promise<void> {
			const real = vi.mocked(invoke).getMockImplementation()!;
			vi.mocked(invoke).mockImplementation(async (cmd) => (cmd === 'get_all_vault_entries_v2' ? entriesOf(Object.entries(files), overrides) : undefined));
			try {
				await refresh();
			} finally {
				vi.mocked(invoke).mockImplementation(real);
			}
		},

		/** Bumps the index version without reloading the Calendar, which leaves its store stale. */
		staleBump: bump,

		/** Makes the next entries read bump the index version while it runs. */
		bumpOnNextRead(): void {
			bumpOnRead = true;
		},

		/** Makes the index serve a copy of the disk as it is now until `thawIndex` (an index lagging behind). */
		freezeIndex(): void {
			frozen = new Map(disk);
		},

		/** Makes the index serve the disk again. */
		thawIndex(): void {
			frozen = null;
		},

		/** The entries the index serves now (the frozen copy or the disk). */
		servedEntries(): NoteEntryV2[] {
			return entriesOf((frozen ?? disk).entries());
		},

		/** The entries an index caught up with the disk would serve. */
		diskEntries(): NoteEntryV2[] {
			return entriesOf(disk.entries());
		},

		/** Holds the next `writeTextFile` open until the returned settlers run. */
		holdNextWrite() {
			const gate = deferred<void>();
			vi.mocked(writeTextFile).mockImplementationOnce(async (p, data) => {
				logWrite(p);
				await gate.promise;
				disk.set(String(p), String(data));
			});
			return gate;
		},

		/** Holds the next `rename` (a move into or out of the Trash, a rename) open until the returned settlers run. */
		holdNextRename() {
			const gate = deferred<void>();
			const real = vi.mocked(rename).getMockImplementation()!;
			vi.mocked(rename).mockImplementationOnce(async (from, to) => {
				await gate.promise;
				return real(from, to);
			});
			return gate;
		},

		/**
		 * Holds the next calendar `renameItem` after its move on the disk, until the
		 * returned settlers run: the note is at its new path while the rename has
		 * not returned (the link rewrite, `refreshTree` and `rename_note` tail of
		 * the real `renameItem`).
		 */
		holdNextRenameTail() {
			const gate = deferred<void>();
			const real = vi.mocked(renameItem).getMockImplementation()!;
			vi.mocked(renameItem).mockImplementationOnce(async (from, newName) => {
				const to = await real(from, newName);
				await gate.promise;
				return to;
			});
			return gate;
		},

		/**
		 * Holds the next `scan_vault` open until the returned settlers run. On a
		 * delete or an outside rename through the real path-change owner, that is
		 * the `refreshTree` of its tail: the disk op landed and the consumers ran,
		 * the change has not returned.
		 */
		holdNextScan() {
			const gate = deferred<void>();
			const real = vi.mocked(invoke).getMockImplementation()!;
			let held = false;
			vi.mocked(invoke).mockImplementation(async (cmd, args) => {
				if (cmd === 'scan_vault' && !held) {
					held = true;
					await gate.promise;
				}
				return real(cmd, args);
			});
			return gate;
		},
	};
}

/** The vault `createCalendarVault` returns. */
export type CalendarVault = ReturnType<typeof createCalendarVault>;
