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
	createTypedNote: vi.fn(),
}));
vi.mock('#lib/features/properties/lifecycle.service.js', () => ({
	toggleFavoriteForPath: vi.fn(),
}));
vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));

import { mount, unmount, flushSync, tick } from 'svelte';
import dayjs from 'dayjs';
import Plus from '@lucide/svelte/icons/plus';
import RailNoteList from '#lib/features/rail-shell/RailNoteList.svelte';
import {
	ARCHIVE_LENS,
	FAVORITES_LENS,
	FILES_LENS,
	INBOX_LENS,
	listEntries,
	neighbourhoodLens,
	TODAY_LENS,
	TYPES_LENS,
	UNTYPED_LENS,
} from '#lib/features/rail-shell/lens.logic.js';
import { eventCalendarDailyNoteStore } from '#lib/features/event-calendar/event-calendar-daily-note.store.svelte.js';
import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
import { railRegistryStore } from '#lib/features/rail-shell/rail-registry.store.svelte.js';
import { registerOneOnOneTodaySection } from '#lib/plugins/one-on-one/one-on-one-today.service.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { buildTypeMetadataMap } from '#lib/features/type-definitions/type-definitions.logic.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { READABILITY_PAIRS } from '#lib/core/settings/theme-builder.logic.js';
import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { createFile, deleteItem, renameItem } from '#lib/core/filesystem/fs.service.js';
import { invoke } from '@tauri-apps/api/core';
import { createTypedNote } from '#lib/features/type-definitions/type-definitions.service.js';
import { toggleFavoriteForPath } from '#lib/features/properties/lifecycle.service.js';
import { ask } from '@tauri-apps/plugin-dialog';
import { toast } from 'svelte-sonner';
import { entryV2, outgoingLinksFromContent } from '../../../fixtures/vault-entries.fixture';

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
		settingsStore.setSettings({ ...settingsStore.settings, explicitOrganization: false });
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

	it('colors the title of a note with only a text color and keeps the fallback icon', async () => {
		typeDefinitionsStore.setEntries([entryV2(ALPHA), entryV2(BETA)]);
		fileIconsStore.setFrontmatterIcons(new Map([[ALPHA, { titleColor: '#3b82f6' }]]));
		await mountList();

		const [alpha, beta] = rows();
		expect(alpha.querySelector<HTMLElement>('[data-note-row-title]')!.style.color).toBe('rgb(59, 130, 246)');
		expect(alpha.querySelector('[data-note-row-fallback-icon]')).not.toBeNull();
		expect(beta.querySelector<HTMLElement>('[data-note-row-title]')!.style.color).toBe('');
	});

	it('sets the header above its rows like the navigators, and the count in the metadata role', async () => {
		typeDefinitionsStore.setEntries([entryV2(ALPHA), entryV2(BETA)]);
		await mountList();

		const label = target.querySelector('[data-note-list-label]')!;
		expect(label.classList).toContain('text-title');
		const count = target.querySelector('[data-note-list-count]')!;
		expect(count.textContent).toBe('2');
		expect(count.classList).toContain('text-meta');
		// The header's container query drops it when narrow, or the sort arrow runs into the search icon.
		expect(count.classList).toContain('@max-[12rem]:hidden');
		// The rows share the row role with the Files and Types tree rows.
		for (const el of rows()) {
			expect(el.querySelector('[data-note-row-title]')!.classList).toContain('text-row');
		}
	});

	it('keeps the title readable in a narrow header: the actions are icon buttons and the count uses a readable tab token', async () => {
		const offOpener = eventCalendarDailyNoteStore.register(vi.fn().mockResolvedValue(undefined));
		try {
			await mountList(TODAY_LENS);

			// The title is the item that grows and shrinks, and never below 64px (4 characters at text-title).
			const label = target.querySelector('[data-note-list-label]')!;
			expect(label.textContent).toBe('Today');
			expect(label.classList).toContain('flex-1');
			expect(label.classList).toContain('min-w-16');

			for (const [selector, name] of [
				['[data-note-list-header-action]', 'Daily note'],
				['[data-note-list-new]', 'New here'],
			]) {
				const button = target.querySelector<HTMLButtonElement>(selector)!;
				expect(button.tagName).toBe('BUTTON');
				expect(button.getAttribute('aria-label')).toBe(name);
				expect(button.title).not.toBe('');
				expect(button.querySelector('svg')).not.toBeNull();
				expect(button.textContent?.trim()).toBe('');
			}

			// The header is bg-tab-bar; the count's token is held to 4.5:1 there in every built-in theme.
			expect(target.querySelector('[data-note-list-count]')!.classList).toContain('text-tab-text-inactive');
			expect(READABILITY_PAIRS).toContainEqual(['ui', 'tabTextInactive', 'ui', 'tabBar', 4.5]);
		} finally {
			offOpener();
		}
	});

	it('clears the traffic lights (header pad) only as the first pane after the rail', async () => {
		const header = () => target.querySelector('[data-note-list-label]')!.parentElement!;

		await mountList();
		expect(header().classList).toContain('pl-3');
		expect(header().classList).not.toContain('pl-[var(--rail-header-pad)]');
		unmount(component!);

		component = mount(RailNoteList, { target, props: { lens: INBOX_LENS, firstPane: true } });
		await settle();
		expect(header().classList).toContain('pl-[var(--rail-header-pad)]');
		expect(header().classList).not.toContain('pl-3');
	});

	it('does not re-resolve a non-folder lens when the file tree is replaced, and still follows a new note', async () => {
		typeDefinitionsStore.setEntries([entryV2(ALPHA, { modifiedAt: 200 })]);
		const entriesRead = vi.spyOn(typeDefinitionsStore, 'entries', 'get');
		await mountList();
		expect(rowTitles()).toEqual(['alpha']);
		entriesRead.mockClear();

		fsStore.setFileTree([{ name: 'beta.md', path: BETA, isDirectory: false }]);
		await settle();
		expect(entriesRead).not.toHaveBeenCalled();

		typeDefinitionsStore.setEntries([entryV2(ALPHA, { modifiedAt: 200 }), entryV2(BETA, { modifiedAt: 100 })]);
		await settle();
		expect(rowTitles()).toEqual(['alpha', 'beta']);
		entriesRead.mockRestore();
	});

	it('shows each row in italics with its type, relative modified time and folder', async () => {
		const now = new Date(2026, 9, 31, 9, 15).getTime();
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(now);
		try {
			typeDefinitionsStore.setEntries([
				entryV2(ALPHA, { isA: 'Project', frontmatter: { date: '2026-10-27', created: '2026-10-01' }, modifiedAt: now / 1000 - 2 * 3600 }),
			]);
			await mountList();

			expect(row('alpha').querySelector('[data-note-row-subtitle]')?.textContent).toBe('2h ago · Work');
			expect(row('alpha').querySelector('.truncate')?.classList.contains('italic')).toBe(true);
			// The subtitle is the row's only date line.
			expect(row('alpha').textContent).not.toContain('Created');
		} finally {
			vi.useRealTimers();
		}
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
		// The same 8px corner as the rail and the right-sidebar rows.
		expect(row('beta').classList).toContain('rounded-md');
		expect(row('beta').className).not.toMatch(/(^|\s)rounded(\s|$)/);
	});

	it('opens the note when a row is clicked', async () => {
		typeDefinitionsStore.setEntries([entryV2(ALPHA)]);
		await mountList();

		row('alpha').click();
		expect(openFileInEditor).toHaveBeenCalledWith(ALPHA);
	});

	it('rows drag with their path, for a drop on a Files navigator folder', async () => {
		typeDefinitionsStore.setEntries([entryV2(ALPHA), entryV2(BETA)]);
		await mountList();

		expect(row('alpha').getAttribute('draggable')).toBe('true');
		const setData = vi.fn();
		const event = new Event('dragstart', { bubbles: true, cancelable: true }) as DragEvent;
		Object.defineProperty(event, 'dataTransfer', { value: { setData, effectAllowed: '' } });
		row('alpha').dispatchEvent(event);

		expect(setData).toHaveBeenCalledWith('text/plain', ALPHA);
		expect(event.dataTransfer!.effectAllowed).toBe('move');
	});

	it('a row being renamed has nothing to drag', async () => {
		typeDefinitionsStore.setEntries([entryV2(ALPHA)]);
		await mountList();
		fsStore.setRenamingPath(ALPHA);
		await settle();

		expect(rows()).toHaveLength(0);
		expect(target.querySelector('[draggable="true"]')).toBeNull();
	});

	it('a row being renamed keeps the 8px row corner', async () => {
		typeDefinitionsStore.setEntries([entryV2(ALPHA)]);
		await mountList();
		fsStore.setRenamingPath(ALPHA);
		await settle();

		const wrapper = target.querySelector('input')!.parentElement!;
		expect(wrapper.classList).toContain('rounded-md');
		expect(wrapper.className).not.toMatch(/(^|\s)rounded(\s|$)/);
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
		typeDefinitionsStore.setEntries([]);
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

	describe('before the entries land', () => {
		const DAY = '2026-10-27';
		const HUB = '/vault/Hub.md';

		function expectLoading() {
			expect(target.querySelector('[data-note-list-loading]')?.textContent?.trim()).toBe('Loading...');
			expect(target.querySelector('[data-note-list-empty]')).toBeNull();
			expect(target.querySelector('[data-note-list-group-empty]')).toBeNull();
			expect(rows()).toEqual([]);
		}

		function landEntries(...extra: NoteEntryV2[]) {
			typeDefinitionsStore.setEntries([
				entryV2(ALPHA, { isA: 'Project', modifiedAt: 2, favorite: true }),
				entryV2(BETA, { modifiedAt: 1, archived: true }),
				...extra,
			]);
			return settle();
		}

		it.each([
			['Inbox', INBOX_LENS, ['alpha']],
			['Favorites', FAVORITES_LENS, ['alpha']],
			['Archive', ARCHIVE_LENS, ['beta']],
			['a type', { kind: 'type', target: 'Project' }, ['alpha']],
			['Untyped', UNTYPED_LENS, []],
		])('%s shows Loading, then its rows', async (_name, lens, titles) => {
			await mountList(lens);
			expectLoading();
			await landEntries();
			expect(target.querySelector('[data-note-list-loading]')).toBeNull();
			expect(rowTitles()).toEqual(titles);
		});

		it('shows no count in the header while it waits, and the count after', async () => {
			await mountList();
			expect(target.querySelector('[data-note-list-count]')?.textContent).toBe('');
			await landEntries();
			expect(target.querySelector('[data-note-list-count]')?.textContent).toBe('1');
		});

		it('keeps the label and the rule of a built-in lens while it waits', async () => {
			await mountList();
			expect(target.querySelector('[data-note-list-label]')?.textContent).toBe('Inbox');
			expect(target.querySelector('[data-note-list-rule]')?.textContent?.trim()).toBe('not organized, not archived');
		});

		it('the bare Types lens shows Loading, not an empty list', async () => {
			await mountList(TYPES_LENS);
			expectLoading();
		});

		it('Today shows Loading in place of its false "Nothing here" and My people, which read the entries', async () => {
			registerOneOnOneTodaySection();
			settingsStore.setSettings({ ...settingsStore.settings, oneOnOne: { ...settingsStore.settings.oneOnOne, workPeopleFolder: 'People' } });
			await mountList(TODAY_LENS);
			expectLoading();
			expect(target.querySelector('[data-my-people-empty]')).toBeNull();
			expect(target.querySelector('[data-note-list-label]')?.textContent).toBe('Today');
			await landEntries();
			expect(target.querySelector('[data-note-list-loading]')).toBeNull();
			expect(target.querySelector('[data-note-list-group="today"]')).not.toBeNull();
			expect(target.querySelector('[data-my-people-empty]')).not.toBeNull();
		});

		it('a neighbourhood shows Loading, then the note and its links', async () => {
			await mountList(neighbourhoodLens(HUB));
			expectLoading();
			await landEntries(entryV2(HUB));
			expect(target.querySelector('[data-note-list-loading]')).toBeNull();
			expect(rowTitles()).toEqual(['Hub']);
		});

		it("a provider's lens, such as the Calendar's day, keeps its label and shows Loading", async () => {
			railRegistryStore.registerLensProvider({
				kind: 'day',
				resolve: (lens, ctx) => ({ label: `Day ${lens.target}`, rule: '', notes: listEntries(ctx, (e) => e.path === ALPHA) }),
			});
			await mountList({ kind: 'day', target: DAY });
			expectLoading();
			expect(target.querySelector('[data-note-list-label]')?.textContent).toBe(`Day ${DAY}`);
			await landEntries();
			expect(rowTitles()).toEqual(['alpha']);
		});

		it('a folder lens does not wait: it lists the file tree', async () => {
			fsStore.setFileTree([{ name: 'beta.md', path: BETA, isDirectory: false }]);
			await mountList(FILES_LENS);
			expect(target.querySelector('[data-note-list-loading]')).toBeNull();
			expect(rowTitles()).toEqual(['beta']);
		});

		it('an empty folder says so without waiting for the entries', async () => {
			await mountList(FILES_LENS);
			expect(target.querySelector('[data-note-list-loading]')).toBeNull();
			expect(target.querySelector('[data-note-list-empty]')).not.toBeNull();
		});

		it('a vault with no notes leaves Loading', async () => {
			await mountList();
			expectLoading();
			typeDefinitionsStore.setEntries([]);
			await settle();
			expect(target.querySelector('[data-note-list-loading]')).toBeNull();
			expect(target.querySelector('[data-note-list-empty]')?.textContent?.trim()).toBe('No notes here');
		});

		it('a built-in lens does not wait for the property index: a failed whole read leaves Inbox working', async () => {
			collectionStore.reset();
			typeDefinitionsStore.setEntries([entryV2(ALPHA)]);
			await mountList();
			expect(collectionStore.isIndexReady).toBe(false);
			expect(target.querySelector('[data-note-list-loading]')).toBeNull();
			expect(rowTitles()).toEqual(['alpha']);
		});

		it('a built-in lens keeps Sort and Search hidden while it waits, and shows them after', async () => {
			await mountList();
			expect(target.querySelector('[data-note-list-search-toggle]')).toBeNull();
			await landEntries();
			expect(target.querySelector('[data-note-list-search-toggle]')).not.toBeNull();
		});
	});

	describe('provider header action', () => {
		const actionButton = () => target.querySelector<HTMLButtonElement>('[data-note-list-header-action]');

		function registerDay(run: (lens: { kind: string; target?: string }) => Promise<void>) {
			railRegistryStore.registerLensProvider({
				kind: 'day',
				resolve: () => ({ label: 'Day', rule: '', notes: [] }),
				headerAction: { label: 'Daily note', title: 'Open or create the daily note', icon: Plus, failureMessage: 'Could not open the daily note', run },
			});
		}

		it('shows the button with its label and runs it on the shown lens', async () => {
			const run = vi.fn().mockResolvedValue(undefined);
			registerDay(run);
			await mountList({ kind: 'day', target: '2026-10-27' });
			expect(actionButton()?.getAttribute('aria-label')).toBe('Daily note');
			expect(actionButton()?.title).toBe('Open or create the daily note');
			expect(actionButton()?.className).not.toMatch(/#[0-9a-f]{3,6}|rgb\(/i);

			actionButton()!.click();
			await settle();
			expect(run).toHaveBeenCalledWith({ kind: 'day', target: '2026-10-27' });
			expect(toast.error).not.toHaveBeenCalled();
		});

		it('toasts when the action fails', async () => {
			registerDay(vi.fn().mockRejectedValue(new Error('no template')));
			await mountList({ kind: 'day', target: '2026-10-27' });
			actionButton()!.click();
			await settle();
			expect(toast.error).toHaveBeenCalledWith('Could not open the daily note');
		});

		it('is absent for a lens whose provider has none, and for built-in lenses', async () => {
			railRegistryStore.registerLensProvider({ kind: 'reading', resolve: () => ({ label: 'Reading', rule: '', notes: [] }) });
			await mountList({ kind: 'reading' });
			expect(actionButton()).toBeNull();

			unmount(component!);
			component = null;
			target.innerHTML = '';
			registerDay(vi.fn());
			await mountList(INBOX_LENS);
			expect(actionButton()).toBeNull();
		});
	});

	describe('type chip', () => {
		const typeChip = (title: string) => row(title).querySelector('[data-note-row-type]');

		it('shows the type of each typed note as a chip, and none on an untyped note', async () => {
			typeDefinitionsStore.setEntries([
				entryV2(ALPHA, { isA: 'Operation' }),
				entryV2(BETA, { isA: 'Note' }),
				entryV2('/vault/untyped.md', { frontmatter: { date: '2020-01-01' } }),
			]);
			await mountList();

			expect(typeChip('alpha')?.textContent?.trim()).toBe('Operation');
			expect(typeChip('beta')?.textContent?.trim()).toBe('Note');
			expect(typeChip('untyped')).toBeNull();
		});

		it('shows the type next to the properties its definition lists', async () => {
			const definition = entryV2('/vault/Project.md', { isA: 'Type', frontmatter: { _list_properties_display: ['status'] } });
			const entries = [definition, entryV2(ALPHA, { isA: 'Project', frontmatter: { status: 'open' } })];
			typeDefinitionsStore.setEntries(entries);
			typeDefinitionsStore.setTypeMetadataMap(buildTypeMetadataMap(entries));
			await mountList();

			const pills = typeChip('alpha')!.parentElement!;
			expect(pills.textContent?.replace(/\s+/g, ' ').trim()).toBe('Project open');
		});

		it('leaves the chip out where the list already is that type', async () => {
			typeDefinitionsStore.setEntries([entryV2(ALPHA, { isA: 'Operation' })]);
			await mountList({ kind: 'type', target: 'Operation' });

			expect(rowTitles()).toEqual(['alpha']);
			expect(typeChip('alpha')).toBeNull();
		});

		it('shows no chip on a file with no type', async () => {
			typeDefinitionsStore.setEntries([entryV2(ALPHA, { isA: 'Project' })]);
			fsStore.setFileTree([
				{ name: 'Work', path: '/vault/Work', isDirectory: true, children: [{ name: 'Board.canvas', path: '/vault/Work/Board.canvas', isDirectory: false }] },
			]);
			await mountList({ kind: 'folder', target: '/vault/Work' });

			expect(typeChip('Board')).toBeNull();
		});
	});

	describe('Today', () => {
		const FAVORITE = '/vault/favorite.md';
		const DATED = '/vault/Work/dated.md';
		const groupHeaders = () =>
			[...target.querySelectorAll<HTMLElement>('[data-note-list-group]')].map((el) => ({
				id: el.dataset.noteListGroup,
				text: el.textContent?.replace(/\s+/g, ' ').trim(),
			}));
		const dailyNoteButton = () => target.querySelector<HTMLButtonElement>('[data-note-list-header-action]');
		let offOpener: (() => void) | null = null;

		afterEach(() => {
			offOpener?.();
			offOpener = null;
			vi.useRealTimers();
		});

		/** Unmounts while a fake clock is live, so the clock release clears a fake timer id. */
		function unmountNow() {
			unmount(component!);
			component = null;
		}

		it('shows only the notes dated today under a header with its count, leaving other favorites out', async () => {
			const today = dayjs().format('YYYY-MM-DD');
			typeDefinitionsStore.setEntries([
				entryV2(FAVORITE, { favorite: true, frontmatter: { date: '2020-01-01' }, modifiedAt: 300 }),
				entryV2(DATED, { frontmatter: { date: today }, modifiedAt: 200 }),
				entryV2('/vault/other.md', { frontmatter: { date: '2020-01-02' } }),
			]);
			await mountList(TODAY_LENS);

			expect(target.querySelector('[data-note-list-label]')?.textContent).toBe('Today');
			expect(target.querySelector('[data-note-list-rule]')?.textContent?.trim()).toBe('note date is today');
			expect(groupHeaders()).toEqual([{ id: 'today', text: 'Today 1' }]);
			expect(rowTitles()).toEqual(['dated']);
			const todayHeader = target.querySelector('[data-note-list-group="today"]')!;
			expect(todayHeader.compareDocumentPosition(row('dated')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
			for (const header of target.querySelectorAll('[data-note-list-group]')) {
				// The same label style as the Types navigator's "Views".
				expect(header.classList).toContain('section-label');
				expect(header.className).toContain('text-file-explorer-muted-fg');
				expect(header.className).not.toMatch(/#[0-9a-f]{3,6}|rgb\(/i);
			}
		});

		it('shows a favorite dated today once', async () => {
			typeDefinitionsStore.setEntries([entryV2(FAVORITE, { favorite: true, frontmatter: { date: dayjs().format('YYYY-MM-DD') } })]);
			await mountList(TODAY_LENS);
			expect(rowTitles()).toEqual(['favorite']);
			expect(target.querySelector('[data-note-list-label]')?.nextElementSibling?.textContent).toBe('1');
		});

		it('shows the Today header and its empty notice over an empty snapshot', async () => {
			typeDefinitionsStore.setEntries([]);
			await mountList(TODAY_LENS);
			expect(groupHeaders()).toEqual([{ id: 'today', text: 'Today 0' }]);
			expect(target.querySelectorAll('[data-note-list-group-empty]')).toHaveLength(1);
			expect(rows()).toEqual([]);
		});

		it('moves to the new day when left open past midnight', async () => {
			vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
			vi.setSystemTime(new Date(2026, 9, 31, 23, 59, 50));
			typeDefinitionsStore.setEntries([
				entryV2('/vault/halloween.md', { frontmatter: { date: '2026-10-31' } }),
				entryV2('/vault/november.md', { frontmatter: { date: '2026-11-01' } }),
			]);
			await mountList(TODAY_LENS);
			expect(rowTitles()).toEqual(['halloween']);

			vi.advanceTimersByTime(30_000);
			await settle();
			expect(rowTitles()).toEqual(['november']);
			unmountNow();
		});

		it('does not re-resolve the lens on a clock tick that stays on the same day', async () => {
			vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
			vi.setSystemTime(new Date(2026, 9, 31, 10, 0, 0));
			typeDefinitionsStore.setEntries([entryV2('/vault/halloween.md', { frontmatter: { date: '2026-10-31' } })]);
			const entriesRead = vi.spyOn(typeDefinitionsStore, 'entries', 'get');
			await mountList(TODAY_LENS);
			expect(rowTitles()).toEqual(['halloween']);
			entriesRead.mockClear();

			vi.advanceTimersByTime(60_000);
			await settle();
			expect(entriesRead).not.toHaveBeenCalled();
			expect(rowTitles()).toEqual(['halloween']);
			entriesRead.mockRestore();
			unmountNow();
		});

		it('New here creates a plain note dated today in the Cmd+N folder', async () => {
			vi.useFakeTimers({ toFake: ['Date'] });
			vi.setSystemTime(new Date(2026, 9, 31, 9, 15));
			vi.mocked(invoke).mockResolvedValue(undefined);
			vi.mocked(createFile).mockImplementation(async (dir, name) => `${dir}/${name}`);
			await mountList(TODAY_LENS);

			target.querySelector<HTMLButtonElement>('[data-note-list-new]')!.click();
			await settle();
			expect(createFile).toHaveBeenCalledWith('/vault/_notes/2026/10-Oct', 'Untitled.md', '---\ndate: 2026-10-31\n---\n');
			expect(openFileInEditor).toHaveBeenCalledWith('/vault/_notes/2026/10-Oct/Untitled.md');
			unmountNow();
		});

		it("Daily note opens or creates today's daily note through the registered opener", async () => {
			const opener = vi.fn().mockResolvedValue(undefined);
			offOpener = eventCalendarDailyNoteStore.register(opener);
			await mountList(TODAY_LENS);
			expect(dailyNoteButton()?.getAttribute('aria-label')).toBe('Daily note');
			expect(dailyNoteButton()!.classList).toContain('text-tab-text-inactive');

			dailyNoteButton()!.click();
			await settle();
			expect(opener).toHaveBeenCalledWith(dayjs().format('YYYY-MM-DD'));
			expect(toast.error).not.toHaveBeenCalled();
		});

		it('toasts when the daily note cannot be opened', async () => {
			offOpener = eventCalendarDailyNoteStore.register(vi.fn().mockRejectedValue(new Error('no template')));
			await mountList(TODAY_LENS);
			dailyNoteButton()!.click();
			await settle();
			expect(toast.error).toHaveBeenCalledWith('Could not open the daily note');
		});

		it('hides Daily note while no opener is registered, and on other lenses', async () => {
			await mountList(TODAY_LENS);
			expect(dailyNoteButton()).toBeNull();

			unmountNow();
			target.innerHTML = '';
			offOpener = eventCalendarDailyNoteStore.register(vi.fn());
			await mountList(FAVORITES_LENS);
			expect(dailyNoteButton()).toBeNull();
		});

		it('renders a registered Today section before the notes dated today, and drops it when unregistered', async () => {
			const off = railRegistryStore.registerTodaySection({ id: 'people', label: 'My people', component: Plus });
			typeDefinitionsStore.setEntries([]);
			await mountList(TODAY_LENS);

			expect(groupHeaders().map((h) => h.id)).toEqual(['people', 'today']);
			expect(groupHeaders()[0].text).toBe('My people');
			const section = target.querySelector('[data-today-section="people"]')!;
			expect(section.querySelector('svg')).not.toBeNull();
			expect(section.compareDocumentPosition(target.querySelector('[data-note-list-group="today"]')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

			off();
			await settle();
			expect(target.querySelector('[data-today-section]')).toBeNull();
			expect(groupHeaders().map((h) => h.id)).toEqual(['today']);
		});

		it("renders the one-on-one plugin's My people before the notes dated today", async () => {
			typeDefinitionsStore.setEntries([
				entryV2('/vault/Work/_people/Ana.md', { isA: 'Person' }),
			]);
			registerOneOnOneTodaySection();
			await mountList(TODAY_LENS);

			expect(groupHeaders().map((h) => h.id)).toEqual(['my-people', 'today']);
			const section = target.querySelector('[data-today-section="my-people"]')!;
			expect(section.querySelector('[data-my-people-row="Ana"] [data-my-people-days]')?.textContent?.trim()).toBe('never');
			expect(section.compareDocumentPosition(target.querySelector('[data-note-list-group="today"]')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		});

		it('shows no Today section on other lenses', async () => {
			railRegistryStore.registerTodaySection({ id: 'people', label: 'My people', component: Plus });
			await mountList(FAVORITES_LENS);
			expect(target.querySelector('[data-today-section]')).toBeNull();
			expect(target.querySelector('[data-note-list-group]')).toBeNull();
		});
	});

	describe('Neighbourhood', () => {
		const HUB = '/vault/Work/Project Alpha.md';
		const groupHeaders = () =>
			[...target.querySelectorAll<HTMLElement>('[data-note-list-group]')].map((el) => el.textContent?.replace(/\s+/g, ' ').trim());

		it('shows the note, then each group under its header with its count', async () => {
			typeDefinitionsStore.setEntries([
				entryV2(HUB, { outgoingLinks: outgoingLinksFromContent('[[Spec]]'), belongsTo: ['Roadmap'], relationships: { client: ['Acme'] } }),
				entryV2('/vault/Spec.md'),
				entryV2('/vault/Roadmap.md'),
				entryV2('/vault/Acme.md'),
				entryV2('/vault/mention.md', { outgoingLinks: outgoingLinksFromContent('[[Project Alpha]]') }),
			]);
			await mountList(neighbourhoodLens(HUB));

			expect(target.querySelector('[data-note-list-label]')?.textContent).toBe('Project Alpha');
			expect(target.querySelector('[data-note-list-rule]')?.textContent?.trim()).toBe('Project Alpha and everything linked to it');
			expect(groupHeaders()).toEqual([
				'This note 1',
				'Outgoing links 1',
				'Backlinks 1',
				'Belongs to 1',
				'Related to 0',
				'Has many 0',
				'Other relationships 1',
			]);
			expect(rowTitles()).toEqual(['Project Alpha', 'Spec', 'mention', 'Roadmap', 'Acme']);
			expect(target.querySelectorAll('[data-note-list-group-empty]')).toHaveLength(2);
			expect(target.querySelector('[data-note-list-new]')).toBeNull();
		});

		it('shows every group at 0 for a note with no links', async () => {
			typeDefinitionsStore.setEntries([entryV2(HUB)]);
			await mountList(neighbourhoodLens(HUB));
			expect(groupHeaders()).toEqual([
				'This note 1',
				'Outgoing links 0',
				'Backlinks 0',
				'Belongs to 0',
				'Related to 0',
				'Has many 0',
				'Other relationships 0',
			]);
			expect(rowTitles()).toEqual(['Project Alpha']);
			expect(target.querySelectorAll('[data-note-list-group-empty]')).toHaveLength(6);
		});

		it('refreshes when a new entries snapshot lands (vault index version bump)', async () => {
			typeDefinitionsStore.setEntries([entryV2(HUB), entryV2('/vault/mention.md')]);
			await mountList(neighbourhoodLens(HUB));
			expect(groupHeaders()[2]).toBe('Backlinks 0');

			typeDefinitionsStore.setEntries([
				entryV2(HUB),
				entryV2('/vault/mention.md', { outgoingLinks: outgoingLinksFromContent('[[Project Alpha]]') }),
			]);
			await settle();
			expect(groupHeaders()[2]).toBe('Backlinks 1');
			expect(rowTitles()).toEqual(['Project Alpha', 'mention']);
		});

		it('shows no list once the note is gone from the snapshot', async () => {
			typeDefinitionsStore.setEntries([entryV2('/vault/other.md')]);
			await mountList(neighbourhoodLens(HUB));
			expect(target.querySelector('[data-note-list-label]')?.textContent).toBe('');
			expect(target.querySelector('[data-note-list-empty]')?.textContent?.trim()).toBe('No notes here');
			expect(rows()).toEqual([]);
		});

		it('opens a row in the editor', async () => {
			typeDefinitionsStore.setEntries([entryV2(HUB, { outgoingLinks: outgoingLinksFromContent('[[Spec]]') }), entryV2('/vault/Spec.md')]);
			await mountList(neighbourhoodLens(HUB));
			row('Spec').click();
			await settle();
			expect(openFileInEditor).toHaveBeenCalledWith('/vault/Spec.md');
		});
	});

	describe('Favorites and Archive', () => {
		it('shows the Favorites label, its rule and its notes', async () => {
			typeDefinitionsStore.setEntries([
				entryV2(ALPHA, { favorite: true, modifiedAt: 200 }),
				entryV2(BETA, { favorite: true, archived: true, modifiedAt: 300 }),
				entryV2('/vault/plain.md'),
			]);
			await mountList(FAVORITES_LENS);

			expect(target.querySelector('[data-note-list-label]')?.textContent).toBe('Favorites');
			expect(target.querySelector('[data-note-list-rule]')?.textContent?.trim()).toBe('favorite, not archived');
			expect(rowTitles()).toEqual(['alpha']);
		});

		it('shows the Archive label, its rule and its notes', async () => {
			typeDefinitionsStore.setEntries([
				entryV2(ALPHA, { archived: true }),
				entryV2(BETA, { favorite: true }),
			]);
			await mountList(ARCHIVE_LENS);

			expect(target.querySelector('[data-note-list-label]')?.textContent).toBe('Archive');
			expect(target.querySelector('[data-note-list-rule]')?.textContent?.trim()).toBe('archived');
			expect(rowTitles()).toEqual(['alpha']);
		});

		// The action bar writes the flag; the index refresh then republishes the
		// entries snapshot (`tauri-listeners.service.ts`), modeled by setEntries.
		it('lists a note as soon as the snapshot marks it favorite, and drops it when archived', async () => {
			typeDefinitionsStore.setEntries([entryV2(ALPHA), entryV2(BETA, { favorite: true })]);
			await mountList(FAVORITES_LENS);
			expect(rowTitles()).toEqual(['beta']);

			typeDefinitionsStore.setEntries([entryV2(ALPHA, { favorite: true, modifiedAt: 5 }), entryV2(BETA, { favorite: true })]);
			await settle();
			expect(rowTitles()).toEqual(['alpha', 'beta']);

			typeDefinitionsStore.setEntries([entryV2(ALPHA, { favorite: true, archived: true }), entryV2(BETA, { favorite: true })]);
			await settle();
			expect(rowTitles()).toEqual(['beta']);
		});

		it('drops a restored note from the Archive and shows the empty state', async () => {
			typeDefinitionsStore.setEntries([entryV2(ALPHA, { archived: true })]);
			await mountList(ARCHIVE_LENS);
			expect(rowTitles()).toEqual(['alpha']);

			typeDefinitionsStore.setEntries([entryV2(ALPHA)]);
			await settle();
			expect(rows()).toHaveLength(0);
			expect(target.querySelector('[data-note-list-empty]')?.textContent?.trim()).toBe('No notes here');
		});

		it('shows the empty state over an empty snapshot', async () => {
			typeDefinitionsStore.setEntries([]);
			await mountList(FAVORITES_LENS);
			expect(target.querySelector('[data-note-list-empty]')).not.toBeNull();
		});
	});

	describe('Type and Untyped lenses', () => {
		const PROJECT = { kind: 'type', target: 'Project' };
		const ENTRIES = [
			entryV2('/vault/Project.md', { isA: 'Type', frontmatter: { _sidebar_label: 'All projects' } }),
			entryV2(ALPHA, { isA: 'Project', modifiedAt: 1 }),
			entryV2(BETA, { isA: 'Project', modifiedAt: 2 }),
			entryV2('/vault/shelved.md', { isA: 'Project', archived: true }),
			entryV2('/vault/loose.md'),
		];

		beforeEach(() => {
			typeDefinitionsStore.setEntries(ENTRIES);
			typeDefinitionsStore.setTypeMetadataMap(buildTypeMetadataMap(ENTRIES));
		});

		it("shows the type's label, its rule and its notes without the archived one", async () => {
			await mountList(PROJECT);
			expect(target.querySelector('[data-note-list-label]')?.textContent).toBe('All projects');
			expect(target.querySelector('[data-note-list-rule]')?.textContent?.trim()).toBe('type is Project, not archived');
			expect(rowTitles()).toEqual(['beta', 'alpha']);
			// No Open / Archived / Favorites tabs in the rail note list.
			expect(target.textContent).not.toMatch(/Archived|Open \d/);
		});

		it('shows Untyped with the notes that have no type', async () => {
			await mountList(UNTYPED_LENS);
			expect(target.querySelector('[data-note-list-label]')?.textContent).toBe('Untyped');
			expect(target.querySelector('[data-note-list-rule]')?.textContent?.trim()).toBe('no type, not archived');
			expect(rowTitles()).toEqual(['loose']);
		});

		it('creates a note of the type from New here and opens it', async () => {
			vi.mocked(createTypedNote).mockResolvedValue('/vault/Untitled Project.md');
			await mountList(PROJECT);
			target.querySelector<HTMLButtonElement>('[data-note-list-new]')!.click();
			await settle();

			expect(createTypedNote).toHaveBeenCalledWith({ typeName: 'Project', title: 'Untitled Project' });
			expect(openFileInEditor).toHaveBeenCalledWith('/vault/Untitled Project.md');
			expect(toast.error).not.toHaveBeenCalled();
		});

		it('toasts when the typed note cannot be created', async () => {
			vi.mocked(createTypedNote).mockRejectedValue(new Error('create-failed'));
			await mountList(PROJECT);
			target.querySelector<HTMLButtonElement>('[data-note-list-new]')!.click();
			await settle();

			expect(toast.error).toHaveBeenCalledWith('Could not create the note');
			expect(openFileInEditor).not.toHaveBeenCalled();
		});

		it('shows an empty list with no New here before a type is picked', async () => {
			await mountList(TYPES_LENS);
			expect(target.querySelector('[data-note-list-empty]')).not.toBeNull();
			expect(target.querySelector('[data-note-list-new]')).toBeNull();
		});
	});

	describe('Folder lens', () => {
		const WORK = '/vault/Work';
		const node = (path: string, isDirectory = false, children?: FileTreeNode[]): FileTreeNode => ({
			name: path.split('/').pop()!,
			path,
			isDirectory,
			...(children ? { children } : {}),
		});
		const workChildren = (): FileTreeNode[] => [
			node(`${WORK}/projects`, true, [node(`${WORK}/projects/Deep.md`)]),
			node(ALPHA),
			node(`${WORK}/Board.canvas`),
			node(`${WORK}/Tasks.kanban`),
			node(`${WORK}/Open.view`),
			node(`${WORK}/Spec.pdf`),
			node(`${WORK}/Shot.png`),
		];
		const setTree = (children: FileTreeNode[]) => fsStore.setFileTree([node(WORK, true, children), node(BETA)]);
		const iconOf = (title: string) => row(title).querySelector('[data-note-row-fallback-icon]')?.getAttribute('class') ?? '';

		beforeEach(() => {
			typeDefinitionsStore.setEntries([entryV2(ALPHA, { isA: 'Project' }), entryV2(BETA)]);
			setTree(workChildren());
		});

		it("lists the folder's direct files of every kind with the rule \"in <folder>/\"", async () => {
			await mountList({ kind: 'folder', target: WORK });
			expect(target.querySelector('[data-note-list-label]')?.textContent).toBe('Work');
			expect(target.querySelector('[data-note-list-rule]')?.textContent?.trim()).toBe('in Work/');
			expect(rowTitles()).toEqual(['alpha', 'Board', 'Tasks', 'Open', 'Spec', 'Shot']);
			expect(rowTitles()).not.toContain('Deep');
			expect(row('alpha').querySelector('[data-note-row-subtitle]')?.textContent).toBe('Work');
			expect(row('Board').querySelector('[data-note-row-subtitle]')?.textContent).toBe('Canvas');
		});

		it("shows each file kind's icon", async () => {
			await mountList({ kind: 'folder', target: WORK });
			expect(iconOf('alpha')).toContain('lucide-file-text');
			expect(iconOf('Board')).toContain('lucide-layout-dashboard');
			expect(iconOf('Tasks')).toContain('lucide-kanban');
			expect(iconOf('Open')).toContain('lucide-table');
			expect(iconOf('Spec')).toContain('lucide-file-type');
			expect(iconOf('Shot')).toContain('lucide-image');
		});

		it('opens a canvas row the way the file tree does', async () => {
			await mountList({ kind: 'folder', target: WORK });
			row('Board').click();
			expect(openFileInEditor).toHaveBeenCalledWith(`${WORK}/Board.canvas`);
		});

		it('offers Favorite and Change icon on a markdown row only, so a canvas is never rewritten', async () => {
			await mountList({ kind: 'folder', target: WORK });
			const labelsOf = async (title: string) => {
				row(title).dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }));
				await settle();
				return [...document.querySelectorAll('[role="menuitem"]')].map((el) => el.querySelector('span')?.textContent?.trim());
			};
			for (const title of ['Board', 'Tasks', 'Open', 'Spec', 'Shot']) {
				const labels = await labelsOf(title);
				expect(labels).toContain('Rename');
				expect(labels).not.toContain('Favorite');
				expect(labels).not.toContain('Change icon');
				document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
				await settle();
			}
			expect(toggleFavoriteForPath).not.toHaveBeenCalled();
			await chooseMenuItem('alpha', 'Favorite');
			expect(toggleFavoriteForPath).toHaveBeenCalledWith(ALPHA, true);
		});

		it('lists the vault root before a pick', async () => {
			await mountList(FILES_LENS);
			expect(target.querySelector('[data-note-list-label]')?.textContent).toBe('vault');
			expect(target.querySelector('[data-note-list-rule]')?.textContent?.trim()).toBe('in the vault root');
			expect(rowTitles()).toEqual(['beta']);
		});

		it('shows the empty state for a folder with no files', async () => {
			setTree([node(`${WORK}/projects`, true, [])]);
			await mountList({ kind: 'folder', target: WORK });
			expect(target.querySelector('[data-note-list-empty]')).not.toBeNull();
			expect(target.querySelector('[data-note-list-label]')?.textContent).toBe('Work');
		});

		it('shows an empty list with no label for a folder that is gone', async () => {
			await mountList({ kind: 'folder', target: '/vault/Gone' });
			expect(target.querySelector('[data-note-list-empty]')).not.toBeNull();
			expect(target.querySelector('[data-note-list-label]')?.textContent).toBe('');
		});

		it('hides New here once the picked folder is gone, so the click cannot re-create it', async () => {
			await mountList({ kind: 'folder', target: WORK });
			expect(target.querySelector('[data-note-list-new]')).not.toBeNull();

			fsStore.setFileTree([node(BETA)]);
			await settle();

			expect(target.querySelector('[data-note-list-label]')?.textContent).toBe('');
			expect(target.querySelector('[data-note-list-new]')).toBeNull();
			expect(createFile).not.toHaveBeenCalled();
		});

		it('creates the New here note in the picked folder, and the list shows it', async () => {
			vi.mocked(invoke).mockResolvedValue(undefined);
			vi.mocked(createFile).mockImplementation(async (dir, name) => {
				// The real createFile refreshes the tree.
				setTree([...workChildren(), node(`${dir}/${name}`)]);
				return `${dir}/${name}`;
			});
			await mountList({ kind: 'folder', target: WORK });
			target.querySelector<HTMLButtonElement>('[data-note-list-new]')!.click();
			await settle();

			expect(createFile).toHaveBeenCalledWith(WORK, 'Untitled.md', '');
			expect(openFileInEditor).toHaveBeenCalledWith(`${WORK}/Untitled.md`);
			expect(rowTitles()).toContain('Untitled');
			expect(toast.error).not.toHaveBeenCalled();
		});

		it('toasts when the New here note cannot be created', async () => {
			vi.mocked(invoke).mockResolvedValue(undefined);
			vi.mocked(createFile).mockRejectedValue(new Error('disk full'));
			await mountList({ kind: 'folder', target: WORK });
			target.querySelector<HTMLButtonElement>('[data-note-list-new]')!.click();
			await settle();

			expect(toast.error).toHaveBeenCalledWith('Could not create the note');
			expect(rowTitles()).not.toContain('Untitled');
		});
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
			expect(newHereButton()?.getAttribute('aria-label')).toBe('New here');
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
			typeDefinitionsStore.setEntries([]);
			await mountList();
			expect(target.querySelector('[data-note-list-empty]')).not.toBeNull();
			expect(newHereButton()).not.toBeNull();
		});

		it('is hidden for a lens with no creation rule, and shown when its provider has one', async () => {
			railRegistryStore.registerLensProvider({ kind: 'reading', resolve: () => ({ label: 'Reading list', rule: '', notes: [] }) });
			await mountList({ kind: 'reading', target: 'Reading' });
			expect(target.querySelector('[data-note-list-label]')?.textContent).toBe('Reading list');
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

		it('creates a _favorite: true note in the Cmd+N folder from Favorites, and Favorites lists it', async () => {
			await mountList(FAVORITES_LENS);
			newHereButton()!.click();
			await settle();

			expect(createFile).toHaveBeenCalledWith(FOLDER, 'Untitled.md', '---\n_favorite: true\n---\n');
			expect(openFileInEditor).toHaveBeenCalledWith(CREATED);

			typeDefinitionsStore.setEntries([entryV2(CREATED, { favorite: true })]);
			await settle();
			expect(rowTitles()).toEqual(['Untitled']);
		});

		it('is hidden in the Archive, even with archived notes listed', async () => {
			typeDefinitionsStore.setEntries([entryV2(ALPHA, { archived: true })]);
			await mountList(ARCHIVE_LENS);
			expect(rowTitles()).toEqual(['alpha']);
			expect(newHereButton()).toBeNull();
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
