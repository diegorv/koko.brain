// @vitest-environment jsdom
// "Create <query>" in the Quick Switcher through the real fs.service::createFile
// owner; only Tauri, the editor service and the toast are mocked.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-fs', () => ({ readDir: vi.fn(), readTextFile: vi.fn(), exists: vi.fn() }));
vi.mock('#lib/core/editor/editor.service.js', () => ({ openFileInEditor: vi.fn() }));
vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));
vi.mock('svelte-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { mount, unmount, flushSync } from 'svelte';
import { invoke } from '@tauri-apps/api/core';
import { readDir } from '@tauri-apps/plugin-fs';
import { toast } from 'svelte-sonner';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { addNoteCreatedObserver } from '#lib/core/editor/editor.hooks.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import QuickSwitcher from '#lib/features/quick-switcher/QuickSwitcher.svelte';
import { quickSwitcherStore } from '#lib/features/quick-switcher/quick-switcher.store.svelte.js';

// bits-ui's Command scrolls its first item into view; jsdom does not implement it.
Element.prototype.scrollIntoView ??= () => {};

describe('QuickSwitcher - create from the query', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		vi.resetAllMocks();
		clearLocalStorage();
		settingsStore.reset();
		settingsStore.setSettings({ ...settingsStore.settings, explicitOrganization: false });
		fsStore.reset();
		quickSwitcherStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
		vi.mocked(readDir).mockResolvedValue([]);
		vi.mocked(invoke).mockResolvedValue(undefined);
		target = document.body.appendChild(document.createElement('div'));
		component = mount(QuickSwitcher, { target });
		flushSync();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		settingsStore.reset();
		vaultStore._reset();
	});

	/** Opens the switcher, types `query` and clicks its "Create" item. */
	function createFromQuery(query: string): void {
		typeQuery(query);
		const item = [...document.querySelectorAll<HTMLElement>('[data-slot="command-item"]')].find((el) =>
			el.textContent?.includes(`Create "${query}"`),
		);
		if (!item) throw new Error('Create item not found');
		item.click();
	}

	/** Opens the switcher, types `query` and returns the input. */
	function typeQuery(query: string): HTMLInputElement {
		quickSwitcherStore.open();
		flushSync();
		const input = document.querySelector<HTMLInputElement>('input[placeholder="Type a note name..."]');
		if (!input) throw new Error('Quick Switcher input not found');
		input.value = query;
		input.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
		return input;
	}

	/**
	 * Presses Enter in `input`. bits-ui selects the first item a tick after the
	 * items render, so this waits a macrotask first, as a real keypress would.
	 */
	async function pressEnter(input: HTMLInputElement): Promise<void> {
		await new Promise((resolve) => setTimeout(resolve, 0));
		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
		flushSync();
	}

	/** The content `create_note` received. */
	function writtenContent(): string {
		const call = vi.mocked(invoke).mock.calls.find(([cmd]) => cmd === 'create_note');
		return (call![1] as { content: string }).content;
	}

	it('creates an empty note and opens it while Explicit organization is off', async () => {
		createFromQuery('Ideas');

		await vi.waitFor(() => expect(openFileInEditor).toHaveBeenCalledWith('/vault/Ideas.md'));
		expect(writtenContent()).toBe('');
		expect(quickSwitcherStore.isOpen).toBe(false);
	});

	it('marks the note unorganized while Explicit organization is on', async () => {
		settingsStore.setSettings({ ...settingsStore.settings, explicitOrganization: true });

		createFromQuery('Ideas');

		await vi.waitFor(() => expect(openFileInEditor).toHaveBeenCalledWith('/vault/Ideas.md'));
		expect(writtenContent()).toBe('---\n_organized: false\n---\n');
	});

	it('toasts and opens nothing when the note cannot be created', async () => {
		vi.mocked(invoke).mockImplementation(async (cmd) => {
			if (cmd === 'create_note') throw new Error('disk full');
		});
		vi.spyOn(console, 'error').mockImplementation(() => {});

		createFromQuery('Ideas');

		await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to create file.'));
		expect(openFileInEditor).not.toHaveBeenCalled();
	});

	it('reports the created note after opening it', async () => {
		let opened = false;
		vi.mocked(openFileInEditor).mockImplementation(async () => {
			await Promise.resolve();
			opened = true;
		});
		const created: { path: string; opened: boolean }[] = [];
		const unsubscribe = addNoteCreatedObserver((path) => created.push({ path, opened }));

		try {
			createFromQuery('Ideas');
			await vi.waitFor(() => expect(created).toEqual([{ path: '/vault/Ideas.md', opened: true }]));
		} finally {
			unsubscribe();
		}
	});

	it('reports nothing when the note cannot be created', async () => {
		vi.mocked(invoke).mockImplementation(async (cmd) => {
			if (cmd === 'create_note') throw new Error('disk full');
		});
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const observer = vi.fn();
		const unsubscribe = addNoteCreatedObserver(observer);

		try {
			createFromQuery('Ideas');
			await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to create file.'));
		} finally {
			unsubscribe();
		}

		expect(observer).not.toHaveBeenCalled();
	});

	it('creates and opens the note on Enter when nothing matches', async () => {
		const input = typeQuery('Ideas');

		await pressEnter(input);

		await vi.waitFor(() => expect(openFileInEditor).toHaveBeenCalledWith('/vault/Ideas.md'));
		expect(vi.mocked(invoke).mock.calls.some(([cmd]) => cmd === 'create_note')).toBe(true);
		expect(quickSwitcherStore.isOpen).toBe(false);
	});

	it('creates the note typed so far on Enter after the query grew past the first render', async () => {
		const input = typeQuery('Idea');
		await new Promise((resolve) => setTimeout(resolve, 0));
		input.value = 'Ideas';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();

		await pressEnter(input);

		await vi.waitFor(() => expect(openFileInEditor).toHaveBeenCalledWith('/vault/Ideas.md'));
		expect(quickSwitcherStore.isOpen).toBe(false);
	});

	it('creates the note on Enter after a matching query changed to one that matches nothing', async () => {
		fsStore.setFileTree([{ name: 'Alpha.md', path: '/vault/Alpha.md', isDirectory: false }]);
		flushSync();
		const input = typeQuery('Al');
		await new Promise((resolve) => setTimeout(resolve, 0));
		input.value = 'Ideas';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();

		await pressEnter(input);

		await vi.waitFor(() => expect(openFileInEditor).toHaveBeenCalledWith('/vault/Ideas.md'));
		expect(vi.mocked(invoke).mock.calls.some(([cmd]) => cmd === 'create_note')).toBe(true);
		expect(quickSwitcherStore.isOpen).toBe(false);
	});

	it('opens the match on Enter after a query that matched nothing changed to a matching one', async () => {
		fsStore.setFileTree([{ name: 'Alpha.md', path: '/vault/Alpha.md', isDirectory: false }]);
		flushSync();
		const input = typeQuery('Zzz');
		await new Promise((resolve) => setTimeout(resolve, 0));
		input.value = 'Alp';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();

		await pressEnter(input);

		await vi.waitFor(() => expect(openFileInEditor).toHaveBeenCalledWith('/vault/Alpha.md'));
		expect(vi.mocked(invoke).mock.calls.some(([cmd]) => cmd === 'create_note')).toBe(false);
		expect(quickSwitcherStore.isOpen).toBe(false);
	});

	it('offers no create item and opens the first match on Enter when a note matches', async () => {
		fsStore.setFileTree([{ name: 'Ideas.md', path: '/vault/Ideas.md', isDirectory: false }]);
		flushSync();
		const input = typeQuery('Ideas');

		expect(document.body.textContent).not.toContain('Create "Ideas"');
		await pressEnter(input);

		await vi.waitFor(() => expect(openFileInEditor).toHaveBeenCalledWith('/vault/Ideas.md'));
		expect(vi.mocked(invoke).mock.calls.some(([cmd]) => cmd === 'create_note')).toBe(false);
		expect(quickSwitcherStore.isOpen).toBe(false);
	});
});
