// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { flushSync } from 'svelte';

vi.mock('@tauri-apps/plugin-fs', () => ({
	exists: vi.fn(async () => true),
	readDir: vi.fn(async () => [{ name: 'watcher', isDirectory: true }]),
	readTextFile: vi.fn(async (path: string) => path.endsWith('manifest.json')
		? JSON.stringify({ id: 'watcher', name: 'Watcher', version: '1.0.0' })
		: 'export default { onload(ctx) { globalThis.__watchCtx = ctx; } };'),
}));
vi.mock('svelte-sonner', () => ({
	toast: { info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));
vi.mock('#lib/utils/debug.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('#lib/utils/debug.js')>()),
	debug: vi.fn(),
	error: vi.fn(),
}));

import { toast } from 'svelte-sonner';

import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { modsEnabledStore } from '#lib/plugins/mods/mods-enabled.store.svelte.js';
import { disableMod, startModsHost, stopModsHost, type ModContext } from '#lib/plugins/mods/mods-host.service.js';
import { modsStore } from '#lib/plugins/mods/mods.store.svelte.js';
import { debug, error } from '#lib/utils/debug.js';

const globals = globalThis as unknown as { __watchCtx: ModContext };

function openTab(name: string): void {
	editorStore.addTab({ path: `/vault/${name}`, name, content: '', savedContent: '' });
}

describe('ctx.watch', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		localStorage.clear();
		editorStore.reset();
		vaultStore._reset();
		modsEnabledStore._reset();
		vaultStore.open('/vault');
		modsEnabledStore.setEnabled(true);
		await startModsHost('/vault');
	});

	afterEach(() => stopModsHost());

	it('reports a changed active path but not subscription, typing or an unchanged path', () => {
		const seen: (string | null)[] = [];
		openTab('Other.md');
		globals.__watchCtx.watch(() => editorStore.activeTabPath, (path) => seen.push(path));
		flushSync();
		expect(seen).toEqual([]);

		openTab('Note.md');
		flushSync();
		expect(seen).toEqual(['/vault/Note.md']);

		editorStore.updateContent('typing');
		flushSync();
		editorStore.removeTab(0);
		flushSync();
		expect(seen).toEqual(['/vault/Note.md']);
	});

	it('captures a change before the first flush and the empty workspace', () => {
		const seen: (string | null)[] = [];
		globals.__watchCtx.watch(() => editorStore.activeTabPath, (path) => seen.push(path));
		openTab('Note.md');
		flushSync();
		editorStore.removeTab(0);
		flushSync();
		expect(seen).toEqual(['/vault/Note.md', null]);
	});

	it('compares with Object.is, including NaN and signed zero', () => {
		openTab('Note.md');
		const seen: number[] = [];
		globals.__watchCtx.watch(() => Number(editorStore.activeTabContent), (value) => seen.push(value));
		flushSync();
		for (const content of ['-0', 'not a number', 'still not a number']) {
			editorStore.updateContent(content);
			flushSync();
		}
		expect(seen).toEqual([-0, NaN]);
	});

	it('does not track reactive reads inside the handler', () => {
		let reads = 0;
		const seen: string[] = [];
		globals.__watchCtx.watch(() => { reads++; return editorStore.activeTabPath; }, () => {
			seen.push(editorStore.activeTabContent ?? '');
		});
		openTab('Note.md');
		flushSync();
		const before = reads;
		editorStore.updateContent('typing');
		flushSync();
		expect(reads).toBe(before);
		expect(seen).toEqual(['']);
	});

	it('survives a throwing baseline and tracked read, then uses the first successful value as baseline', () => {
		const seen: (string | null)[] = [];
		globals.__watchCtx.watch(() => {
			const path = editorStore.activeTabPath;
			if (!path) throw new Error('no tab');
			return path;
		}, (path) => seen.push(path));
		flushSync();
		openTab('First.md');
		flushSync();
		expect(seen).toEqual([]);
		openTab('Second.md');
		flushSync();
		expect(seen).toEqual(['/vault/Second.md']);
		expect(debug).toHaveBeenCalledWith('MOD:watcher', 'watch read failed:', expect.stringContaining('no tab'));
		expect(error).not.toHaveBeenCalled();
	});

	it('keeps the last good value after a failed read and survives a throwing handler', () => {
		openTab('First.md');
		const seen: (string | null)[] = [];
		globals.__watchCtx.watch(() => {
			const path = editorStore.activeTabPath;
			if (path?.endsWith('Bad.md')) throw new Error('bad read');
			return path;
		}, (path) => {
			seen.push(path);
			throw new Error('bad handler');
		});
		flushSync();
		for (const name of ['Bad.md', 'Second.md', 'Third.md']) {
			openTab(name);
			flushSync();
		}
		expect(seen).toEqual(['/vault/Second.md', '/vault/Third.md']);
		expect(debug).toHaveBeenCalledWith('MOD:watcher', 'watch callback failed:', expect.stringContaining('bad handler'));
		expect(error).not.toHaveBeenCalled();
	});

	it('records a throwing and an async rejecting callback under watch, keeps firing, and never re-runs the read for the record', async () => {
		let reads = 0;
		const seen: (string | null)[] = [];
		globals.__watchCtx.watch(() => { reads++; return editorStore.activeTabPath; }, async (path) => {
			seen.push(path);
			if (path === '/vault/Async.md') throw new Error('async handler');
		});
		globals.__watchCtx.watch(() => editorStore.activeTabPath, (path) => {
			if (path === '/vault/Sync.md') throw new Error('sync handler');
		});
		flushSync();

		openTab('Sync.md');
		flushSync();
		await Promise.resolve();
		expect(modsStore.callbackErrorFor('watcher')).toMatchObject({ callback: 'watch' });
		const readsAfterFailure = reads;
		modsStore.recordCallbackError('watcher', { callback: 'watch', message: 'external write', at: 0 });
		flushSync();
		expect(reads).toBe(readsAfterFailure);

		openTab('Async.md');
		flushSync();
		await vi.waitFor(() => expect(modsStore.callbackErrorFor('watcher')).toMatchObject({ callback: 'watch', message: 'async handler' }));

		openTab('Third.md');
		flushSync();
		expect(seen).toEqual(['/vault/Sync.md', '/vault/Async.md', '/vault/Third.md']);
		expect(debug).toHaveBeenCalledWith('MOD:watcher', 'watch callback failed:', expect.stringContaining('sync handler'));
		expect(debug).toHaveBeenCalledWith('MOD:watcher', 'watch callback failed:', expect.stringContaining('async handler'));
		expect(toast.error).toHaveBeenCalledTimes(1);
		expect(error).not.toHaveBeenCalled();
	});

	it('records nothing for a throwing read', () => {
		globals.__watchCtx.watch(() => {
			const path = editorStore.activeTabPath;
			if (path) throw new Error('bad read');
			return path;
		}, () => {});
		openTab('Note.md');
		flushSync();
		expect(debug).toHaveBeenCalledWith('MOD:watcher', 'watch read failed:', expect.stringContaining('bad read'));
		expect(modsStore.callbackErrorFor('watcher')).toBeNull();
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('contains a read that throws before tracking anything without inventing a polling dependency', () => {
		const read = vi.fn(() => { throw new Error('no dependency'); });
		const seen: unknown[] = [];
		globals.__watchCtx.watch(read, (value) => seen.push(value));
		flushSync();
		const count = read.mock.calls.length;
		openTab('Note.md');
		flushSync();
		expect(read).toHaveBeenCalledTimes(count);
		expect(seen).toEqual([]);
	});

	it('stops after disposal and after the real host unload', () => {
		const seen: string[] = [];
		const dispose = globals.__watchCtx.watch(() => editorStore.activeTabPath, () => seen.push('disposed'));
		globals.__watchCtx.watch(() => editorStore.activeTabPath, () => seen.push('live'));
		flushSync();
		dispose();
		dispose();
		openTab('First.md');
		flushSync();
		expect(seen).toEqual(['live']);
		disableMod('watcher');
		openTab('Second.md');
		flushSync();
		expect(seen).toEqual(['live']);
		expect(() => globals.__watchCtx.watch(() => 0, () => {})).toThrow('unloaded');
	});

	it('rejects invalid JavaScript arguments', () => {
		expect(() => globals.__watchCtx.watch(null as never, () => {})).toThrow('watch needs a read function');
		expect(() => globals.__watchCtx.watch(() => 0, null as never)).toThrow('watch needs a callback function');
	});
});
