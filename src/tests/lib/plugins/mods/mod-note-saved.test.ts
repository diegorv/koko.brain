// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const files = vi.hoisted(() => new Map<string, string>());
vi.mock('@tauri-apps/plugin-fs', () => ({
	exists: vi.fn(async (path: string) => [...files.keys()].some((key) => key === path || key.startsWith(`${path}/`))),
	readDir: vi.fn(async () => [{ name: 'saver', isDirectory: true }, { name: 'other', isDirectory: true }]),
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

import { writeTextFile } from '@tauri-apps/plugin-fs';
import { toast } from 'svelte-sonner';

import { addAfterSaveObserver, notifyAfterSave, resetHooks } from '#lib/core/editor/editor.hooks.js';
import { saveFileByPath } from '#lib/core/editor/editor.service.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { modsEnabledStore } from '#lib/plugins/mods/mods-enabled.store.svelte.js';
import { disableMod, startModsHost, stopModsHost, type ModContext } from '#lib/plugins/mods/mods-host.service.js';
import { modsStore } from '#lib/plugins/mods/mods.store.svelte.js';
import { debug, error } from '#lib/utils/debug.js';

const globals = globalThis as unknown as { __saveCtx: ModContext; __otherCtx: ModContext };
const PATH = '/vault/Ideas/Note.md';

describe('ctx.onNoteSaved', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		localStorage.clear();
		files.clear();
		files.set('/vault/_system/mods/saver/manifest.json', JSON.stringify({ id: 'saver', name: 'Saver', version: '1.0.0' }));
		files.set('/vault/_system/mods/saver/main.js', 'export default { onload(ctx) { globalThis.__saveCtx = ctx; } };');
		files.set('/vault/_system/mods/other/manifest.json', JSON.stringify({ id: 'other', name: 'Other', version: '1.0.0' }));
		files.set('/vault/_system/mods/other/main.js', 'export default { onload(ctx) { globalThis.__otherCtx = ctx; } };');
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

	it('passes the saved content with the path, one call per save in order', async () => {
		const seen: [string, string][] = [];
		globals.__saveCtx.onNoteSaved((path, content) => seen.push([path, content]));
		editorStore.addTab({ path: PATH, name: 'Note.md', content: 'edited', savedContent: 'old' });
		expect(await saveFileByPath(PATH)).toBe(true);
		editorStore.updateContent('edited again');
		expect(await saveFileByPath(PATH)).toBe(true);
		await vi.advanceTimersByTimeAsync(0);
		expect(seen).toEqual([
			['Ideas/Note.md', 'edited'],
			['Ideas/Note.md', 'edited again'],
		]);
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

	describe('own writes', () => {
		const DRAFT = '---\nstatus: draft\n---\n';
		const ACTIVE = '---\nstatus: active\n---\n';
		const activate = (props: { key: string; value: unknown }[]) =>
			props.map((p) => (p.key === 'status' ? { ...p, value: 'active' } : p)) as never;
		/** Saves the note through the editor, as a user edit would */
		const editorSave = async (content: string) => {
			if (!editorStore.tabs.some((t) => t.path === PATH)) {
				editorStore.addTab({ path: PATH, name: 'Note.md', content, savedContent: files.get(PATH) ?? '' });
			} else {
				editorStore.updateContent(content);
			}
			expect(await saveFileByPath(PATH)).toBe(true);
		};

		it('reports the mod\'s own vault.write without the option, with its content', async () => {
			const seen: [string, string][] = [];
			globals.__saveCtx.onNoteSaved((path, content) => seen.push([path, content]));
			await globals.__saveCtx.vault.write('Ideas/Note.md', 'mine');
			await vi.advanceTimersByTimeAsync(0);
			expect(seen).toEqual([['Ideas/Note.md', 'mine']]);
		});

		it('skips the mod\'s own vault.write with ignoreOwnWrites, and still reports a later editor save', async () => {
			const seen: [string, string][] = [];
			globals.__saveCtx.onNoteSaved((path, content) => seen.push([path, content]), { ignoreOwnWrites: true });
			await globals.__saveCtx.vault.write('Ideas/Note.md', 'mine');
			await vi.advanceTimersByTimeAsync(0);
			expect(seen).toEqual([]);
			await editorSave('typed');
			await vi.advanceTimersByTimeAsync(0);
			expect(seen).toEqual([['Ideas/Note.md', 'typed']]);
		});

		it('skips the mod\'s own updateFrontmatter on a closed note and an open tab with the option, and reports it without', async () => {
			files.set(PATH, `${DRAFT}body`);
			const ignoring: string[] = [];
			const hearing: [string, string][] = [];
			globals.__saveCtx.onNoteSaved((path) => ignoring.push(path), { ignoreOwnWrites: true });
			globals.__saveCtx.onNoteSaved((path, content) => hearing.push([path, content]));

			await globals.__saveCtx.vault.updateFrontmatter('Ideas/Note.md', activate);
			await vi.advanceTimersByTimeAsync(0);
			expect(files.get(PATH)).toBe(`${ACTIVE}body`);

			files.set(PATH, `${DRAFT}body`);
			editorStore.addTab({ path: PATH, name: 'Note.md', content: `${DRAFT}body`, savedContent: `${DRAFT}body` });
			await globals.__saveCtx.vault.updateFrontmatter('Ideas/Note.md', activate);
			await vi.advanceTimersByTimeAsync(0);
			expect(editorStore.activeTab?.savedContent).toBe(`${ACTIVE}body`);

			expect(ignoring).toEqual([]);
			expect(hearing).toEqual([
				['Ideas/Note.md', `${ACTIVE}body`],
				['Ideas/Note.md', `${ACTIVE}body`],
			]);
		});

		it('keeps two concurrent updateFrontmatter calls on one path from clearing each other, and clears after both settle', async () => {
			files.set(PATH, `${DRAFT}body`);
			const seen: string[] = [];
			globals.__saveCtx.onNoteSaved((_path, content) => seen.push(content), { ignoreOwnWrites: true });
			const realWrite = vi.mocked(writeTextFile).getMockImplementation()!;
			let releaseSecond = () => {};
			vi.mocked(writeTextFile)
				.mockImplementationOnce(realWrite)
				.mockImplementationOnce(async (...args) => {
					await new Promise<void>((resolve) => { releaseSecond = resolve; });
					return realWrite(...args);
				});

			const first = globals.__saveCtx.vault.updateFrontmatter('Ideas/Note.md', activate);
			const second = globals.__saveCtx.vault.updateFrontmatter('Ideas/Note.md', activate);
			await first;
			// The first call has settled and released its mark; the second one still holds its own.
			releaseSecond();
			await second;
			await vi.advanceTimersByTimeAsync(0);
			expect(seen).toEqual([]);

			await editorSave('typed');
			await vi.advanceTimersByTimeAsync(0);
			expect(seen).toEqual(['typed']);
		});

		it('releases the own-write mark when updateFrontmatter rejects, so a later editor save is reported', async () => {
			// A comment in the frontmatter makes the rebuild lossy, so the write is refused after the mark is taken.
			files.set(PATH, '---\n# c\nstatus: draft\n---\nbody');
			const seen: string[] = [];
			globals.__saveCtx.onNoteSaved((_path, content) => seen.push(content), { ignoreOwnWrites: true });
			await expect(globals.__saveCtx.vault.updateFrontmatter('Ideas/Note.md', activate)).rejects.toThrow();
			expect(files.get(PATH)).toBe('---\n# c\nstatus: draft\n---\nbody');

			await editorSave('typed');
			await vi.advanceTimersByTimeAsync(0);
			expect(seen).toEqual(['typed']);
		});

		it('filters only the writing mod: another mod with the option still hears it', async () => {
			const saver: string[] = [];
			const other: [string, string][] = [];
			globals.__saveCtx.onNoteSaved((path) => saver.push(path), { ignoreOwnWrites: true });
			globals.__otherCtx.onNoteSaved((path, content) => other.push([path, content]), { ignoreOwnWrites: true });
			await globals.__saveCtx.vault.write('Ideas/Note.md', 'from saver');
			await vi.advanceTimersByTimeAsync(0);
			expect(saver).toEqual([]);
			expect(other).toEqual([['Ideas/Note.md', 'from saver']]);
		});

		it('applies the option per subscription', async () => {
			const withOption: string[] = [];
			const without: string[] = [];
			globals.__saveCtx.onNoteSaved((path) => withOption.push(path), { ignoreOwnWrites: true });
			globals.__saveCtx.onNoteSaved((path) => without.push(path));
			await globals.__saveCtx.vault.write('Ideas/Note.md', 'mine');
			await vi.advanceTimersByTimeAsync(0);
			expect(withOption).toEqual([]);
			expect(without).toEqual(['Ideas/Note.md']);
		});

		it('never passes the saved content to debug() or error()', async () => {
			const secret = 'SECRET-NOTE-TEXT';
			globals.__saveCtx.onNoteSaved(() => { throw new Error('bad handler'); });
			globals.__saveCtx.onNoteSaved(() => {}, { ignoreOwnWrites: true });
			await globals.__saveCtx.vault.write('Ideas/Note.md', `${secret} one`);
			await editorSave(`${secret} two`);
			await vi.advanceTimersByTimeAsync(0);
			const logged = [...vi.mocked(debug).mock.calls, ...vi.mocked(error).mock.calls].flat().map(String);
			expect(logged.some((text) => text.includes(secret))).toBe(false);
			expect(debug).toHaveBeenCalledWith('MOD:saver', 'onNoteSaved callback failed:', expect.stringContaining('bad handler'));
		});
	});

	it('validates options', () => {
		const ctx = globals.__saveCtx;
		for (const bad of [null, true, 'yes']) {
			expect(() => ctx.onNoteSaved(() => {}, bad as never)).toThrow('Mod "saver": onNoteSaved needs options to be an object');
		}
		expect(() => ctx.onNoteSaved(() => {}, { ignoreOwnWrites: 'yes' } as never)).toThrow(
			'Mod "saver": onNoteSaved needs options.ignoreOwnWrites to be a boolean',
		);
		expect(() => ctx.onNoteSaved(() => {}, undefined)).not.toThrow();
		expect(() => ctx.onNoteSaved(() => {}, {})).not.toThrow();
		expect(() => ctx.onNoteSaved(() => {}, { ignoreOwnWrites: false })).not.toThrow();
	});

	it('rejects a non-function callback', () => {
		expect(() => globals.__saveCtx.onNoteSaved(null as never)).toThrow('onNoteSaved needs a callback function');
	});
});
