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
import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';
import { preloadPacks } from '#lib/features/file-icons/file-icons.icon-data.js';
import { lifecycleFilterStore } from '#lib/features/properties/lifecycle-filter.store.svelte.js';
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

		await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to create file: disk full'));
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
			await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to create file: disk full'));
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

	/** Command item labels, in rendered order. */
	function itemLabels(): string[] {
		return [...document.querySelectorAll<HTMLElement>('[data-slot="command-item"]')].map((el) => el.textContent ?? '');
	}

	/** The rendered "Create" item, or undefined. */
	function createItem(): HTMLElement | undefined {
		return [...document.querySelectorAll<HTMLElement>('[data-slot="command-item"]')].find((el) =>
			el.textContent?.includes('Create "'),
		);
	}

	/** Presses Shift+Enter in `input`, after the same macrotask as `pressEnter`. */
	async function pressShiftEnter(input: HTMLInputElement): Promise<void> {
		await new Promise((resolve) => setTimeout(resolve, 0));
		input.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true, cancelable: true }),
		);
		flushSync();
	}

	/** Every invoked command name, in order. */
	function invokedCommands(): string[] {
		return vi.mocked(invoke).mock.calls.map(([cmd]) => cmd);
	}

	it('renders the Create row after the matches and opens the first match on Enter', async () => {
		fsStore.setFileTree([{ name: 'Ideas.md', path: '/vault/Ideas.md', isDirectory: false }]);
		flushSync();
		const input = typeQuery('Idea');

		const labels = itemLabels();
		expect(labels).toHaveLength(2);
		expect(labels[0]).toContain('Ideas');
		expect(labels[1]).toContain('Create "Idea"');
		await pressEnter(input);

		await vi.waitFor(() => expect(openFileInEditor).toHaveBeenCalledWith('/vault/Ideas.md'));
		expect(invokedCommands()).not.toContain('create_note');
		expect(quickSwitcherStore.isOpen).toBe(false);
	});

	it('creates and opens the typed note on Shift+Enter while a note matches', async () => {
		fsStore.setFileTree([{ name: 'Ideas.md', path: '/vault/Ideas.md', isDirectory: false }]);
		flushSync();
		const input = typeQuery('Idea');

		await pressShiftEnter(input);

		await vi.waitFor(() => expect(openFileInEditor).toHaveBeenCalledWith('/vault/Idea.md'));
		expect(openFileInEditor).not.toHaveBeenCalledWith('/vault/Ideas.md');
		expect(quickSwitcherStore.isOpen).toBe(false);
	});

	it('offers no Create row when a note with that exact name exists in the target folder', async () => {
		vi.mocked(readDir).mockResolvedValue([{ name: 'Ideas.md', isDirectory: false, isFile: true, isSymlink: false }]);
		fsStore.setFileTree([{ name: 'Ideas.md', path: '/vault/Ideas.md', isDirectory: false }]);
		flushSync();
		const input = typeQuery('ideas');

		expect(createItem()).toBeUndefined();
		await pressShiftEnter(input);

		await vi.waitFor(() => expect(openFileInEditor).toHaveBeenCalledWith('/vault/Ideas.md'));
		expect(invokedCommands()).not.toContain('create_note');
	});

	it('lists the existing note a folder path names, and opens it on Enter', async () => {
		fsStore.setFileTree([
			{
				name: 'Projects',
				path: '/vault/Projects',
				isDirectory: true,
				children: [{ name: 'Idea.md', path: '/vault/Projects/Idea.md', isDirectory: false }],
			},
		]);
		flushSync();
		const input = typeQuery('Projects/Idea');

		expect(createItem()).toBeUndefined();
		const labels = itemLabels();
		expect(labels).toHaveLength(1);
		expect(labels[0]).toContain('Idea');
		expect(labels[0]).toContain('Projects');
		expect(document.body.textContent).not.toContain('No files found.');
		await pressEnter(input);

		await vi.waitFor(() => expect(openFileInEditor).toHaveBeenCalledWith('/vault/Projects/Idea.md'));
		expect(invokedCommands()).not.toContain('create_note');
	});

	it('labels the Create row with its target folder', () => {
		typeQuery('Projects/Idea');
		expect(createItem()?.textContent).toContain('in Projects');

		typeQuery('Idea');
		expect(createItem()?.textContent).toContain('in vault root');
	});

	it('creates the typed folder before the note in it, and opens the note', async () => {
		createFromQuery('Projects/Idea');

		await vi.waitFor(() => expect(openFileInEditor).toHaveBeenCalledWith('/vault/Projects/Idea.md'));
		const calls = vi.mocked(invoke).mock.calls;
		const folderAt = calls.findIndex(([cmd, args]) => cmd === 'create_folder' && (args as { path: string }).path === '/vault/Projects');
		const noteAt = calls.findIndex(([cmd, args]) => cmd === 'create_note' && (args as { path: string }).path === '/vault/Projects/Idea.md');
		expect(folderAt).toBeGreaterThanOrEqual(0);
		expect(noteAt).toBeGreaterThan(folderAt);
	});

	it('creates every missing level of a nested folder path', async () => {
		createFromQuery('Area/Projects/Idea');

		await vi.waitFor(() => expect(openFileInEditor).toHaveBeenCalledWith('/vault/Area/Projects/Idea.md'));
		expect(vi.mocked(invoke)).toHaveBeenCalledWith('create_folder', { path: '/vault/Area/Projects' });
		const tree = fsStore.fileTree;
		const area = tree.find((n) => n.path === '/vault/Area');
		const projects = area?.children?.find((n) => n.path === '/vault/Area/Projects');
		expect(projects?.children?.map((n) => n.path)).toEqual(['/vault/Area/Projects/Idea.md']);
	});

	it('reuses an existing folder instead of making a renamed copy', async () => {
		// The vault root lists `Projects`, so a path through fs.service `createFolder` would get `Projects 1`.
		vi.mocked(readDir).mockImplementation(async (p) =>
			p === '/vault' ? [{ name: 'Projects', isDirectory: true, isFile: false, isSymlink: false }] : [],
		);
		fsStore.setFileTree([{ name: 'Projects', path: '/vault/Projects', isDirectory: true, children: [] }]);
		flushSync();

		createFromQuery('Projects/Idea');

		await vi.waitFor(() => expect(openFileInEditor).toHaveBeenCalledWith('/vault/Projects/Idea.md'));
		expect(JSON.stringify(vi.mocked(invoke).mock.calls)).not.toContain('Projects 1');
		expect(fsStore.fileTree.filter((n) => n.isDirectory).map((n) => n.path)).toEqual(['/vault/Projects']);
	});

	it('adds the typed folder holding the note to the tree', async () => {
		createFromQuery('Projects/Idea');

		await vi.waitFor(() => expect(openFileInEditor).toHaveBeenCalledWith('/vault/Projects/Idea.md'));
		const projects = fsStore.fileTree.find((n) => n.path === '/vault/Projects');
		expect(projects?.isDirectory).toBe(true);
		expect(projects?.children?.map((n) => n.name)).toEqual(['Idea.md']);
	});

	it('skips create_folder for a note in the vault root', async () => {
		createFromQuery('Idea');

		await vi.waitFor(() => expect(openFileInEditor).toHaveBeenCalledWith('/vault/Idea.md'));
		expect(invokedCommands()).not.toContain('create_folder');
	});

	it.each([
		['Projects//Idea', 'empty'],
		['Projects/', 'empty'],
		['./Idea', '"."'],
		['../Idea', '"."'],
		['.kokobrain/x', '"."'],
		['Projects/.hidden', '"."'],
	])('creates nothing for %s and toasts why', async (query, reason) => {
		createFromQuery(query);

		await vi.waitFor(() => expect(toast.error).toHaveBeenCalledOnce());
		expect(vi.mocked(toast.error).mock.calls[0][0]).toContain(reason);
		expect(invokedCommands()).not.toContain('create_folder');
		expect(invokedCommands()).not.toContain('create_note');
		expect(openFileInEditor).not.toHaveBeenCalled();
	});

	it('toasts the reason when the folder cannot be created', async () => {
		vi.mocked(invoke).mockImplementation(async (cmd) => {
			if (cmd === 'create_folder') throw 'Permission denied';
		});
		vi.spyOn(console, 'error').mockImplementation(() => {});

		createFromQuery('Projects/Idea');

		await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to create file: Permission denied'));
		expect(invokedCommands()).not.toContain('create_note');
		expect(openFileInEditor).not.toHaveBeenCalled();
	});

	it('shows the Shift+Enter Create hint in the footer', () => {
		quickSwitcherStore.open();
		flushSync();
		const footer = document.querySelector('[data-slot="command-dialog-footer"]');
		expect(footer).not.toBeNull();
		expect([...footer!.querySelectorAll('kbd')].map((k) => k.textContent)).toContain('⇧↵');
		expect(footer!.textContent).toContain('Create');
	});
});

describe('QuickSwitcher - rows', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		vi.resetAllMocks();
		clearLocalStorage();
		fsStore.reset();
		fileIconsStore.reset();
		lifecycleFilterStore.reset();
		quickSwitcherStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
		fsStore.setFileTree([
			{
				name: 'Projects',
				path: '/vault/Projects',
				isDirectory: true,
				children: [{ name: 'A.md', path: '/vault/Projects/A.md', isDirectory: false }],
			},
			{ name: 'Board.canvas', path: '/vault/Board.canvas', isDirectory: false },
			{ name: 'Tasks.kanban', path: '/vault/Tasks.kanban', isDirectory: false },
			{ name: 'Welcome.md', path: '/vault/Welcome.md', isDirectory: false },
		]);
		target = document.body.appendChild(document.createElement('div'));
		component = mount(QuickSwitcher, { target });
		flushSync();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		fileIconsStore.reset();
		lifecycleFilterStore.reset();
		vaultStore._reset();
	});

	/** Opens the switcher and types `query` (empty leaves the input blank). */
	function open(query = ''): HTMLInputElement {
		quickSwitcherStore.open();
		flushSync();
		const input = document.querySelector<HTMLInputElement>('[data-slot="command-input"]')!;
		if (query) {
			input.value = query;
			input.dispatchEvent(new Event('input', { bubbles: true }));
			flushSync();
		}
		return input;
	}

	/** The row whose name reads `name`. */
	function row(name: string): HTMLElement {
		const found = [...document.querySelectorAll<HTMLElement>('[data-slot="command-item"]')].find(
			(el) => el.querySelector('[data-quick-switcher-name]')?.textContent === name,
		);
		if (!found) throw new Error(`Row ${name} not found`);
		return found;
	}

	/** Texts of the group headings, in order. */
	function headingTexts(): string[] {
		return [...document.querySelectorAll('[data-command-group-heading]')].map((el) => el.textContent?.trim() ?? '');
	}

	/** Name of the highlighted row. */
	function selectedName(): string | undefined {
		return document.querySelector('[data-slot="command-item"][aria-selected="true"] [data-quick-switcher-name]')?.textContent ?? undefined;
	}

	it('shows the kind icon of a canvas and a kanban file, not the note icon', () => {
		open();

		expect(row('Board').querySelector('svg.lucide-layout-dashboard')).not.toBeNull();
		expect(row('Board').querySelector('svg.lucide-file-text')).toBeNull();
		expect(row('Tasks').querySelector('svg.lucide-kanban')).not.toBeNull();
		expect(row('Tasks').querySelector('svg.lucide-file-text')).toBeNull();
		expect(row('Welcome').querySelector('svg.lucide-file-text')).not.toBeNull();
	});

	it("shows a note's own frontmatter icon instead of the kind icon", async () => {
		await preloadPacks(['emoji']);
		fileIconsStore.updateFrontmatterIcon('/vault/Welcome.md', { iconPack: 'emoji', iconName: '🚀' });
		open();

		const emoji = [...row('Welcome').querySelectorAll('span')].find((s) => s.childElementCount === 0 && s.textContent === '🚀');
		expect(emoji).toBeDefined();
		expect(row('Welcome').querySelector('svg.lucide-file-text')).toBeNull();
	});

	it('shows only the folder of a nested note, and none for a root note', () => {
		open();

		expect(row('A').querySelector('[data-quick-switcher-folder]')?.textContent?.trim()).toBe('Projects');
		expect(row('A').textContent).not.toContain('.md');
		expect(row('Welcome').querySelector('[data-quick-switcher-folder]')).toBeNull();
		expect(row('Welcome').textContent).not.toContain('Welcome.md');
	});

	it('marks an archived note with an Archived tag and no dimmed name', () => {
		lifecycleFilterStore.setArchivedPaths(new Set(['/vault/Welcome.md']));
		open();

		const archived = row('Welcome');
		expect(archived.querySelector('[data-quick-switcher-archived]')?.textContent?.trim()).toBe('Archived');
		expect(archived.querySelector('.opacity-50')).toBeNull();
		expect(archived.querySelector('svg.lucide-archive')).toBeNull();
		expect(row('Board').querySelector('[data-quick-switcher-archived]')).toBeNull();
	});

	it('wraps the matched characters in highlight elements and keeps the option text', () => {
		open('wel');

		const welcome = row('Welcome');
		expect([...welcome.querySelectorAll('mark')].map((m) => m.textContent)).toEqual(['Wel']);
		expect(welcome.getAttribute('role')).toBe('option');
		expect(welcome.querySelector('[data-quick-switcher-name]')?.textContent).toBe('Welcome');
	});

	it('highlights nothing for an empty query', () => {
		open();
		expect(document.querySelectorAll('[data-slot="command-item"] mark')).toHaveLength(0);
	});

	it('heads the recents "Recent notes" and leaves the rest unheaded', () => {
		quickSwitcherStore.addRecentPath('/vault/Tasks.kanban');
		open();

		expect(headingTexts()).toEqual(['Recent notes']);
		const groups = document.querySelectorAll('[data-slot="command-group"]');
		expect(groups).toHaveLength(2);
		expect([...groups[0].querySelectorAll('[data-quick-switcher-name]')].map((el) => el.textContent)).toEqual(['Tasks']);
		expect(groups[1].querySelector('[data-command-group-heading]')).toBeNull();
		expect([...groups[1].querySelectorAll('[data-quick-switcher-name]')].map((el) => el.textContent)).toEqual([
			'A',
			'Board',
			'Welcome',
		]);
	});

	it('shows no heading without recents', () => {
		open();
		expect(headingTexts()).toEqual([]);
	});

	it('shows no heading once a query is typed', () => {
		quickSwitcherStore.addRecentPath('/vault/Tasks.kanban');
		open('a');
		expect(headingTexts()).toEqual([]);
	});

	it('moves the highlight across the Recent notes boundary with the arrow keys', async () => {
		quickSwitcherStore.addRecentPath('/vault/Tasks.kanban');
		const input = open();
		await vi.waitFor(() => expect(selectedName()).toBe('Tasks'));

		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
		flushSync();
		expect(selectedName()).toBe('A');

		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
		flushSync();
		expect(selectedName()).toBe('Tasks');
	});
});
