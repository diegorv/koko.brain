// @vitest-environment jsdom
// New view in the Files navigator's folder menu: the item, its icon and New
// Collection's, the New view dialog it opens with the folder as target, and
// the view lens handed to onPickView. The view service is mocked; the dialog,
// the name check and the stores are real.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('svelte-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-fs', () => ({ readTextFile: vi.fn(), readDir: vi.fn() }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn() }));
vi.mock('#lib/core/editor/editor.service.js', () => ({ openFileInEditor: vi.fn() }));
vi.mock('#lib/features/type-definitions/type-definitions.service.js', () => ({ createView: vi.fn(), editView: vi.fn() }));
vi.mock('#lib/features/file-icons/file-icons.icon-data.js', () => ({
	getIconSync: vi.fn(),
	getAllIconPacks: vi.fn(() => []),
	getIconsForPack: vi.fn(() => []),
	preloadPacks: vi.fn(),
	setOnPacksLoaded: vi.fn(),
}));
vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));

import { mount, unmount, flushSync, tick } from 'svelte';
import FilesNavigator from '#lib/features/rail-shell/FilesNavigator.svelte';
import { FILES_LENS, VIEW_LENS_KIND } from '#lib/features/rail-shell/lens.logic.js';
import { createView } from '#lib/features/type-definitions/type-definitions.service.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { railRegistryStore } from '#lib/features/rail-shell/rail-registry.store.svelte.js';
import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

const VAULT = '/vault';
const WORK = `${VAULT}/Work`;
const HIDDEN = `${WORK}/Hidden.view`;

const TREE: FileTreeNode[] = [
	{ name: 'Work', path: WORK, isDirectory: true, children: [{ name: 'Hidden.view', path: HIDDEN, isDirectory: false }] },
];

async function settle(rounds = 4) {
	for (let i = 0; i < rounds; i++) {
		await tick();
		flushSync();
	}
}

describe('FilesNavigator: New view', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;
	const onPickView = vi.fn();
	const onPick = vi.fn();

	const row = (path: string) => target.querySelector<HTMLElement>(`[data-files-navigator-row="${path}"]`)!;
	const nameInput = () => document.querySelector<HTMLInputElement>('input[placeholder="View name"]');
	const menuItem = (label: string) =>
		[...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((n) => n.textContent?.trim() === label);

	async function openMenu(el: Element) {
		el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }));
		await settle();
	}

	async function chooseNewView(el: Element) {
		await openMenu(el);
		menuItem('New view')!.click();
		await settle();
	}

	async function typeName(value: string) {
		const input = nameInput()!;
		input.value = value;
		input.dispatchEvent(new Event('input', { bubbles: true }));
		await settle();
	}

	async function pressEnter() {
		nameInput()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
		await settle();
	}

	beforeEach(() => {
		vi.clearAllMocks();
		settingsStore.reset();
		railRegistryStore.reset();
		typeDefinitionsStore.reset();
		fsStore.reset();
		vaultStore._reset();
		vaultStore.open(VAULT);
		fsStore.setFileTree(TREE);
		typeDefinitionsStore.setEntries([entryV2(HIDDEN, { frontmatter: { _sidebar_label: 'Secret', _visible: false } })]);
		target = document.body.appendChild(document.createElement('div'));
		component = mount(FilesNavigator, { target, props: { picked: FILES_LENS, expanded: [], onPick, onToggle: vi.fn(), onPickView } });
		flushSync();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.replaceChildren();
	});

	it('puts New view after the file creators and before New folder, with the view row icon', async () => {
		await openMenu(row(WORK));
		const labels = [...document.querySelectorAll('[role="menuitem"]')].map((n) => n.textContent?.trim());
		expect(labels.slice(0, 5)).toEqual(['New note', 'New Canvas', 'New table', 'New view', 'New folder']);
		expect(menuItem('New view')!.querySelector('svg')!.getAttribute('class')).toContain('lucide-table');
	});

	it('gives New table the Database icon, not the Table icon of view rows', async () => {
		await openMenu(row(WORK));
		const icon = menuItem('New table')!.querySelector('svg')!.getAttribute('class');
		expect(icon).toContain('lucide-database');
		expect(icon).not.toContain('lucide-table');
	});

	it('creates the view in the folder and hands its view lens to onPickView', async () => {
		vi.mocked(createView).mockResolvedValue(`${WORK}/Reading.view`);
		await chooseNewView(row(WORK));
		expect(document.querySelector('[role="dialog"]')?.textContent).toContain('New view');

		await typeName('Reading');
		await pressEnter();

		expect(createView).toHaveBeenCalledWith('Reading', undefined, WORK);
		expect(onPickView).toHaveBeenCalledWith({ kind: VIEW_LENS_KIND, target: `${WORK}/Reading.view` });
		expect(onPick).not.toHaveBeenCalled();
		// jsdom never ends the exit animation, so the closed dialog stays in the DOM.
		expect(document.querySelector('[role="dialog"]')?.getAttribute('data-state')).toBe('closed');
	});

	it('creates at the vault root from the root row', async () => {
		vi.mocked(createView).mockResolvedValue(`${VAULT}/Reading.view`);
		await chooseNewView(target.querySelector('[data-files-navigator-root]')!);
		await typeName('Reading');
		await pressEnter();

		expect(createView).toHaveBeenCalledWith('Reading', undefined, VAULT);
		expect(onPickView).toHaveBeenCalledWith({ kind: VIEW_LENS_KIND, target: `${VAULT}/Reading.view` });
	});

	it("refuses the label of any .view, a hidden one included, as the Types navigator's dialog does", async () => {
		await chooseNewView(row(WORK));
		await typeName('Secret');
		expect(document.querySelector('[data-view-dialog-name-error]')?.textContent).toBe('A view with this name already exists');

		await pressEnter();
		expect(createView).not.toHaveBeenCalled();
		expect(onPickView).not.toHaveBeenCalled();
	});

	it('picks nothing when the create fails', async () => {
		vi.mocked(createView).mockRejectedValue(new Error('disk full'));
		await chooseNewView(row(WORK));
		await typeName('Reading');
		await pressEnter();

		expect(onPickView).not.toHaveBeenCalled();
		expect(document.querySelector('[role="dialog"] [role="alert"]')?.textContent).toContain('disk full');
	});
});
