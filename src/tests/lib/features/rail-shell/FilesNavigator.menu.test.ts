// @vitest-environment jsdom
// The Files navigator's folder menu over the real fs.service, path-change owner,
// stores and rail registry: every item, the inline rename, the failure toasts,
// drag to move and folder notes. Only the Tauri boundary (invoke, plugin-fs, dialog, opener, trash)
// and the editor are mocked.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// The icon picker's scroll area observes its size; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
} as unknown as typeof ResizeObserver;

vi.mock('svelte-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	mkdir: vi.fn(),
	remove: vi.fn(),
	rename: vi.fn(),
	exists: vi.fn(),
	copyFile: vi.fn(),
	readDir: vi.fn(),
}));
vi.mock('@tauri-apps/plugin-opener', () => ({ revealItemInDir: vi.fn() }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn() }));
vi.mock('#lib/core/trash/trash.service.js', () => ({ moveToTrash: vi.fn() }));
vi.mock('#lib/core/editor/editor.service.js', () => ({
	openFileInEditor: vi.fn(),
	closeTabsForDeletedPath: vi.fn(() => []),
	syncExternalContentToEditor: vi.fn(),
}));
vi.mock('#lib/features/file-icons/file-icons.icon-data.js', () => ({
	getIconSync: vi.fn(),
	getAllIconPacks: vi.fn(() => []),
	getIconsForPack: vi.fn(() => []),
	preloadPacks: vi.fn(),
	setOnPacksLoaded: vi.fn(),
}));
vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));

import { mount, unmount, flushSync, tick } from 'svelte';
import FilePlus from '@lucide/svelte/icons/file-plus';
import { toast } from 'svelte-sonner';
import { invoke } from '@tauri-apps/api/core';
import { exists, readDir, readTextFile, rename, writeTextFile } from '@tauri-apps/plugin-fs';
import { ask } from '@tauri-apps/plugin-dialog';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { moveToTrash } from '#lib/core/trash/trash.service.js';
import { getAllIconPacks, getIconsForPack } from '#lib/features/file-icons/file-icons.icon-data.js';
import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import FilesNavigator from '#lib/features/rail-shell/FilesNavigator.svelte';
import { pickedFolderLens, parseExpandedFolders, toggleExpandedFolder } from '#lib/features/rail-shell/lens.logic.js';
import { registerFilesNavigatorPathChangeConsumer } from '#lib/features/rail-shell/files-navigator.service.js';
import { railRegistryStore } from '#lib/features/rail-shell/rail-registry.store.svelte.js';
import { registerKanbanFolderCreator } from '#lib/plugins/kanban/kanban.service.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
import { PreDeleteSaveError } from '#lib/core/filesystem/fs.logic.js';

const VAULT = '/vault';
const WORK = `${VAULT}/Work`;
const PROJECTS = `${WORK}/projects`;
const PERSONAL = `${VAULT}/Personal`;

const file = (path: string): FileTreeNode => ({ name: path.split('/').pop()!, path, isDirectory: false });
const dir = (path: string, children: FileTreeNode[] = []): FileTreeNode => ({
	name: path.split('/').pop()!,
	path,
	isDirectory: true,
	children,
});

/** What `scan_vault` returns: the tests change it to mirror a disk operation. */
let diskTree: FileTreeNode[] = [];
let component: ReturnType<typeof mount> | null = null;
let target: HTMLElement;
const offs: (() => void)[] = [];

/** Mounts the navigator wired to the layout settings, as AppShell does. */
function render() {
	component = mount(FilesNavigator, {
		target,
		props: {
			get picked() {
				return pickedFolderLens(settingsStore.layout.railFolder);
			},
			get expanded() {
				return parseExpandedFolders(settingsStore.layout.railExpandedFolders);
			},
			onPick: (lens) => settingsStore.updateLayout({ railFolder: lens.target ?? null }),
			onToggle: (path) =>
				settingsStore.updateLayout({ railExpandedFolders: toggleExpandedFolder(settingsStore.layout.railExpandedFolders, path) }),
			onPickView: vi.fn(),
		},
	});
	flushSync();
}

const row = (path: string) => target.querySelector<HTMLElement>(`[data-files-navigator-row="${path}"]`)!;
const root = () => target.querySelector<HTMLElement>('[data-files-navigator-root]')!;
const renameInput = (path: string) => target.querySelector<HTMLInputElement>(`[data-files-navigator-rename="${path}"]`);

/** Right-clicks `el` and returns the labels of the rendered menu items. */
async function openMenu(el: Element): Promise<string[]> {
	el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }));
	await tick();
	return vi.waitFor(() => {
		const items = [...document.querySelectorAll('[role="menuitem"]')].map((n) => n.textContent?.trim() ?? '');
		if (items.length === 0) throw new Error('menu not rendered');
		return items;
	});
}

/** Right-clicks `el` and clicks the menu item labelled `label`. */
async function choose(el: Element, label: string) {
	await openMenu(el);
	const item = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
		(n) => n.textContent?.trim() === label,
	);
	if (!item) throw new Error(`menu item "${label}" not rendered`);
	item.click();
	await tick();
}

/** Types `value` into the open rename input and presses Enter. */
async function typeRename(path: string, value: string) {
	const input = await vi.waitFor(() => {
		const el = renameInput(path);
		if (!el) throw new Error('rename input not rendered');
		return el;
	});
	input.value = value;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
	flushSync();
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.spyOn(console, 'error').mockImplementation(() => {});
	settingsStore.reset();
	fsStore.reset();
	vaultStore._reset();
	vaultStore.open(VAULT);
	railRegistryStore.reset();
	fileIconsStore.reset();
	diskTree = [dir(WORK, [dir(PROJECTS)]), dir(PERSONAL)];
	fsStore.setFileTree(diskTree);
	vi.mocked(invoke).mockImplementation(async (cmd) => (cmd === 'scan_vault' ? diskTree : undefined));
	vi.mocked(readDir).mockResolvedValue([]);
	vi.mocked(exists).mockResolvedValue(false);
	vi.mocked(rename).mockResolvedValue(undefined);
	vi.mocked(moveToTrash).mockResolvedValue(true);
	offs.push(registerFilesNavigatorPathChangeConsumer(), registerKanbanFolderCreator());
	target = document.body.appendChild(document.createElement('div'));
});

afterEach(() => {
	if (component) unmount(component);
	component = null;
	for (const off of offs.splice(0)) off();
	document.body.replaceChildren();
	vaultStore.close();
	vi.restoreAllMocks();
});

describe('FilesNavigator folder menu', () => {
	it('offers the folder operations on a folder row, the kanban item from the plugin registry', async () => {
		render();
		expect(await openMenu(row(WORK))).toEqual([
			'New note',
			'New Canvas',
			'New Collection',
			'New Kanban Board',
			'New view',
			'New folder',
			'Change icon',
			'Copy path',
			'Reveal in Finder',
			'Rename',
			'Move to Trash',
		]);
	});

	it('offers only the create items on the vault root, which cannot be renamed or trashed', async () => {
		render();
		expect(await openMenu(root())).toEqual(['New note', 'New Canvas', 'New Collection', 'New Kanban Board', 'New view', 'New folder']);
	});

	it('offers the create items on an empty vault', async () => {
		diskTree = [];
		fsStore.setFileTree([]);
		render();
		expect(await openMenu(target.querySelector('[data-files-navigator-tree]')!)).toContain('New note');
	});

	it('creates a note in the folder, picks the folder and opens the note', async () => {
		render();
		await choose(row(WORK), 'New note');

		await vi.waitFor(() => expect(openFileInEditor).toHaveBeenCalledWith(`${WORK}/Untitled.md`));
		expect(invoke).toHaveBeenCalledWith('create_note', { path: `${WORK}/Untitled.md`, content: '' });
		expect(settingsStore.layout.railFolder).toBe(WORK);
	});

	it('creates the note unorganized while Explicit organization is on', async () => {
		settingsStore.setSettings({ ...settingsStore.settings, explicitOrganization: true });
		render();
		await choose(row(WORK), 'New note');

		await vi.waitFor(() => expect(openFileInEditor).toHaveBeenCalledWith(`${WORK}/Untitled.md`));
		expect(invoke).toHaveBeenCalledWith('create_note', { path: `${WORK}/Untitled.md`, content: '---\n_organized: false\n---\n' });
	});

	it.each([
		['New Canvas', 'Untitled.canvas'],
		['New Collection', 'Untitled.collection'],
		['New Kanban Board', 'Untitled.kanban'],
	])('"%s" creates %s in the folder and opens it', async (label, fileName) => {
		render();
		await choose(row(PERSONAL), label);

		await vi.waitFor(() => expect(openFileInEditor).toHaveBeenCalledWith(`${PERSONAL}/${fileName}`));
		expect(invoke).toHaveBeenCalledWith('create_note', expect.objectContaining({ path: `${PERSONAL}/${fileName}` }));
		expect(settingsStore.layout.railFolder).toBe(PERSONAL);
	});

	it('a note created on the vault root picks the root', async () => {
		settingsStore.updateLayout({ railFolder: WORK });
		render();
		await choose(root(), 'New note');

		await vi.waitFor(() => expect(openFileInEditor).toHaveBeenCalledWith(`${VAULT}/Untitled.md`));
		expect(settingsStore.layout.railFolder).toBeNull();
	});

	it.each([
		['New note', 'Untitled.md'],
		['New Canvas', 'Untitled.canvas'],
		['New Collection', 'Untitled.collection'],
		['New Kanban Board', 'Untitled.kanban'],
		['New folder', 'Untitled'],
	])('toasts when "%s" fails, and opens and picks nothing', async (label, fileName) => {
		vi.mocked(invoke).mockRejectedValue('Permission denied (os error 13)');
		render();
		await choose(row(PERSONAL), label);

		await vi.waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith(`Could not create "${fileName}": Permission denied (os error 13)`),
		);
		expect(openFileInEditor).not.toHaveBeenCalled();
		expect(settingsStore.layout.railFolder).toBeNull();
		expect(target.querySelector('[data-files-navigator-rename]')).toBeNull();
	});

	it('creates a folder, expands its parent and starts renaming the new row', async () => {
		render();
		await choose(row(WORK), 'New folder');
		diskTree = [dir(WORK, [dir(PROJECTS), dir(`${WORK}/Untitled`)]), dir(PERSONAL)];

		await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith('create_folder', { path: `${WORK}/Untitled` }));
		await vi.waitFor(() => expect(renameInput(`${WORK}/Untitled`)?.value).toBe('Untitled'));
		// Same row role as the tree rows and the note list's rename input.
		expect(renameInput(`${WORK}/Untitled`)!.classList).toContain('text-row');
		expect(settingsStore.layout.railExpandedFolders).toEqual([WORK]);
	});

	it('renames the picked folder inline; it stays picked under its new path and its expanded state follows', async () => {
		settingsStore.updateLayout({ railFolder: WORK, railExpandedFolders: [WORK] });
		vi.mocked(rename).mockImplementation(async () => {
			diskTree = [dir(`${VAULT}/Job`, [dir(`${VAULT}/Job/projects`)]), dir(PERSONAL)];
		});
		render();
		await choose(row(WORK), 'Rename');
		await typeRename(WORK, 'Job');

		await vi.waitFor(() => expect(row(`${VAULT}/Job`)).not.toBeNull());
		expect(rename).toHaveBeenCalledWith(WORK, `${VAULT}/Job`);
		expect(settingsStore.layout.railFolder).toBe(`${VAULT}/Job`);
		expect(settingsStore.layout.railExpandedFolders).toEqual([`${VAULT}/Job`]);
		const picked = target.querySelector(`[data-files-navigator-folder="${VAULT}/Job"]`)!;
		expect(picked.getAttribute('aria-current')).toBe('true');
		expect(row(`${VAULT}/Job/projects`)).not.toBeNull();
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('toasts a rename onto an existing name and leaves the folder and the pick alone', async () => {
		settingsStore.updateLayout({ railFolder: WORK });
		vi.mocked(exists).mockResolvedValue(true);
		render();
		await choose(row(WORK), 'Rename');
		await typeRename(WORK, 'Personal');

		await vi.waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith('Could not rename "Work": "Personal" already exists in this folder'),
		);
		expect(rename).not.toHaveBeenCalled();
		expect(settingsStore.layout.railFolder).toBe(WORK);
		expect(row(WORK)).not.toBeNull();
	});

	it('toasts an invalid name without touching the disk', async () => {
		render();
		await choose(row(WORK), 'Rename');
		await typeRename(WORK, 'a/b');

		expect(toast.error).toHaveBeenCalledWith('Could not rename "Work": Name cannot contain "/"');
		expect(exists).not.toHaveBeenCalled();
		expect(rename).not.toHaveBeenCalled();
		expect(renameInput(WORK)).toBeNull();
	});

	it('toasts a rename the disk refuses', async () => {
		vi.mocked(rename).mockRejectedValue('Permission denied (os error 13)');
		render();
		await choose(row(WORK), 'Rename');
		await typeRename(WORK, 'Job');

		await vi.waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith('Could not rename "Work": Permission denied (os error 13)'),
		);
	});

	it('treats an empty or unchanged name, and Escape, as a cancel', async () => {
		render();
		await choose(row(WORK), 'Rename');
		await typeRename(WORK, '  ');
		await choose(row(WORK), 'Rename');
		await typeRename(WORK, 'Work');
		await choose(row(WORK), 'Rename');
		const input = await vi.waitFor(() => renameInput(WORK)!);
		input.value = 'Job';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		flushSync();
		input.dispatchEvent(new FocusEvent('blur'));

		expect(renameInput(WORK)).toBeNull();
		expect(exists).not.toHaveBeenCalled();
		expect(rename).not.toHaveBeenCalled();
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('moves the picked folder to the Trash after asking; the pick goes back to the vault root', async () => {
		settingsStore.updateLayout({ railFolder: PROJECTS, railExpandedFolders: [WORK] });
		vi.mocked(ask).mockResolvedValue(true);
		render();
		await choose(row(WORK), 'Move to Trash');
		diskTree = [dir(PERSONAL)];

		await vi.waitFor(() => expect(moveToTrash).toHaveBeenCalledWith(VAULT, WORK, true));
		expect(ask).toHaveBeenCalledWith('Move "Work" to trash? This will include all contents.', {
			title: 'Move to Trash',
			kind: 'warning',
			okLabel: 'Move to Trash',
			cancelLabel: 'Cancel',
		});
		await vi.waitFor(() => expect(row(WORK)).toBeNull());
		expect(settingsStore.layout.railFolder).toBeNull();
		expect(settingsStore.layout.railExpandedFolders).toEqual([]);
		expect(root().getAttribute('aria-current')).toBe('true');
	});

	it('toasts when moving a folder to the Trash fails, and keeps the pick', async () => {
		settingsStore.updateLayout({ railFolder: WORK });
		vi.mocked(ask).mockResolvedValue(true);
		vi.mocked(moveToTrash).mockRejectedValue(new Error('trash is not writable'));
		render();
		await choose(row(WORK), 'Move to Trash');

		await vi.waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith('Could not move "Work" to the Trash: trash is not writable'),
		);
		expect(settingsStore.layout.railFolder).toBe(WORK);
	});

	it('adds no toast of its own when the pre-delete save failed (the editor already showed one)', async () => {
		vi.mocked(ask).mockResolvedValue(true);
		vi.mocked(moveToTrash).mockRejectedValue(new PreDeleteSaveError(WORK));
		render();
		await choose(row(WORK), 'Move to Trash');
		await vi.waitFor(() => expect(moveToTrash).toHaveBeenCalled());
		await tick();

		expect(toast.error).not.toHaveBeenCalled();
	});

	it('does nothing when the Trash confirmation is declined', async () => {
		vi.mocked(ask).mockResolvedValue(false);
		render();
		await choose(row(WORK), 'Move to Trash');
		await vi.waitFor(() => expect(ask).toHaveBeenCalled());
		await tick();

		expect(moveToTrash).not.toHaveBeenCalled();
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('reveals the folder in Finder', async () => {
		render();
		await choose(row(PERSONAL), 'Reveal in Finder');
		await vi.waitFor(() => expect(revealItemInDir).toHaveBeenCalledWith(PERSONAL));
	});

	it.each([
		['Copy absolute path', PROJECTS],
		['Copy relative path', 'Work/projects'],
	])('"%s" copies the folder path', async (label, expected) => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
		settingsStore.updateLayout({ railExpandedFolders: [WORK] });
		render();
		await choose(row(PROJECTS), 'Copy path');
		const item = await vi.waitFor(() => {
			const found = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((n) => n.textContent?.trim() === label);
			if (!found) throw new Error(`${label} not rendered`);
			return found;
		});
		item.click();

		await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith(expected));
	});

	it('toasts when the clipboard refuses the path', async () => {
		const writeText = vi.fn().mockRejectedValue(new Error('clipboard denied'));
		Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
		render();
		await choose(row(PERSONAL), 'Copy path');
		const item = await vi.waitFor(() => {
			const found = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
				(n) => n.textContent?.trim() === 'Copy absolute path',
			);
			if (!found) throw new Error('Copy absolute path not rendered');
			return found;
		});
		item.click();

		await vi.waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith('Could not copy the path of "Personal": clipboard denied'),
		);
	});

	it('a plugin creator labelled like a built-in one renders next to it', async () => {
		offs.push(
			railRegistryStore.registerFolderCreator({
				id: 'other-note',
				label: 'New note',
				icon: FilePlus,
				fileName: 'Other.md',
				create: async (d) => `${d}/Other.md`,
			}),
		);
		render();
		const labels = await openMenu(row(WORK));
		expect(labels.filter((l) => l === 'New note')).toHaveLength(2);
	});

	it('keeps the rename input on the region tokens, with no hard-coded colors', async () => {
		render();
		await choose(row(WORK), 'Rename');
		const input = await vi.waitFor(() => renameInput(WORK)!);
		expect(input.className).toContain('text-file-explorer-fg');
		expect(target.innerHTML).not.toMatch(/#[0-9a-f]{3,6}\b|rgb\(/i);
	});

	it('opens the icon picker for the folder', async () => {
		render();
		await choose(row(PERSONAL), 'Change icon');
		await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).not.toBeNull());
	});

	it('sets the picked icon on the folder through its folder note, then removes it', async () => {
		const notePath = `${PERSONAL}/Personal.md`;
		let noteContent: string | null = null;
		vi.mocked(getAllIconPacks).mockReturnValue([{ id: 'lucide', label: 'Lucide' }]);
		vi.mocked(getIconsForPack).mockResolvedValue([
			{ name: 'star', pack: 'lucide', svgContent: '<path d="M0 0"/>', viewBox: '0 0 24 24', keywords: [] },
		]);
		vi.mocked(exists).mockImplementation(async (p) => p === notePath && noteContent !== null);
		vi.mocked(readTextFile).mockImplementation(async () => noteContent ?? '');
		vi.mocked(writeTextFile).mockImplementation(async (p, content) => {
			if (p === notePath) noteContent = content as string;
		});
		render();

		await choose(row(PERSONAL), 'Change icon');
		const star = await vi.waitFor(() => {
			const btn = document.querySelector<HTMLElement>('button[title="star (lucide)"]');
			if (!btn) throw new Error('icon not rendered');
			return btn;
		});
		star.click();

		await vi.waitFor(() => expect(fileIconsStore.getFrontmatterIcon(PERSONAL)?.iconName).toBe('star'));
		expect(fileIconsStore.getFrontmatterIcon(PERSONAL)?.iconPack).toBe('lucide');
		expect(noteContent).toContain('_icon: lucide:star');

		await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
		await choose(row(PERSONAL), 'Change icon');
		const remove = await vi.waitFor(() => {
			const btn = [...document.querySelectorAll<HTMLElement>('button')].find((b) => b.textContent?.trim() === 'Remove custom icon');
			if (!btn) throw new Error('remove not rendered');
			return btn;
		});
		remove.click();

		await vi.waitFor(() => expect(fileIconsStore.getFrontmatterIcon(PERSONAL)).toBeUndefined());
		expect(noteContent).not.toContain('_icon');
	});

	/** The two swatches titled `name`: the Icon row's, then the Text row's. */
	const swatch = (name: string, row: 0 | 1) => document.querySelectorAll<HTMLElement>(`button[title="${name}"]`)[row];

	it('saves a text color picked for a folder with no icon to its folder note, creating it', async () => {
		const notePath = `${PERSONAL}/Personal.md`;
		let noteContent: string | null = null;
		vi.mocked(exists).mockImplementation(async (p) => p === notePath && noteContent !== null);
		vi.mocked(readTextFile).mockImplementation(async () => noteContent ?? '');
		vi.mocked(writeTextFile).mockImplementation(async (p, content) => {
			if (p === notePath) noteContent = content as string;
		});
		render();

		await choose(row(PERSONAL), 'Change icon');
		await vi.waitFor(() => expect(swatch('Green', 1)).toBeDefined());
		swatch('Green', 1).click();

		await vi.waitFor(() => expect(fileIconsStore.getFrontmatterIcon(PERSONAL)?.titleColor).toBe('#22c55e'));
		expect(fileIconsStore.getFrontmatterIcon(notePath)?.titleColor).toBe('#22c55e');
		expect(noteContent).toContain('_title_color');
		expect(noteContent).not.toContain('_icon');
	});

	it('creates no folder note when the Default swatch is clicked on a folder without one', async () => {
		vi.mocked(exists).mockResolvedValue(false);
		render();

		await choose(row(PERSONAL), 'Change icon');
		await vi.waitFor(() => expect(swatch('Default', 1)).toBeDefined());
		swatch('Default', 1).click();
		// exists is what the save asks first; the await lets the rest of the handler run.
		await vi.waitFor(() => expect(exists).toHaveBeenCalledWith(`${PERSONAL}/Personal.md`));
		await tick();

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(fileIconsStore.getFrontmatterIcon(PERSONAL)).toBeUndefined();
	});
});

/** Dispatches a drag event of `type` on `el` whose payload is `payload`; returns the event. */
function drag(el: Element, type: 'dragstart' | 'dragover' | 'dragleave' | 'drop', payload = '') {
	const data = { payload, effectAllowed: '', dropEffect: '' };
	const event = new Event(type, { bubbles: true, cancelable: true }) as DragEvent;
	Object.defineProperty(event, 'dataTransfer', {
		value: {
			getData: () => data.payload,
			setData: (_format: string, value: string) => {
				data.payload = value;
			},
			get effectAllowed() {
				return data.effectAllowed;
			},
			set effectAllowed(v: string) {
				data.effectAllowed = v;
			},
			get dropEffect() {
				return data.dropEffect;
			},
			set dropEffect(v: string) {
				data.dropEffect = v;
			},
		},
	});
	el.dispatchEvent(event);
	flushSync();
	return { event, data };
}

describe('FilesNavigator drag to move', () => {
	const NOTE = `${PERSONAL}/Note.md`;

	it('a folder row starts a drag carrying its path', () => {
		render();
		const { data } = drag(row(WORK), 'dragstart');
		expect(data.payload).toBe(WORK);
		expect(data.effectAllowed).toBe('move');
		expect(row(WORK).getAttribute('draggable')).toBe('true');
		expect(root().getAttribute('draggable')).not.toBe('true');
	});

	it('a folder row being renamed does not drag', async () => {
		render();
		await choose(row(WORK), 'Rename');
		await vi.waitFor(() => expect(renameInput(WORK)).not.toBeNull());
		expect(row(WORK).getAttribute('draggable')).toBe('false');
		const { event, data } = drag(row(WORK), 'dragstart');
		expect(event.defaultPrevented).toBe(true);
		expect(data.payload).toBe('');
	});

	it('shows the drop look on the hovered folder with the region tokens, and clears it on leave', () => {
		render();
		const { event } = drag(row(PERSONAL), 'dragover', WORK);
		expect(event.defaultPrevented).toBe(true);
		expect(row(PERSONAL).className).toContain('bg-file-explorer-accent/50');
		expect(row(PERSONAL).className).toContain('outline-ring');
		expect(target.innerHTML).not.toMatch(/#[0-9a-f]{3,6}\b|rgb\(/i);
		drag(row(PERSONAL), 'dragleave');
		expect(row(PERSONAL).className).not.toContain('bg-file-explorer-accent/50');
	});

	it('the picked folder under a drag shows only the drop background', () => {
		settingsStore.updateLayout({ railFolder: PERSONAL });
		render();
		expect(row(PERSONAL).className).toContain('bg-file-explorer-primary/25');
		drag(row(PERSONAL), 'dragover', WORK);
		expect(row(PERSONAL).className).toContain('bg-file-explorer-accent/50');
		expect(row(PERSONAL).className).not.toContain('bg-file-explorer-primary/25');
		drag(row(PERSONAL), 'dragleave');
		expect(row(PERSONAL).className).toContain('bg-file-explorer-primary/25');
	});

	it('a note-list row dropped on a folder moves the file there', async () => {
		diskTree = [dir(WORK, [dir(PROJECTS)]), dir(PERSONAL, [file(NOTE)])];
		fsStore.setFileTree(diskTree);
		vi.mocked(rename).mockImplementation(async () => {
			diskTree = [dir(WORK, [dir(PROJECTS), file(`${WORK}/Note.md`)]), dir(PERSONAL)];
		});
		settingsStore.updateLayout({ railFolder: PERSONAL });
		render();
		drag(row(WORK), 'drop', NOTE);

		await vi.waitFor(() => expect(rename).toHaveBeenCalledWith(NOTE, `${WORK}/Note.md`));
		await vi.waitFor(() =>
			expect(fsStore.fileTree[0].children?.map((n) => n.path)).toEqual([PROJECTS, `${WORK}/Note.md`]),
		);
		expect(settingsStore.layout.railFolder).toBe(PERSONAL);
		expect(row(WORK).className).not.toContain('bg-file-explorer-accent/50');
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('a folder dropped on a collapsed folder moves it and expands the target, so the moved row shows', async () => {
		vi.mocked(rename).mockImplementation(async () => {
			diskTree = [dir(WORK, [dir(PROJECTS), dir(`${WORK}/Personal`)])];
		});
		render();
		drag(row(WORK), 'drop', PERSONAL);

		await vi.waitFor(() => expect(row(`${WORK}/Personal`)).not.toBeNull());
		expect(rename).toHaveBeenCalledWith(PERSONAL, `${WORK}/Personal`);
		expect(row(PERSONAL)).toBeNull();
		expect(settingsStore.layout.railExpandedFolders).toEqual([WORK]);
	});

	it('moving the picked folder keeps it picked under its new path, with its expanded state', async () => {
		settingsStore.updateLayout({ railFolder: WORK, railExpandedFolders: [WORK, PERSONAL] });
		vi.mocked(rename).mockImplementation(async () => {
			diskTree = [dir(PERSONAL, [dir(`${PERSONAL}/Work`, [dir(`${PERSONAL}/Work/projects`)])])];
		});
		render();
		drag(row(PERSONAL), 'drop', WORK);

		await vi.waitFor(() => expect(row(`${PERSONAL}/Work`)).not.toBeNull());
		expect(settingsStore.layout.railFolder).toBe(`${PERSONAL}/Work`);
		expect(settingsStore.layout.railExpandedFolders).toEqual([`${PERSONAL}/Work`, PERSONAL]);
		const picked = target.querySelector(`[data-files-navigator-folder="${PERSONAL}/Work"]`)!;
		expect(picked.getAttribute('aria-current')).toBe('true');
		expect(row(`${PERSONAL}/Work/projects`)).not.toBeNull();
	});

	it('a drop on the vault root row moves the item to the root', async () => {
		settingsStore.updateLayout({ railExpandedFolders: [WORK] });
		vi.mocked(rename).mockImplementation(async () => {
			diskTree = [dir(WORK), dir(`${VAULT}/projects`), dir(PERSONAL)];
		});
		render();
		drag(root(), 'drop', PROJECTS);

		await vi.waitFor(() => expect(rename).toHaveBeenCalledWith(PROJECTS, `${VAULT}/projects`));
		await vi.waitFor(() => expect(row(`${VAULT}/projects`)).not.toBeNull());
	});

	it('a move onto an existing name toasts and moves nothing', async () => {
		settingsStore.updateLayout({ railFolder: PERSONAL });
		vi.mocked(exists).mockResolvedValue(true);
		render();
		drag(row(WORK), 'drop', PERSONAL);

		await vi.waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith('Could not move "Personal": "Personal" already exists in this folder'),
		);
		expect(rename).not.toHaveBeenCalled();
		expect(settingsStore.layout.railFolder).toBe(PERSONAL);
		expect(row(PERSONAL)).not.toBeNull();
	});

	it('toasts a move the disk refuses', async () => {
		vi.mocked(rename).mockRejectedValue('Permission denied (os error 13)');
		render();
		drag(row(WORK), 'drop', PERSONAL);

		await vi.waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith('Could not move "Personal": Permission denied (os error 13)'),
		);
	});

	it.each([
		['an empty payload', WORK, ''],
		['a folder onto itself', WORK, WORK],
		['a folder into its own child', PROJECTS, WORK],
		['an item onto the folder it is already in', WORK, PROJECTS],
		['text that is not a vault path', WORK, 'hello world'],
		['an absolute path outside the file tree', WORK, '/elsewhere/Note.md'],
	])('ignores %s', async (_label, onto, payload) => {
		settingsStore.updateLayout({ railExpandedFolders: [WORK] });
		render();
		drag(row(onto), 'drop', payload);
		await tick();

		expect(exists).not.toHaveBeenCalled();
		expect(rename).not.toHaveBeenCalled();
		expect(toast.error).not.toHaveBeenCalled();
	});
});

describe('FilesNavigator folder notes', () => {
	const FOLDER_NOTE = `${WORK}/Work.md`;

	beforeEach(() => {
		diskTree = [dir(WORK, [dir(PROJECTS), file(FOLDER_NOTE)]), dir(PERSONAL, [file(`${PERSONAL}/Other.md`)])];
		fsStore.setFileTree(diskTree);
	});

	const pick = (path: string) => target.querySelector<HTMLElement>(`[data-files-navigator-folder="${path}"]`)!.click();

	it('with folder notes on, picking a folder with a folder note picks it and opens the note', () => {
		render();
		pick(WORK);
		expect(settingsStore.layout.railFolder).toBe(WORK);
		expect(openFileInEditor).toHaveBeenCalledWith(FOLDER_NOTE);
	});

	it('picking a folder without a folder note only picks it', () => {
		render();
		pick(PERSONAL);
		expect(settingsStore.layout.railFolder).toBe(PERSONAL);
		expect(openFileInEditor).not.toHaveBeenCalled();
	});

	it('with folder notes off, picking a folder with a folder note does not open it', () => {
		settingsStore.updateFolderNotes({ enabled: false });
		render();
		pick(WORK);
		expect(settingsStore.layout.railFolder).toBe(WORK);
		expect(openFileInEditor).not.toHaveBeenCalled();
	});

	it('the vault root opens no note', () => {
		diskTree = [...diskTree, file(`${VAULT}/vault.md`)];
		fsStore.setFileTree(diskTree);
		settingsStore.updateLayout({ railFolder: WORK });
		render();
		root().click();
		expect(settingsStore.layout.railFolder).toBeNull();
		expect(openFileInEditor).not.toHaveBeenCalled();
	});
});
