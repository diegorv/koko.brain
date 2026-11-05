// @vitest-environment jsdom
// The Types navigator over real stores and the real row builder: rows, counts,
// the pick, New type and the type context menu.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('#lib/features/file-icons/file-icons.icon-data.js', () => ({
	getIconSync: vi.fn(),
	getAllIconPacks: vi.fn(() => []),
	getIconsForPack: vi.fn(() => []),
	preloadPacks: vi.fn(),
	setOnPacksLoaded: vi.fn(),
}));
vi.mock('#lib/core/editor/editor.service.js', () => ({ openFileInEditor: vi.fn() }));
vi.mock('#lib/core/filesystem/fs.service.js', () => ({ revealInSystemExplorer: vi.fn(), deleteItem: vi.fn() }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn() }));
vi.mock('#lib/features/file-icons/file-icons.service.js', () => ({
	setIconForPath: vi.fn(),
	setIconColors: vi.fn(),
	removeIconForPath: vi.fn(),
	trackRecentIcon: vi.fn(),
}));
vi.mock('#lib/features/type-definitions/type-definitions.service.js', () => ({
	createNoteOfType: vi.fn(),
	createTypeDefinition: vi.fn(),
	renameType: vi.fn(),
	createView: vi.fn(),
	editView: vi.fn(),
	updateViewIcon: vi.fn(),
	updateViewIconColors: vi.fn(),
	removeViewIcon: vi.fn(),
	setViewRailPin: vi.fn(),
}));
vi.mock('#lib/features/properties/lifecycle.service.js', () => ({ setTypeRailPin: vi.fn() }));
vi.mock('svelte-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@tauri-apps/plugin-fs', () => ({ readTextFile: vi.fn() }));
vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));

import { mount, unmount, flushSync, tick } from 'svelte';
import TypesNavigator from '#lib/features/rail-shell/TypesNavigator.svelte';
import { queryViewLens, resolveLens, resolveViewLens, staleTypesPickFix, typeNavigatorRows, viewLoadFromQuery, viewNavigatorRows } from '#lib/features/rail-shell/lens.logic.js';
import type { Lens, LensContext } from '#lib/features/rail-shell/rail-shell.types.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { buildTypeMetadataMap } from '#lib/features/type-definitions/type-definitions.logic.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';
import { setIconColors } from '#lib/features/file-icons/file-icons.service.js';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { deleteItem, revealInSystemExplorer } from '#lib/core/filesystem/fs.service.js';
import { ask } from '@tauri-apps/plugin-dialog';
import { createNoteOfType, createTypeDefinition, createView, editView, renameType, setViewRailPin, updateViewIcon, updateViewIconColors } from '#lib/features/type-definitions/type-definitions.service.js';
import { setTypeRailPin } from '#lib/features/properties/lifecycle.service.js';
import { toast } from 'svelte-sonner';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { clearAllViewParseCache } from '#lib/features/type-definitions/view-parse-cache.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import { buildNoteRecord } from '#lib/features/collection/collection.logic.js';
import { parseCollectionYaml } from '#lib/features/collection/yaml-parser.js';
import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
import { getFileName } from '#lib/core/filesystem/fs.logic.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

const ENTRIES = [
	entryV2('/vault/Project.md', { isA: 'Type' }),
	entryV2('/vault/alpha.md', { isA: 'Project' }),
	entryV2('/vault/beta.md', { isA: 'Project' }),
	entryV2('/vault/shelved.md', { isA: 'Project', archived: true }),
	entryV2('/vault/standup.md', { isA: 'Meeting' }),
	entryV2('/vault/loose.md'),
];

async function settle(rounds = 4) {
	for (let i = 0; i < rounds; i++) {
		await tick();
		flushSync();
	}
}

describe('TypesNavigator', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;
	const onPick = vi.fn();

	function lensContext(): LensContext {
		return {
			entries: typeDefinitionsStore.entries,
			vaultPath: '/vault',
			systemFolder: '_system',
			typeMetadataMap: typeDefinitionsStore.typeMetadataMap,
			fileTree: [],
		};
	}

	async function mountNavigator(picked: Lens = { kind: 'type', target: 'Project' }, showUntyped = true) {
		const rows = typeNavigatorRows(lensContext(), showUntyped);
		component = mount(TypesNavigator, { target, props: { rows, picked, onPick } });
		await settle();
	}

	function rowEls(): HTMLElement[] {
		return [...target.querySelectorAll<HTMLElement>('[data-types-navigator-row]')];
	}

	function rowEl(key: string): HTMLElement {
		return target.querySelector<HTMLElement>(`[data-types-navigator-row="${key}"]`)!;
	}

	function menuLabels(): string[] {
		return [...document.querySelectorAll('[role="menuitem"]')].map((el) => el.textContent?.trim() ?? '');
	}

	/** The open menu's entries, separators as `---`. */
	function menuEntries(): string[] {
		const menu = [...document.querySelectorAll('[role="menu"]')].find((m) => m.getAttribute('data-state') === 'open')!;
		return [...menu.children].map((m) =>
			m.getAttribute('data-slot') === 'context-menu-separator' ? '---' : (m.querySelector('span')?.textContent?.trim() ?? ''),
		);
	}

	function menuIsOpen(): boolean {
		return [...document.querySelectorAll('[role="menu"]')].some((el) => el.getAttribute('data-state') === 'open');
	}

	async function rightClick(el: Element) {
		el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }));
		await settle();
	}

	async function clickItem(label: string) {
		const item = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((el) => el.textContent?.trim().startsWith(label))!;
		item.click();
		await settle();
	}

	/** Types a name into the open TypeNameDialog and presses Enter. */
	async function submitDialog(name: string) {
		const input = document.querySelector<HTMLInputElement>('input[placeholder="Type name"]')!;
		input.value = name;
		input.dispatchEvent(new Event('input', { bubbles: true }));
		await settle();
		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		await settle();
	}

	beforeEach(() => {
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open('/vault');
		fileIconsStore.reset();
		typeDefinitionsStore.reset();
		typeDefinitionsStore.setEntries(ENTRIES);
		typeDefinitionsStore.setTypeMetadataMap(buildTypeMetadataMap(ENTRIES));
		vi.clearAllMocks();
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	it('lists the types with their counts, then Untyped', async () => {
		await mountNavigator();
		expect(rowEls().map((el) => el.querySelector('.truncate')?.textContent?.trim())).toEqual(['Projects', 'Meetings', 'Untyped']);
		expect(rowEls().map((el) => el.querySelector('[data-types-navigator-count]')?.textContent)).toEqual(['2', '1', '1']);
	});

	it('shows on each row the number of notes its list holds', async () => {
		await mountNavigator();
		const rows = typeNavigatorRows(lensContext(), true);
		for (const [i, el] of rowEls().entries()) {
			const listed = resolveLens(rows[i].lens, lensContext())!.notes.length;
			expect(el.querySelector('[data-types-navigator-count]')?.textContent).toBe(String(listed));
		}
	});

	it('sets the Types header above its rows, and the counts in the metadata role', async () => {
		await mountNavigator();
		const header = target.querySelector<HTMLElement>('[data-types-navigator-title]')!;
		expect(header.textContent).toBe('Types');
		expect(header.classList).toContain('text-title');
		for (const el of rowEls()) {
			expect(el.classList).toContain('text-row');
			expect(el.querySelector('[data-types-navigator-count]')!.classList).toContain('text-meta');
			// The same 8px corner as the rail and the right-sidebar rows.
			expect(el.classList).toContain('rounded-md');
			expect(el.className).not.toMatch(/(^|\s)rounded(\s|$)/);
		}
	});

	it('leaves Untyped out when untyped notes are hidden', async () => {
		await mountNavigator(undefined, false);
		expect(rowEl('untyped')).toBeNull();
	});

	it('highlights the picked row with the region tokens', async () => {
		await mountNavigator({ kind: 'type', target: 'Meeting' });
		expect(rowEl('Meeting').getAttribute('aria-current')).toBe('true');
		expect(rowEl('Meeting').className).toContain('bg-file-explorer-primary/25 text-file-explorer-primary');
		expect(rowEl('Project').hasAttribute('aria-current')).toBe(false);
		const nav = target.querySelector('[data-types-navigator]')!;
		expect(nav.className).toContain('bg-file-explorer-bg');
		expect(nav.innerHTML).not.toMatch(/#[0-9a-f]{3,6}\b|rgb\(/i);
	});

	it('hands the clicked row lens to onPick', async () => {
		await mountNavigator();
		rowEl('Meeting').click();
		expect(onPick).toHaveBeenCalledWith({ kind: 'type', target: 'Meeting' });
		rowEl('untyped').click();
		expect(onPick).toHaveBeenLastCalledWith({ kind: 'untyped' });
	});

	it('colors the name of a type with only a text color and keeps the default icon', async () => {
		fileIconsStore.setFrontmatterIcons(new Map([['/vault/Project.md', { titleColor: '#3b82f6' }]]));
		await mountNavigator({ kind: 'untyped' });

		const row = rowEl('Project');
		expect(row.querySelector<HTMLElement>('span.truncate')!.style.color).toBe('rgb(59, 130, 246)');
		expect(row.querySelector('svg.lucide-file-text')).not.toBeNull();
	});

	it('saves a text color picked for a type with no icon, without asking for an icon', async () => {
		globalThis.ResizeObserver ??= class {
			observe() {}
			unobserve() {}
			disconnect() {}
		} as unknown as typeof ResizeObserver;
		await mountNavigator();

		await rightClick(rowEl('Project'));
		await clickItem('Change icon');
		document.querySelectorAll<HTMLButtonElement>('button[title="Green"]')[1].click();
		await settle();

		expect(setIconColors).toHaveBeenCalledWith('/vault/Project.md', undefined, '#22c55e');
	});

	it('says so when there are no types', async () => {
		typeDefinitionsStore.setEntries([]);
		typeDefinitionsStore.setTypeMetadataMap(new Map());
		await mountNavigator(undefined, false);
		expect(rowEls()).toHaveLength(0);
		expect(target.querySelector('[data-types-navigator-empty]')?.textContent).toBe('No types yet');
	});

	it("offers the type menu on a type's row and runs its actions", async () => {
		await mountNavigator();
		await rightClick(rowEl('Project'));
		expect(menuEntries()).toEqual([
			'New Project', 'Open type definition', 'Rename', '---',
			'Copy path', 'Change icon', 'Pin to rail', 'Reveal in Finder',
		]);

		await clickItem('New Project');
		expect(createNoteOfType).toHaveBeenCalledWith('Project');
		expect(menuIsOpen()).toBe(false);

		await rightClick(rowEl('Project'));
		await clickItem('Open type definition');
		expect(openFileInEditor).toHaveBeenCalledWith('/vault/Project.md');
		expect(menuIsOpen()).toBe(false);

		await rightClick(rowEl('Project'));
		await clickItem('Reveal in Finder');
		expect(revealInSystemExplorer).toHaveBeenCalledWith('/vault/Project.md');
		expect(menuIsOpen()).toBe(false);
	});

	describe('Pin to rail on a type row', () => {
		it('pins a type through its definition', async () => {
			await mountNavigator();
			await rightClick(rowEl('Project'));
			await clickItem('Pin to rail');
			expect(setTypeRailPin).toHaveBeenCalledWith('/vault/Project.md', true);
			expect(menuIsOpen()).toBe(false);
		});

		it('reads "Unpin from rail" on a type whose definition has _rail: true, and unpins it', async () => {
			const pinned = ENTRIES.map((e) => (e.path === '/vault/Project.md' ? { ...e, frontmatter: { _rail: true } } : e));
			typeDefinitionsStore.setEntries(pinned);
			typeDefinitionsStore.setTypeMetadataMap(buildTypeMetadataMap(pinned));
			await mountNavigator();
			await rightClick(rowEl('Project'));
			expect(menuLabels()).toContain('Unpin from rail');
			expect(menuLabels()).not.toContain('Pin to rail');
			await clickItem('Unpin from rail');
			expect(setTypeRailPin).toHaveBeenCalledWith('/vault/Project.md', false);
		});

		it('says so when the write fails', async () => {
			vi.mocked(setTypeRailPin).mockRejectedValueOnce(new Error('EACCES'));
			await mountNavigator();
			await rightClick(rowEl('Project'));
			await clickItem('Pin to rail');
			await settle();
			expect(toast.error).toHaveBeenCalledWith('Could not pin the type: EACCES');
		});

		it('offers no pin item on a type without a definition', async () => {
			await mountNavigator();
			await rightClick(rowEl('Meeting'));
			expect(menuLabels()).not.toContain('Pin to rail');
		});
	});

	it('marks a type row whose definition sets an ignored reserved key', async () => {
		const marked = ENTRIES.map((e) => (e.path === '/vault/Project.md' ? { ...e, frontmatter: { _rail: 'true' } } : e));
		typeDefinitionsStore.setEntries(marked);
		typeDefinitionsStore.setTypeMetadataMap(buildTypeMetadataMap(marked));
		await mountNavigator();
		const mark = rowEl('Project').querySelector('[data-types-navigator-mark]');
		expect(mark?.getAttribute('title')).toBe('Ignored key _rail: expected true or false, got "true"');
		expect(mark?.getAttribute('aria-label')).toBe('Ignored key _rail: expected true or false, got "true"');
		expect(rowEl('Project').querySelector('[data-types-navigator-count]')?.textContent).toBe('2');
		expect(rowEl('Meeting').querySelector('[data-types-navigator-mark]')).toBeNull();
	});

	it('offers to create the definition of a type that has none', async () => {
		await mountNavigator();
		await rightClick(rowEl('Meeting'));
		expect(menuEntries()).toEqual(['New Meeting', 'Create type definition']);
		await clickItem('Create type definition');
		expect(createTypeDefinition).toHaveBeenCalledWith('Meeting');
		expect(menuIsOpen()).toBe(false);
	});

	it('opens no menu on the Untyped row', async () => {
		await mountNavigator();
		await rightClick(rowEl('untyped'));
		expect(menuIsOpen()).toBe(false);
	});

	it('renames a type from its menu', async () => {
		await mountNavigator();
		await rightClick(rowEl('Project'));
		await clickItem('Rename');
		expect(document.body.textContent).toContain('This will update 2 notes');
		await submitDialog('Initiative');
		expect(renameType).toHaveBeenCalledWith('Project', 'Initiative', '/vault/Project.md');
	});

	it('creates a type with New type and picks it', async () => {
		vi.mocked(createTypeDefinition).mockResolvedValue('/vault/Area.md');
		await mountNavigator();
		target.querySelector<HTMLButtonElement>('[data-types-navigator-new-type]')!.click();
		await settle();
		await submitDialog('Area');
		expect(createTypeDefinition).toHaveBeenCalledWith('Area', { select: true });
		expect(onPick).toHaveBeenCalledWith({ kind: 'type', target: 'Area' });
	});

	it('does not pick a type New type failed to create', async () => {
		vi.mocked(createTypeDefinition).mockResolvedValue(null);
		await mountNavigator();
		target.querySelector<HTMLButtonElement>('[data-types-navigator-new-type]')!.click();
		await settle();
		await submitDialog('Area');
		expect(createTypeDefinition).toHaveBeenCalled();
		expect(onPick).not.toHaveBeenCalled();
	});

	it('creates a lowercase New type name with its first letter uppercased, and picks it', async () => {
		vi.mocked(createTypeDefinition).mockResolvedValue('/vault/Book.md');
		await mountNavigator();
		target.querySelector<HTMLButtonElement>('[data-types-navigator-new-type]')!.click();
		await settle();
		await submitDialog('book');
		expect(createTypeDefinition).toHaveBeenCalledWith('Book', { select: true });
		expect(onPick).toHaveBeenCalledWith({ kind: 'type', target: 'Book' });
	});

	it('renames a type to a lowercase name with its first letter uppercased', async () => {
		await mountNavigator();
		await rightClick(rowEl('Project'));
		await clickItem('Rename');
		await submitDialog('book');
		expect(renameType).toHaveBeenCalledWith('Project', 'Book', '/vault/Project.md');
	});

	it('shows the name a lowercase entry is saved as, and nothing for a name already cased', async () => {
		await mountNavigator();
		target.querySelector<HTMLButtonElement>('[data-types-navigator-new-type]')!.click();
		await settle();
		const input = document.querySelector<HTMLInputElement>('input[placeholder="Type name"]')!;
		input.value = 'book';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		await settle();
		expect(document.body.textContent).toContain('Saved as "Book"');
		input.value = 'Book';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		await settle();
		expect(document.body.textContent).not.toContain('Saved as');
		input.value = 'project';
		input.dispatchEvent(new Event('input', { bubbles: true }));
		await settle();
		expect(document.body.textContent).toContain('A type with this name already exists');
		expect(document.body.textContent).not.toContain('Saved as');
	});

	it('refuses a New type name that is already a type', async () => {
		await mountNavigator();
		target.querySelector<HTMLButtonElement>('[data-types-navigator-new-type]')!.click();
		await settle();
		await submitDialog('Meeting');
		expect(createTypeDefinition).not.toHaveBeenCalled();
	});

	describe('Views', () => {
		const PROJECTS = '/vault/Views/Projects.view';
		const BROKEN = '/vault/Broken.view';
		const VIEW_FILES: Record<string, string> = {
			[PROJECTS]: "_sidebar_label: All projects\nfilters: '_type == \"Project\"'\nviews:\n  - type: table\n    name: Projects\n",
			[BROKEN]: 'views: [',
		};
		const TREE: FileTreeNode[] = [
			{ name: 'Views', path: '/vault/Views', isDirectory: true, children: [{ name: 'Projects.view', path: PROJECTS, isDirectory: false }] },
			{ name: 'Broken.view', path: BROKEN, isDirectory: false },
		];
		const VIEW_ENTRIES = [...ENTRIES, entryV2(PROJECTS, { frontmatter: { _sidebar_label: 'All projects', _order: 1 } })];
		const NOTE_FILES: Record<string, string> = {
			'/vault/alpha.md': '---\n_type: Project\n---\n',
			'/vault/beta.md': '---\n_type: Project\n---\n',
			'/vault/shelved.md': '---\n_type: Project\n_archived: true\n---\n',
			'/vault/standup.md': '---\n_type: Meeting\n---\n',
		};
		const index = () => new Map(Object.entries(NOTE_FILES).map(([p, c]) => [p, buildNoteRecord(p, c)]));

		async function mountWithViews(picked: Lens = { kind: 'type', target: 'Project' }) {
			const rows = [...viewNavigatorRows(TREE, typeDefinitionsStore.entriesByPath), ...typeNavigatorRows(lensContext(), true)];
			component = mount(TypesNavigator, { target, props: { rows, picked, onPick } });
			await settle();
		}

		function viewEl(path: string): HTMLElement {
			return target.querySelector<HTMLElement>(`[data-types-navigator-view="${path}"]`)!;
		}

		beforeEach(() => {
			clearAllViewParseCache();
			collectionStore.reset();
			typeDefinitionsStore.setEntries(VIEW_ENTRIES);
			// The New view and Edit view name checks read every .view in the tree.
			fsStore.setFileTree(TREE);
			vi.mocked(readTextFile).mockImplementation(async (path) => {
				const content = VIEW_FILES[String(path)];
				if (content === undefined) throw new Error('not found');
				return content;
			});
		});

		afterEach(() => {
			vi.useRealTimers();
			fsStore.reset();
		});

		it('lists the views above the types, in _order', async () => {
			await mountWithViews();
			const labels = [...target.querySelectorAll('[data-types-navigator-row]')].map((el) => el.querySelector('.truncate')?.textContent?.trim());
			expect(labels).toEqual(['All projects', 'Broken', 'Projects', 'Meetings', 'Untyped']);
			expect(target.querySelector('[data-types-navigator-views]')?.textContent).toContain('Views');
		});

		it('labels Views with the section label, and its rows and counts on the type scale', async () => {
			vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
			await mountWithViews();
			collectionStore.setPropertyIndex(index());
			await settle();
			await vi.advanceTimersByTimeAsync(1000);
			await settle();

			const label = target.querySelector('[data-types-navigator-views] span')!;
			expect(label.textContent).toBe('Views');
			expect(label.classList).toContain('section-label');
			expect(viewEl(PROJECTS).classList).toContain('text-row');
			expect(viewEl(PROJECTS).querySelector('[data-types-navigator-count]')!.classList).toContain('text-meta');
			expect(viewEl(PROJECTS).classList).toContain('rounded-md');
			expect(viewEl(PROJECTS).className).not.toMatch(/(^|\s)rounded(\s|$)/);
		});

		/** Sets the property index and lets the 1000 ms recount debounce fire. */
		async function countViews() {
			collectionStore.setPropertyIndex(index());
			await settle();
			await vi.advanceTimersByTimeAsync(1000);
			await settle();
		}

		function countEl(path: string): HTMLElement | null {
			return viewEl(path).querySelector<HTMLElement>('[data-types-navigator-count]');
		}

		function markEl(path: string): HTMLElement | null {
			return viewEl(path).querySelector<HTMLElement>('[data-types-navigator-mark]');
		}

		it('counts each view as its list resolves it, once the property index is ready', async () => {
			vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
			await mountWithViews();
			// Pending: the slot is there, empty, and no view shows a mark yet.
			expect(countEl(PROJECTS)?.textContent).toBe('');
			expect(countEl(BROKEN)?.textContent).toBe('');
			expect(markEl(BROKEN)).toBeNull();

			await countViews();

			const parsed = parseCollectionYaml(VIEW_FILES[PROJECTS]);
			if (!parsed.success) throw new Error('fixture');
			const listed = resolveViewLens(PROJECTS, viewLoadFromQuery(queryViewLens(parsed.definition, null, index(), PROJECTS, lensContext())), lensContext()).notes.length;
			expect(listed).toBe(2);
			expect(countEl(PROJECTS)?.textContent).toBe(String(listed));
			expect(markEl(PROJECTS)).toBeNull();
			// A view that cannot be parsed shows the error mark in place of its count.
			expect(countEl(BROKEN)?.textContent).toBe('');
			expect(markEl(BROKEN)).not.toBeNull();
		});

		it('shows the parser message in the error mark of an unparseable view, in place of the count', async () => {
			vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
			await mountWithViews();
			await countViews();

			const parsed = parseCollectionYaml(VIEW_FILES[BROKEN]);
			if (parsed.success) throw new Error('fixture parses');
			const mark = markEl(BROKEN)!;
			expect(mark.getAttribute('title')).toBe(parsed.error);
			expect(mark.getAttribute('aria-label')).toBe(parsed.error);
			expect(countEl(BROKEN)!.contains(mark)).toBe(true);
			expect(countEl(BROKEN)!.textContent).toBe('');
		});

		describe('before the entries land', () => {
			async function landEntries(entries = VIEW_ENTRIES) {
				typeDefinitionsStore.setEntries(entries);
				await settle();
				await vi.advanceTimersByTimeAsync(1000);
				await settle();
			}

			it('keeps the empty pending slot, not 0, while the index is ready and the entries are not', async () => {
				vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
				typeDefinitionsStore.reset();
				await mountWithViews();
				await countViews();
				expect(countEl(PROJECTS)?.textContent).toBe('');
				await landEntries();
				expect(countEl(PROJECTS)?.textContent).toBe('2');
			});

			it('does not count a refresh left over from the previous vault as the entries landing', async () => {
				vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
				typeDefinitionsStore.reset();
				await mountWithViews();
				await countViews();
				await landEntries([entryV2('/previous/note.md')]);
				expect(countEl(PROJECTS)?.textContent).toBe('');
				await landEntries();
				expect(countEl(PROJECTS)?.textContent).toBe('2');
			});

			it('does not count a leftover refresh that rewrote the index as well', async () => {
				vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
				typeDefinitionsStore.reset();
				await mountWithViews();
				const previous = '/previous/note.md';
				collectionStore.setPropertyIndex(new Map([[previous, buildNoteRecord(previous, '---\n_type: Project\n---\n')]]));
				await settle();
				await landEntries([entryV2(previous, { isA: 'Project' })]);
				expect(countEl(PROJECTS)?.textContent).toBe('');
				collectionStore.setPropertyIndex(index());
				await landEntries();
				expect(countEl(PROJECTS)?.textContent).toBe('2');
			});

			it('counts 0 in a vault whose entries landed empty', async () => {
				vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
				typeDefinitionsStore.reset();
				await mountWithViews();
				await countViews();
				await landEntries([]);
				expect(countEl(PROJECTS)?.textContent).toBe('0');
			});
		});

		it('keeps the same fixed-width count slot while pending and once counted', async () => {
			vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
			await mountWithViews();
			const pending = countEl(PROJECTS)!;
			expect(pending.textContent).toBe('');
			expect(pending.classList).toContain('min-w-6');
			const pendingClass = pending.className;

			await countViews();
			expect(countEl(PROJECTS)!.textContent).toBe('2');
			expect(countEl(PROJECTS)!.className).toBe(pendingClass);
		});

		it('marks a view with an ignored reserved key next to its count, and lists the error first', async () => {
			vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
			typeDefinitionsStore.setEntries([
				...ENTRIES,
				entryV2(PROJECTS, { frontmatter: { _sidebar_label: 'All projects', _order: '1' } }),
				entryV2(BROKEN, { frontmatter: { _open_in_editor: 'true' } }),
			]);
			await mountWithViews();
			// The notes do not wait for the count.
			const orderNote = 'Ignored key _order: expected a number, got "1"';
			expect(markEl(PROJECTS)?.getAttribute('title')).toBe(orderNote);

			await countViews();
			expect(countEl(PROJECTS)?.textContent).toBe('2');
			expect(countEl(PROJECTS)!.contains(markEl(PROJECTS))).toBe(false);
			expect(markEl(PROJECTS)?.getAttribute('aria-label')).toBe(orderNote);

			const parsed = parseCollectionYaml(VIEW_FILES[BROKEN]);
			if (parsed.success) throw new Error('fixture parses');
			const brokenMarks = viewEl(BROKEN).querySelectorAll('[data-types-navigator-mark]');
			expect(brokenMarks).toHaveLength(1);
			expect(brokenMarks[0].getAttribute('title')).toBe(
				`${parsed.error}\nIgnored key _open_in_editor: expected true or false, got "true"`,
			);
		});

		describe('the _rail_view mark', () => {
			const BOARD_YAML = "_rail_view: {NAME}\nfilters: '_type == \"Project\"'\nviews:\n  - type: table\n    name: Table\n  - type: table\n    name: Board\n";
			const NOTE = 'Ignored key _rail_view: "Bord" names no view; the first view runs';

			/** PROJECTS on the mocked disk with the given `_rail_view`, its entry in the shape Rust gives: each view projected to null. */
			async function mountRailView(name: string, yaml = BOARD_YAML.replace('{NAME}', name)) {
				vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
				vi.mocked(readTextFile).mockImplementation(async (path) => (String(path) === PROJECTS ? yaml : VIEW_FILES[BROKEN]));
				typeDefinitionsStore.setEntries([...ENTRIES, entryV2(PROJECTS, { frontmatter: { _rail_view: name, views: [null] } })]);
				await mountWithViews();
			}

			it('shows no mark for a right name, before and after the count', async () => {
				await mountRailView('Board');
				expect(markEl(PROJECTS)).toBeNull();
				await countViews();
				expect(countEl(PROJECTS)?.textContent).toBe('2');
				expect(markEl(PROJECTS)).toBeNull();
			});

			it('shows no mark for a wrong name until the view is counted, then one mark', async () => {
				await mountRailView('Bord');
				expect(markEl(PROJECTS)).toBeNull();
				await countViews();
				expect(countEl(PROJECTS)?.textContent).toBe('2');
				const marks = viewEl(PROJECTS).querySelectorAll('[data-types-navigator-mark]');
				expect(marks).toHaveLength(1);
				expect(marks[0].getAttribute('title')).toBe(NOTE);
				expect(countEl(PROJECTS)!.contains(marks[0])).toBe(false);
			});

			it('marks a value of the wrong kind from the entry, without waiting for the count', async () => {
				vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
				typeDefinitionsStore.setEntries([...ENTRIES, entryV2(PROJECTS, { frontmatter: { _rail_view: 3, views: [null] } })]);
				await mountWithViews();
				const note = 'Ignored key _rail_view: expected the name of one of its views, got 3';
				expect(markEl(PROJECTS)?.getAttribute('title')).toBe(note);
				await countViews();
				expect(viewEl(PROJECTS).querySelectorAll('[data-types-navigator-mark]')).toHaveLength(1);
				expect(markEl(PROJECTS)?.getAttribute('title')).toBe(note);
			});

			it('marks an unquoted [[Board]], which Rust projects to a string and the parse refuses, once counted', async () => {
				await mountRailView('[[Board]]', BOARD_YAML.replace('{NAME}', '[[Board]]'));
				expect(markEl(PROJECTS)).toBeNull();
				await countViews();
				const marks = viewEl(PROJECTS).querySelectorAll('[data-types-navigator-mark]');
				expect(marks).toHaveLength(1);
				expect(marks[0].getAttribute('title')).toBe('Ignored key _rail_view: expected the name of one of its views, got [["Board"]]');
			});

			it('shows one line when the entry and the parse report the same wrong kind', async () => {
				vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
				vi.mocked(readTextFile).mockImplementation(async (path) => (String(path) === PROJECTS ? BOARD_YAML.replace('{NAME}', '3') : VIEW_FILES[BROKEN]));
				typeDefinitionsStore.setEntries([...ENTRIES, entryV2(PROJECTS, { frontmatter: { _rail_view: 3, views: [null] } })]);
				await mountWithViews();
				await countViews();
				expect(markEl(PROJECTS)?.getAttribute('title')).toBe('Ignored key _rail_view: expected the name of one of its views, got 3');
			});

			it('lists a wrong name after the error of a view whose filter does not parse', async () => {
				await mountRailView('Bord', "_rail_view: Bord\nfilters: \"status = 'active'\"\nviews:\n  - type: table\n    name: Table\n");
				await countViews();
				const marks = viewEl(PROJECTS).querySelectorAll('[data-types-navigator-mark]');
				expect(marks).toHaveLength(1);
				const lines = marks[0].getAttribute('title')!.split('\n');
				expect(lines[0]).toContain("status = 'active'");
				expect(lines.at(-1)).toBe(NOTE);
			});
		});

		it('highlights the picked view and hands a clicked view to onPick', async () => {
			await mountWithViews({ kind: 'view', target: PROJECTS });
			expect(viewEl(PROJECTS).getAttribute('aria-current')).toBe('true');
			expect(viewEl(PROJECTS).className).toContain('bg-file-explorer-primary/25 text-file-explorer-primary');
			viewEl(BROKEN).click();
			expect(onPick).toHaveBeenCalledWith({ kind: 'view', target: BROKEN });
		});

		/** Clicks the Views `+`, types `name` into the New view dialog and presses Enter. */
		async function newView(name: string) {
			target.querySelector<HTMLButtonElement>('[data-types-navigator-new-view]')!.click();
			await settle();
			const input = document.querySelector<HTMLInputElement>('input[placeholder="View name"]')!;
			input.value = name;
			input.dispatchEvent(new Event('input', { bubbles: true }));
			await settle();
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
			await settle();
		}

		it('creates a view with New view and picks it', async () => {
			vi.mocked(createView).mockResolvedValue('/vault/Reading.view');
			await mountWithViews();
			await newView('Reading');
			expect(createView).toHaveBeenCalledWith('Reading', undefined, undefined);
			expect(onPick).toHaveBeenCalledWith({ kind: 'view', target: '/vault/Reading.view' });
			expect(document.querySelector('[role="dialog"][data-state="open"]')).toBeNull();
		});

		it('does not pick a view New view failed to create', async () => {
			vi.mocked(createView).mockRejectedValue(new Error('write error'));
			await mountWithViews();
			await newView('Reading');
			expect(createView).toHaveBeenCalledWith('Reading', undefined, undefined);
			expect(onPick).not.toHaveBeenCalled();
			expect(document.querySelector('[role="alert"]')?.textContent).toContain('write error');
			expect(document.querySelector('[role="dialog"][data-state="open"]')).not.toBeNull();
		});

		it('passes the trimmed name to createView', async () => {
			vi.mocked(createView).mockResolvedValue('/vault/Reading.view');
			await mountWithViews();
			await newView('  Reading  ');
			expect(createView).toHaveBeenCalledWith('Reading', undefined, undefined);
		});

		it('refuses a New view name a view row already shows', async () => {
			await mountWithViews();
			// "All projects" is a label from `_sidebar_label`; "Broken" is a filename fallback.
			await newView('all projects');
			expect(document.body.textContent).toContain('A view with this name already exists');
			const input = document.querySelector<HTMLInputElement>('input[placeholder="View name"]')!;
			input.value = 'Broken';
			input.dispatchEvent(new Event('input', { bubbles: true }));
			await settle();
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
			await settle();
			expect(createView).not.toHaveBeenCalled();
			expect(onPick).not.toHaveBeenCalled();
		});

		it('refuses a New view name a hidden view holds', async () => {
			const SECRET = '/vault/Secret.view';
			fsStore.setFileTree([...TREE, { name: 'Secret.view', path: SECRET, isDirectory: false }]);
			typeDefinitionsStore.setEntries([...VIEW_ENTRIES, entryV2(SECRET, { frontmatter: { _sidebar_label: 'Secret list', _visible: false } })]);
			await mountWithViews();
			expect(viewEl(SECRET)).toBeNull();
			await newView('secret list');
			expect(document.body.textContent).toContain('A view with this name already exists');
			expect(createView).not.toHaveBeenCalled();
		});

		it('saves a color picked for a view with no icon as colors alone, never touching its icon', async () => {
			globalThis.ResizeObserver ??= class {
				observe() {}
				unobserve() {}
				disconnect() {}
			} as unknown as typeof ResizeObserver;
			fileIconsStore.setFrontmatterIcons(new Map([[PROJECTS, { color: '#ef4444' }]]));
			await mountWithViews();

			await rightClick(viewEl(PROJECTS));
			await clickItem('Change icon');
			document.querySelectorAll<HTMLButtonElement>('button[title="Green"]')[1].click();
			await settle();

			expect(updateViewIconColors).toHaveBeenCalledWith(PROJECTS, '#ef4444', '#22c55e');
			expect(updateViewIcon).not.toHaveBeenCalled();
			expect(setIconColors).not.toHaveBeenCalled();
		});

		it("offers the view menu on a view's row and runs its actions", async () => {
			await mountWithViews();
			await rightClick(viewEl(PROJECTS));
			expect(menuEntries()).toEqual([
				'Open view', 'Edit view', '---',
				'Copy path', 'Change icon', 'Pin to rail', '---',
				'Reveal in Finder', 'Move to Trash',
			]);

			await clickItem('Open view');
			expect(openFileInEditor).toHaveBeenCalledWith(PROJECTS);
			expect(menuIsOpen()).toBe(false);

			await rightClick(viewEl(PROJECTS));
			await clickItem('Reveal in Finder');
			expect(revealInSystemExplorer).toHaveBeenCalledWith(PROJECTS);
			expect(menuIsOpen()).toBe(false);
		});

		describe('Pin to rail', () => {
			it('pins the view', async () => {
				await mountWithViews();
				await rightClick(viewEl(PROJECTS));
				await clickItem('Pin to rail');
				expect(setViewRailPin).toHaveBeenCalledWith(PROJECTS, true);
				expect(menuIsOpen()).toBe(false);
			});

			it('reads "Unpin from rail" on a view with _rail: true, and unpins it', async () => {
				typeDefinitionsStore.setEntries([...ENTRIES, entryV2(PROJECTS, { frontmatter: { _sidebar_label: 'All projects', _rail: true } })]);
				await mountWithViews();
				await rightClick(viewEl(PROJECTS));
				expect(menuLabels()).toContain('Unpin from rail');
				expect(menuLabels()).not.toContain('Pin to rail');
				await clickItem('Unpin from rail');
				expect(setViewRailPin).toHaveBeenCalledWith(PROJECTS, false);
			});

			it('reads "Pin to rail" on a view whose _rail is not the boolean true', async () => {
				typeDefinitionsStore.setEntries([...ENTRIES, entryV2(PROJECTS, { frontmatter: { _rail: 'true' } })]);
				await mountWithViews();
				await rightClick(viewEl(PROJECTS));
				expect(menuLabels()).toContain('Pin to rail');
			});

			it('says so when the write fails', async () => {
				vi.mocked(setViewRailPin).mockRejectedValue(new Error('EACCES'));
				await mountWithViews();
				await rightClick(viewEl(PROJECTS));
				await clickItem('Pin to rail');
				await settle();
				expect(toast.error).toHaveBeenCalledWith('Could not pin the view: EACCES');
			});
		});

		describe('Move to Trash', () => {
			it('asks to move the .view to the trash, then trashes it once', async () => {
				vi.mocked(ask).mockResolvedValue(true);
				vi.mocked(deleteItem).mockResolvedValue();
				await mountWithViews();
				await rightClick(viewEl(PROJECTS));
				await clickItem('Move to Trash');
				await settle();
				expect(ask).toHaveBeenCalledWith('Move "Projects.view" to trash?', {
					title: 'Move to Trash',
					kind: 'warning',
					okLabel: 'Move to Trash',
					cancelLabel: 'Cancel',
				});
				expect(deleteItem).toHaveBeenCalledTimes(1);
				expect(deleteItem).toHaveBeenCalledWith(PROJECTS, false);
			});

			it('trashes nothing when the question is declined', async () => {
				vi.mocked(ask).mockResolvedValue(false);
				await mountWithViews();
				await rightClick(viewEl(PROJECTS));
				await clickItem('Move to Trash');
				await settle();
				expect(ask).toHaveBeenCalledTimes(1);
				expect(deleteItem).not.toHaveBeenCalled();
			});
		});

		describe('groups', () => {
			const WEEK2 = '/vault/Week 2.view';
			const WEEK10 = '/vault/Week 10.view';
			const BOARD = '/vault/Board.view';
			const GROUP_TREE: FileTreeNode[] = [
				...TREE,
				{ name: 'Week 10.view', path: WEEK10, isDirectory: false },
				{ name: 'Week 2.view', path: WEEK2, isDirectory: false },
				{ name: 'Board.view', path: BOARD, isDirectory: false },
			];

			async function mountGrouped(picked: Lens = { kind: 'type', target: 'Project' }) {
				const rows = [...viewNavigatorRows(GROUP_TREE, typeDefinitionsStore.entriesByPath), ...typeNavigatorRows(lensContext(), true)];
				component = mount(TypesNavigator, { target, props: { rows, picked, onPick } });
				await settle();
			}

			/** The Views part in DOM order: `#<group>` for a subheading, else the view path. */
			function viewsOrder(): string[] {
				return [...target.querySelectorAll<HTMLElement>('[data-types-navigator-group], [data-types-navigator-view]')].map((el) =>
					el.hasAttribute('data-types-navigator-group') ? `#${el.dataset.typesNavigatorGroup}` : el.dataset.typesNavigatorView!,
				);
			}

			beforeEach(() => {
				editorStore.reset();
				typeDefinitionsStore.setEntries([
					...VIEW_ENTRIES,
					entryV2(WEEK2, { frontmatter: { _group: 'Weekly' } }),
					entryV2(WEEK10, { frontmatter: { _group: 'Weekly' } }),
					entryV2(BOARD, { frontmatter: { _group: 'Boards', _open_in_editor: true } }),
				]);
			});

			afterEach(() => {
				editorStore.reset();
			});

			it('puts one subheading before each group, after the ungrouped views', async () => {
				await mountGrouped();
				expect(viewsOrder()).toEqual([PROJECTS, BROKEN, '#Boards', BOARD, '#Weekly', WEEK2, WEEK10]);
				const heading = target.querySelector<HTMLElement>('[data-types-navigator-group="Weekly"]')!;
				expect(heading.textContent?.trim()).toBe('Weekly');
				expect(heading.tagName).not.toBe('BUTTON');
				expect(heading.hasAttribute('tabindex')).toBe(false);
				expect(heading.querySelector('button, [tabindex]')).toBeNull();
			});

			it('keeps the click, aria-current and the context menu on grouped rows', async () => {
				await mountGrouped({ kind: 'view', target: WEEK10 });
				expect(viewEl(WEEK10).getAttribute('aria-current')).toBe('true');
				expect(viewEl(WEEK2).hasAttribute('aria-current')).toBe(false);

				viewEl(WEEK2).click();
				expect(onPick).toHaveBeenCalledWith({ kind: 'view', target: WEEK2 });

				await rightClick(viewEl(WEEK2));
				expect(menuLabels()).toContain('Move to Trash');
				await clickItem('Open view');
				expect(openFileInEditor).toHaveBeenCalledWith(WEEK2);
			});

			it('opens a grouped view marked to open in the editor instead of picking it', async () => {
				await mountGrouped();
				viewEl(BOARD).click();
				expect(openFileInEditor).toHaveBeenCalledWith(BOARD);
				expect(onPick).not.toHaveBeenCalled();
			});

			it('shows no subheading when no view has a group', async () => {
				await mountWithViews();
				expect(target.querySelector('[data-types-navigator-group]')).toBeNull();
			});
		});

		describe('Edit view', () => {
			function editDialog(): HTMLElement | null {
				return document.querySelector<HTMLElement>('[role="dialog"][data-state="open"]');
			}

			function nameInput(): HTMLInputElement {
				return document.querySelector<HTMLInputElement>('input[placeholder="View name"]')!;
			}

			function dialogButton(label: string): HTMLButtonElement {
				return [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find((b) => b.textContent?.trim() === label)!;
			}

			async function rename(value: string) {
				nameInput().value = value;
				nameInput().dispatchEvent(new Event('input', { bubbles: true }));
				await settle();
			}

			async function openEdit(path: string) {
				await rightClick(viewEl(path));
				await clickItem('Edit view');
				await settle();
			}

			afterEach(() => {
				editorStore.reset();
				settingsStore.updateLayout({ railTypesLens: null });
			});

			it("opens the dialog prefilled with the row's label and the view's filters", async () => {
				await mountWithViews();
				await openEdit(PROJECTS);
				expect(editDialog()?.textContent).toContain('Edit view');
				expect(nameInput().value).toBe('All projects');
				expect(editDialog()?.textContent).toContain('All views');
			});

			it('saves through editView on the same path, closes, and does not pick the view', async () => {
				vi.mocked(editView).mockResolvedValue();
				await mountWithViews();
				await openEdit(PROJECTS);
				await rename('Live projects');
				dialogButton('Save').click();
				await settle();
				expect(editView).toHaveBeenCalledWith(PROJECTS, { label: 'Live projects', filters: "_type == 'Project'", viewFilters: undefined });
				expect(editDialog()).toBeNull();
				expect(onPick).not.toHaveBeenCalled();
				expect(createView).not.toHaveBeenCalled();
			});

			it("refuses another view's label and allows its own", async () => {
				await mountWithViews();
				await openEdit(PROJECTS);
				// "Broken" is the other row's filename fallback.
				await rename('broken');
				expect(dialogButton('Save').disabled).toBe(true);
				expect(document.body.textContent).toContain('A view with this name already exists');
				await rename('ALL PROJECTS');
				expect(dialogButton('Save').disabled).toBe(false);
			});

			it('keeps open tabs and the saved Types pick on the view after a rename', async () => {
				vi.mocked(editView).mockResolvedValue();
				editorStore.addTab({ path: PROJECTS, name: getFileName(PROJECTS), content: '', savedContent: '', fileType: 'collection' });
				settingsStore.updateLayout({ railTypesLens: { kind: 'view', target: PROJECTS } });
				await mountWithViews({ kind: 'view', target: PROJECTS });
				await openEdit(PROJECTS);
				await rename('Live projects');
				dialogButton('Save').click();
				await settle();

				// The index refresh after the save relabels the row; its path stays.
				typeDefinitionsStore.setEntries([...ENTRIES, entryV2(PROJECTS, { frontmatter: { _sidebar_label: 'Live projects', _order: 1 } })]);
				const rows = [...viewNavigatorRows(TREE, typeDefinitionsStore.entriesByPath), ...typeNavigatorRows(lensContext(), true)];
				expect(rows.find((r) => r.lens.target === PROJECTS)?.label).toBe('Live projects');
				expect(staleTypesPickFix('types', settingsStore.layout.railTypesLens, rows, [PROJECTS, BROKEN])).toBeNull();
				expect(settingsStore.layout.railTypesLens).toEqual({ kind: 'view', target: PROJECTS });
				expect(editorStore.tabs.map((t) => t.path)).toEqual([PROJECTS]);
			});
		});

		describe('a view marked to open in the editor', () => {
			const BOARD = '/vault/Board.view';
			const EDITOR_TREE: FileTreeNode[] = [...TREE, { name: 'Board.view', path: BOARD, isDirectory: false }];

			async function mountWithEditorView(picked: Lens = { kind: 'type', target: 'Project' }) {
				const rows = [...viewNavigatorRows(EDITOR_TREE, typeDefinitionsStore.entriesByPath), ...typeNavigatorRows(lensContext(), true)];
				component = mount(TypesNavigator, { target, props: { rows, picked, onPick } });
				await settle();
			}

			function openTab(path: string) {
				editorStore.addTab({ path, name: getFileName(path), content: '', savedContent: '', fileType: 'collection' });
				flushSync();
			}

			beforeEach(() => {
				editorStore.reset();
				typeDefinitionsStore.setEntries([...VIEW_ENTRIES, entryV2(BOARD, { frontmatter: { _open_in_editor: true } })]);
			});

			afterEach(() => {
				editorStore.reset();
			});

			it('opens the view in the editor on click and leaves the pick alone', async () => {
				await mountWithEditorView();
				viewEl(BOARD).click();
				expect(openFileInEditor).toHaveBeenCalledWith(BOARD);
				expect(onPick).not.toHaveBeenCalled();
			});

			it('lands the clicked view as the active editor tab', async () => {
				const actual = await vi.importActual<typeof import('#lib/core/editor/editor.service.js')>('#lib/core/editor/editor.service.js');
				vi.mocked(openFileInEditor).mockImplementationOnce(actual.openFileInEditor);
				vi.mocked(readTextFile).mockResolvedValueOnce('_open_in_editor: true\nviews:\n  - type: board\n    name: Board\n');
				await mountWithEditorView();
				viewEl(BOARD).click();
				await settle();
				expect(editorStore.activeTabPath).toBe(BOARD);
				expect(viewEl(BOARD).getAttribute('aria-current')).toBe('true');
			});

			it('still picks a view without the key', async () => {
				await mountWithEditorView();
				viewEl(PROJECTS).click();
				expect(onPick).toHaveBeenCalledWith({ kind: 'view', target: PROJECTS });
				expect(openFileInEditor).not.toHaveBeenCalled();
			});

			it('highlights the row while the view is the active tab, not while another tab is', async () => {
				await mountWithEditorView();
				expect(viewEl(BOARD).hasAttribute('aria-current')).toBe(false);

				openTab(BOARD);
				expect(viewEl(BOARD).getAttribute('aria-current')).toBe('true');
				expect(viewEl(BOARD).className).toContain('bg-file-explorer-primary/25 text-file-explorer-primary');

				openTab('/vault/alpha.md');
				expect(viewEl(BOARD).hasAttribute('aria-current')).toBe(false);
				expect(viewEl(BOARD).className).not.toContain('bg-file-explorer-primary/25');

				editorStore.setActiveIndex(0);
				flushSync();
				expect(viewEl(BOARD).getAttribute('aria-current')).toBe('true');
			});

			it('does not highlight a list view because it is open in the active tab', async () => {
				await mountWithEditorView();
				openTab(PROJECTS);
				expect(viewEl(PROJECTS).hasAttribute('aria-current')).toBe(false);
			});

			it('keeps the picked row highlighted next to the open editor view', async () => {
				await mountWithEditorView({ kind: 'view', target: PROJECTS });
				openTab(BOARD);
				expect(viewEl(PROJECTS).getAttribute('aria-current')).toBe('true');
				expect(viewEl(BOARD).getAttribute('aria-current')).toBe('true');
			});
		});

		it('shows the Views section with New view even without views', async () => {
			component = mount(TypesNavigator, { target, props: { rows: typeNavigatorRows(lensContext(), true), picked: { kind: 'type', target: 'Project' }, onPick } });
			await settle();
			expect(target.querySelector('[data-types-navigator-new-view]')).not.toBeNull();
			expect(target.querySelector('[data-types-navigator-view]')).toBeNull();
		});
	});
});
