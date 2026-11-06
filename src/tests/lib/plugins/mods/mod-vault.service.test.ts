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
	};
});

// Like the Rust commands: create_folder is recursive, create_note refuses a missing parent or an existing file.
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(async (cmd: string, args?: { path: string; content?: string }) => {
		if (cmd === 'create_folder') {
			for (let dir = args!.path; dir.length > 1; dir = parentOf(dir)) disk.folders.add(dir);
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
import { writeTextFile } from '@tauri-apps/plugin-fs';

import { addAfterSaveObserver, resetHooks } from '#lib/core/editor/editor.hooks.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { findNodeByPath as findNode } from '#lib/core/filesystem/fs.logic.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
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
		runtime = { controller: new AbortController(), disposers: [], unloaded: false };
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
