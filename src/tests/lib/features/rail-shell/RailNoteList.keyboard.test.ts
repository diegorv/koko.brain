// @vitest-environment jsdom
// The rail note list's keyboard model over the real stores: one Tab stop,
// arrow keys between note rows, focus that follows a removed or renamed row,
// and the hand-off with the list search.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// virtua mounts rows only after ResizeObserver reports sizes and skips targets
// without offsetParent; jsdom has neither. Same shim as RailNoteList.test.ts.
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
// virtua's scrollToIndex writes the offset with scrollTo, which jsdom lacks.
Element.prototype.scrollTo ??= () => {};

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
vi.mock('#lib/features/properties/lifecycle.service.js', () => ({
	setArchivedForPath: vi.fn(),
	setOrganizedForPath: vi.fn(),
	toggleFavoriteForPath: vi.fn(),
}));
vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));

import { mount, unmount, flushSync, tick } from 'svelte';
import dayjs from 'dayjs';
import RailNoteList from '#lib/features/rail-shell/RailNoteList.svelte';
import { INBOX_LENS, neighbourhoodLens, TODAY_LENS } from '#lib/features/rail-shell/lens.logic.js';
import type { Lens } from '#lib/features/rail-shell/rail-shell.types.js';
import { railRegistryStore } from '#lib/features/rail-shell/rail-registry.store.svelte.js';
import { registerOneOnOneTodaySection } from '#lib/plugins/one-on-one/one-on-one-today.service.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { fileIconsStore } from '#lib/features/file-icons/file-icons.store.svelte.js';
import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { renameItem } from '#lib/core/filesystem/fs.service.js';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';
import { entryV2, outgoingLinksFromContent } from '../../../fixtures/vault-entries.fixture';

const ALPHA = '/vault/alpha.md';
const BETA = '/vault/beta.md';
const GAMMA = '/vault/gamma.md';
const DELTA = '/vault/delta.md';

async function settle(rounds = 4) {
	for (let i = 0; i < rounds; i++) {
		await tick();
		flushSync();
	}
}

/** Inbox entries listed in the given order (the Inbox sorts newest first). */
function inboxEntries(paths: string[]): NoteEntryV2[] {
	return paths.map((path, i) => entryV2(path, { modifiedAt: 1000 - i }));
}

/** `/vault/n00.md`, `/vault/n01.md`, ... */
function numbered(count: number): string[] {
	return Array.from({ length: count }, (_, i) => `/vault/n${String(i).padStart(2, '0')}.md`);
}

describe('RailNoteList keyboard', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	async function mountList(lens: Lens = INBOX_LENS) {
		component = mount(RailNoteList, { target, props: { lens } });
		await settle();
	}

	function rows(): HTMLElement[] {
		return [...target.querySelectorAll<HTMLElement>('[data-note-row]')];
	}

	function titleOf(el: Element | null): string | undefined {
		return el?.querySelector('[data-note-row-title]')?.textContent?.trim();
	}

	function row(title: string): HTMLElement {
		return rows().find((el) => titleOf(el) === title)!;
	}

	/** The rows in the Tab order: the ones with `tabindex="0"` */
	function tabStops(): HTMLElement[] {
		return rows().filter((el) => el.getAttribute('tabindex') === '0');
	}

	function focusedTitle(): string | undefined {
		return titleOf(document.activeElement);
	}

	function press(el: Element, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
		const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
		el.dispatchEvent(event);
		flushSync();
		return event;
	}

	/** Presses `key` on the focused element */
	async function pressFocused(key: string, init: KeyboardEventInit = {}): Promise<KeyboardEvent> {
		const event = press(document.activeElement!, key, init);
		await settle();
		return event;
	}

	function searchInput(): HTMLInputElement | null {
		return target.querySelector<HTMLInputElement>('[data-note-list-search] input');
	}

	async function openSearch() {
		target.querySelector<HTMLButtonElement>('[data-note-list-search-toggle]')!.click();
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

	describe('roving focus', () => {
		it('gives exactly one of 12 rows the Tab stop, the first one before any focus', async () => {
			typeDefinitionsStore.setEntries(inboxEntries(numbered(12)));
			await mountList();

			expect(rows()).toHaveLength(12);
			expect(tabStops()).toHaveLength(1);
			expect(titleOf(tabStops()[0])).toBe('n00');
			expect(rows().slice(1).every((el) => el.getAttribute('tabindex') === '-1')).toBe(true);
		});

		it('moves focus and the Tab stop with ArrowDown and ArrowUp, clamped at the ends', async () => {
			typeDefinitionsStore.setEntries(inboxEntries(numbered(12)));
			await mountList();
			row('n00').focus();

			const down = await pressFocused('ArrowDown');
			expect(down.defaultPrevented).toBe(true);
			expect(focusedTitle()).toBe('n01');
			expect(tabStops().map(titleOf)).toEqual(['n01']);

			await pressFocused('ArrowDown');
			expect(focusedTitle()).toBe('n02');

			await pressFocused('ArrowUp');
			expect(focusedTitle()).toBe('n01');
			expect(tabStops().map(titleOf)).toEqual(['n01']);

			await pressFocused('ArrowUp');
			await pressFocused('ArrowUp');
			expect(focusedTitle()).toBe('n00');
			expect(tabStops().map(titleOf)).toEqual(['n00']);
		});

		it('goes to the ends with Home and End', async () => {
			typeDefinitionsStore.setEntries(inboxEntries(numbered(12)));
			await mountList();
			row('n03').focus();

			await pressFocused('End');
			expect(focusedTitle()).toBe('n11');
			expect(tabStops().map(titleOf)).toEqual(['n11']);

			await pressFocused('Home');
			expect(focusedTitle()).toBe('n00');
			expect(tabStops().map(titleOf)).toEqual(['n00']);
		});

		it('End on 40 notes mounts and focuses the last row', async () => {
			typeDefinitionsStore.setEntries(inboxEntries(numbered(40)));
			await mountList();
			expect(rows().some((el) => titleOf(el) === 'n39')).toBe(false);
			row('n00').focus();

			await pressFocused('End');
			expect(focusedTitle()).toBe('n39');
			expect(tabStops().map(titleOf)).toEqual(['n39']);
		});

		it('a row focused by a click takes the Tab stop', async () => {
			typeDefinitionsStore.setEntries(inboxEntries([ALPHA, BETA, GAMMA]));
			await mountList();

			row('gamma').focus();
			flushSync();
			expect(tabStops().map(titleOf)).toEqual(['gamma']);
		});

		it('leaves modified arrows and other keys alone', async () => {
			typeDefinitionsStore.setEntries(inboxEntries([ALPHA, BETA, GAMMA]));
			await mountList();
			row('alpha').focus();

			const shifted = await pressFocused('ArrowDown', { shiftKey: true });
			expect(shifted.defaultPrevented).toBe(false);
			const letter = await pressFocused('a');
			expect(letter.defaultPrevented).toBe(false);
			expect(focusedTitle()).toBe('alpha');
		});

		it('Enter on a focused row opens the note once, and a held Enter does not repeat it', async () => {
			typeDefinitionsStore.setEntries(inboxEntries([ALPHA, BETA]));
			await mountList();
			row('beta').focus();

			const enter = await pressFocused('Enter');
			expect(enter.defaultPrevented).toBe(true);
			await pressFocused('Enter', { repeat: true });

			expect(openFileInEditor).toHaveBeenCalledTimes(1);
			expect(openFileInEditor).toHaveBeenCalledWith(BETA);
		});
	});

	describe('grouped lenses', () => {
		const HUB = '/vault/Work/Project Alpha.md';
		const SPEC = '/vault/Spec.md';

		it('walks a note listed under both Outgoing links and Backlinks once per group, in display order, skipping headers', async () => {
			typeDefinitionsStore.setEntries([
				entryV2(HUB, { outgoingLinks: outgoingLinksFromContent('[[Spec]]') }),
				entryV2(SPEC, { outgoingLinks: outgoingLinksFromContent('[[Project Alpha]]') }),
			]);
			await mountList(neighbourhoodLens(HUB));

			const shown = rows();
			expect(shown.map(titleOf)).toEqual(['Project Alpha', 'Spec', 'Spec']);
			expect(tabStops()).toEqual([shown[0]]);

			shown[0].focus();
			await pressFocused('ArrowDown');
			expect(document.activeElement).toBe(shown[1]);
			expect(tabStops()).toEqual([shown[1]]);

			await pressFocused('ArrowDown');
			expect(document.activeElement).toBe(shown[2]);
			expect(tabStops()).toEqual([shown[2]]);

			await pressFocused('ArrowDown');
			expect(document.activeElement).toBe(shown[2]);

			await pressFocused('Home');
			expect(document.activeElement).toBe(shown[0]);
		});

		it('leaves the Today section out of the arrow order and in the Tab order', async () => {
			const today = dayjs().format('YYYY-MM-DD');
			typeDefinitionsStore.setEntries([
				entryV2('/vault/Work/_people/Ana.md', { isA: 'Person', frontmatter: { _one_on_one_every: true } }),
				entryV2(ALPHA, { frontmatter: { date: today }, modifiedAt: 200 }),
				entryV2(BETA, { frontmatter: { date: today }, modifiedAt: 100 }),
			]);
			registerOneOnOneTodaySection();
			await mountList(TODAY_LENS);

			const person = target.querySelector<HTMLButtonElement>('[data-my-people-open]')!;
			expect(person).not.toBeNull();
			expect(person.hasAttribute('tabindex')).toBe(false);
			expect(rows().map(titleOf)).toEqual(['alpha', 'beta']);
			expect(tabStops().map(titleOf)).toEqual(['alpha']);

			row('alpha').focus();
			await pressFocused('ArrowUp');
			expect(focusedTitle()).toBe('alpha');
			await pressFocused('End');
			expect(focusedTitle()).toBe('beta');

			person.focus();
			const down = await pressFocused('ArrowDown');
			expect(down.defaultPrevented).toBe(false);
			expect(document.activeElement).toBe(person);
		});
	});

	describe('rename', () => {
		beforeEach(async () => {
			typeDefinitionsStore.setEntries(inboxEntries([ALPHA, BETA, GAMMA]));
			await mountList();
		});

		async function startRename(title: string): Promise<HTMLInputElement> {
			row(title).focus();
			await pressFocused('F2');
			const input = target.querySelector<HTMLInputElement>('[data-rail-note-list] input:not([data-note-list-search] input)')!;
			input.focus();
			return input;
		}

		it('arrows in the rename input move the caret, not row focus', async () => {
			const input = await startRename('beta');

			const down = press(input, 'ArrowDown');
			const up = press(input, 'ArrowUp');
			await settle();

			expect(down.defaultPrevented).toBe(false);
			expect(up.defaultPrevented).toBe(false);
			expect(document.activeElement).toBe(input);
			expect(fsStore.renamingPath).toBe(BETA);
		});

		it('a committed rename leaves focus on the renamed row under its new path', async () => {
			const input = await startRename('beta');
			input.value = 'zeta';
			input.dispatchEvent(new Event('input', { bubbles: true }));
			press(input, 'Enter');
			await settle();

			expect(renameItem).toHaveBeenCalledWith(BETA, 'zeta.md');
			expect(focusedTitle()).toBe('beta');

			// The index hands the list the renamed note, in the same place.
			typeDefinitionsStore.setEntries([
				entryV2(ALPHA, { modifiedAt: 1000 }),
				entryV2('/vault/zeta.md', { modifiedAt: 999 }),
				entryV2(GAMMA, { modifiedAt: 998 }),
			]);
			await settle();

			expect(focusedTitle()).toBe('zeta');
			expect(tabStops().map(titleOf)).toEqual(['zeta']);
		});

		it('a failed rename leaves no record: the row leaving later moves focus to its neighbour', async () => {
			typeDefinitionsStore.setEntries(inboxEntries([ALPHA, BETA, GAMMA, DELTA]));
			await settle();
			// The target name is taken, as TargetExistsError reports it.
			vi.mocked(renameItem).mockRejectedValueOnce(new Error('exists'));
			const input = await startRename('beta');
			input.value = 'delta';
			input.dispatchEvent(new Event('input', { bubbles: true }));
			press(input, 'Enter');
			await settle();
			expect(renameItem).toHaveBeenCalledWith(BETA, 'delta.md');
			expect(focusedTitle()).toBe('beta');

			typeDefinitionsStore.setEntries(inboxEntries([ALPHA, GAMMA, DELTA]));
			await settle();

			expect(focusedTitle()).toBe('gamma');
		});

		it('Escape in the rename input returns focus to the row', async () => {
			const input = await startRename('beta');
			press(input, 'Escape');
			await settle();

			expect(fsStore.renamingPath).toBeNull();
			expect(renameItem).not.toHaveBeenCalled();
			expect(focusedTitle()).toBe('beta');
			expect(tabStops().map(titleOf)).toEqual(['beta']);
		});
	});

	describe('search hand-off', () => {
		beforeEach(async () => {
			typeDefinitionsStore.setEntries(inboxEntries([ALPHA, BETA, GAMMA]));
			await mountList();
		});

		it('ArrowDown in the open search input focuses the first row, ArrowUp on it returns to the input', async () => {
			await openSearch();
			const input = searchInput()!;
			expect(document.activeElement).toBe(input);

			const down = press(input, 'ArrowDown');
			await settle();
			expect(down.defaultPrevented).toBe(true);
			expect(focusedTitle()).toBe('alpha');

			await pressFocused('ArrowUp');
			expect(document.activeElement).toBe(input);
		});

		it('ArrowDown in the input goes to the first row even when another row holds the Tab stop', async () => {
			row('gamma').focus();
			flushSync();
			await openSearch();

			press(searchInput()!, 'ArrowDown');
			await settle();
			expect(focusedTitle()).toBe('alpha');
		});

		it('ArrowUp on the first row stays there while the search is closed', async () => {
			row('alpha').focus();
			await pressFocused('ArrowUp');
			expect(focusedTitle()).toBe('alpha');
		});
	});

	describe('removal', () => {
		beforeEach(async () => {
			typeDefinitionsStore.setEntries(inboxEntries([ALPHA, BETA, GAMMA, DELTA]));
			await mountList();
		});

		it('moves focus to the next row when the focused row leaves the list', async () => {
			row('beta').focus();
			flushSync();

			typeDefinitionsStore.setEntries(inboxEntries([ALPHA, GAMMA, DELTA]));
			await settle();

			expect(focusedTitle()).toBe('gamma');
			expect(tabStops().map(titleOf)).toEqual(['gamma']);
		});

		it('moves focus to the previous row when the last row leaves', async () => {
			row('delta').focus();
			flushSync();

			typeDefinitionsStore.setEntries(inboxEntries([ALPHA, BETA, GAMMA]));
			await settle();

			expect(focusedTitle()).toBe('gamma');
		});

		it('follows when focus is on the list wrapper (a click on blank area)', async () => {
			row('beta').focus();
			flushSync();
			const wrapper = row('beta').closest<HTMLElement>('[tabindex="-1"]:not([data-note-row])')!;
			expect(wrapper.contains(row('alpha'))).toBe(true);
			wrapper.focus();
			expect(document.activeElement).toBe(wrapper);

			typeDefinitionsStore.setEntries(inboxEntries([ALPHA, GAMMA, DELTA]));
			await settle();

			expect(focusedTitle()).toBe('gamma');
		});

		it('leaves focus in the search input, and hands the Tab stop to the next row', async () => {
			row('beta').focus();
			flushSync();
			await openSearch();
			const input = searchInput()!;
			expect(document.activeElement).toBe(input);

			typeDefinitionsStore.setEntries(inboxEntries([ALPHA, GAMMA, DELTA]));
			await settle();

			expect(document.activeElement).toBe(input);
			expect(tabStops().map(titleOf)).toEqual(['gamma']);
		});

		it('does not move focus when another row leaves', async () => {
			row('beta').focus();
			flushSync();

			typeDefinitionsStore.setEntries(inboxEntries([BETA, GAMMA, DELTA]));
			await settle();

			expect(focusedTitle()).toBe('beta');
			expect(tabStops().map(titleOf)).toEqual(['beta']);
		});
	});

	describe('Inbox check', () => {
		function checkOf(title: string): HTMLButtonElement {
			return row(title).parentElement!.querySelector<HTMLButtonElement>(':scope > [data-note-row-organize]')!;
		}

		it("gives only the Tab-stop row's check tabindex 0", async () => {
			typeDefinitionsStore.setEntries(inboxEntries([ALPHA, BETA, GAMMA]));
			await mountList();

			expect(checkOf('alpha').getAttribute('tabindex')).toBe('0');
			expect(checkOf('beta').getAttribute('tabindex')).toBe('-1');
			expect(checkOf('gamma').getAttribute('tabindex')).toBe('-1');

			row('alpha').focus();
			await pressFocused('ArrowDown');

			expect(checkOf('alpha').getAttribute('tabindex')).toBe('-1');
			expect(checkOf('beta').getAttribute('tabindex')).toBe('0');
		});

		it('the check moves no row focus with the arrows', async () => {
			typeDefinitionsStore.setEntries(inboxEntries([ALPHA, BETA]));
			await mountList();

			const check = checkOf('alpha');
			check.focus();
			const down = await pressFocused('ArrowDown');

			expect(down.defaultPrevented).toBe(false);
			expect(document.activeElement).toBe(check);
		});
	});
});
