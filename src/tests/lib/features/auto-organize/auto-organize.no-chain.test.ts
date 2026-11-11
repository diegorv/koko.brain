import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// The whole save -> observer -> write -> save loop runs for real: the real
// editor hooks, the real frontmatter writer and the real icon writer. Only
// the Tauri fs plugin (an in-memory vault) and the IPC `call` are mocked.
const files = new Map<string, string>();

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(async (path: string) => {
		const content = files.get(path);
		if (content === undefined) throw new Error(`failed to open file at path: ${path}`);
		return content;
	}),
	writeTextFile: vi.fn(async (path: string, content: string) => {
		files.set(path, content);
	}),
	exists: vi.fn(async (path: string) => files.has(path) || [...files.keys()].some((p) => p.startsWith(`${path}/`))),
	mkdir: vi.fn(async () => {}),
	rename: vi.fn(async (from: string, to: string) => {
		files.set(to, files.get(from)!);
		files.delete(from);
	}),
	remove: vi.fn(),
	copyFile: vi.fn(),
	readDir: vi.fn(async () => []),
}));

/** Notes that link to each note, by absolute path, as Rust `get_backlinks_v2` returns them. */
const backlinks = new Map<string, string[]>();

vi.mock('#lib/contracts/ipc.js', () => ({
	// `create_note` writes the note, as the Rust command does.
	call: vi.fn(async (command: string, args?: { path: string; content: string }) => {
		if (command === 'create_note' && args) files.set(args.path, args.content);
		if (command === 'get_backlinks_v2' && args) return (backlinks.get(args.path) ?? []).map((path) => ({ path }));
		return undefined;
	}),
	listen: vi.fn(async () => () => {}),
}));

import { rename, writeTextFile } from '@tauri-apps/plugin-fs';
import { notifyAfterSave, resetHooks } from '#lib/core/editor/editor.hooks.js';
import { parseFrontmatterProperties } from '#lib/core/frontmatter/properties.logic.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { autoOrganizeStore } from '#lib/features/auto-organize/auto-organize.store.svelte.js';
import { registerAutoOrganizeHook, resetAutoOrganize } from '#lib/features/auto-organize/auto-organize.service.js';
import type { AutoOrganizeRule } from '#lib/features/auto-organize/auto-organize.types.js';
// `setIconForPath` loads this lazily; loaded here, its import resolves from the
// module cache inside the fake-timer window.
import '#lib/features/file-icons/frontmatter-icon.service.js';

const DEBOUNCE = 50;

/** The parsed frontmatter of `path` as a key -> value object. */
function frontmatter(path: string): Record<string, unknown> {
	return Object.fromEntries(parseFrontmatterProperties(files.get(path)!).map((p) => [p.key, p.value]));
}

/**
 * Advances past the 15 s recent-save timers of `notifyAfterSave`. A run
 * scheduled by a rule's own write would fire in this window and write again.
 */
async function drain(): Promise<void> {
	await vi.advanceTimersByTimeAsync(20_000);
}

describe('auto-organize rule writes never schedule another run', () => {
	let unsubscribe: () => void;

	beforeEach(() => {
		vi.useFakeTimers();
		files.clear();
		backlinks.clear();
		fsStore.reset();
		vi.mocked(writeTextFile).mockClear();
		vi.mocked(rename).mockClear();
		resetHooks();
		resetAutoOrganize();
		clearLocalStorage();
		settingsStore.updateAutoOrganize({ enabled: true, debounceMs: DEBOUNCE });
		vaultStore.open('/vault');
		unsubscribe = registerAutoOrganizeHook();
	});

	afterEach(() => {
		unsubscribe();
		resetAutoOrganize();
		resetHooks();
		vaultStore.close();
		vi.useRealTimers();
	});

	function setRules(rules: AutoOrganizeRule[]): void {
		autoOrganizeStore.setConfig({ rules, excludedFolders: [] });
	}

	it('a rule whose filter depends on another rule\'s output does not apply in the same save', async () => {
		setRules([
			{
				id: 'a',
				name: 'A',
				expression: "file.folder == '/vault/topics/AWS'",
				destination: '',
				enabled: true,
				properties: [{ key: '_belongs_to', value: '[[AWS]]', mode: 'if-missing' }],
			},
			{
				id: 'b',
				name: 'B',
				expression: '_belongs_to.contains("AWS")',
				destination: '',
				enabled: true,
				properties: [{ key: 'x', value: 1, mode: 'always' }],
			},
		]);
		const path = '/vault/topics/AWS/note.md';
		files.set(path, '---\n_belongs_to: ""\n---\nbody');

		notifyAfterSave(path, files.get(path)!);
		await vi.advanceTimersByTimeAsync(DEBOUNCE + 10);
		await vi.advanceTimersByTimeAsync(DEBOUNCE + 10);

		expect(frontmatter(path)).toEqual({ _belongs_to: '[[AWS]]' });
		expect(writeTextFile).toHaveBeenCalledTimes(1);

		await drain();
		expect(frontmatter(path).x).toBeUndefined();
		expect(writeTextFile).toHaveBeenCalledTimes(1);
		expect(vi.getTimerCount()).toBe(0);
	});

	it('a note a rule creates is not evaluated by the rules in the same run', async () => {
		setRules([
			{
				id: 'follow-up',
				name: 'Follow-up',
				expression: "file.basename == 'meeting'",
				destination: '',
				enabled: true,
				createNote: { path: '{folder}/{basename} follow-up.md' },
			},
			{
				id: 'stamp',
				name: 'Stamp follow-ups',
				expression: 'file.basename.endsWith("follow-up")',
				destination: '',
				enabled: true,
				properties: [{ key: 'x', value: 1, mode: 'always' }],
			},
		]);
		const path = '/vault/notes/meeting.md';
		const created = '/vault/notes/meeting follow-up.md';
		files.set(path, '---\nstatus: open\n---\nbody');

		notifyAfterSave(path, files.get(path)!);
		for (let i = 0; i < 3; i++) await vi.advanceTimersByTimeAsync(DEBOUNCE + 10);

		expect(files.get(created)).toBe('');
		await drain();
		expect(files.get(created)).toBe('');
		expect(writeTextFile).not.toHaveBeenCalled();
		expect(vi.getTimerCount()).toBe(0);
	});

	describe('rename', () => {
		const NOTE = '/vault/notes/old.md';
		const RENAMED = '/vault/notes/2026-11 Meeting.md';
		const LINKER = '/vault/notes/linker.md';
		const MONTHLY: AutoOrganizeRule = {
			id: 'monthly',
			name: 'Monthly meeting name',
			expression: "type == 'meeting'",
			destination: '',
			enabled: true,
			rename: { name: '{year}-{month} Meeting' },
		};

		beforeEach(() => {
			vi.setSystemTime(new Date(2026, 10, 10, 9, 0));
			files.set(NOTE, '---\ntype: meeting\n---\nbody');
			files.set(LINKER, 'See [[old]].');
			backlinks.set(NOTE, [LINKER]);
			const file = (path: string) => ({ name: path.slice(path.lastIndexOf('/') + 1), path, isDirectory: false });
			fsStore.setFileTree([{ name: 'notes', path: '/vault/notes', isDirectory: true, children: [file(LINKER), file(NOTE)] }]);
		});

		it('a matching save renames the note and rewrites the links to it, and a second save does nothing', async () => {
			setRules([MONTHLY]);

			notifyAfterSave(NOTE, files.get(NOTE)!);
			for (let i = 0; i < 3; i++) await vi.advanceTimersByTimeAsync(DEBOUNCE + 10);

			expect(files.has(NOTE)).toBe(false);
			expect(files.get(RENAMED)).toBe('---\ntype: meeting\n---\nbody');
			expect(files.get(LINKER)).toBe('See [[2026-11 Meeting]].');
			expect(rename).toHaveBeenCalledTimes(1);

			notifyAfterSave(RENAMED, files.get(RENAMED)!);
			await drain();

			expect(rename).toHaveBeenCalledTimes(1);
			expect(files.get(RENAMED)).toBe('---\ntype: meeting\n---\nbody');
			expect(vi.getTimerCount()).toBe(0);
		});

		it('the backlink rewrite after a rename does not run the rules on the rewritten notes', async () => {
			setRules([
				MONTHLY,
				{
					id: 'stamp',
					name: 'Stamp every note',
					expression: 'true',
					destination: '',
					enabled: true,
					properties: [{ key: 'x', value: 1, mode: 'always' }],
				},
			]);

			notifyAfterSave(NOTE, files.get(NOTE)!);
			for (let i = 0; i < 3; i++) await vi.advanceTimersByTimeAsync(DEBOUNCE + 10);
			await drain();

			expect(files.get(LINKER)).toBe('See [[2026-11 Meeting]].');
			expect(vi.mocked(writeTextFile).mock.calls.filter(([p]) => p === LINKER)).toHaveLength(1);
			expect(frontmatter(RENAMED)).toEqual({ _type: 'meeting', x: 1 });
			expect(vi.getTimerCount()).toBe(0);
		});

		it('a rule that renames, moves and sets a property ends at the final path in one run, and nothing runs again', async () => {
			const FINAL = '/vault/Archive/2026-11 Meeting.md';
			setRules([{ ...MONTHLY, destination: 'Archive', properties: [{ key: 'x', value: 1, mode: 'always' }] }]);

			notifyAfterSave(NOTE, files.get(NOTE)!);
			for (let i = 0; i < 3; i++) await vi.advanceTimersByTimeAsync(DEBOUNCE + 10);
			await drain();

			expect(files.has(NOTE)).toBe(false);
			expect(files.has(RENAMED)).toBe(false);
			expect(frontmatter(FINAL)).toEqual({ _type: 'meeting', x: 1 });
			expect(vi.mocked(writeTextFile).mock.calls.filter(([p]) => p === FINAL)).toHaveLength(1);
			expect(vi.getTimerCount()).toBe(0);
		});
	});

	it('a legacy icon with no color and an always _color property do not rewrite each other', async () => {
		setRules([
			{
				id: 'mover',
				name: 'Mover',
				expression: "file.folder == '/vault/Archive'",
				destination: 'Archive',
				enabled: true,
				icon: { iconPack: 'lucide', iconName: 'archive' },
			},
			{
				id: 'paint',
				name: 'Paint',
				expression: 'true',
				destination: '',
				enabled: true,
				properties: [{ key: '_color', value: 'red', mode: 'always' }],
			},
		]);
		const path = '/vault/Archive/note.md';
		files.set(path, '---\nstatus: done\n---\nbody');

		notifyAfterSave(path, files.get(path)!);
		for (let i = 0; i < 3; i++) await vi.advanceTimersByTimeAsync(DEBOUNCE + 10);

		expect(frontmatter(path)).toEqual({ status: 'done', _icon: 'lucide:archive', _color: 'red' });
		const writes = vi.mocked(writeTextFile).mock.calls.length;
		expect(writes).toBe(2);

		await drain();
		expect(vi.mocked(writeTextFile).mock.calls.length).toBe(writes);
		expect(vi.getTimerCount()).toBe(0);
	});
});
