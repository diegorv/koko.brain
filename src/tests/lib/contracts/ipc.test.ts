import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(() => Promise.resolve(null)),
}));

import { invoke } from '@tauri-apps/api/core';
import type { FileNode, UpdateMetadata, UpdateResult } from '#lib/contracts/index.js';
import { COMMAND_ARGS, type ArgKey, type CommandMap } from '#lib/contracts/commands.js';
import { call } from '#lib/contracts/ipc.js';

describe('call', () => {
	beforeEach(() => {
		vi.mocked(invoke).mockClear();
	});

	it('reaches invoke with exactly one argument for a zero-arg command', async () => {
		await call('close_vault_db');

		expect(vi.mocked(invoke).mock.calls).toEqual([['close_vault_db']]);
		expect(vi.mocked(invoke).mock.calls[0]).toHaveLength(1);
	});

	it('passes the args object through unchanged', async () => {
		await call('scan_vault', { path: '/vault', sortBy: 'name' });

		expect(invoke).toHaveBeenCalledWith('scan_vault', { path: '/vault', sortBy: 'name' });
	});

	it('resolves to the invoke result', async () => {
		vi.mocked(invoke).mockResolvedValueOnce(['Helvetica']);

		await expect(call('list_system_fonts')).resolves.toEqual(['Helvetica']);
	});

	it('rejects with the invoke error', async () => {
		vi.mocked(invoke).mockRejectedValueOnce('db closed');

		await expect(call('open_vault_db', { vaultPath: '/vault' })).rejects.toBe('db closed');
	});

	it('rejects bad args at compile time', () => {
		// Compile-time only; the calls never run.
		const typeOnly = () => {
			// @ts-expect-error sectionTag is required
			void call('get_tasks_in_section_v2', {});
			// @ts-expect-error sortBy is missing
			void call('scan_vault', { path: '/vault' });
			// @ts-expect-error a zero-arg command takes no args object
			void call('close_vault_db', {});
			// @ts-expect-error a command with args needs its args object
			void call('create_folder');
			// @ts-expect-error unknown command
			void call('not_a_command');
		};
		expect(typeOnly).toBeTypeOf('function');
	});

	it('types results from CommandMap', () => {
		expectTypeOf(call<'scan_vault'>).returns.resolves.toEqualTypeOf<FileNode[]>();
		expectTypeOf(call<'rename_note'>).returns.resolves.toEqualTypeOf<UpdateResult | null>();
		expectTypeOf(call<'check_for_update_on_channel'>).returns.resolves.toEqualTypeOf<UpdateMetadata | null>();
		expectTypeOf(call<'update_note_in_index'>).returns.resolves.toEqualTypeOf<UpdateResult>();
	});
});

describe('COMMAND_ARGS', () => {
	it('lists every arg key of every CommandMap entry', () => {
		type Missing = {
			[K in keyof CommandMap]: Exclude<ArgKey<K>, (typeof COMMAND_ARGS)[K][number]>;
		}[keyof CommandMap];
		expectTypeOf<Missing>().toBeNever();
	});

	it('marks optional args with a ? suffix', () => {
		expect(COMMAND_ARGS.search_fts).toEqual(['query', 'maxResults?', 'fuzzy?']);
		expect(COMMAND_ARGS.check_for_update_on_channel).toEqual(['channel', 'allowDowngrades?']);
		expectTypeOf<ArgKey<'search_semantic'>>().toEqualTypeOf<'query' | 'maxResults?' | 'minScore?'>();
	});
});
