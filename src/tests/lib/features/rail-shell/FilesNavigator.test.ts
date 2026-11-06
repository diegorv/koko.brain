// @vitest-environment jsdom
// The Files navigator over the real fs store: the vault root, the folder tree
// (folders only, hidden ones out), the pick and the expand toggle.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('#lib/features/file-icons/file-icons.icon-data.js', () => ({
	getIconSync: vi.fn(),
	getAllIconPacks: vi.fn(() => []),
	getIconsForPack: vi.fn(() => []),
	preloadPacks: vi.fn(),
	setOnPacksLoaded: vi.fn(),
}));

import { mount, unmount, flushSync } from 'svelte';
import FilesNavigator from '#lib/features/rail-shell/FilesNavigator.svelte';
import { FILES_LENS } from '#lib/features/rail-shell/lens.logic.js';
import type { Lens } from '#lib/features/rail-shell/rail-shell.types.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';

const VAULT = '/vault';
const WORK = `${VAULT}/Work`;
const PROJECTS = `${WORK}/projects`;
const ARCHIVE = `${PROJECTS}/archive`;

const file = (path: string): FileTreeNode => ({ name: path.split('/').pop()!, path, isDirectory: false });
const dir = (path: string, children: FileTreeNode[] = []): FileTreeNode => ({
	name: path.split('/').pop()!,
	path,
	isDirectory: true,
	children,
});

const TREE: FileTreeNode[] = [
	dir(`${VAULT}/.obsidian`, [dir(`${VAULT}/.obsidian/plugins`)]),
	dir(WORK, [dir(PROJECTS, [dir(ARCHIVE), file(`${PROJECTS}/Alpha.md`)]), dir(`${WORK}/.trash`), file(`${WORK}/Board.canvas`)]),
	dir(`${VAULT}/Personal`),
	file(`${VAULT}/Welcome.md`),
];

describe('FilesNavigator', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;
	const onPick = vi.fn();
	const onToggle = vi.fn();

	function mountNavigator(picked: Lens = FILES_LENS, expanded: string[] = []) {
		component = mount(FilesNavigator, { target, props: { picked, expanded, onPick, onToggle, onPickView: vi.fn() } });
		flushSync();
	}

	const folderButtons = () => [...target.querySelectorAll<HTMLElement>('[data-files-navigator-folder]')];
	const shownFolders = () => folderButtons().map((el) => el.dataset.filesNavigatorFolder);
	const folder = (path: string) => target.querySelector<HTMLButtonElement>(`[data-files-navigator-folder="${path}"]`)!;
	const toggle = (path: string) => target.querySelector<HTMLButtonElement>(`[data-files-navigator-toggle="${path}"]`);

	beforeEach(() => {
		vaultStore._reset();
		vaultStore.open(VAULT);
		fsStore.reset();
		fsStore.setFileTree(TREE);
		onPick.mockReset();
		onToggle.mockReset();
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	it('shows the vault root, then the top-level folders only, in tree order', () => {
		mountNavigator();
		expect(shownFolders()).toEqual([VAULT, WORK, `${VAULT}/Personal`]);
		expect(target.querySelector('[data-files-navigator-root]')?.textContent?.trim()).toBe('vault');
		expect(target.textContent).not.toContain('Welcome');
		expect(target.textContent).not.toContain('Board');
	});

	it('keeps hidden folders out, at every level', () => {
		mountNavigator(FILES_LENS, [WORK]);
		expect(shownFolders()).toEqual([VAULT, WORK, PROJECTS, `${VAULT}/Personal`]);
		expect(target.textContent).not.toContain('.obsidian');
		expect(target.textContent).not.toContain('.trash');
	});

	it('shows the subfolders of expanded folders only', () => {
		mountNavigator(FILES_LENS, [WORK, PROJECTS]);
		expect(shownFolders()).toEqual([VAULT, WORK, PROJECTS, ARCHIVE, `${VAULT}/Personal`]);
		expect(toggle(WORK)?.getAttribute('aria-expanded')).toBe('true');
	});

	it('hides the subfolders of an expanded folder whose parent is collapsed', () => {
		mountNavigator(FILES_LENS, [PROJECTS]);
		expect(shownFolders()).toEqual([VAULT, WORK, `${VAULT}/Personal`]);
		expect(toggle(WORK)?.getAttribute('aria-expanded')).toBe('false');
	});

	it('offers a chevron only on folders with subfolders, and hands its path to onToggle', () => {
		mountNavigator();
		expect(toggle(`${VAULT}/Personal`)).toBeNull();
		toggle(WORK)!.click();
		expect(onToggle).toHaveBeenCalledWith(WORK);
		expect(onPick).not.toHaveBeenCalled();
	});

	it('picks a folder lens on a folder click, and the bare lens on the root', () => {
		mountNavigator();
		folder(WORK).click();
		expect(onPick).toHaveBeenLastCalledWith({ kind: 'folder', target: WORK });
		expect(onToggle).not.toHaveBeenCalled();
		folder(VAULT).click();
		expect(onPick).toHaveBeenLastCalledWith({ kind: 'folder' });
	});

	it('highlights the picked folder with the region tokens', () => {
		mountNavigator({ kind: 'folder', target: WORK });
		expect(folder(WORK).getAttribute('aria-current')).toBe('true');
		expect(folder(VAULT).getAttribute('aria-current')).toBeNull();
		const row = target.querySelector<HTMLElement>(`[data-files-navigator-row="${WORK}"]`)!;
		expect(row.className).toContain('bg-file-explorer-primary/25');
		expect(row.className).toContain('text-file-explorer-primary');
		expect(target.innerHTML).not.toMatch(/#[0-9a-f]{3,6}\b|rgb\(/i);
	});

	it('highlights the root before a pick and when the vault path is picked', () => {
		mountNavigator();
		expect(folder(VAULT).getAttribute('aria-current')).toBe('true');
		unmount(component!);
		mountNavigator({ kind: 'folder', target: VAULT });
		expect(folder(VAULT).getAttribute('aria-current')).toBe('true');
	});

	it('clears the traffic lights with the header pad', () => {
		mountNavigator();
		expect(target.querySelector('[data-files-navigator-title]')!.parentElement!.classList).toContain('pl-[var(--rail-header-pad)]');
	});

	it('sets the Files header above its rows on the type scale', () => {
		mountNavigator(FILES_LENS, [WORK]);
		const header = target.querySelector<HTMLElement>('[data-files-navigator-title]')!;
		expect(header.textContent).toBe('Files');
		expect(header.classList).toContain('text-title');
		const rows = [
			target.querySelector<HTMLElement>('[data-files-navigator-root]')!,
			...target.querySelectorAll<HTMLElement>('[data-files-navigator-row]'),
		];
		expect(rows).toHaveLength(4);
		for (const row of rows) {
			expect(row.classList).toContain('text-row');
			expect(row.className).not.toMatch(/text-\[\d+px\]/);
			// The same 8px corner as the rail and the right-sidebar rows.
			expect(row.classList).toContain('rounded-md');
			expect(row.className).not.toMatch(/(^|\s)rounded(\s|$)/);
		}
		// The vault root is a row: no bigger or heavier than the header.
		const rootLabel = target.querySelector('[data-files-navigator-root] .truncate')!;
		expect(rootLabel.className).not.toMatch(/\btext-(title|lg|base)\b|font-(semibold|bold)/);
	});

	it('shows only the root for an empty vault', () => {
		fsStore.setFileTree([]);
		mountNavigator();
		expect(shownFolders()).toEqual([VAULT]);
	});

	it('follows the tree when a folder is added', () => {
		mountNavigator();
		fsStore.setFileTree([...TREE, dir(`${VAULT}/Zeta`)]);
		flushSync();
		expect(shownFolders()).toContain(`${VAULT}/Zeta`);
	});
});
