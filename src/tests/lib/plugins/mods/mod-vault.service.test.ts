// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Real stores, editor service and hooks; only plugin-fs, Tauri IPC and the toast are mocked.
const disk = vi.hoisted(() => ({ files: new Map<string, string>(), folders: new Set<string>() }));

const parentOf = (path: string) => path.slice(0, path.lastIndexOf('/'));

vi.mock('@tauri-apps/plugin-fs', () => {
	const isUnder = (path: string, dir: string) => path.startsWith(`${dir}/`);
	return {
		exists: vi.fn(
			async (path: string) =>
				disk.files.has(path) || disk.folders.has(path) || [...disk.files.keys()].some((k) => isUnder(k, path)),
		),
		readDir: vi.fn(async (dir: string) => {
			const entries = new Map<string, boolean>();
			for (const key of [...disk.files.keys(), ...disk.folders]) {
				if (!isUnder(key, dir)) continue;
				const rest = key.slice(dir.length + 1);
				const slash = rest.indexOf('/');
				const name = slash < 0 ? rest : rest.slice(0, slash);
				entries.set(name, entries.get(name) || slash >= 0 || disk.folders.has(`${dir}/${name}`));
			}
			return [...entries].map(([name, isDirectory]) => ({ name, isDirectory, isFile: !isDirectory, isSymlink: false }));
		}),
		readTextFile: vi.fn(async (path: string) => {
			const text = disk.files.get(path);
			if (text === undefined) throw new Error(`No such file: ${path}`);
			return text;
		}),
		writeTextFile: vi.fn(async (path: string, content: string, options?: { create?: boolean }) => {
			if (options?.create === false && !disk.files.has(path)) throw new Error(`No such file: ${path}`);
			disk.files.set(path, content);
		}),
		rename: vi.fn(async (from: string, to: string) => {
			const text = disk.files.get(from);
			if (text === undefined) throw new Error(`No such file: ${from}`);
			disk.files.delete(from);
			disk.files.set(to, text);
		}),
	};
});

// Like the Rust commands: create_folder is recursive, create_note refuses a missing parent or an existing file.
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(async (cmd: string, args?: { path: string; content?: string }) => {
		if (cmd === 'create_folder') {
			for (let dir = args!.path; dir.length > 1; dir = parentOf(dir)) disk.folders.add(dir);
			return null;
		}
		if (cmd === 'write_mod_data') {
			const { vaultPath, modId, content } = args as unknown as { vaultPath: string; modId: string; content: string };
			const path = `${vaultPath}/.kokobrain/mods/${modId}/data.json`;
			for (let dir = parentOf(path); dir.length > 1; dir = parentOf(dir)) disk.folders.add(dir);
			disk.files.set(path, content);
			return null;
		}
		if (cmd === 'create_note') {
			const { path, content } = args!;
			if (!disk.folders.has(parentOf(path))) throw new Error(`Parent folder does not exist: ${parentOf(path)}`);
			if (disk.files.has(path)) throw new Error(`File already exists: ${path}`);
			disk.files.set(path, content!);
			return { changed: true };
		}
		return null;
	}),
}));

vi.mock('svelte-sonner', () => ({
	toast: { info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

vi.mock('#lib/utils/debug.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('#lib/utils/debug.js')>()),
	debug: vi.fn(),
	error: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { exists, readTextFile, rename, writeTextFile } from '@tauri-apps/plugin-fs';

import { addAfterSaveObserver, resetHooks } from '#lib/core/editor/editor.hooks.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { findNodeByPath as findNode } from '#lib/core/filesystem/fs.logic.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { registerContentInvalidationListener } from '#lib/core/filesystem/note-change.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { debug } from '#lib/utils/debug.js';
import { clearAllIndexed } from '#lib/utils/index-dedupe.js';
import type { ModContextV1 } from '#lib/plugins/mods/contract/mod-api.v1.js';
import { createModContext, type ModRuntime } from '#lib/plugins/mods/mods-host.service.js';

const VAULT = '/vaults/main';

const createCalls = () => vi.mocked(invoke).mock.calls.filter(([cmd]) => cmd === 'create_note' || cmd === 'create_folder');

describe('ctx.vault and ctx.workspace', () => {
	let runtime: ModRuntime;
	let ctx: ModContextV1;

	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
		disk.files.clear();
		disk.folders.clear();
		disk.folders.add(VAULT);
		vaultStore._reset();
		fsStore.reset();
		editorStore.reset();
		resetHooks();
		clearAllIndexed();
		vaultStore.open(VAULT);
		runtime = { controller: new AbortController(), disposers: [], runs: new Set(), unloaded: false };
		ctx = createModContext({ id: 'ideas', name: 'Ideas', version: '1.0.0' }, VAULT, runtime);
	});

	afterEach(() => {
		resetHooks();
	});

	describe('create', () => {
		it('writes the note, lists it in the file tree and resolves to the vault-relative path', async () => {
			disk.folders.add(`${VAULT}/Ideas`);

			await expect(ctx.vault.create('Ideas/Idea.md', '# Idea')).resolves.toBe('Ideas/Idea.md');

			expect(disk.files.get(`${VAULT}/Ideas/Idea.md`)).toBe('# Idea');
			expect(findNode(fsStore.fileTree, `${VAULT}/Ideas/Idea.md`)).toMatchObject({ name: 'Idea.md', isDirectory: false });
		});

		it('creates a missing parent folder before the note', async () => {
			await expect(ctx.vault.create('Ideas/2026/Idea.md', 'text')).resolves.toBe('Ideas/2026/Idea.md');

			expect(disk.files.get(`${VAULT}/Ideas/2026/Idea.md`)).toBe('text');
			expect(createCalls().map(([cmd]) => cmd)).toEqual(['create_folder', 'create_note']);
			expect(findNode(fsStore.fileTree, `${VAULT}/Ideas`)?.isDirectory).toBe(true);
			expect(findNode(fsStore.fileTree, `${VAULT}/Ideas/2026/Idea.md`)).not.toBeNull();
		});

		it('creates a note at the vault root', async () => {
			await expect(ctx.vault.create('Idea.md', 'root')).resolves.toBe('Idea.md');

			expect(disk.files.get(`${VAULT}/Idea.md`)).toBe('root');
			expect(fsStore.fileTree.map((n) => n.path)).toEqual([`${VAULT}/Idea.md`]);
		});

		it('rejects an existing path and writes nothing', async () => {
			disk.files.set(`${VAULT}/Idea.md`, 'original');

			await expect(ctx.vault.create('Idea.md', 'new')).rejects.toThrow('"Idea.md" already exists; use write');

			expect(disk.files.get(`${VAULT}/Idea.md`)).toBe('original');
			expect(createCalls()).toEqual([]);
			expect(fsStore.fileTree).toEqual([]);
		});

		it('rejects content that is not a string', async () => {
			const loose = ctx.vault as unknown as { create: (p: string, c: unknown) => Promise<string> };

			await expect(loose.create('Idea.md', 42)).rejects.toThrow('Mod "ideas": vault.create needs string content');
			expect(createCalls()).toEqual([]);
		});
	});

	describe('write', () => {
		it('rejects a missing file', async () => {
			await expect(ctx.vault.write('Missing.md', 'x')).rejects.toThrow('"Missing.md" does not exist; use create');

			expect(disk.files.has(`${VAULT}/Missing.md`)).toBe(false);
		});

		it('overwrites a file and runs the after-save observers', async () => {
			disk.files.set(`${VAULT}/Note.md`, 'old');
			const saved: [string, string][] = [];
			addAfterSaveObserver((path, content) => saved.push([path, content]));

			await ctx.vault.write('Note.md', 'new');

			expect(disk.files.get(`${VAULT}/Note.md`)).toBe('new');
			expect(writeTextFile).toHaveBeenCalledWith(`${VAULT}/Note.md`, 'new', { create: false });
			expect(saved).toEqual([[`${VAULT}/Note.md`, 'new']]);
		});

		it("a mod's own data file skips the after-save path: no observers, no index IPC, no vault-wide invalidation", async () => {
			const path = `${VAULT}/_system/mods/habits/data.json`;
			disk.files.set(path, '{}');
			const saved: string[] = [];
			addAfterSaveObserver((p) => saved.push(p));
			let invalidated = 0;
			const stopListening = registerContentInvalidationListener('test', () => invalidated++);

			await ctx.vault.write('_system/mods/habits/data.json', '{"a":1}');
			stopListening();

			expect(disk.files.get(path)).toBe('{"a":1}');
			expect(saved).toEqual([]);
			expect(invalidated).toBe(0);
			expect(vi.mocked(invoke).mock.calls.filter(([cmd]) => cmd === 'update_note_in_index')).toEqual([]);
		});

		it("a mod's own data file still updates a clean open tab", async () => {
			const path = `${VAULT}/_system/mods/habits/data.json`;
			disk.files.set(path, '{}');
			editorStore.addTab({ path, name: 'data.json', content: '{}', savedContent: '{}' });

			await ctx.vault.write('_system/mods/habits/data.json', '{"a":1}');

			expect(editorStore.activeTab).toMatchObject({ path, content: '{"a":1}', savedContent: '{"a":1}' });
		});

		it('a note inside the mods folder keeps the after-save path', async () => {
			const path = `${VAULT}/_system/mods/habits/README.md`;
			disk.files.set(path, 'old');
			const saved: string[] = [];
			addAfterSaveObserver((p) => saved.push(p));

			await ctx.vault.write('_system/mods/habits/README.md', 'new');

			expect(saved).toEqual([path]);
		});

		it("updates a clean open tab's content", async () => {
			const path = `${VAULT}/Note.md`;
			disk.files.set(path, 'old');
			editorStore.addTab({ path, name: 'Note.md', content: 'old', savedContent: 'old' });
			const saved: [string, string][] = [];
			addAfterSaveObserver((p, content) => saved.push([p, content]));

			await ctx.vault.write('Note.md', 'new');

			expect(editorStore.activeTab).toMatchObject({ path, content: 'new', savedContent: 'new' });
			expect(saved).toEqual([[path, 'new']]);
		});

		it('rejects a file whose open tab has unsaved changes and leaves both untouched', async () => {
			const path = `${VAULT}/Note.md`;
			disk.files.set(path, 'old');
			editorStore.addTab({ path, name: 'Note.md', content: 'typing', savedContent: 'old' });
			const saved: string[] = [];
			addAfterSaveObserver((p) => saved.push(p));

			await expect(ctx.vault.write('Note.md', 'new')).rejects.toThrow('"Note.md" has unsaved changes in an open tab');

			expect(disk.files.get(path)).toBe('old');
			expect(editorStore.activeTab).toMatchObject({ content: 'typing', savedContent: 'old' });
			expect(writeTextFile).not.toHaveBeenCalled();
			expect(saved).toEqual([]);
		});
	});

	describe('loadData and saveData', () => {
		const DIR = `${VAULT}/.kokobrain/mods/ideas`;
		const DATA = `${DIR}/data.json`;
		const dataFiles = () => [...disk.files.keys()].filter((path) => path.startsWith(`${DIR}/`)).sort();
		const writes = () => vi.mocked(invoke).mock.calls.filter(([cmd]) => cmd === 'write_mod_data');
		const realInvoke = vi.mocked(invoke).getMockImplementation()!;
		const realExists = vi.mocked(exists).getMockImplementation()!;
		const realReadTextFile = vi.mocked(readTextFile).getMockImplementation()!;
		const realRename = vi.mocked(rename).getMockImplementation()!;

		/** Makes each `write_mod_data` wait for `release`, in call order, then land */
		const holdWrites = () => {
			const releases: (() => void)[] = [];
			vi.mocked(invoke).mockImplementation(async (cmd, args) => {
				if (cmd === 'write_mod_data') await new Promise<void>((resolve) => releases.push(resolve));
				return realInvoke(cmd, args);
			});
			return releases;
		};
		const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

		afterEach(() => {
			vi.mocked(invoke).mockImplementation(realInvoke);
			vi.mocked(exists).mockImplementation(realExists);
			vi.mocked(readTextFile).mockImplementation(realReadTextFile);
			vi.mocked(rename).mockImplementation(realRename);
			vi.restoreAllMocks();
		});

		it('loadData resolves to null when there is no file, and creates nothing', async () => {
			await expect(ctx.loadData()).resolves.toBeNull();

			expect(writes()).toEqual([]);
			expect(disk.folders.has(DIR)).toBe(false);
		});

		it('saveData creates the folders and writes readable JSON through the atomic command; loadData parses it back', async () => {
			await ctx.saveData({ habits: ['read'], log: {} });

			expect(disk.files.get(DATA)).toBe('{\n\t"habits": [\n\t\t"read"\n\t],\n\t"log": {}\n}\n');
			expect(disk.folders.has(DIR)).toBe(true);
			expect(writes()).toEqual([['write_mod_data', { vaultPath: VAULT, modId: 'ideas', content: disk.files.get(DATA) }]]);
			expect(writeTextFile).not.toHaveBeenCalled();
			await expect(ctx.loadData()).resolves.toEqual({ habits: ['read'], log: {} });
		});

		it.each([[{}], [[]], [0], [''], [false], [null]])('round-trips the empty value %j', async (value) => {
			await ctx.saveData(value);

			await expect(ctx.loadData()).resolves.toEqual(value);
		});

		it('a value of another mod stays in its own folder', async () => {
			const other = createModContext({ id: 'other-mod', name: 'Other', version: '1.0.0' }, VAULT, runtime);

			await other.saveData({ mine: true });

			expect(disk.files.has(`${VAULT}/.kokobrain/mods/other-mod/data.json`)).toBe(true);
			await expect(ctx.loadData()).resolves.toBeNull();
		});

		describe('unparseable data', () => {
			const NOW = 1_700_000_000_000;
			const BACKUP = `${DIR}/data.corrupt-${NOW}.json`;
			const expected = {
				name: 'ModDataCorruptError',
				corruptPath: `.kokobrain/mods/ideas/data.corrupt-${NOW}.json`,
				message: `Mod "ideas": data.json is not valid JSON; its content was kept in .kokobrain/mods/ideas/data.corrupt-${NOW}.json`,
			};

			beforeEach(() => {
				vi.spyOn(Date, 'now').mockReturnValue(NOW);
			});

			it('moves the file aside byte for byte and reports it to the mod', async () => {
				disk.files.set(DATA, '{"habits": [');

				await expect(ctx.loadData()).rejects.toMatchObject(expected);

				expect(rename).toHaveBeenCalledWith(DATA, BACKUP);
				expect(dataFiles()).toEqual([BACKUP]);
				expect(disk.files.get(BACKUP)).toBe('{"habits": [');
				expect(writes()).toEqual([]);
				expect(writeTextFile).not.toHaveBeenCalled();
			});

			it('an empty file is unparseable too: a truncated file must not read as no data', async () => {
				disk.files.set(DATA, '');

				await expect(ctx.loadData()).rejects.toMatchObject(expected);

				expect(disk.files.get(BACKUP)).toBe('');
			});

			it('the next load resolves to null, and a later save leaves the kept copy alone', async () => {
				disk.files.set(DATA, 'not json');
				await expect(ctx.loadData()).rejects.toMatchObject(expected);

				await expect(ctx.loadData()).resolves.toBeNull();
				await ctx.saveData({ fresh: true });

				expect(disk.files.get(BACKUP)).toBe('not json');
				await expect(ctx.loadData()).resolves.toEqual({ fresh: true });
			});

			it('two loads at once report it once and keep one copy', async () => {
				disk.files.set(DATA, 'not json');

				const [first, second] = await Promise.allSettled([ctx.loadData(), ctx.loadData()]);

				expect(first).toMatchObject({ status: 'rejected', reason: expected });
				expect(second).toEqual({ status: 'fulfilled', value: null });
				expect(dataFiles()).toEqual([BACKUP]);
			});

			it('when the move fails, the file stays, and the error is the file system one', async () => {
				disk.files.set(DATA, 'not json');
				vi.mocked(rename).mockRejectedValueOnce('EACCES');

				const failure = await ctx.loadData().catch((err: Error) => err);

				expect(failure).toBeInstanceOf(Error);
				expect((failure as Error).message).toBe('EACCES');
				expect((failure as Error).name).toBe('Error');
				expect(disk.files.get(DATA)).toBe('not json');
				expect(debug).toHaveBeenCalledWith('MOD:ideas', 'loadData failed:', expect.stringContaining('EACCES'));
			});
		});

		it('a read failure rejects as it comes and moves nothing', async () => {
			disk.files.set(DATA, '{}');
			vi.mocked(readTextFile).mockRejectedValueOnce('EIO');

			await expect(ctx.loadData()).rejects.toEqual(new Error('EIO'));

			expect(dataFiles()).toEqual([DATA]);
			expect(debug).toHaveBeenCalledWith('MOD:ideas', 'loadData failed:', expect.stringContaining('EIO'));
		});

		it('a write failure rejects as it comes, and the old file is not touched', async () => {
			disk.files.set(DATA, '{"old":true}');
			vi.mocked(invoke).mockRejectedValueOnce('rename failed for data.json');

			// Tauri rejects with a bare string; a mod reads err.message.
			await expect(ctx.saveData({ new: true })).rejects.toEqual(new Error('rename failed for data.json'));

			expect(disk.files.get(DATA)).toBe('{"old":true}');
			expect(debug).toHaveBeenCalledWith('MOD:ideas', 'saveData failed:', expect.stringContaining('rename failed'));
		});

		it.each<[string, unknown]>([
			['undefined', undefined],
			['a function', () => {}],
			['a symbol', Symbol('s')],
			['a BigInt', 1n],
			['NaN inside an object', { n: NaN }],
			['a Map inside an array', [new Map()]],
		])('saveData rejects %s, naming the mod, and writes nothing', async (_label, value) => {
			disk.files.set(DATA, '{"old":true}');

			await expect(ctx.saveData(value)).rejects.toThrow(/^Mod "ideas": saveData needs a value JSON can represent: /);

			expect(writes()).toEqual([]);
			expect(disk.files.get(DATA)).toBe('{"old":true}');
		});

		it('saveData rejects a circular value, naming the mod', async () => {
			const circular: Record<string, unknown> = {};
			circular.self = circular;

			await expect(ctx.saveData(circular)).rejects.toThrow(/^Mod "ideas": saveData needs a value JSON can represent: /);
			expect(writes()).toEqual([]);
		});

		it('neither call reaches the index, search, history, Auto Move, the file tree or the vault-wide invalidation', async () => {
			const saved: string[] = [];
			addAfterSaveObserver((path) => saved.push(path));
			let invalidated = 0;
			const stopListening = registerContentInvalidationListener('test', () => invalidated++);
			vi.spyOn(Date, 'now').mockReturnValue(1);

			await ctx.saveData({ a: 1 });
			await ctx.loadData();
			disk.files.set(DATA, 'not json');
			await ctx.loadData().catch(() => {});
			stopListening();

			expect(vi.mocked(invoke).mock.calls.map(([cmd]) => cmd)).toEqual(['write_mod_data']);
			expect(saved).toEqual([]);
			expect(invalidated).toBe(0);
			expect(fsStore.fileTree).toEqual([]);
			expect(editorStore.tabs).toEqual([]);
			expect(writeTextFile).not.toHaveBeenCalled();
		});

		it("the path uses the manifest's id, whatever the mod does to ctx.mod", async () => {
			(ctx.mod as { id: string }).id = '../../escape';

			await ctx.saveData({ a: 1 });
			await ctx.loadData();

			expect(writes()[0][1]).toMatchObject({ modId: 'ideas' });
			expect(exists).toHaveBeenCalledWith(DATA);
			expect(disk.files.has(DATA)).toBe(true);
			expect([...disk.files.keys()].filter((path) => path.includes('escape'))).toEqual([]);
		});

		describe('order', () => {
			it('concurrent saves land one at a time in call order, and the last call wins', async () => {
				const releases = holdWrites();
				const saves = [ctx.saveData({ n: 1 }), ctx.saveData({ n: 2 }), ctx.saveData({ n: 3 })];
				await flush();
				// One at a time: a write sent before the previous one returned could land first.
				expect(writes()).toHaveLength(1);

				for (let landed = 0; landed < 3; landed++) {
					releases[landed]();
					await flush();
				}
				await Promise.all(saves);

				expect(writes().map(([, args]) => JSON.parse((args as unknown as { content: string }).content).n)).toEqual([1, 2, 3]);
				expect(JSON.parse(disk.files.get(DATA)!).n).toBe(3);
			});

			it('saves what the value held at the call, not at the write', async () => {
				const releases = holdWrites();
				const blocker = ctx.saveData({ n: 0 });
				const value = { n: 1 };
				const save = ctx.saveData(value);
				value.n = 99;
				await flush();
				releases[0]();
				await flush();
				releases[1]();
				await Promise.all([blocker, save]);

				expect(JSON.parse(disk.files.get(DATA)!).n).toBe(1);
			});

			it('a failed save does not stop the next one', async () => {
				vi.mocked(invoke).mockRejectedValueOnce('disk full');

				const results = await Promise.allSettled([ctx.saveData({ n: 1 }), ctx.saveData({ n: 2 })]);

				expect(results.map((r) => r.status)).toEqual(['rejected', 'fulfilled']);
				expect(JSON.parse(disk.files.get(DATA)!).n).toBe(2);
			});

			it('a load after a save waits for it and sees the saved value', async () => {
				const releases = holdWrites();
				const save = ctx.saveData({ n: 1 });
				const load = ctx.loadData();
				await flush();
				expect(readTextFile).not.toHaveBeenCalled();

				releases[0]();
				await save;

				await expect(load).resolves.toEqual({ n: 1 });
			});
		});

		describe('unload', () => {
			const UNLOADED = 'Mod "ideas" is unloaded';

			it('both throw after unload and touch nothing', async () => {
				disk.files.set(DATA, '{"old":true}');
				runtime.unloaded = true;

				await expect(ctx.loadData()).rejects.toThrow(UNLOADED);
				await expect(ctx.saveData({ new: true })).rejects.toThrow(UNLOADED);

				expect(exists).not.toHaveBeenCalled();
				expect(writes()).toEqual([]);
				expect(disk.files.get(DATA)).toBe('{"old":true}');
			});

			it('both throw after the vault changed, and nothing lands in either vault', async () => {
				vaultStore.open('/vaults/other');

				await expect(ctx.loadData()).rejects.toThrow(UNLOADED);
				await expect(ctx.saveData({ new: true })).rejects.toThrow(UNLOADED);

				expect(writes()).toEqual([]);
			});

			it('an unusable value after unload reports the unload', async () => {
				runtime.unloaded = true;

				await expect(ctx.saveData(undefined)).rejects.toThrow(UNLOADED);
			});

			it('loadData throws when the unload comes during the check for the file', async () => {
				vi.mocked(exists).mockImplementationOnce(async () => {
					runtime.unloaded = true;
					return false;
				});

				await expect(ctx.loadData()).rejects.toThrow(UNLOADED);
			});

			it('loadData throws when the unload comes during the read, even with valid data', async () => {
				disk.files.set(DATA, '{"a":1}');
				vi.mocked(readTextFile).mockImplementationOnce(async () => {
					runtime.unloaded = true;
					return '{"a":1}';
				});

				await expect(ctx.loadData()).rejects.toThrow(UNLOADED);
			});

			it('an unload during the read of a corrupt file moves nothing: the next instance finds and reports it', async () => {
				disk.files.set(DATA, 'not json');
				vi.mocked(readTextFile).mockImplementationOnce(async () => {
					runtime.unloaded = true;
					return 'not json';
				});

				await expect(ctx.loadData()).rejects.toThrow(UNLOADED);

				expect(dataFiles()).toEqual([DATA]);
			});

			it('an unload during the move throws the unload error; the kept copy is safe', async () => {
				disk.files.set(DATA, 'not json');
				vi.mocked(rename).mockImplementationOnce(async (from, to) => {
					await realRename(from, to);
					runtime.unloaded = true;
				});

				await expect(ctx.loadData()).rejects.toThrow(UNLOADED);

				expect(dataFiles()).toHaveLength(1);
				expect(dataFiles()[0]).toMatch(/data\.corrupt-\d+\.json$/);
			});

			it('saveData throws when the unload comes during its write', async () => {
				const releases = holdWrites();
				const save = ctx.saveData({ n: 1 });
				await flush();
				runtime.unloaded = true;
				releases[0]();

				await expect(save).rejects.toThrow(UNLOADED);
			});

			it('a save still queued at unload rejects and never writes', async () => {
				const releases = holdWrites();
				const first = ctx.saveData({ n: 1 });
				const queued = ctx.saveData({ n: 2 });
				await flush();
				runtime.unloaded = true;
				releases[0]();

				await expect(first).rejects.toThrow(UNLOADED);
				await expect(queued).rejects.toThrow(UNLOADED);
				expect(writes()).toHaveLength(1);
				expect(JSON.parse(disk.files.get(DATA)!).n).toBe(1);
			});
		});
	});

	describe('cleanups', () => {
		it('a cleanup the mod already ran leaves runtime.disposers, so a dialog opened many times does not grow it', () => {
			const before = runtime.disposers.length;

			for (let i = 0; i < 3; i++) ctx.theme.onChange(() => {})();

			expect(runtime.disposers).toHaveLength(before);
		});

		it('a cleanup not run yet stays for the unload', () => {
			const before = runtime.disposers.length;

			ctx.theme.onChange(() => {});

			expect(runtime.disposers).toHaveLength(before + 1);
		});
	});

	describe('read, exists and list', () => {
		it('read resolves to the text and rejects a missing file', async () => {
			disk.files.set(`${VAULT}/Ideas/Idea.md`, 'hello');

			await expect(ctx.vault.read('Ideas/Idea.md')).resolves.toBe('hello');
			await expect(ctx.vault.read('Ideas/Missing.md')).rejects.toThrow('No such file');
			// A string, not the Error: the log file JSON-stringifies other arguments, and an Error becomes `{}`.
			expect(debug).toHaveBeenCalledWith('MOD:ideas', 'vault.read "Ideas/Missing.md" failed:', expect.stringContaining('No such file'));
		});

		it('exists resolves for files and folders', async () => {
			disk.files.set(`${VAULT}/Ideas/Idea.md`, 'hello');

			await expect(ctx.vault.exists('Ideas/Idea.md')).resolves.toBe(true);
			await expect(ctx.vault.exists('Ideas')).resolves.toBe(true);
			await expect(ctx.vault.exists('Nope.md')).resolves.toBe(false);
		});

		it('list returns the direct children with vault-relative paths and no dot entries', async () => {
			disk.files.set(`${VAULT}/Ideas/Idea.md`, '');
			disk.files.set(`${VAULT}/Ideas/.DS_Store`, '');
			disk.files.set(`${VAULT}/Ideas/2026/Deep.md`, '');
			disk.folders.add(`${VAULT}/Ideas/.hidden`);
			disk.files.set(`${VAULT}/Top.md`, '');

			const ideas = await ctx.vault.list('Ideas');

			expect(ideas.sort((a, b) => a.name.localeCompare(b.name))).toEqual([
				{ name: '2026', path: 'Ideas/2026', isFolder: true },
				{ name: 'Idea.md', path: 'Ideas/Idea.md', isFolder: false },
			]);
			expect((await ctx.vault.list('')).map((e) => e.path).sort()).toEqual(['Ideas', 'Top.md']);
		});
	});

	it('openNote opens the note in the editor by its absolute path', async () => {
		disk.files.set(`${VAULT}/Ideas/Idea.md`, '# Idea');

		await ctx.workspace.openNote('Ideas/Idea.md');

		expect(editorStore.activeTab).toMatchObject({ path: `${VAULT}/Ideas/Idea.md`, content: '# Idea' });
	});

	it('openNote rejects a missing note and opens no tab', async () => {
		await expect(ctx.workspace.openNote('Ideas/Missing.md')).rejects.toThrow('"Ideas/Missing.md" does not exist');

		expect(editorStore.tabs).toEqual([]);
	});

	it('every member rejects an invalid vault path', async () => {
		const message = 'Invalid vault path "../outside.md"';

		await expect(ctx.vault.read('../outside.md')).rejects.toThrow(message);
		await expect(ctx.vault.exists('../outside.md')).rejects.toThrow(message);
		await expect(ctx.vault.list('../outside.md')).rejects.toThrow(message);
		await expect(ctx.vault.create('../outside.md', '')).rejects.toThrow(message);
		await expect(ctx.vault.write('../outside.md', '')).rejects.toThrow(message);
		await expect(ctx.workspace.openNote('/abs.md')).rejects.toThrow('Invalid vault path "/abs.md"');
		expect(createCalls()).toEqual([]);
	});

	it('every call after the open vault changed throws and touches nothing', async () => {
		disk.files.set(`${VAULT}/Note.md`, 'old');
		vaultStore.open('/vaults/other');
		const message = 'Mod "ideas" is unloaded';

		await expect(ctx.vault.read('Note.md')).rejects.toThrow(message);
		await expect(ctx.vault.exists('Note.md')).rejects.toThrow(message);
		await expect(ctx.vault.list('')).rejects.toThrow(message);
		await expect(ctx.vault.create('New.md', '')).rejects.toThrow(message);
		await expect(ctx.vault.write('Note.md', 'new')).rejects.toThrow(message);
		await expect(ctx.workspace.openNote('Note.md')).rejects.toThrow(message);
		expect(disk.files.get(`${VAULT}/Note.md`)).toBe('old');
		expect(createCalls()).toEqual([]);
		expect(editorStore.tabs).toEqual([]);
	});

	it('a create whose vault changes while it runs leaves the file tree alone', async () => {
		const original = vi.mocked(invoke).getMockImplementation()!;
		vi.mocked(invoke).mockImplementation(async (cmd, args) => {
			const result = await original(cmd, args);
			if (cmd === 'create_note') vaultStore.open('/vaults/other');
			return result;
		});

		await expect(ctx.vault.create('Idea.md', 'x')).rejects.toThrow('Mod "ideas" is unloaded');

		expect(fsStore.fileTree).toEqual([]);
	});

	it('every call after unload throws', async () => {
		runtime.unloaded = true;

		await expect(ctx.vault.read('Note.md')).rejects.toThrow('Mod "ideas" is unloaded');
		await expect(ctx.vault.create('New.md', '')).rejects.toThrow('Mod "ideas" is unloaded');
		await expect(ctx.workspace.openNote('Note.md')).rejects.toThrow('Mod "ideas" is unloaded');
	});
});
