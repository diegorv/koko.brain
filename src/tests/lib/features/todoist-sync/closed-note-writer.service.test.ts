import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage } from '../../../fixtures/localStorage.fixture';

// `vaultStore.open` persists the recent-vaults list.
setupLocalStorage();

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	readDir: vi.fn(),
	exists: vi.fn(),
	mkdir: vi.fn(),
	remove: vi.fn(),
	rename: vi.fn(),
	copyFile: vi.fn(),
}));

vi.mock('#lib/utils/debug.js', () => ({
	debug: vi.fn(),
	error: vi.fn(),
	timeAsync: vi.fn(async (_tag: string, _label: string, fn: () => Promise<unknown>) => fn()),
	timeSync: vi.fn((_tag: string, _label: string, fn: () => unknown) => fn()),
}));

import { invoke } from '@tauri-apps/api/core';
import { error } from '#lib/utils/debug.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { areAllRecentSaves, resetHooks } from '#lib/core/editor/editor.hooks.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import {
	registerContentInvalidationListener,
	registerNoteChangeConsumer,
} from '#lib/core/filesystem/note-change.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { writeTaskLinesToClosedNote } from '#lib/features/todoist-sync/closed-note-writer.service.js';
import type { TaskLineEdits, TaskLinesWriteResult } from '#lib/contracts/index.js';

const LINE = '- [ ] Buy milk 🆔 td-a';
const DONE = '- [x] Buy milk 🆔 td-a';

const noChange = { changed: false, affected: [], version: 1, upserted: [], removed: [], fullRescan: false };

function result(partial: Partial<TaskLinesWriteResult>): TaskLinesWriteResult {
	return { outcome: 'written', content: null, stale: null, updateResult: noChange, ...partial };
}

const closeA: TaskLineEdits = {
	replace: [{ anchor: 'td-a', expectedLine: LINE, newLine: DONE }],
	insert: [],
	remove: [],
};

const addA: TaskLineEdits = { replace: [], insert: [{ afterHeading: null, lines: [LINE] }], remove: [] };

/** Answers `write_task_lines` with `results` in order, every other command with a promise. */
function mockCommands(...results: TaskLinesWriteResult[]): void {
	vi.mocked(invoke).mockImplementation((cmd: string) => {
		if (cmd === 'write_task_lines') {
			const next = results.shift();
			return next ? Promise.resolve(next) : Promise.reject(new Error('unexpected write_task_lines'));
		}
		return Promise.resolve(cmd.startsWith('get_') ? [] : undefined);
	});
}

function commandNames(): string[] {
	return vi.mocked(invoke).mock.calls.map((c) => c[0]);
}

describe('writeTaskLinesToClosedNote', () => {
	let upserts: [string, string][] = [];
	let invalidations = 0;
	let unregister: (() => void)[] = [];

	beforeEach(() => {
		upserts = [];
		invalidations = 0;
		resetHooks();
		editorStore.reset();
		fsStore.reset();
		vaultStore.open('/vault');
		unregister = [
			registerNoteChangeConsumer({
				name: 'probe',
				upsert: (path, content) => upserts.push([path, content]),
				remove: () => {},
			}),
			registerContentInvalidationListener('probe', () => invalidations++),
		];
	});

	afterEach(() => {
		for (const u of unregister) u();
		unregister = [];
		vaultStore.close();
		resetHooks();
		editorStore.reset();
		fsStore.reset();
		vi.mocked(invoke).mockReset();
		vi.mocked(error).mockClear();
	});

	it('writes through the guarded command and settles the note like a task write', async () => {
		mockCommands(result({ outcome: 'written', content: `${DONE}\n` }));

		const out = await writeTaskLinesToClosedNote('/vault', 'Todoist/Inbox.md', closeA);

		expect(out).toEqual({ kind: 'written', content: `${DONE}\n` });
		expect(invoke).toHaveBeenCalledWith('write_task_lines', {
			vaultRoot: '/vault',
			relPath: 'Todoist/Inbox.md',
			edits: closeA,
		});
		expect(invoke).toHaveBeenCalledWith('update_search_index_file', {
			filePath: 'Todoist/Inbox.md',
			content: `${DONE}\n`,
			vaultPath: '/vault',
		});
		expect(upserts).toEqual([['/vault/Todoist/Inbox.md', `${DONE}\n`]]);
		expect(invalidations).toBe(1);
		expect(areAllRecentSaves(['/vault/Todoist/Inbox.md'])).toBe(true);
		expect(commandNames()).not.toContain('update_note_in_index');
	});

	it('rejects a note with an open tab without calling the command', async () => {
		editorStore.addTab({ path: '/vault/Todoist/Inbox.md', name: 'Inbox', content: LINE, savedContent: LINE });
		mockCommands();

		const out = await writeTaskLinesToClosedNote('/vault', 'Todoist/Inbox.md', closeA);

		expect(out).toEqual({ kind: 'open-tab' });
		expect(invoke).not.toHaveBeenCalled();
	});

	it('returns the failed check of a stale batch and settles nothing', async () => {
		const stale = { reason: 'lineDiffers' as const, subject: 'td-a' };
		mockCommands(result({ outcome: 'stale', stale }));

		const out = await writeTaskLinesToClosedNote('/vault', 'Todoist/Inbox.md', closeA);

		expect(out).toEqual({ kind: 'stale', stale });
		expect(upserts).toEqual([]);
		expect(invalidations).toBe(0);
		expect(areAllRecentSaves(['/vault/Todoist/Inbox.md'])).toBe(false);
	});

	it('returns the content of an unchanged note and settles nothing', async () => {
		mockCommands(result({ outcome: 'unchanged', content: `${LINE}\n` }));

		const out = await writeTaskLinesToClosedNote('/vault', 'n.md', closeA);

		expect(out).toEqual({ kind: 'unchanged', content: `${LINE}\n` });
		expect(upserts).toEqual([]);
		expect(invalidations).toBe(0);
	});

	it('creates a missing note through create_note, shows it in the explorer, then inserts into it', async () => {
		mockCommands(result({ outcome: 'missing' }), result({ outcome: 'written', content: `${LINE}\n` }));

		const out = await writeTaskLinesToClosedNote('/vault', 'Todoist/New.md', addA);

		expect(out).toEqual({ kind: 'written', content: `${LINE}\n` });
		expect(invoke).toHaveBeenCalledWith('create_folder', { path: '/vault/Todoist' });
		expect(invoke).toHaveBeenCalledWith('create_note', { path: '/vault/Todoist/New.md', content: '' });
		expect(commandNames().filter((c) => c === 'write_task_lines')).toHaveLength(2);
		expect(commandNames().indexOf('create_note')).toBeLessThan(commandNames().lastIndexOf('write_task_lines'));
		const folder = fsStore.fileTree.find((n) => n.path === '/vault/Todoist');
		expect(folder?.children?.map((n) => n.path)).toEqual(['/vault/Todoist/New.md']);
		// The create upsert first, then the task write.
		expect(upserts).toEqual([
			['/vault/Todoist/New.md', ''],
			['/vault/Todoist/New.md', `${LINE}\n`],
		]);
		expect(areAllRecentSaves(['/vault/Todoist/New.md'])).toBe(true);
	});

	it('rejects when the note is still missing after creating it', async () => {
		mockCommands(result({ outcome: 'missing' }), result({ outcome: 'missing' }));

		await expect(writeTaskLinesToClosedNote('/vault', 'New.md', addA)).rejects.toThrow('New.md');
		expect(error).toHaveBeenCalled();
	});

	it('logs and rethrows a command error', async () => {
		vi.mocked(invoke).mockRejectedValue('Refusing to write task lines: /other is not the open vault');

		await expect(writeTaskLinesToClosedNote('/other', 'n.md', closeA)).rejects.toBe(
			'Refusing to write task lines: /other is not the open vault',
		);
		expect(error).toHaveBeenCalled();
		expect(upserts).toEqual([]);
	});
});
