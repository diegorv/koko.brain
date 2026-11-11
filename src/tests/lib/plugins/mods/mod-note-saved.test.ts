// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const files = vi.hoisted(() => new Map<string, string>());
vi.mock('@tauri-apps/plugin-fs', () => ({
	exists: vi.fn(async (path: string) => [...files.keys()].some((key) => key === path || key.startsWith(`${path}/`))),
	readDir: vi.fn(async () => [{ name: 'saver', isDirectory: true }]),
	readTextFile: vi.fn(async (path: string) => files.get(path)),
	writeTextFile: vi.fn(async (path: string, content: string) => { files.set(path, content); }),
}));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(async () => null) }));
vi.mock('svelte-sonner', () => ({
	toast: { info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));
vi.mock('#lib/utils/debug.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('#lib/utils/debug.js')>()),
	debug: vi.fn(),
	error: vi.fn(),
}));

import { toast } from 'svelte-sonner';

import { addAfterSaveObserver, notifyAfterSave, resetHooks } from '#lib/core/editor/editor.hooks.js';
import { saveFileByPath } from '#lib/core/editor/editor.service.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { modsEnabledStore } from '#lib/plugins/mods/mods-enabled.store.svelte.js';
import { disableMod, startModsHost, stopModsHost, type ModContext } from '#lib/plugins/mods/mods-host.service.js';
import { modsStore } from '#lib/plugins/mods/mods.store.svelte.js';
import { debug, error } from '#lib/utils/debug.js';

const globals = globalThis as unknown as { __saveCtx: ModContext };
const PATH = '/vault/Ideas/Note.md';

describe('ctx.onNoteSaved', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		localStorage.clear();
		files.clear();
		files.set('/vault/_system/mods/saver/manifest.json', JSON.stringify({ id: 'saver', name: 'Saver', version: '1.0.0' }));
		files.set('/vault/_system/mods/saver/main.js', 'export default { onload(ctx) { globalThis.__saveCtx = ctx; } };');
		files.set(PATH, 'old');
		resetHooks();
		editorStore.reset();
		vaultStore._reset();
		modsEnabledStore._reset();
		vaultStore.open('/vault');
		modsEnabledStore.setEnabled(true);
		await startModsHost('/vault');
	});

	afterEach(() => {
		stopModsHost();
		resetHooks();
		vi.useRealTimers();
	});

	it('reports a real editor save as a relative path after synchronous observers, including ones registered later', async () => {
		const events: string[] = [];
		addAfterSaveObserver(() => events.push('before'));
		globals.__saveCtx.onNoteSaved((path) => events.push(path));
		addAfterSaveObserver(() => events.push('after'));
		editorStore.addTab({ path: PATH, name: 'Note.md', content: 'edited', savedContent: 'old' });

		expect(await saveFileByPath(PATH)).toBe(true);
		expect(files.get(PATH)).toBe('edited');
		expect(editorStore.activeTab?.savedContent).toBe('edited');
		expect(events).toEqual(['before', 'after']);
		await vi.advanceTimersByTimeAsync(0);
		expect(events).toEqual(['before', 'after', 'Ideas/Note.md']);
	});

	it('contains throws and async rejections in the mod debug log, the Labs record and one toast, never Sentry or another observer', async () => {
		const seen: string[] = [];
		globals.__saveCtx.onNoteSaved(() => { throw new Error('bad save handler'); });
		globals.__saveCtx.onNoteSaved(async () => { throw new Error('bad async handler'); });
		globals.__saveCtx.onNoteSaved((path) => seen.push(path));
		addAfterSaveObserver(() => seen.push('sync'));
		await globals.__saveCtx.vault.write('Ideas/Note.md', 'changed');
		await vi.advanceTimersByTimeAsync(0);
		expect(seen).toEqual(['sync', 'Ideas/Note.md']);
		expect(debug).toHaveBeenCalledWith('MOD:saver', 'onNoteSaved callback failed:', expect.stringContaining('bad save handler'));
		expect(debug).toHaveBeenCalledWith('MOD:saver', 'onNoteSaved callback failed:', expect.stringContaining('bad async handler'));
		expect(error).not.toHaveBeenCalled();
		// The sync throw reports at once; the rejection settles a microtask later, so it is the last report.
		const record = modsStore.callbackErrorFor('saver');
		expect(record).toMatchObject({ callback: 'onNoteSaved', message: 'bad async handler' });
		expect(typeof record?.at).toBe('number');
		expect(record?.stack).toContain('bad async handler');
		expect(toast.error).toHaveBeenCalledTimes(1);
		expect(vi.mocked(toast.error).mock.calls[0][0]).toMatch(/^Saver: onNoteSaved callback failed: /);
	});

	it('disposal cancels pending callbacks and unsubscribes future saves', async () => {
		const seen: string[] = [];
		const dispose = globals.__saveCtx.onNoteSaved((path) => seen.push(path));
		await globals.__saveCtx.vault.write('Ideas/Note.md', 'one');
		dispose();
		dispose();
		await globals.__saveCtx.vault.write('Ideas/Note.md', 'two');
		await vi.advanceTimersByTimeAsync(0);
		expect(seen).toEqual([]);
	});

	it('unloading cancels pending callbacks and removes the observer', async () => {
		const ctx = globals.__saveCtx;
		const seen: string[] = [];
		ctx.onNoteSaved((path) => seen.push(path));
		await ctx.vault.write('Ideas/Note.md', 'one');
		disableMod('saver');
		notifyAfterSave(PATH, 'two');
		await vi.advanceTimersByTimeAsync(0);
		expect(seen).toEqual([]);
		expect(() => ctx.onNoteSaved(() => {})).toThrow('unloaded');
	});

	it('ignores paths outside its vault and drops pending callbacks after a vault switch', async () => {
		const seen: string[] = [];
		globals.__saveCtx.onNoteSaved((path) => seen.push(path));
		notifyAfterSave('/vault-other/Note.md', 'other');
		notifyAfterSave('/vault', 'root');
		notifyAfterSave('', 'empty');
		await vi.advanceTimersByTimeAsync(0);
		expect(seen).toEqual([]);
		await globals.__saveCtx.vault.write('Ideas/Note.md', 'changed');
		vaultStore.open('/other');
		await vi.advanceTimersByTimeAsync(0);
		expect(seen).toEqual([]);
	});

	it('rejects a non-function callback', () => {
		expect(() => globals.__saveCtx.onNoteSaved(null as never)).toThrow('onNoteSaved needs a callback function');
	});
});
