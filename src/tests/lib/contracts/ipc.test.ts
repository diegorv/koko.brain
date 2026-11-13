import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn(() => Promise.resolve(() => {})),
}));

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { FileNode, UpdateMetadata, UpdateResult } from '#lib/contracts/index.js';
import { COMMAND_ARGS, type ArgKey, type CommandMap } from '#lib/contracts/commands.js';
import type { EventMap, EventName } from '#lib/contracts/events.js';
import { call, on, setInvokeTracking, takeQueueWait } from '#lib/contracts/ipc.js';

describe('invoke queue tracking', () => {
	beforeEach(() => {
		setInvokeTracking(false);
		vi.useFakeTimers();
		vi.setSystemTime(10_000);
	});

	afterEach(() => {
		setInvokeTracking(false);
		vi.useRealTimers();
	});

	it('pairs each Rust enter with the oldest invoke of that command', async () => {
		setInvokeTracking(true);
		await call('get_all_tags_v2');
		vi.setSystemTime(10_005);
		await call('get_all_tags_v2');

		expect(takeQueueWait('get_all_tags_v2', 10_030)).toEqual({ invokeMs: 10_000, queueMs: 30 });
		expect(takeQueueWait('get_all_tags_v2', 10_031)).toEqual({ invokeMs: 10_005, queueMs: 26 });
		expect(takeQueueWait('get_all_tags_v2', 10_032)).toBeNull();
	});

	it('records nothing while tracking is off', async () => {
		await call('get_all_tags_v2');
		setInvokeTracking(true);

		expect(takeQueueWait('get_all_tags_v2', 10_030)).toBeNull();
	});

	it('turning tracking off drops the pending invokes', async () => {
		setInvokeTracking(true);
		await call('get_all_tags_v2');
		setInvokeTracking(false);
		setInvokeTracking(true);

		expect(takeQueueWait('get_all_tags_v2', 10_030)).toBeNull();
	});
});

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
			// @ts-expect-error required args are missing
			void call('toggle_task_status', {});
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

describe('on', () => {
	beforeEach(() => {
		vi.mocked(listen).mockClear();
	});

	it('listens on the event name and hands the handler the payload', async () => {
		const handler = vi.fn();
		await on('vault-index-updated', handler);

		expect(listen).toHaveBeenCalledWith('vault-index-updated', expect.any(Function));
		const wrapped = vi.mocked(listen).mock.calls[0][1];
		const payload: UpdateResult = {
			changed: true, affected: [], version: 7, upserted: ['/v/a.md'], removed: [], fullRescan: false,
		};
		wrapped({ event: 'vault-index-updated', id: 1, payload });
		expect(handler).toHaveBeenCalledWith(payload);
	});

	it('resolves to the unlisten function', async () => {
		const unlisten = vi.fn();
		vi.mocked(listen).mockResolvedValueOnce(unlisten);

		await expect(on('menu:settings', () => {})).resolves.toBe(unlisten);
	});

	it('rejects with the listen error', async () => {
		vi.mocked(listen).mockRejectedValueOnce(new Error('no ipc'));

		await expect(on('tauri-debug-log', () => {})).rejects.toThrow('no ipc');
	});

	it('types the payload from EventMap and rejects unknown names', () => {
		// Compile-time only; the calls never run.
		const typeOnly = () => {
			void on('vault-index-updated', (p) => p.version);
			// @ts-expect-error unknown event name
			void on('vault-index-update', () => {});
			// @ts-expect-error vault-files-changed carries paths, not a version
			void on('vault-files-changed', (p) => p.version);
		};
		expect(typeOnly).toBeTypeOf('function');
		expectTypeOf<Parameters<Parameters<typeof on<'menu:settings'>>[1]>[0]>().toEqualTypeOf<null>();
		expectTypeOf<Parameters<Parameters<typeof on<'qc:open-composer'>>[1]>[0]>().toEqualTypeOf<string>();
	});
});

describe('EventMap', () => {
	it('has one entry per EVENT_NAMES value and no other', () => {
		expectTypeOf<keyof EventMap>().toEqualTypeOf<EventName>();
	});
});
