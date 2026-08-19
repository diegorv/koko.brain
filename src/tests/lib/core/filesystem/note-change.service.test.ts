import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('$lib/utils/debug', () => ({
	debug: vi.fn(),
	error: vi.fn(),
	timeSync: vi.fn((_tag: string, _label: string, fn: () => unknown) => fn()),
	timeAsync: vi.fn((_tag: string, _label: string, fn: () => Promise<unknown>) => fn()),
}));

import { invoke } from '@tauri-apps/api/core';
import { error as debugError } from '$lib/utils/debug';
import {
	applyNoteChange,
	registerNoteChangeConsumer,
	type NoteChangeSource,
} from '$lib/core/filesystem/note-change.service';
import { registerCollectionNoteChangeConsumer } from '$lib/features/collection/collection.service';
import { collectionStore } from '$lib/features/collection/collection.store.svelte';
import { registerFileIconsNoteChangeConsumer } from '$lib/features/file-icons/file-icons.service';
import { fileIconsStore } from '$lib/features/file-icons/file-icons.store.svelte';
import { registerCalendarNoteChangeConsumer, resetCalendar } from '$lib/plugins/calendar/calendar.service';
import { calendarStore } from '$lib/plugins/calendar/calendar.store.svelte';
import { clearAllIndexed, isAlreadyIndexed, markIndexed } from '$lib/utils/index-dedupe';

/** Frontmatter that lights up all three registered consumers at once. */
const CONTENT = '---\n_icon: lucide:star\ncreated: 2026-01-02\nstatus: done\n---\n';

/** Names of the commands the invoke mock was called with. */
function invokedCommands(): string[] {
	return vi.mocked(invoke).mock.calls.map((c) => c[0] as string);
}

/** Every `filePath` argument the invoke mock received. */
function invokedFilePaths(): unknown[] {
	return vi.mocked(invoke).mock.calls
		.map((c) => (c[1] as Record<string, unknown> | undefined)?.filePath)
		.filter((v) => v !== undefined);
}

describe('applyNoteChange', () => {
	let unregister: (() => void)[] = [];

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(invoke).mockResolvedValue(undefined);
		clearAllIndexed();
		collectionStore.reset();
		fileIconsStore.reset();
		resetCalendar();
		unregister = [
			registerCollectionNoteChangeConsumer(),
			registerFileIconsNoteChangeConsumer(),
			registerCalendarNoteChangeConsumer(),
		];
	});

	afterEach(() => {
		for (const u of unregister) u();
		unregister = [];
		collectionStore.reset();
		fileIconsStore.reset();
		resetCalendar();
	});

	/** Asserts that all three registered consumers indexed `path` from `CONTENT`. */
	function expectAllConsumersIndexed(path: string): void {
		expect(collectionStore.propertyIndex.get(path)?.properties.get('status')).toBe('done');
		expect(fileIconsStore.getFrontmatterIcon(path)).toEqual({
			iconPack: 'lucide', iconName: 'star', color: undefined, titleColor: undefined,
		});
		expect(calendarStore.dayPaths.get('2026-01-02')).toEqual([path]);
	}

	describe('upsert - per-source policy', () => {
		it.each<[NoteChangeSource, boolean, boolean]>([
			// source, fires update_note_in_index, marks the dedupe signature
			['save', true, true],
			['edit', true, true],
			['watcher', true, true],
			['create', false, false],
			['fs', false, false],
		])('source %s: rust=%s mark=%s', async (source, firesRust, marks) => {
			await applyNoteChange({ kind: 'upsert', source, path: '/vault/a.md', content: CONTENT });

			expectAllConsumersIndexed('/vault/a.md');
			expect(invokedCommands().includes('update_note_in_index')).toBe(firesRust);
			expect(isAlreadyIndexed('/vault/a.md', CONTENT)).toBe(marks);
		});

		it('save on an already-indexed signature skips the consumers but STILL fires Rust', async () => {
			// The two axes are independent: the TS dedupe map only tracks whether
			// the TS consumers saw this exact content. Rust has its own
			// `UpdateResult.changed` short-circuit, so the save-side IPC is
			// unconditional. Collapsing both into one boolean would silently drop it.
			markIndexed('/vault/a.md', CONTENT);

			await applyNoteChange({ kind: 'upsert', source: 'save', path: '/vault/a.md', content: CONTENT });

			expect(collectionStore.propertyIndex.has('/vault/a.md')).toBe(false);
			expect(invoke).toHaveBeenCalledWith('update_note_in_index', {
				path: '/vault/a.md',
				content: CONTENT,
			});
		});

		it('edit on an already-indexed signature skips BOTH the consumers and Rust', async () => {
			markIndexed('/vault/a.md', CONTENT);

			await applyNoteChange({ kind: 'upsert', source: 'edit', path: '/vault/a.md', content: CONTENT });

			expect(collectionStore.propertyIndex.has('/vault/a.md')).toBe(false);
			expect(invoke).not.toHaveBeenCalled();
		});

		it('watcher runs the consumers even on an already-indexed signature', async () => {
			markIndexed('/vault/a.md', CONTENT);

			await applyNoteChange({ kind: 'upsert', source: 'watcher', path: '/vault/a.md', content: CONTENT });

			expectAllConsumersIndexed('/vault/a.md');
		});

		it('runs the consumers SYNCHRONOUSLY for the save source', () => {
			// ADR-0009: notifyAfterSave refreshes the per-file indexes before it
			// invalidates the queryjs cache. An owner that awaited anything
			// before its consumers would break that while staying green elsewhere.
			void applyNoteChange({ kind: 'upsert', source: 'save', path: '/vault/a.md', content: CONTENT });

			expectAllConsumersIndexed('/vault/a.md');
		});

		it('defers the consumers past a macrotask for the edit source', async () => {
			const pending = applyNoteChange({ kind: 'upsert', source: 'edit', path: '/vault/a.md', content: CONTENT });

			// Rust fires first, before the yield.
			expect(invoke).toHaveBeenCalledWith('update_note_in_index', { path: '/vault/a.md', content: CONTENT });
			expect(collectionStore.propertyIndex.has('/vault/a.md')).toBe(false);

			await pending;
			expectAllConsumersIndexed('/vault/a.md');
		});

		it('isStale discards the consumer fan-out but never the Rust update', async () => {
			await applyNoteChange({
				kind: 'upsert',
				source: 'edit',
				path: '/vault/a.md',
				content: CONTENT,
				isStale: () => true,
			});

			expect(invoke).toHaveBeenCalledWith('update_note_in_index', { path: '/vault/a.md', content: CONTENT });
			expect(collectionStore.propertyIndex.has('/vault/a.md')).toBe(false);
		});

		it('a throwing consumer does not stop the others', async () => {
			unregister.push(registerNoteChangeConsumer({
				name: 'exploding',
				upsert: () => { throw new Error('boom'); },
				remove: () => {},
			}));

			await applyNoteChange({ kind: 'upsert', source: 'save', path: '/vault/a.md', content: CONTENT });

			expect(debugError).toHaveBeenCalledWith('NOTE-CHANGE', 'exploding upsert failed:', expect.any(Error));
			expectAllConsumersIndexed('/vault/a.md');
		});

		it('handles empty content', async () => {
			await applyNoteChange({ kind: 'upsert', source: 'save', path: '/vault/a.md', content: '' });

			expect(collectionStore.propertyIndex.has('/vault/a.md')).toBe(true);
			expect(fileIconsStore.getFrontmatterIcon('/vault/a.md')).toBeUndefined();
		});

		it('logs a rejected update_note_in_index without propagating', async () => {
			vi.mocked(invoke).mockRejectedValue(new Error('ipc fail'));

			await applyNoteChange({ kind: 'upsert', source: 'save', path: '/vault/a.md', content: CONTENT });
			await new Promise((r) => setTimeout(r, 0));

			expect(debugError).toHaveBeenCalledWith('NOTE-CHANGE', 'update_note_in_index failed:', expect.any(Error));
		});
	});

	describe('upsert - FTS5 / semantic key', () => {
		it('derives a vault-relative key when a vaultPath is supplied', async () => {
			await applyNoteChange({
				kind: 'upsert', source: 'watcher', path: '/vault/notes/a.md', content: CONTENT, vaultPath: '/vault',
			});

			expect(invoke).toHaveBeenCalledWith('update_search_index_file', {
				filePath: 'notes/a.md', content: CONTENT,
			});
			expect(invoke).toHaveBeenCalledWith('update_semantic_file', {
				filePath: 'notes/a.md', content: CONTENT, vaultPath: '/vault',
			});
		});

		it('SKIPS the FTS legs for a sibling path that merely shares the vault prefix', async () => {
			await applyNoteChange({
				kind: 'upsert', source: 'watcher', path: '/vaulted/a.md', content: CONTENT, vaultPath: '/vault',
			});

			expect(invokedCommands()).not.toContain('update_search_index_file');
			expect(invokedCommands()).not.toContain('update_semantic_file');
			// The absolute-key corruption this replaced must not reappear.
			expect(invokedFilePaths().some((p) => String(p).startsWith('/'))).toBe(false);
			// The absolute-keyed legs still run.
			expect(invoke).toHaveBeenCalledWith('update_note_in_index', { path: '/vaulted/a.md', content: CONTENT });
			expect(collectionStore.propertyIndex.has('/vaulted/a.md')).toBe(true);
		});

		it('never touches FTS when no vaultPath is supplied', async () => {
			for (const source of ['save', 'edit', 'create', 'fs'] as const) {
				await applyNoteChange({ kind: 'upsert', source, path: '/vault/a.md', content: `${source}` });
			}

			expect(invokedCommands()).not.toContain('update_search_index_file');
			expect(invokedCommands()).not.toContain('update_semantic_file');
		});
	});

	describe('delete', () => {
		it('evicts every consumer, clears the dedupe signature and drops the Rust entry', async () => {
			await applyNoteChange({ kind: 'upsert', source: 'watcher', path: '/vault/a.md', content: CONTENT });
			expectAllConsumersIndexed('/vault/a.md');

			await applyNoteChange({ kind: 'delete', source: 'fs', path: '/vault/a.md' });

			expect(collectionStore.propertyIndex.has('/vault/a.md')).toBe(false);
			expect(fileIconsStore.getFrontmatterIcon('/vault/a.md')).toBeUndefined();
			expect(calendarStore.dayPaths.get('2026-01-02')).toBeUndefined();
			expect(calendarStore.dayFileCounts.get('2026-01-02')).toBeUndefined();
			expect(isAlreadyIndexed('/vault/a.md', CONTENT)).toBe(false);
			expect(invoke).toHaveBeenCalledWith('remove_note_from_index', { path: '/vault/a.md' });
		});

		it('drops the Rust entry even for sources whose upsert policy is rust: never', async () => {
			// The policy table governs the upsert branch only - there is no
			// caller-side Rust removal command to defer to.
			for (const source of ['create', 'fs'] as const) {
				vi.mocked(invoke).mockClear();
				await applyNoteChange({ kind: 'delete', source, path: '/vault/a.md' });
				expect(invoke).toHaveBeenCalledWith('remove_note_from_index', { path: '/vault/a.md' });
			}
		});

		it('removes the FTS row when a vaultPath is supplied, and skips it otherwise', async () => {
			await applyNoteChange({ kind: 'delete', source: 'watcher', path: '/vault/notes/a.md', vaultPath: '/vault' });
			expect(invoke).toHaveBeenCalledWith('remove_from_search_index', { filePath: 'notes/a.md' });

			vi.mocked(invoke).mockClear();
			await applyNoteChange({ kind: 'delete', source: 'fs', path: '/vault/notes/a.md' });
			expect(invokedCommands()).not.toContain('remove_from_search_index');
		});

		it('SKIPS the FTS removal for a path outside the vault prefix', async () => {
			await applyNoteChange({ kind: 'delete', source: 'watcher', path: '/vaulted/a.md', vaultPath: '/vault' });

			expect(invoke).toHaveBeenCalledWith('remove_note_from_index', { path: '/vaulted/a.md' });
			expect(invokedCommands()).not.toContain('remove_from_search_index');
		});

		it('a throwing consumer does not stop the others', async () => {
			await applyNoteChange({ kind: 'upsert', source: 'watcher', path: '/vault/a.md', content: CONTENT });
			unregister.push(registerNoteChangeConsumer({
				name: 'exploding',
				upsert: () => {},
				remove: () => { throw new Error('boom'); },
			}));

			await applyNoteChange({ kind: 'delete', source: 'fs', path: '/vault/a.md' });

			expect(debugError).toHaveBeenCalledWith('NOTE-CHANGE', 'exploding remove failed:', expect.any(Error));
			expect(collectionStore.propertyIndex.has('/vault/a.md')).toBe(false);
		});

		it('is a harmless no-op for a path no consumer knows about', async () => {
			await applyNoteChange({ kind: 'delete', source: 'fs', path: '/vault/never-seen.md' });

			expect(collectionStore.propertyIndex.size).toBe(0);
			expect(invoke).toHaveBeenCalledWith('remove_note_from_index', { path: '/vault/never-seen.md' });
		});

		it('logs a rejected remove_note_from_index without propagating', async () => {
			vi.mocked(invoke).mockRejectedValue(new Error('ipc fail'));

			await applyNoteChange({ kind: 'delete', source: 'fs', path: '/vault/a.md' });
			await new Promise((r) => setTimeout(r, 0));

			expect(debugError).toHaveBeenCalledWith('NOTE-CHANGE', 'remove_note_from_index failed:', expect.any(Error));
		});
	});

	describe('registerNoteChangeConsumer', () => {
		it('returns an unregister function that stops the fan-out', async () => {
			const seen: string[] = [];
			const off = registerNoteChangeConsumer({
				name: 'probe',
				upsert: (path) => seen.push(`upsert:${path}`),
				remove: (path) => seen.push(`remove:${path}`),
			});

			await applyNoteChange({ kind: 'upsert', source: 'save', path: '/vault/a.md', content: 'x' });
			off();
			await applyNoteChange({ kind: 'delete', source: 'fs', path: '/vault/a.md' });

			expect(seen).toEqual(['upsert:/vault/a.md']);
		});
	});
});
