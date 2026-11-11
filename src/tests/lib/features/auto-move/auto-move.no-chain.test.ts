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
	rename: vi.fn(),
	remove: vi.fn(),
	copyFile: vi.fn(),
	readDir: vi.fn(async () => []),
}));

vi.mock('#lib/contracts/ipc.js', () => ({
	call: vi.fn(async () => undefined),
	listen: vi.fn(async () => () => {}),
}));

import { writeTextFile } from '@tauri-apps/plugin-fs';
import { notifyAfterSave, resetHooks } from '#lib/core/editor/editor.hooks.js';
import { parseFrontmatterProperties } from '#lib/core/frontmatter/properties.logic.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { autoMoveStore } from '#lib/features/auto-move/auto-move.store.svelte.js';
import { registerAutoMoveHook, resetAutoMove } from '#lib/features/auto-move/auto-move.service.js';
import type { AutoMoveRule } from '#lib/features/auto-move/auto-move.types.js';
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

describe('auto-move rule writes never schedule another run', () => {
	let unsubscribe: () => void;

	beforeEach(() => {
		vi.useFakeTimers();
		files.clear();
		vi.mocked(writeTextFile).mockClear();
		resetHooks();
		resetAutoMove();
		clearLocalStorage();
		settingsStore.updateAutoMove({ enabled: true, debounceMs: DEBOUNCE });
		vaultStore.open('/vault');
		unsubscribe = registerAutoMoveHook();
	});

	afterEach(() => {
		unsubscribe();
		resetAutoMove();
		resetHooks();
		vaultStore.close();
		vi.useRealTimers();
	});

	function setRules(rules: AutoMoveRule[]): void {
		autoMoveStore.setConfig({ rules, excludedFolders: [] });
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
