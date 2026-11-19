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
import { FILES_LENS, FOLDER_LENS_KIND, resolveLens } from '#lib/features/rail-shell/lens.logic.js';
import type { Lens } from '#lib/features/rail-shell/rail-shell.types.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';
import { appliedThemeStore } from '#lib/core/settings/applied-theme.store.svelte.js';
import { LAVENDER_HAZE_THEME } from '#lib/core/settings/theme.logic.js';
import { applyTheme } from '#lib/core/settings/theme.service.js';
import { themeSurface } from '#lib/core/settings/theme-surfaces.logic.js';
import { contrastRatio } from '#lib/utils/color.js';

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
		settingsStore.reset();
		fsStore.reset();
		fsStore.setFileTree(TREE);
		fileIconsStore.reset();
		onPick.mockReset();
		onToggle.mockReset();
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	it("draws a folder's default icon in its own color when it has no icon, closed and open", () => {
		fileIconsStore.updateFrontmatterIcon(WORK, { color: '#ef4444' });
		mountNavigator();
		expect(folder(WORK).querySelector('svg')!.getAttribute('style')).toContain('rgb(239, 68, 68)');
		expect(folder(`${VAULT}/Personal`).querySelector('svg')!.getAttribute('style')).toBeNull();
		unmount(component!);

		mountNavigator(FILES_LENS, [WORK]);
		expect(folder(WORK).querySelector('svg')!.getAttribute('style')).toContain('rgb(239, 68, 68)');
	});

	describe('on a light theme', () => {
		afterEach(() => {
			appliedThemeStore._reset();
			document.documentElement.removeAttribute('style');
			document.documentElement.classList.remove('dark');
		});

		it('lifts an IconPicker preset folder color to 3:1 and its title color to 4.5:1, keeping the stored values', () => {
			applyTheme(LAVENDER_HAZE_THEME);
			fileIconsStore.updateFrontmatterIcon(WORK, { color: '#eab308', titleColor: '#eab308' });
			mountNavigator();
			const nav = themeSurface(appliedThemeStore, 'nav-bg')!;
			expect(contrastRatio('#eab308', nav)!).toBeLessThan(3);
			expect(contrastRatio(folder(WORK).querySelector<SVGElement>('svg')!.style.color, nav)!).toBeGreaterThanOrEqual(3);
			expect(contrastRatio(folder(WORK).querySelector<HTMLElement>('.truncate')!.style.color, nav)!).toBeGreaterThanOrEqual(4.5);
			expect(fileIconsStore.getFrontmatterIcon(WORK)).toMatchObject({ color: '#eab308', titleColor: '#eab308' });
		});
	});

	it('paints the navigator column tone', () => {
		mountNavigator();
		expect(target.querySelector('[data-files-navigator]')!.classList).toContain('bg-nav-bg');
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

	describe('system folders', () => {
		const NOTES = `${VAULT}/_notes`;
		const SYSTEM = `${VAULT}/_system`;
		const SYSTEM_TEMPLATES = `${SYSTEM}/templates`;
		const TEMPLATES = `${VAULT}/_templates`;
		const AREAS = `${VAULT}/Areas`;
		const DAILY = `${VAULT}/Daily`;
		// Scan order: `_` sorts before letters.
		const SCAN_TREE: FileTreeNode[] = [dir(NOTES), dir(SYSTEM, [dir(SYSTEM_TEMPLATES)]), dir(AREAS), dir(DAILY)];
		const MUTED = 'text-file-explorer-muted-fg';
		const nameOf = (path: string) => folder(path).querySelector<HTMLElement>('.truncate')!;

		beforeEach(() => {
			fsStore.setFileTree(SCAN_TREE);
		});

		it('lists the configured system folder after the user folders, muted; other underscore folders stay', () => {
			mountNavigator();
			expect(shownFolders()).toEqual([VAULT, NOTES, AREAS, DAILY, SYSTEM]);
			expect(nameOf(SYSTEM).classList).toContain(MUTED);
			expect(nameOf(NOTES).classList).not.toContain(MUTED);
			expect(nameOf(AREAS).classList).not.toContain(MUTED);
		});

		it('treats the templates folder as a system folder too', () => {
			settingsStore.updateTemplates({ folder: '_templates' });
			fsStore.setFileTree([dir(NOTES), dir(SYSTEM), dir(TEMPLATES), dir(AREAS)]);
			mountNavigator();
			expect(shownFolders()).toEqual([VAULT, NOTES, AREAS, SYSTEM, TEMPLATES]);
			expect(nameOf(TEMPLATES).classList).toContain(MUTED);
		});

		it('keeps scan order and mutes nothing when both settings are blank', () => {
			settingsStore.updateTemplates({ folder: '', systemFolder: '' });
			mountNavigator();
			expect(shownFolders()).toEqual([VAULT, NOTES, SYSTEM, AREAS, DAILY]);
			expect(nameOf(SYSTEM).classList).not.toContain(MUTED);
		});

		it('keeps a custom root order from folder-order.json, with the system folder still muted', () => {
			// The fs service hands the tree over already in the saved order.
			fsStore.setFolderOrder({ '.': ['_system', 'Daily', '_notes', 'Areas'] });
			fsStore.setFileTree([dir(SYSTEM), dir(DAILY), dir(NOTES), dir(AREAS)]);
			mountNavigator();
			expect(shownFolders()).toEqual([VAULT, SYSTEM, DAILY, NOTES, AREAS]);
			expect(nameOf(SYSTEM).classList).toContain(MUTED);
		});

		it('keeps a custom root order from a top-level folder _order', () => {
			fsStore.setContentOrder(new Map([[DAILY, 1]]));
			fsStore.setFileTree([dir(DAILY), dir(NOTES), dir(SYSTEM), dir(AREAS)]);
			mountNavigator();
			expect(shownFolders()).toEqual([VAULT, DAILY, NOTES, SYSTEM, AREAS]);
			expect(nameOf(SYSTEM).classList).toContain(MUTED);
		});

		it('still moves the system folder last when only a nested folder has a custom order', () => {
			fsStore.setFolderOrder({ _system: ['templates'] });
			fsStore.setContentOrder(new Map([[SYSTEM_TEMPLATES, 1]]));
			mountNavigator();
			expect(shownFolders()).toEqual([VAULT, NOTES, AREAS, DAILY, SYSTEM]);
		});

		it('mutes an expanded subfolder of the system folder, leaving the order inside it alone', () => {
			mountNavigator(FILES_LENS, [SYSTEM]);
			expect(shownFolders()).toEqual([VAULT, NOTES, AREAS, DAILY, SYSTEM, SYSTEM_TEMPLATES]);
			expect(nameOf(SYSTEM_TEMPLATES).classList).toContain(MUTED);
		});

		it('lets a folder title color win over the muted name', () => {
			fileIconsStore.updateFrontmatterIcon(SYSTEM, { titleColor: '#22c55e' });
			mountNavigator();
			expect(nameOf(SYSTEM).classList).not.toContain(MUTED);
			expect(nameOf(SYSTEM).style.color).toBe('rgb(34, 197, 94)');
		});

		it('shows a picked system folder in the primary color, not muted', () => {
			mountNavigator({ kind: FOLDER_LENS_KIND, target: SYSTEM });
			const row = target.querySelector<HTMLElement>(`[data-files-navigator-row="${SYSTEM}"]`)!;
			expect(row.classList).toContain('text-file-explorer-primary');
			expect(nameOf(SYSTEM).classList).not.toContain(MUTED);
		});
	});

	describe('file counts', () => {
		const MIXED = `${VAULT}/Mixed`;
		const EMPTY = `${VAULT}/Empty`;
		const mixedTree = (extra: FileTreeNode[] = []): FileTreeNode[] => [
			dir(MIXED, [
				dir(`${MIXED}/sub`, [file(`${MIXED}/sub/deep.md`)]),
				file(`${MIXED}/a.md`),
				file(`${MIXED}/b.md`),
				file(`${MIXED}/board.canvas`),
				file(`${MIXED}/.DS_Store`),
				...extra,
			]),
			dir(EMPTY),
			file(`${VAULT}/Welcome.md`),
		];
		const countOf = (path: string) =>
			target.querySelector(`[data-files-navigator-row="${path}"] [data-files-navigator-count]`)?.textContent?.trim() ?? null;

		beforeEach(() => {
			fsStore.setFileTree(mixedTree());
		});

		it("shows a folder's direct, non-hidden file count, muted and in tabular figures", () => {
			mountNavigator();
			expect(countOf(MIXED)).toBe('3');
			const count = target.querySelector<HTMLElement>(`[data-files-navigator-row="${MIXED}"] [data-files-navigator-count]`)!;
			expect(count.classList).toContain('tabular-nums');
			expect(count.classList).toContain('text-file-explorer-muted-fg');
			expect(count.classList).toContain('ml-auto');
			// Hidden from the folder button's accessible name.
			expect(count.getAttribute('aria-hidden')).toBe('true');
		});

		it('picks the folder when the number is clicked', () => {
			mountNavigator();
			target.querySelector<HTMLElement>(`[data-files-navigator-row="${MIXED}"] [data-files-navigator-count]`)!.click();
			expect(onPick).toHaveBeenLastCalledWith({ kind: 'folder', target: MIXED });
		});

		it('shows no number for an empty folder or the vault root', () => {
			mountNavigator();
			expect(countOf(EMPTY)).toBeNull();
			expect(target.querySelector('[data-files-navigator-root] [data-files-navigator-count]')).toBeNull();
		});

		it("equals the folder lens's row count for the same tree", () => {
			mountNavigator();
			const lens = resolveLens(
				{ kind: FOLDER_LENS_KIND, target: MIXED },
				{ entries: [], vaultPath: VAULT, systemFolder: '_system', typeMetadataMap: new Map(), fileTree: fsStore.fileTree },
			);
			expect(countOf(MIXED)).toBe(String(lens!.notes.length));
		});

		it('updates when a file is added to the tree', () => {
			mountNavigator();
			fsStore.setFileTree(mixedTree([file(`${MIXED}/c.pdf`)]));
			flushSync();
			expect(countOf(MIXED)).toBe('4');
		});
	});
});
