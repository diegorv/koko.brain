// @vitest-environment jsdom
// The rail shell's note list over the real stores: the lens fills the header and
// the rows, the shared row menu acts on them.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// virtua mounts rows only after ResizeObserver reports sizes and skips targets
// without offsetParent; jsdom has neither. Same shim as TypeNoteList.view.test.ts.
class ResizeObserverStub {
	private cb: ResizeObserverCallback;
	constructor(cb: ResizeObserverCallback) {
		this.cb = cb;
	}
	observe(el: Element) {
		const height = (el as HTMLElement).style?.overflowY === 'auto' ? 600 : 60;
		queueMicrotask(() =>
			this.cb(
				[{ target: el, contentRect: { height, width: 240 } } as unknown as ResizeObserverEntry],
				this as unknown as ResizeObserver,
			),
		);
	}
	unobserve() {}
	disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
	get() {
		return this.parentElement;
	},
	configurable: true,
});

vi.mock('#lib/features/file-icons/file-icons.icon-data.js', () => ({
	getIconSync: vi.fn(),
	getAllIconPacks: vi.fn(() => []),
	getIconsForPack: vi.fn(() => []),
	preloadPacks: vi.fn(),
	setOnPacksLoaded: vi.fn(),
}));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn() }));
vi.mock('svelte-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('#lib/core/editor/editor.service.js', () => ({ openFileInEditor: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('#lib/core/filesystem/fs.service.js', () => ({
	createFile: vi.fn(),
	deleteItem: vi.fn(),
	duplicateItem: vi.fn(),
	renameItem: vi.fn(),
	revealInSystemExplorer: vi.fn(),
}));
vi.mock('#lib/features/file-icons/file-icons.service.js', () => ({
	setIconForPath: vi.fn(),
	removeIconForPath: vi.fn(),
	trackRecentIcon: vi.fn(),
}));
vi.mock('#lib/features/type-definitions/type-definitions.service.js', () => ({
	toggleFavoriteForPath: vi.fn(),
}));
vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));

import { mount, unmount, flushSync, tick } from 'svelte';
import RailNoteList from '#lib/features/rail-shell/RailNoteList.svelte';
import { INBOX_LENS } from '#lib/features/rail-shell/lens.logic.js';
import { railRegistryStore } from '#lib/features/rail-shell/rail-registry.store.svelte.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { buildTypeMetadataMap } from '#lib/features/type-definitions/type-definitions.logic.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { createFile, deleteItem, renameItem } from '#lib/core/filesystem/fs.service.js';
import { invoke } from '@tauri-apps/api/core';
import { toggleFavoriteForPath } from '#lib/features/type-definitions/type-definitions.service.js';
import { ask } from '@tauri-apps/plugin-dialog';
import { toast } from 'svelte-sonner';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

const ALPHA = '/vault/Work/alpha.md';
const BETA = '/vault/beta.md';

async function settle(rounds = 4) {
	for (let i = 0; i < rounds; i++) {
		await tick();
		flushSync();
	}
}

describe('RailNoteList', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	async function mountList(lens = INBOX_LENS) {
		component = mount(RailNoteList, { target, props: { lens } });
		await settle();
	}

	function rows(): HTMLElement[] {
		return [...target.querySelectorAll<HTMLElement>('[data-note-row]')];
	}

	function row(title: string): HTMLElement {
		return rows().find((el) => el.querySelector('.truncate')?.textContent?.trim() === title)!;
	}

	function rowTitles(): string[] {
		return rows().map((el) => el.querySelector('.truncate')?.textContent?.trim() ?? '');
	}

	async function chooseMenuItem(title: string, label: string) {
		row(title).dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }));
		await settle();
		const item = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((el) =>
			el.textContent?.trim().startsWith(label),
		)!;
		item.click();
		await settle();
	}

	beforeEach(() => {
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open('/vault');
		editorStore.reset();
		fsStore.reset();
		fileIconsStore.reset();
		typeDefinitionsStore.reset();
		settingsStore.reset();
		railRegistryStore.reset();
		vi.clearAllMocks();
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	it('shows the Inbox label, its rule and one row per inbox note', async () => {
		typeDefinitionsStore.setEntries([
			entryV2(ALPHA, { modifiedAt: 200 }),
			entryV2(BETA, { modifiedAt: 100 }),
			entryV2('/vault/done.md', { organized: true }),
			entryV2('/vault/Types/Project.md', { isA: 'Type' }),
			entryV2('/vault/_system/templates/Daily.md'),
		]);
		await mountList();

		expect(target.querySelector('[data-note-list-label]')?.textContent).toBe('Inbox');
		expect(target.querySelector('[data-note-list-rule]')?.textContent?.trim()).toBe('not organized, not archived');
		expect(rowTitles()).toEqual(['alpha', 'beta']);
	});

	it('shows each row in italics with its type, note date and folder', async () => {
		typeDefinitionsStore.setEntries([
			entryV2(ALPHA, { isA: 'Project', frontmatter: { date: '2026-10-27', created: '2026-10-01' } }),
		]);
		await mountList();

		expect(row('alpha').querySelector('[data-note-row-subtitle]')?.textContent).toBe('Project · 2026-10-27 · Work');
		expect(row('alpha').querySelector('.truncate')?.classList.contains('italic')).toBe(true);
		// The subtitle replaces the classic list's relative-time line.
		expect(row('alpha').textContent).not.toContain('Created');
	});

	it("renders the note type's list-property pills", async () => {
		const def = entryV2('/vault/Types/Project.md', { title: 'Project', isA: 'Type', frontmatter: { _list_properties_display: ['status'] } });
		const note = entryV2(ALPHA, { isA: 'Project', frontmatter: { status: 'active' } });
		typeDefinitionsStore.setTypeMetadataMap(buildTypeMetadataMap([def, note]));
		typeDefinitionsStore.setEntries([def, note]);
		await mountList();

		expect(row('alpha').textContent).toContain('active');
	});

	it("highlights the row of the active tab's note", async () => {
		typeDefinitionsStore.setEntries([entryV2(ALPHA), entryV2(BETA)]);
		editorStore.addTab({ path: BETA, name: 'beta', content: '', savedContent: '' });
		await mountList();

		expect(row('beta').className).toContain('bg-primary/25');
		expect(row('alpha').className).not.toContain('bg-primary/25');
	});

	it('opens the note when a row is clicked', async () => {
		typeDefinitionsStore.setEntries([entryV2(ALPHA)]);
		await mountList();

		row('alpha').click();
		expect(openFileInEditor).toHaveBeenCalledWith(ALPHA);
	});

	it('shows an empty state when the Inbox is empty', async () => {
		typeDefinitionsStore.setEntries([entryV2('/vault/done.md', { organized: true })]);
		await mountList();

		expect(rows()).toHaveLength(0);
		expect(target.querySelector('[data-note-list-empty]')?.textContent?.trim()).toBe('No notes here');
	});

	it('updates when the entries snapshot changes', async () => {
		typeDefinitionsStore.setEntries([entryV2(ALPHA)]);
		await mountList();
		expect(rowTitles()).toEqual(['alpha']);

		typeDefinitionsStore.setEntries([entryV2(ALPHA, { organized: true })]);
		await settle();
		expect(rows()).toHaveLength(0);
	});

	it('resolves a registered lens kind through its provider, and shows the empty state for an unknown one', async () => {
		railRegistryStore.registerLensProvider({
			kind: 'day',
			resolve: (lens) => ({ label: `Day ${lens.target}`, rule: `note date is ${lens.target}`, notes: [] }),
		});
		await mountList({ kind: 'day', target: '2026-10-27' });
		expect(target.querySelector('[data-note-list-label]')?.textContent).toBe('Day 2026-10-27');

		unmount(component!);
		component = null;
		target.innerHTML = '';
		await mountList({ kind: 'nope' });
		expect(target.querySelector('[data-note-list-label]')?.textContent).toBe('');
		expect(target.querySelector('[data-note-list-rule]')).toBeNull();
		expect(target.querySelector('[data-note-list-empty]')).not.toBeNull();
	});

	describe('+ New here', () => {
		// Settings defaults: Cmd+N notes go to `_notes/YYYY/MM-MMM`.
		const FOLDER = '/vault/_notes/2026/10-Oct';
		const CREATED = `${FOLDER}/Untitled.md`;

		function newHereButton(): HTMLButtonElement | null {
			return target.querySelector<HTMLButtonElement>('[data-note-list-new]');
		}

		beforeEach(() => {
			vi.useFakeTimers({ toFake: ['Date'] });
			vi.setSystemTime(new Date(2026, 9, 31, 9, 15));
			vi.mocked(invoke).mockResolvedValue(undefined);
			vi.mocked(createFile).mockImplementation(async (dir, name) => `${dir}/${name}`);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('creates an _organized: false note in the Cmd+N folder, opens it, and the Inbox lists it', async () => {
			typeDefinitionsStore.setEntries([entryV2(ALPHA)]);
			await mountList();
			expect(newHereButton()?.textContent?.trim()).toBe('New here');
			// The header is `bg-tab-bar`: only the tab-bar text tokens are pinned readable on it.
			expect(newHereButton()!.classList).toContain('text-tab-text-inactive');

			newHereButton()!.click();
			await settle();

			expect(invoke).toHaveBeenCalledWith('create_folder', { path: FOLDER });
			expect(createFile).toHaveBeenCalledWith(FOLDER, 'Untitled.md', '---\n_organized: false\n---\n');
			expect(openFileInEditor).toHaveBeenCalledWith(CREATED);
			expect(toast.error).not.toHaveBeenCalled();

			// The index refresh after `create_note` delivers the new entry.
			typeDefinitionsStore.setEntries([entryV2(ALPHA, { modifiedAt: 1 }), entryV2(CREATED, { modifiedAt: 2 })]);
			await settle();
			expect(rowTitles()).toEqual(['Untitled', 'alpha']);
		});

		it('shows the button on an empty Inbox', async () => {
			await mountList();
			expect(target.querySelector('[data-note-list-empty]')).not.toBeNull();
			expect(newHereButton()).not.toBeNull();
		});

		it('is hidden for a lens with no creation rule, and shown when its provider has one', async () => {
			railRegistryStore.registerLensProvider({ kind: 'archive', resolve: () => ({ label: 'Archive', rule: 'archived', notes: [] }) });
			await mountList({ kind: 'archive' });
			expect(target.querySelector('[data-note-list-label]')?.textContent).toBe('Archive');
			expect(newHereButton()).toBeNull();

			unmount(component!);
			component = null;
			target.innerHTML = '';
			railRegistryStore.registerLensProvider({
				kind: 'day',
				resolve: () => ({ label: 'Day', rule: '', notes: [] }),
				newNote: (lens, ctx) => ({ folder: `${ctx.vaultPath}/days`, frontmatter: { date: lens.target! } }),
			});
			await mountList({ kind: 'day', target: '2026-10-27' });
			newHereButton()!.click();
			await settle();
			expect(createFile).toHaveBeenCalledWith('/vault/days', 'Untitled.md', '---\ndate: 2026-10-27\n---\n');
		});

		it('is hidden when no vault is open', async () => {
			vaultStore._reset();
			await mountList();
			expect(newHereButton()).toBeNull();
		});

		it('ignores a second click while the first creation is pending', async () => {
			let finish!: (path: string) => void;
			vi.mocked(createFile).mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
			await mountList();

			newHereButton()!.click();
			await settle();
			newHereButton()!.click();
			await settle();
			expect(createFile).toHaveBeenCalledTimes(1);

			finish(CREATED);
			await settle();
			expect(openFileInEditor).toHaveBeenCalledWith(CREATED);
			expect(toast.error).not.toHaveBeenCalled();

			// Once settled, the button creates again.
			newHereButton()!.click();
			await settle();
			expect(createFile).toHaveBeenCalledTimes(2);
		});

		it('toasts a failed creation and opens nothing', async () => {
			typeDefinitionsStore.setEntries([entryV2(ALPHA)]);
			vi.mocked(createFile).mockRejectedValue(new Error('disk full'));
			await mountList();

			newHereButton()!.click();
			await settle();

			expect(toast.error).toHaveBeenCalledWith('Could not create the note');
			expect(openFileInEditor).not.toHaveBeenCalled();
			expect(rowTitles()).toEqual(['alpha']);
		});
	});

	describe('row menu', () => {
		beforeEach(async () => {
			typeDefinitionsStore.setEntries([entryV2(ALPHA), entryV2(BETA, { favorite: true })]);
			await mountList();
		});

		it('renames a row through the inline input', async () => {
			await chooseMenuItem('alpha', 'Rename');
			expect(fsStore.renamingPath).toBe(ALPHA);

			const input = target.querySelector<HTMLInputElement>('input')!;
			expect(input.value).toBe('alpha');
			input.value = 'gamma';
			input.dispatchEvent(new Event('input', { bubbles: true }));
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
			await settle();

			expect(renameItem).toHaveBeenCalledWith(ALPHA, 'gamma.md');
			expect(fsStore.renamingPath).toBeNull();
		});

		// The file services are mocked here, so these two tests pin only the wiring
		// from a rail row to the service. The resulting state (`_favorite: true`
		// written, the trashed note gone) is owned by e2e/specs/rail-shell.spec.ts,
		// which asserts it on the virtual filesystem.
		it('adds and removes a favorite', async () => {
			await chooseMenuItem('alpha', 'Favorite');
			expect(toggleFavoriteForPath).toHaveBeenCalledWith(ALPHA, true);

			await chooseMenuItem('beta', 'Unfavorite');
			expect(toggleFavoriteForPath).toHaveBeenCalledWith(BETA, false);
			expect(rowTitles()).toEqual(['alpha', 'beta']);
		});

		it('moves a row to the trash after confirming', async () => {
			vi.mocked(ask).mockResolvedValue(true);
			await chooseMenuItem('alpha', 'Move to Trash');
			expect(deleteItem).toHaveBeenCalledWith(ALPHA, false);
			expect(toast.error).not.toHaveBeenCalled();
		});

		it('toasts a failed trash', async () => {
			vi.mocked(ask).mockResolvedValue(true);
			vi.mocked(deleteItem).mockRejectedValue(new Error('disk full'));
			await chooseMenuItem('alpha', 'Move to Trash');
			expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('alpha'));
		});
	});
});
