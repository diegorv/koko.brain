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
vi.mock('#lib/core/filesystem/fs.service.js', () => ({ revealInSystemExplorer: vi.fn() }));
vi.mock('#lib/features/file-icons/file-icons.service.js', () => ({
	setIconForPath: vi.fn(),
	removeIconForPath: vi.fn(),
	trackRecentIcon: vi.fn(),
}));
vi.mock('#lib/features/type-definitions/type-definitions.service.js', () => ({
	createNoteOfType: vi.fn(),
	createTypeDefinition: vi.fn(),
	renameType: vi.fn(),
}));
vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));

import { mount, unmount, flushSync, tick } from 'svelte';
import TypesNavigator from '#lib/features/rail-shell/TypesNavigator.svelte';
import { resolveLens, typeNavigatorRows } from '#lib/features/rail-shell/lens.logic.js';
import type { Lens, LensContext } from '#lib/features/rail-shell/rail-shell.types.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { buildTypeMetadataMap } from '#lib/features/type-definitions/type-definitions.logic.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { revealInSystemExplorer } from '#lib/core/filesystem/fs.service.js';
import { createNoteOfType, createTypeDefinition, renameType } from '#lib/features/type-definitions/type-definitions.service.js';
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
		expect(menuLabels()).toEqual(['New Project', 'Rename', 'Open type definition', 'Copy path', 'Change icon', 'Reveal in Finder']);

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

	it('offers to create the definition of a type that has none', async () => {
		await mountNavigator();
		await rightClick(rowEl('Meeting'));
		expect(menuLabels()).toEqual(['New Meeting', 'Create type definition']);
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

	it('refuses a New type name that is already a type', async () => {
		await mountNavigator();
		target.querySelector<HTMLButtonElement>('[data-types-navigator-new-type]')!.click();
		await settle();
		await submitDialog('Meeting');
		expect(createTypeDefinition).not.toHaveBeenCalled();
	});
});
