// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// bits-ui ContextMenu/Popover position via @floating-ui/dom, which needs ResizeObserver.
class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
// jsdom lacks the pointer-capture and scroll APIs the sort Select calls when it opens.
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= () => {};
Element.prototype.scrollIntoView ??= () => {};

// The linked-file loader reaches Tauri IPC — legitimately mocked. Stores and
// kanban.logic stay real (CLAUDE.md rule 1): the view is driven through the real
// board state and the rendered DOM, with the harness round-tripping onContentChange.
vi.mock('#lib/plugins/kanban/kanban.service.js', () => ({
	loadLinkedFileContent: vi.fn(async () => null),
}));
// Toasts are a DOM side-effect service.
vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mount, unmount, flushSync, tick } from 'svelte';
import { toast } from 'svelte-sonner';
import { loadLinkedFileContent } from '#lib/plugins/kanban/kanban.service.js';
import KanbanViewHarness from '../../../fixtures/KanbanViewHarness.svelte';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { kanbanStore } from '#lib/plugins/kanban/kanban.store.svelte.js';
import { DEFAULT_LANE_WIDTH, isLaneCollapsed, parseKanbanBoard, serializeKanbanBoard, setLaneAutoComplete, setLaneMaxItems, setSortMode, setTagColor, setViewMode, toggleLaneCollapsed } from '#lib/plugins/kanban/kanban.logic.js';
import type { KanbanBoard, KanbanSortMode, KanbanViewMode } from '#lib/plugins/kanban/kanban.types.js';

interface HarnessApi {
	setMarkdown: (markdown: string) => void;
	getMarkdown: () => string;
	getPersistCount: () => number;
}

/**
 * Canonical seed: already carries `viewMode: "board"`, so clicking the
 * already-active "Board view" button produces a board that serializes to
 * byte-identical markdown — the no-op shape M27 reports.
 */
const SEED = serializeKanbanBoard(
	setViewMode(parseKanbanBoard('## To Do\n\n- [ ] write the test\n\n## Done\n\n'), 'board'),
);

/** An EXTERNAL edit (vault sync / file watcher): different lane title. */
const EXTERNAL = serializeKanbanBoard(
	setViewMode(parseKanbanBoard('## Externally Renamed\n\n- [ ] write the test\n\n## Done\n\n'), 'board'),
);

describe('KanbanView — applyChange no-op guard (M27)', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;
	let api: HarnessApi | undefined;

	beforeEach(() => {
		vi.clearAllMocks();
		kanbanStore.reset();
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		api = undefined;
		document.body.innerHTML = '';
	});

	function mountView(markdown = SEED): void {
		component = mount(KanbanViewHarness, {
			target,
			props: { initialMarkdown: markdown, register: (a: HarnessApi) => { api = a; } },
		});
		flushSync();
	}

	/** Clicks a toolbar button by its `title` attribute. */
	function clickToolbarButton(title: string): void {
		const button = document.querySelector<HTMLButtonElement>(`button[title="${title}"]`);
		if (!button) throw new Error(`toolbar button "${title}" not found`);
		button.click();
		flushSync();
	}

	it('renders the seeded board', () => {
		mountView();
		expect(document.body.textContent).toContain('To Do');
		expect(document.body.textContent).toContain('write the test');
	});

	it('does not persist when the change serializes to identical markdown', () => {
		mountView();
		// The board is already in 'board' view mode, so this re-selection produces
		// a fresh board object whose serialization equals the current markdown.
		clickToolbarButton('Board view');

		expect(api?.getPersistCount()).toBe(0);
		expect(api?.getMarkdown()).toBe(SEED);
	});

	it('still applies the next external reload after a no-op change', () => {
		mountView();
		clickToolbarButton('Board view');

		// Because the no-op persist never reaches the parent, the prop never
		// round-trips and the selfUpdate latch must NOT be left armed — otherwise
		// this external reload is swallowed and the board renders stale.
		api?.setMarkdown(EXTERNAL);
		flushSync();

		expect(document.body.textContent).toContain('Externally Renamed');
		expect(document.body.textContent).not.toContain('To Do');
	});

	it('still persists and swallows the round-trip for a real change', () => {
		mountView();
		clickToolbarButton('List view');

		expect(api?.getPersistCount()).toBe(1);
		expect(api?.getMarkdown()).toContain('"viewMode": "list"');
	});
});

describe('KanbanView: card wikilinks', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('a card wikilink click calls onOpenWikilink with its target', () => {
		kanbanStore.reset();
		const onOpenWikilink = vi.fn();
		const markdown = serializeKanbanBoard(
			setViewMode(parseKanbanBoard('## To Do\n\n- [ ] see [[Target Note]]\n\n'), 'board'),
		);
		const component = mount(KanbanViewHarness, {
			target: document.body.appendChild(document.createElement('div')),
			props: { initialMarkdown: markdown, onOpenWikilink },
		});
		flushSync();

		const link = [...document.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === 'Target Note');
		expect(link).toBeDefined();
		link!.click();
		flushSync();

		expect(onOpenWikilink).toHaveBeenCalledWith('Target Note');
		unmount(component);
	});
});

describe('KanbanView: date proximity tone', () => {
	/** A fixed past date is overdue against the real clock, so no time mocking is needed. */
	const PAST = '2000-01-01';
	let component: Record<string, unknown> | null = null;

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	function mountMode(mode: 'board' | 'list' | 'table'): void {
		kanbanStore.reset();
		const markdown = serializeKanbanBoard(
			setViewMode(parseKanbanBoard(`## To Do\n\n- [x] finished task {${PAST}}\n- [ ] open task {${PAST}}\n\n`), mode),
		);
		component = mount(KanbanViewHarness, {
			target: document.body.appendChild(document.createElement('div')),
			props: { initialMarkdown: markdown },
		});
		flushSync();
	}

	/**
	 * The innermost element holding both the card's text and its date: the list
	 * or table row. The matches form one ancestor chain in document order, so the
	 * last is the innermost. A board card widens it to the `[data-item-id]` card.
	 */
	function cardRow(text: string): HTMLElement {
		const row = [...document.querySelectorAll<HTMLElement>('body *')]
			.filter((el) => el.textContent?.includes(text) && el.textContent.includes(PAST))
			.at(-1);
		if (!row) throw new Error(`card "${text}" not found`);
		return row.closest<HTMLElement>('[data-item-id]') ?? row;
	}

	/**
	 * The date badge inside a card or row. On the board the styled badge button
	 * sits inside the unstyled popover trigger, so the innermost match is taken.
	 */
	function dateBadge(row: HTMLElement): HTMLElement {
		const badge = [...row.querySelectorAll<HTMLElement>('span, button')].filter((el) => el.textContent?.trim() === PAST).at(-1);
		if (!badge) throw new Error('date badge not found');
		return badge;
	}

	it('board: a checked overdue card has no destructive border or badge; an unchecked one has both', () => {
		mountMode('board');
		const done = cardRow('finished task');
		const open = cardRow('open task');

		expect(done.hasAttribute('data-item-id')).toBe(true);
		expect(done.className).not.toContain('border-l-destructive');
		expect(dateBadge(done).className).not.toContain('text-destructive');
		expect(open.className).toContain('border-l-destructive');
		expect(dateBadge(open).className).toContain('text-destructive');
	});

	it.each(['list', 'table'] as const)('%s: only the unchecked overdue card gets the destructive badge', (mode) => {
		mountMode(mode);

		const done = cardRow('finished task');
		const open = cardRow('open task');

		expect(done.textContent).not.toContain('open task');
		expect(dateBadge(done).className).toContain('bg-muted text-muted-foreground');
		expect(dateBadge(open).className).toContain('bg-destructive/15 text-destructive');
	});
});

describe('KanbanView: card and lane menus', () => {
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		kanbanStore.reset();
		const markdown = serializeKanbanBoard(
			setViewMode(parseKanbanBoard('## To Do\n\n- [ ] write the test\n- [ ] tagged #design\n\n## Done\n\n'), 'board'),
		);
		component = mount(KanbanViewHarness, {
			target: document.body.appendChild(document.createElement('div')),
			props: { initialMarkdown: markdown },
		});
		flushSync();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	/** Right-clicks `el` and returns the open menu's entries, separators as `---`. */
	async function openMenu(el: Element): Promise<string[]> {
		el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 1, clientY: 1 }));
		for (let i = 0; i < 5; i++) await Promise.resolve();
		flushSync();
		const menu = [...document.querySelectorAll('[role="menu"]')].find((m) => m.getAttribute('data-state') === 'open')!;
		return [...menu.children].map((m) =>
			m.getAttribute('data-slot') === 'context-menu-separator' ? '---' : (m.textContent?.trim() ?? ''),
		);
	}

	it('lists the card actions as one group, in sentence case', async () => {
		const card = document.querySelector('[data-item-id]')!;
		expect(await openMenu(card)).toEqual(['Edit', 'Archive', 'Move to', 'Card color', 'Delete']);
	});

	it('adds "Tag color" only on a card with tags', async () => {
		const tagged = [...document.querySelectorAll('[data-item-id]')].find((el) => el.textContent?.includes('tagged'))!;
		expect(await openMenu(tagged)).toEqual(['Edit', 'Archive', 'Move to', 'Card color', 'Tag color', 'Delete']);
	});

	it('lists the lane actions as one group, in sentence case', async () => {
		const title = [...document.querySelectorAll('h3')].find((h) => h.textContent?.trim() === 'To Do')!;
		expect(await openMenu(title)).toEqual(['Rename', 'Enable auto-complete', 'Set card limit', 'Delete lane']);
	});

	it('renders the card and lane delete items with the destructive variant', async () => {
		await openMenu(document.querySelector('[data-item-id]')!);
		const openItems = () => {
			const menu = [...document.querySelectorAll('[role="menu"]')].find((m) => m.getAttribute('data-state') === 'open')!;
			return [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')];
		};
		expect(openItems().find((el) => el.textContent?.trim() === 'Delete')?.dataset.variant).toBe('destructive');

		document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		for (let i = 0; i < 5; i++) await Promise.resolve();
		flushSync();
		const title = [...document.querySelectorAll('h3')].find((h) => h.textContent?.trim() === 'To Do')!;
		await openMenu(title);
		expect(openItems().find((el) => el.textContent?.trim() === 'Delete lane')?.dataset.variant).toBe('destructive');
	});

	it('lists the card limits as one group, with no separator before "No limit"', async () => {
		// The lane has no limit set, so "No limit" carries the "(current)" mark.
		const title = [...document.querySelectorAll('h3')].find((h) => h.textContent?.trim() === 'To Do')!;
		await openMenu(title);
		const trigger = document.querySelector('[data-slot="context-menu-sub-trigger"]')!;
		trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
		for (let i = 0; i < 5; i++) await Promise.resolve();
		flushSync();
		const sub = document.querySelector('[data-slot="context-menu-sub-content"]')!;
		const entries = [...sub.children].map((m) =>
			m.getAttribute('data-slot') === 'context-menu-separator' ? '---' : (m.textContent?.trim() ?? ''),
		);
		expect(entries).toEqual(['3 cards', '5 cards', '10 cards', '15 cards', 'No limit (current)']);
	});
});

describe('KanbanView: Add Lane', () => {
	let component: Record<string, unknown> | null = null;
	let api: HarnessApi | undefined;

	beforeEach(() => {
		kanbanStore.reset();
		component = mount(KanbanViewHarness, {
			target: document.body.appendChild(document.createElement('div')),
			props: { initialMarkdown: SEED, register: (a: HarnessApi) => { api = a; } },
		});
		flushSync();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		api = undefined;
		document.body.innerHTML = '';
	});

	function clickAddLane(): void {
		const button = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Add Lane');
		if (!button) throw new Error('"Add Lane" button not found');
		button.click();
		flushSync();
	}

	it('gives each new lane a unique title', () => {
		clickAddLane();
		clickAddLane();

		const titles = parseKanbanBoard(api!.getMarkdown()).lanes.map((l) => l.title);
		expect(titles).toEqual(['To Do', 'Done', 'New Lane', 'New Lane 2']);
		expect(api?.getPersistCount()).toBe(2);
	});
});

describe('KanbanView: keyboard shortcuts and toolbar', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;
	let api: HarnessApi | undefined;

	/** Tagged and untagged cards interleaved, so a `#x` filter hides some of them. */
	const MIXED = '## To Do\n\n- [ ] hidden one\n- [ ] keep #x\n- [ ] hidden two\n- [ ] other #x\n\n## Done\n\n- [ ] hidden done\n\n';

	beforeEach(() => {
		kanbanStore.reset();
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		api = undefined;
		kanbanStore.reset();
		document.body.innerHTML = '';
	});

	function mountBoard(source = MIXED, mode: KanbanViewMode = 'board', sortMode?: KanbanSortMode): void {
		let board = setViewMode(parseKanbanBoard(source), mode);
		if (sortMode) board = setSortMode(board, sortMode);
		component = mount(KanbanViewHarness, {
			target,
			props: { initialMarkdown: serializeKanbanBoard(board), register: (a: HarnessApi) => { api = a; } },
		});
		flushSync();
	}

	/** The view's root, which carries the keydown handler. */
	function root(): HTMLElement {
		return target.firstElementChild as HTMLElement;
	}

	function press(el: Element, key: string): void {
		el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
		flushSync();
	}

	function card(text: string): HTMLElement {
		const found = [...target.querySelectorAll<HTMLElement>('[data-item-id]')].find((el) => el.textContent?.includes(text));
		if (!found) throw new Error(`card "${text}" not found`);
		return found;
	}

	/** Texts of the cards carrying the focus ring. */
	function ringed(): string[] {
		return [...target.querySelectorAll<HTMLElement>('[data-item-id]')]
			.filter((el) => el.className.includes('ring-2'))
			.map((el) => el.textContent?.trim() ?? '');
	}

	function cardTexts(): string[] {
		return parseKanbanBoard(api!.getMarkdown()).lanes.flatMap((l) => l.items.map((i) => i.text));
	}

	function sortTrigger(): HTMLElement {
		const el = target.querySelector<HTMLElement>('[data-slot="select-trigger"][aria-label="Sort cards"]');
		if (!el) throw new Error('no "Sort cards" control');
		return el;
	}

	async function settle(): Promise<void> {
		for (let i = 0; i < 20; i++) {
			await Promise.resolve();
			await tick();
		}
		flushSync();
	}

	/** Opens the sort Select and returns its options' text. */
	async function openSortOptions(): Promise<string[]> {
		const el = sortTrigger();
		el.focus();
		el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		flushSync();
		return vi.waitFor(() => {
			const listbox = document.getElementById(el.getAttribute('aria-controls') ?? '');
			const found = [...(listbox?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])].map((o) => o.textContent?.trim() ?? '');
			if (found.length === 0) throw new Error('sort Select did not open');
			return found;
		});
	}

	async function chooseSort(option: string): Promise<void> {
		if (sortTrigger().getAttribute('aria-expanded') !== 'true') await openSortOptions();
		const listbox = document.getElementById(sortTrigger().getAttribute('aria-controls') ?? '');
		const item = [...(listbox?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])].find((o) => o.textContent?.trim() === option);
		if (!item) throw new Error(`no option ${option}`);
		item.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0, pointerType: 'mouse' }));
		item.click();
		await settle();
	}

	describe('board keys act on the visible card', () => {
		it('with a filter on, ArrowDown then Backspace deletes the ringed visible card and keeps every hidden card', () => {
			mountBoard();
			kanbanStore.setFilterQuery('#x');
			flushSync();

			press(root(), 'ArrowDown');
			expect(ringed()).toEqual(['keep #x']);

			press(root(), 'Backspace');
			expect(cardTexts()).toEqual(['hidden one', 'hidden two', 'other #x', 'hidden done']);
		});

		it('a collapsed lane has no ringable cards, so Space and Backspace leave them in the file', () => {
			let board = setViewMode(parseKanbanBoard('## A\n\n- [ ] a1\n\n## B\n\n- [ ] secret\n\n'), 'board');
			board = toggleLaneCollapsed(board, 'B');
			component = mount(KanbanViewHarness, {
				target,
				props: { initialMarkdown: serializeKanbanBoard(board), register: (a: HarnessApi) => { api = a; } },
			});
			flushSync();
			const before = api!.getMarkdown();

			press(root(), 'ArrowRight');
			press(root(), 'ArrowRight');
			press(root(), ' ');
			press(root(), 'Backspace');

			expect(cardTexts()).toEqual(['a1', 'secret']);
			expect(api!.getMarkdown()).toBe(before);
		});

		it('ArrowDown from a card trigger div still moves the ring', () => {
			mountBoard();
			const triggerDiv = card('hidden one').closest<HTMLElement>('[data-context-menu-trigger]');
			expect(triggerDiv).not.toBeNull();
			triggerDiv!.focus();

			press(triggerDiv!, 'ArrowDown');
			press(triggerDiv!, 'ArrowDown');
			expect(kanbanStore.focusedItemIndex).toBe(1);
			expect(ringed()).toEqual(['keep #x']);
		});

		it.each(['list', 'table'] as const)('in %s mode Delete, Backspace and Space on the root change nothing', (mode) => {
			mountBoard(MIXED, mode);
			kanbanStore.setFocus(0, 0);
			const before = api!.getMarkdown();

			for (const key of ['Delete', 'Backspace', ' ']) press(root(), key);

			expect(api!.getPersistCount()).toBe(0);
			expect(api!.getMarkdown()).toBe(before);
		});

		it('Space or Enter on a card check button does not toggle or edit the ringed card', () => {
			mountBoard();
			kanbanStore.setFocus(0, 0);
			flushSync();
			const check = card('keep #x').querySelector<HTMLButtonElement>('button[aria-label="Check"]')!;

			press(check, ' ');
			press(check, 'Enter');

			expect(api!.getPersistCount()).toBe(0);
			expect(kanbanStore.editingItemId).toBeNull();
		});

		it('Space or Enter on a calendar day does not toggle or edit the ringed card', async () => {
			mountBoard('## To Do\n\n- [ ] ringed card\n- [ ] dated card {2026-01-15}\n\n');
			kanbanStore.setFocus(0, 0);
			flushSync();
			const badge = [...card('dated card').querySelectorAll<HTMLElement>('button')].filter((b) => b.textContent?.trim() === '2026-01-15').at(-1)!;
			badge.click();
			await settle();
			const day = card('dated card').querySelector<HTMLElement>('[role="gridcell"] [data-bits-day], [role="gridcell"]');
			expect(day).not.toBeNull();

			press(day!, ' ');
			press(day!, 'Enter');

			const ringedItem = parseKanbanBoard(api!.getMarkdown()).lanes[0].items[0];
			expect(ringedItem.text).toBe('ringed card');
			expect(ringedItem.checked).toBe(false);
			expect(kanbanStore.editingItemId).toBeNull();
		});

		it('keys bubbling from the sort trigger leave the focused card untouched and issue no save', () => {
			mountBoard();
			kanbanStore.setFocus(0, 0);
			flushSync();

			for (const key of [' ', 'Enter', 'Backspace', 'n']) press(sortTrigger(), key);

			expect(cardTexts()).toContain('hidden one');
			expect(parseKanbanBoard(api!.getMarkdown()).lanes[0].items[0].checked).toBe(false);
			expect(kanbanStore.editingItemId).toBeNull();
			expect(api!.getPersistCount()).toBe(0);
		});
	});

	describe('sort control', () => {
		it('is the themed Select, not a native select, listing SORT_LABELS in order', async () => {
			mountBoard();
			expect(target.querySelector('.pane-toolbar select')).toBeNull();
			expect(await openSortOptions()).toEqual(['Manual', 'Date (oldest)', 'Date (newest)', 'Text (A→Z)', 'Text (Z→A)', 'Unchecked first']);
		});

		it('choosing "Text (A→Z)" persists text-asc', async () => {
			mountBoard();
			await chooseSort('Text (A→Z)');
			expect(parseKanbanBoard(api!.getMarkdown()).settings.sortMode).toBe('text-asc');
			expect(sortTrigger().textContent).toContain('Text (A→Z)');
		});

		it('mounting and re-choosing the current option issue no save', async () => {
			mountBoard();
			expect(sortTrigger().textContent).toContain('Manual');
			await chooseSort('Manual');
			expect(api!.getPersistCount()).toBe(0);
		});

		it('an unknown stored sortMode mounts without a save and does not read "Manual"', () => {
			mountBoard(MIXED, 'board', 'unchecked' as KanbanSortMode);
			expect(api!.getPersistCount()).toBe(0);
			expect(sortTrigger().textContent).not.toContain('Manual');
			expect(sortTrigger().textContent).toContain('Custom sort');
		});
	});

	describe('view buttons and the focus ring', () => {
		function pressedModes(): string[] {
			return [...target.querySelectorAll<HTMLButtonElement>('button[aria-pressed="true"]')].map((b) => b.getAttribute('aria-label') ?? '');
		}

		it('mark only the current mode as pressed, named by their title', () => {
			mountBoard();
			for (const name of ['Board view', 'List view', 'Table view']) {
				const button = target.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`);
				expect(button?.title).toBe(name);
			}
			expect(pressedModes()).toEqual(['Board view']);

			target.querySelector<HTMLButtonElement>('button[title="List view"]')!.click();
			flushSync();
			expect(pressedModes()).toEqual(['List view']);
		});

		it('changing the view clears the ring', () => {
			mountBoard();
			kanbanStore.setFocus(0, 1);
			flushSync();
			target.querySelector<HTMLButtonElement>('button[title="List view"]')!.click();
			flushSync();
			expect(kanbanStore.focusedLaneIndex).toBe(-1);
		});

		it('changing the filter clears the ring', () => {
			mountBoard();
			kanbanStore.setFocus(0, 1);
			flushSync();
			kanbanStore.setFilterQuery('#x');
			flushSync();
			expect(kanbanStore.focusedLaneIndex).toBe(-1);
		});

		it('changing the sort clears the ring', async () => {
			mountBoard();
			kanbanStore.setFocus(0, 1);
			flushSync();
			await chooseSort('Text (Z→A)');
			expect(kanbanStore.focusedLaneIndex).toBe(-1);
		});
	});
});

describe('KanbanView: filter clear, per-board reset and tag filter', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;
	let api: HarnessApi | undefined;

	const SOURCE = '## To Do\n\n- [ ] plain card\n- [ ] tagged #design\n- [ ] wider #design-system\n\n';
	const ALL = ['plain card', 'tagged', 'wider'];

	beforeEach(() => {
		kanbanStore.reset();
		editorStore.reset();
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		api = undefined;
		kanbanStore.reset();
		editorStore.reset();
		document.body.innerHTML = '';
	});

	function markdownOf(source = SOURCE, tagColors: Record<string, string> = {}): string {
		let board = setViewMode(parseKanbanBoard(source), 'board');
		for (const [tag, color] of Object.entries(tagColors)) board = setTagColor(board, tag, color);
		return serializeKanbanBoard(board);
	}

	function mountBoard(markdown = markdownOf()): void {
		component = mount(KanbanViewHarness, {
			target,
			props: { initialMarkdown: markdown, register: (a: HarnessApi) => { api = a; } },
		});
		flushSync();
	}

	function filterInput(): HTMLInputElement {
		const el = target.querySelector<HTMLInputElement>('input[placeholder="Filter cards..."]');
		if (!el) throw new Error('no filter input');
		return el;
	}

	function clearButton(): HTMLButtonElement | null {
		return target.querySelector<HTMLButtonElement>('button[aria-label="Clear filter"]');
	}

	function type(value: string): void {
		const input = filterInput();
		input.value = value;
		input.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
	}

	/** Which of the seeded cards render, by their leading text. */
	function visible(): string[] {
		const texts = [...target.querySelectorAll<HTMLElement>('[data-item-id]')].map((el) => el.textContent ?? '');
		return ALL.filter((name) => texts.some((t) => t.includes(name)));
	}

	async function settle(): Promise<void> {
		for (let i = 0; i < 5; i++) await Promise.resolve();
		flushSync();
	}

	/** Opens the card's context menu, then its "Tag color" submenu, and returns the submenu. */
	async function openTagColor(text: string): Promise<HTMLElement> {
		const card = [...target.querySelectorAll('[data-item-id]')].find((el) => el.textContent?.includes(text))!;
		card.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 1, clientY: 1 }));
		await settle();
		const trigger = [...document.querySelectorAll('[data-slot="context-menu-sub-trigger"]')].find((el) => el.textContent?.includes('Tag color'));
		if (!trigger) throw new Error('no "Tag color" submenu');
		trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
		await settle();
		const sub = document.querySelector<HTMLElement>('[data-slot="context-menu-sub-content"]');
		if (!sub) throw new Error('"Tag color" submenu did not open');
		return sub;
	}

	function kanbanTab(path: string) {
		const content = markdownOf();
		return { path, name: path, content, savedContent: content, fileType: 'kanban' as const };
	}

	describe('clearing the filter', () => {
		it('shows "Clear filter" only while there is a query; clicking it empties the query and every card renders again', () => {
			mountBoard();
			expect(clearButton()).toBeNull();

			type('plain');
			expect(visible()).toEqual(['plain card']);
			expect(clearButton()).not.toBeNull();

			clearButton()!.click();
			flushSync();

			expect(kanbanStore.filterQuery).toBe('');
			expect(filterInput().value).toBe('');
			expect(visible()).toEqual(ALL);
			expect(clearButton()).toBeNull();
		});

		it('Escape in the filter input clears it', () => {
			mountBoard();
			type('plain');

			filterInput().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
			flushSync();

			expect(kanbanStore.filterQuery).toBe('');
			expect(visible()).toEqual(ALL);
		});
	});

	describe('the filter resets per board', () => {
		beforeEach(() => {
			editorStore.addTab(kanbanTab('/vault/a.kanban.md'));
			editorStore.addTab(kanbanTab('/vault/b.kanban.md'));
			editorStore.setActiveIndex(0);
		});

		it('switching the active tab path clears the filter and leaves an open card edit alone', () => {
			mountBoard();
			kanbanStore.setFilterQuery('plain');
			flushSync();
			const card = [...target.querySelectorAll<HTMLElement>('[data-item-id]')].find((el) => el.textContent?.includes('plain card'))!;
			card.querySelector('span.cursor-pointer')!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
			flushSync();
			const editingId = kanbanStore.editingItemId;
			expect(editingId).toBe(card.dataset.itemId);
			expect(card.querySelector('textarea')).not.toBeNull();

			editorStore.setActiveIndex(1);
			flushSync();

			expect(kanbanStore.filterQuery).toBe('');
			expect(kanbanStore.editingItemId).toBe(editingId);
			const editing = target.querySelector<HTMLElement>(`[data-item-id="${editingId}"]`);
			expect(editing?.querySelector('textarea')).not.toBeNull();
		});

		it('switching the active tab path clears the focus ring', () => {
			mountBoard();
			kanbanStore.setFocus(0, 1);
			flushSync();

			editorStore.setActiveIndex(1);
			flushSync();

			expect(kanbanStore.focusedLaneIndex).toBe(-1);
			expect(kanbanStore.focusedItemIndex).toBe(-1);
		});

		it('closing an earlier tab moves the active index but not the path, so the filter stays', () => {
			editorStore.setActiveIndex(1);
			mountBoard();
			kanbanStore.setFilterQuery('#design');
			flushSync();

			editorStore.removeTab(0);
			flushSync();

			expect(editorStore.activeIndex).toBe(0);
			expect(editorStore.activeTab?.path).toBe('/vault/b.kanban.md');
			expect(kanbanStore.filterQuery).toBe('#design');
		});

		it('unmounting clears the filter', () => {
			mountBoard();
			kanbanStore.setFilterQuery('#design');
			flushSync();

			unmount(component!);
			component = null;

			expect(kanbanStore.filterQuery).toBe('');
		});
	});

	describe('tag chips', () => {
		it('clicking a #design chip sets the filter to #design and hides an untagged card', () => {
			mountBoard();
			const chip = [...target.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === '#design');
			expect(chip).toBeDefined();

			chip!.click();
			flushSync();

			expect(kanbanStore.filterQuery).toBe('#design');
			expect(filterInput().value).toBe('#design');
			expect(visible()).not.toContain('plain card');
			expect(visible()).toContain('tagged');
			expect(api!.getPersistCount()).toBe(0);
		});

		it('a #design chip mixes its preset toward --editor-fg, and the tag swatches keep the full preset', async () => {
			mountBoard(markdownOf(SOURCE, { design: 'yellow' }));
			const chip = [...target.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === '#design')!;
			const style = chip.getAttribute('style') ?? '';
			expect(style).toContain('color-mix');
			expect(style).toContain('--editor-fg');
			expect(chip.style.background).toBe('rgba(234, 179, 8, 0.15)');

			const sub = await openTagColor('tagged');
			expect(sub.querySelector<HTMLElement>('button[title="yellow"]')!.style.background).toBe('rgb(234, 179, 8)');
		});

		it('"Tag color" lists one group per tag of the card', async () => {
			mountBoard(markdownOf('## To Do\n\n- [ ] two tags #alpha #beta\n\n'));
			const sub = await openTagColor('two tags');
			const labels = [...sub.querySelectorAll('[data-slot="context-menu-label"]')].map((el) => el.textContent?.trim());
			expect(labels).toEqual(['#alpha', '#beta']);
		});

		it('a "Tag color" swatch writes settings.tagColors in the persisted markdown', async () => {
			mountBoard();
			const sub = await openTagColor('tagged');
			const blue = sub.querySelector<HTMLButtonElement>('button[title="blue"]');
			expect(blue).not.toBeNull();

			blue!.click();
			flushSync();

			expect(parseKanbanBoard(api!.getMarkdown()).settings.tagColors).toEqual({ design: 'blue' });
		});

		it('"Reset to default" removes the tag colour entry', async () => {
			mountBoard(markdownOf(SOURCE, { design: 'red', other: 'green' }));
			const sub = await openTagColor('tagged');
			const reset = [...sub.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((el) => el.textContent?.trim() === 'Reset to default');
			expect(reset).toBeDefined();

			reset!.click();
			flushSync();

			expect(parseKanbanBoard(api!.getMarkdown()).settings.tagColors).toEqual({ other: 'green' });
		});

		it('"Reset to default" is absent for a tag with no colour', async () => {
			mountBoard();
			const sub = await openTagColor('tagged');
			expect(sub.textContent).not.toContain('Reset to default');
		});
	});
});

describe('KanbanView: card anatomy and inline edit', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;
	let api: HarnessApi | undefined;

	const SOURCE = '## To Do\n\n- [ ] plain card\n- [ ] dated card {2026-01-15}\n- [ ] linked card [[Some Note]]\n\n';

	beforeEach(() => {
		kanbanStore.reset();
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		api = undefined;
		kanbanStore.reset();
		fsStore.reset();
		document.body.innerHTML = '';
	});

	function mountBoard(source = SOURCE): void {
		component = mount(KanbanViewHarness, {
			target,
			props: { initialMarkdown: serializeKanbanBoard(setViewMode(parseKanbanBoard(source), 'board')), register: (a: HarnessApi) => { api = a; } },
		});
		flushSync();
	}

	/** The view's root, which carries the board keydown handler. */
	function root(): HTMLElement {
		return target.firstElementChild as HTMLElement;
	}

	function card(text: string): HTMLElement {
		const found = [...target.querySelectorAll<HTMLElement>('[data-item-id]')].find((el) => el.textContent?.includes(text));
		if (!found) throw new Error(`card "${text}" not found`);
		return found;
	}

	async function settle(): Promise<void> {
		for (let i = 0; i < 10; i++) {
			await Promise.resolve();
			await tick();
		}
		flushSync();
	}

	/** Double-clicks the card's text, which opens the inline editor, and returns the textarea. */
	function startEdit(text: string): HTMLTextAreaElement {
		const span = [...card(text).querySelectorAll<HTMLElement>('span')].filter((el) => el.textContent?.includes(text)).at(-1)!;
		span.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
		flushSync();
		const textarea = target.querySelector<HTMLTextAreaElement>('textarea');
		if (!textarea) throw new Error('edit textarea did not open');
		return textarea;
	}

	function typeInto(textarea: HTMLTextAreaElement, value: string): void {
		textarea.value = value;
		textarea.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
	}

	function press(el: Element, key: string): void {
		el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
		flushSync();
	}

	describe('card anatomy', () => {
		it('an undated card has a "Set date" button on its title line and no separate date row', () => {
			mountBoard();
			const setDate = card('plain card').querySelector<HTMLElement>('button[aria-label="Set date"]');
			expect(setDate).not.toBeNull();

			// The first ancestor that also holds the title is the title line, a row, not the card's column.
			let line = setDate!.parentElement!;
			while (!line.textContent?.includes('plain card')) line = line.parentElement!;
			expect(line.className).not.toContain('flex-col');
			expect(card('plain card').querySelector('.flex-wrap')).toBeNull();
		});

		it('a dated card keeps its date badge and remove button, and no "Set date" icon', () => {
			mountBoard();
			const dated = card('dated card');
			const badge = [...dated.querySelectorAll<HTMLElement>('button')].filter((b) => b.textContent?.trim() === '2026-01-15');
			expect(badge.length).toBeGreaterThan(0);
			expect(dated.querySelector('button[aria-label="Remove date"]')).not.toBeNull();
			expect(dated.querySelector('button[aria-label="Set date"]')).toBeNull();
		});

		it('the card is rounded-md', () => {
			mountBoard();
			expect(card('plain card').className).toContain('rounded-md');
			expect(card('plain card').className).not.toContain('rounded-lg');
		});

		it('the linked-note preview is clamped to three lines, not a scroll box', async () => {
			vi.mocked(loadLinkedFileContent).mockResolvedValueOnce('first line\nsecond line\nthird line\nfourth line');
			mountBoard();
			await settle();

			const preview = [...card('linked card').querySelectorAll<HTMLElement>('div')].find((el) => el.textContent?.trim().startsWith('first line'));
			expect(preview).toBeDefined();
			expect(preview!.className).toContain('line-clamp-3');
			expect(preview!.className).not.toContain('overflow-y-auto');
			expect(preview!.className).not.toContain('max-h-32');
		});

		it('double-clicking the "Set date" icon does not start an edit', () => {
			mountBoard();
			const setDate = card('plain card').querySelector<HTMLElement>('button[aria-label="Set date"]')!;
			setDate.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
			flushSync();
			expect(kanbanStore.editingItemId).toBeNull();
			expect(target.querySelector('textarea')).toBeNull();
		});

		it('source: the "Set date" wrapper stays opaque while the popover is open and sits outside the ondblclick span', () => {
			const source = readFileSync(join(process.cwd(), 'src/lib/plugins/kanban/KanbanCard.svelte'), 'utf8');
			const wrapper = source.match(/class="([^"]*)"[^>]*>\s*<KanbanDatePicker/g)?.find((m) => m.includes('has-[[data-state=open]]:opacity-100'));
			expect(wrapper).toBeDefined();
			expect(wrapper).toContain('group-hover:opacity-100');
			expect(wrapper).toContain('group-focus-within:opacity-100');

			const dblclickSpan = source.match(/<span[^>]*ondblclick=\{onStartEdit\}[\s\S]*?<\/span>/);
			expect(dblclickSpan).not.toBeNull();
			expect(dblclickSpan![0]).not.toContain('KanbanDatePicker');
		});
	});

	describe('growing editor', () => {
		const proto = HTMLTextAreaElement.prototype;

		afterEach(() => {
			delete (proto as unknown as Record<string, unknown>).scrollHeight;
		});

		/** A content-dependent height proves the measure runs after the value lands in the DOM. */
		function stubScrollHeight(): void {
			Object.defineProperty(proto, 'scrollHeight', {
				configurable: true,
				get(this: HTMLTextAreaElement) {
					return this.value.length > 20 ? 60 : 20;
				},
			});
		}

		it('sets the textarea height to its scrollHeight on every input', async () => {
			stubScrollHeight();
			mountBoard();
			const textarea = startEdit('plain card');
			await settle();
			expect(textarea.style.height).toBe('20px');

			typeInto(textarea, 'a much longer card text that wraps');
			await settle();
			expect(textarea.style.height).toBe('60px');

			typeInto(textarea, 'short');
			await settle();
			expect(textarea.style.height).toBe('20px');
		});

		it('opens a long card at its full height', async () => {
			stubScrollHeight();
			mountBoard('## To Do\n\n- [ ] a very long card text that certainly wraps\n\n');
			const textarea = startEdit('a very long card text');
			await settle();
			expect(textarea.value).toBe('a very long card text that certainly wraps');
			expect(textarea.style.height).toBe('60px');
		});

		it('grows when a wikilink suggestion rewrites the text', async () => {
			stubScrollHeight();
			fsStore.setFileTree([{ name: 'A very long note name.md', path: '/vault/A very long note name.md', isDirectory: false }]);
			mountBoard('## To Do\n\n- [ ] short\n\n');
			const textarea = startEdit('short');
			typeInto(textarea, 'x [[A ve');
			await settle();
			expect(textarea.style.height).toBe('20px');

			press(textarea, 'Enter');
			await settle();
			expect(textarea.value).toBe('x [[A very long note name]]');
			expect(textarea.style.height).toBe('60px');
		});
	});

	describe('focus after the edit', () => {
		it('Enter commits once and focuses the board root after the textarea unmounts', async () => {
			mountBoard();
			const textarea = startEdit('plain card');
			typeInto(textarea, 'renamed card');

			press(textarea, 'Enter');
			// Focusing before the textarea unmounts would blur it into a second commit.
			expect(document.activeElement).not.toBe(root());
			await settle();

			expect(target.querySelector('textarea')).toBeNull();
			expect(document.activeElement).toBe(root());
			expect(api!.getPersistCount()).toBe(1);
			expect(parseKanbanBoard(api!.getMarkdown()).lanes[0].items[0].text).toBe('renamed card');
		});

		it('Escape persists nothing and focuses the board root', async () => {
			mountBoard();
			const textarea = startEdit('plain card');
			typeInto(textarea, 'discarded text');

			press(textarea, 'Escape');
			await settle();

			expect(target.querySelector('textarea')).toBeNull();
			expect(document.activeElement).toBe(root());
			expect(api!.getPersistCount()).toBe(0);
		});

		it('the board root draws no focus ring when focused from code', () => {
			mountBoard();
			expect(root().className).toContain('outline-none');
		});

		it('a blur commit persists once and does not move focus to the root', async () => {
			mountBoard();
			const textarea = startEdit('plain card');
			typeInto(textarea, 'blurred card');

			textarea.blur();
			flushSync();
			await settle();

			expect(target.querySelector('textarea')).toBeNull();
			expect(api!.getPersistCount()).toBe(1);
			expect(document.activeElement).not.toBe(root());
		});

		it('the textarea holds the raw card text, date and color tokens included', () => {
			mountBoard('## To Do\n\n- [ ] dated card {2026-01-15} {color:blue}\n\n');
			const textarea = startEdit('dated card');
			expect(textarea.value).toBe('dated card {2026-01-15} {color:blue}');
		});
	});
});

describe('KanbanView: lanes, add row, counts and rail', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;
	let api: HarnessApi | undefined;

	const SOURCE = '## To Do\n\n- [ ] alpha #x\n- [ ] beta\n- [ ] gamma\n\n## Empty\n\n';

	beforeEach(() => {
		kanbanStore.reset();
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		api = undefined;
		kanbanStore.reset();
		fsStore.reset();
		document.body.innerHTML = '';
	});

	function mountBoard(source = SOURCE, edit: (b: ReturnType<typeof parseKanbanBoard>) => ReturnType<typeof parseKanbanBoard> = (b) => b): void {
		const board = edit(setViewMode(parseKanbanBoard(source), 'board'));
		component = mount(KanbanViewHarness, {
			target,
			props: { initialMarkdown: serializeKanbanBoard(board), register: (a: HarnessApi) => { api = a; } },
		});
		flushSync();
	}

	function lane(title: string): HTMLElement {
		const found = target.querySelector<HTMLElement>(`[data-lane-id][aria-label="${title}"]`);
		if (!found) throw new Error(`lane "${title}" not found`);
		return found;
	}

	function addInput(title: string): HTMLInputElement {
		const input = lane(title).querySelector<HTMLInputElement>('input[placeholder="Add a card..."]');
		if (!input) throw new Error(`lane "${title}" has no add input`);
		return input;
	}

	function typeInto(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
		el.value = value;
		el.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
	}

	function press(el: Element, key: string): void {
		el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
		flushSync();
	}

	describe('add row', () => {
		it('a stored-empty lane says "No cards. Drag one here or add a card."', () => {
			mountBoard();
			expect(lane('Empty').textContent).toContain('No cards. Drag one here or add a card.');
			expect(lane('To Do').textContent).not.toContain('No cards.');
		});

		it('the add input sits outside the card list, in a form with no opacity-0', () => {
			mountBoard();
			const input = addInput('To Do');
			expect(input.closest('[role="list"]')).toBeNull();
			expect(input.closest('[data-lane-id]')).toBe(lane('To Do'));
			expect(input.closest('form')!.className).not.toContain('opacity-0');
		});

		it('the add row suggestions open upward; the card editor keeps the default placement', () => {
			fsStore.setFileTree([{ name: 'Projects.md', path: '/vault/Projects.md', isDirectory: false }]);
			mountBoard();

			typeInto(addInput('To Do'), '[[Pro');
			const addSuggestion = [...lane('To Do').querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Projects');
			expect(addSuggestion?.parentElement?.className).toContain('bottom-full');
			typeInto(addInput('To Do'), '');

			const span = [...lane('To Do').querySelectorAll<HTMLElement>('[data-item-id] span')].filter((el) => el.textContent?.includes('beta')).at(-1)!;
			span.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
			flushSync();
			typeInto(target.querySelector('textarea')!, 'beta [[Pro');
			const editSuggestion = [...target.querySelectorAll('[data-item-id] button')].find((b) => b.textContent?.trim() === 'Projects');
			expect(editSuggestion?.parentElement?.className).toContain('mt-1');
			expect(editSuggestion?.parentElement?.className).not.toContain('bottom-full');
		});

		it('"n" focuses the focused lane\'s add input', () => {
			mountBoard();
			const root = target.firstElementChild as HTMLElement;
			press(root, 'ArrowDown');
			press(root, 'n');
			expect(document.activeElement).toBe(addInput('To Do'));
		});
	});

	describe('counts and empty text', () => {
		/** The lane's card count element. */
		function count(title: string): HTMLElement {
			const found = lane(title).querySelector<HTMLElement>('[data-lane-count]');
			if (!found) throw new Error(`lane "${title}" has no count`);
			return found;
		}

		/** The count text a sighted user sees; hidden from assistive tech. */
		function shown(title: string): string | undefined {
			return count(title).querySelector('[aria-hidden="true"]')?.textContent?.trim();
		}

		/** The count's spoken text: a screen-reader-only span, since a generic span cannot carry an aria-label. */
		function spoken(title: string): string | undefined {
			return count(title).querySelector('.sr-only')?.textContent?.trim();
		}

		it('with no filter the count reads n, or n/max with a limit, named "3 cards" / "3 of 5 cards"', () => {
			mountBoard(SOURCE, (b) => setLaneMaxItems(b, 'To Do', 5));
			expect(shown('To Do')).toBe('3/5');
			expect(spoken('To Do')).toBe('3 of 5 cards');
			expect(shown('Empty')).toBe('0');
			expect(spoken('Empty')).toBe('0 cards');
			expect(count('To Do').hasAttribute('aria-label')).toBe(false);
		});

		it('while filtering the count reads "1 of 3" with no /max, and atLimit still comes from the stored count', () => {
			mountBoard(SOURCE, (b) => setLaneMaxItems(b, 'To Do', 3));
			expect(count('To Do').className).toContain('text-destructive');

			kanbanStore.setFilterQuery('#x');
			flushSync();

			expect(shown('To Do')).toBe('1 of 3');
			expect(spoken('To Do')).toBe('1 of 3 cards');
			expect(count('To Do').className).toContain('text-destructive');
		});

		it('a lane the filter empties says "No matching cards"; a stored-empty lane keeps its own text', () => {
			mountBoard();
			kanbanStore.setFilterQuery('nothing matches this');
			flushSync();

			expect(lane('To Do').textContent).toContain('No matching cards');
			expect(lane('To Do').textContent).not.toContain('No cards.');
			expect(shown('To Do')).toBe('0 of 3');
			expect(lane('Empty').textContent).toContain('No cards. Drag one here or add a card.');
			expect(lane('Empty').textContent).not.toContain('No matching cards');
		});

		it('a whitespace-only filter counts as no filter', () => {
			mountBoard();
			kanbanStore.setFilterQuery('   ');
			flushSync();
			expect(shown('To Do')).toBe('3');
		});

		it('the auto-complete icon is named "Auto-complete on"', () => {
			mountBoard(SOURCE, (b) => setLaneAutoComplete(b, 'To Do', true));
			expect(lane('To Do').querySelector('[role="img"][aria-label="Auto-complete on"]')).not.toBeNull();
			expect(lane('Empty').querySelector('[aria-label="Auto-complete on"]')).toBeNull();
		});
	});

	describe('collapsed lane rail', () => {
		const collapsedToDo = (b: ReturnType<typeof parseKanbanBoard>) => toggleLaneCollapsed(b, 'To Do');

		function resizeHandle(title: string): Element | null {
			return lane(title).querySelector('[role="separator"][aria-label="Resize lane"]');
		}

		it('is 40 px wide, shows its title and count, and has no resize handle or add row', () => {
			mountBoard(SOURCE, collapsedToDo);
			expect(lane('To Do').style.width).toBe('40px');
			expect(lane('To Do').querySelector('h3')?.textContent?.trim()).toBe('To Do');
			const railCount = lane('To Do').querySelector('[data-lane-count]');
			expect(railCount?.querySelector('[aria-hidden="true"]')?.textContent?.trim()).toBe('3');
			expect(railCount?.querySelector('.sr-only')?.textContent?.trim()).toBe('3 cards');
			expect(lane('To Do').querySelector('button[aria-label="Expand lane"]')).not.toBeNull();
			expect(resizeHandle('To Do')).toBeNull();
			expect(lane('To Do').querySelector('form')).toBeNull();

			expect(lane('Empty').style.width).toBe(`${DEFAULT_LANE_WIDTH}px`);
			expect(resizeHandle('Empty')).not.toBeNull();
		});

		it('expanding restores the board lane width and the resize handle', () => {
			mountBoard(SOURCE, collapsedToDo);
			lane('To Do').querySelector<HTMLButtonElement>('button[aria-label="Expand lane"]')!.click();
			flushSync();

			expect(lane('To Do').style.width).toBe(`${DEFAULT_LANE_WIDTH}px`);
			expect(resizeHandle('To Do')).not.toBeNull();
			expect(isLaneCollapsed(parseKanbanBoard(api!.getMarkdown()), 'To Do')).toBe(false);
		});

		it('double-clicking the rail title expands the lane and shows the title input', () => {
			mountBoard(SOURCE, collapsedToDo);
			lane('To Do').querySelector('h3')!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
			flushSync();

			expect(lane('To Do').style.width).toBe(`${DEFAULT_LANE_WIDTH}px`);
			expect(isLaneCollapsed(parseKanbanBoard(api!.getMarkdown()), 'To Do')).toBe(false);
			const input = lane('To Do').querySelector<HTMLInputElement>('input:not([placeholder])');
			expect(input?.value).toBe('To Do');
		});

		it('"Rename" on the rail expands the lane and shows the title input', async () => {
			mountBoard(SOURCE, collapsedToDo);
			const title = lane('To Do').querySelector('h3')!;
			title.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 1, clientY: 1 }));
			for (let i = 0; i < 5; i++) await Promise.resolve();
			flushSync();
			const rename = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((el) => el.textContent?.trim() === 'Rename');
			if (!rename) throw new Error('no "Rename" item');
			rename.click();
			flushSync();

			expect(lane('To Do').style.width).toBe(`${DEFAULT_LANE_WIDTH}px`);
			expect(isLaneCollapsed(parseKanbanBoard(api!.getMarkdown()), 'To Do')).toBe(false);
			const input = lane('To Do').querySelector<HTMLInputElement>('input:not([placeholder])');
			expect(input?.value).toBe('To Do');
		});
	});
});

describe('KanbanView: list, table and archive', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;
	let api: HarnessApi | undefined;

	beforeEach(() => {
		vi.clearAllMocks();
		kanbanStore.reset();
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		api = undefined;
		kanbanStore.reset();
		document.body.innerHTML = '';
	});

	function mountMode(source: string, mode: KanbanViewMode, onOpenWikilink: (target: string) => void = () => {}): void {
		component = mount(KanbanViewHarness, {
			target,
			props: {
				initialMarkdown: serializeKanbanBoard(setViewMode(parseKanbanBoard(source), mode)),
				register: (a: HarnessApi) => { api = a; },
				onOpenWikilink,
			},
		});
		flushSync();
	}

	function buttonNamed(name: string): HTMLButtonElement[] {
		return [...target.querySelectorAll<HTMLButtonElement>('button')].filter((b) => b.getAttribute('aria-label') === name);
	}

	describe('check buttons', () => {
		it.each(['table', 'list'] as const)('%s: the check is named "Mark done" and flips to "Mark open" after a click', (mode) => {
			mountMode('## To Do\n\n- [ ] write the test\n\n', mode);
			const check = buttonNamed('Mark done');
			expect(check).toHaveLength(1);
			check[0].click();
			flushSync();

			expect(buttonNamed('Mark done')).toHaveLength(0);
			expect(buttonNamed('Mark open')).toHaveLength(1);
			expect(parseKanbanBoard(api!.getMarkdown()).lanes[0].items[0].checked).toBe(true);
		});
	});

	describe('table cells', () => {
		const TAGGED = '## To Do\n\n- [ ] Ship #design [[Spec]]\n\n';

		function cardCell(): HTMLTableCellElement {
			const row = target.querySelector<HTMLTableRowElement>('tbody tr');
			if (!row) throw new Error('no table row');
			return row.cells[2];
		}

		it('render the card text with a clickable wikilink and no inline tag', () => {
			const onOpenWikilink = vi.fn();
			mountMode(TAGGED, 'table', onOpenWikilink);
			const cell = cardCell();

			expect(cell.textContent).toContain('Ship');
			expect(cell.textContent).not.toContain('#design');
			const link = [...cell.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === 'Spec');
			expect(link).toBeDefined();
			link!.click();
			flushSync();
			expect(onOpenWikilink).toHaveBeenCalledWith('Spec');

			const row = cell.closest('tr')!;
			expect(row.cells[3].textContent?.trim()).toBe('#design');
			const chipStyle = row.cells[3].querySelector('span')!.getAttribute('style') ?? '';
			expect(chipStyle).toContain('color-mix');
			expect(chipStyle).toContain('--editor-fg');
		});

		it('list view still renders the #design chip inline', () => {
			mountMode(TAGGED, 'list');
			const chip = [...target.querySelectorAll<HTMLElement>('span, button')].find((el) => el.textContent?.trim() === '#design');
			expect(chip).toBeDefined();
		});

		it('an empty board shows one "No cards" row', () => {
			mountMode('## To Do\n\n## Done\n\n', 'table');
			const rows = target.querySelectorAll<HTMLTableRowElement>('tbody tr');
			expect(rows).toHaveLength(1);
			expect(rows[0].textContent?.trim()).toBe('No cards');
		});

		it('a board with cards has no "No cards" row', () => {
			mountMode(TAGGED, 'table');
			expect(target.querySelector('tbody')!.textContent).not.toContain('No cards');
		});
	});

	describe('archive', () => {
		const ARCHIVED = '## To Do\n\n- [ ] open card\n\n## Done\n\n---\n\n## Archive\n\n- [x] Pay rent {2026-11-20} {color:red}\n';

		function openArchive(): HTMLElement {
			const toggle = [...target.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.includes('Archive (1)'));
			if (!toggle) throw new Error('no archive toggle');
			toggle.click();
			flushSync();
			const row = buttonNamed('Restore item')[0]?.parentElement;
			if (!row) throw new Error('no archive row');
			return row;
		}

		it('a row shows the card text without date or color tokens, and the stored text keeps them', () => {
			mountMode(ARCHIVED, 'board');
			const row = openArchive();

			expect(row.textContent?.trim()).toBe('Pay rent');
			expect(parseKanbanBoard(api!.getMarkdown()).archive[0].text).toBe('Pay rent {2026-11-20} {color:red}');
		});

		it('Restore toasts the first lane title and moves the card into it in the persisted markdown', () => {
			mountMode(ARCHIVED, 'board');
			openArchive();
			buttonNamed('Restore item')[0].click();
			flushSync();

			expect(toast.success).toHaveBeenCalledWith('Restored to To Do');
			const board = parseKanbanBoard(api!.getMarkdown());
			expect(board.archive).toHaveLength(0);
			expect(board.lanes[0].items.map((i) => i.text)).toContain('Pay rent {2026-11-20} {color:red}');
		});
	});
});

describe('KanbanView: Move to and the manual order chip', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;
	let api: HarnessApi | undefined;

	const SOURCE = '## To Do\n\n- [ ] first card\n- [ ] second card #x\n\n## Done\n\n- [ ] done one\n- [ ] done two #x\n\n';

	beforeEach(() => {
		kanbanStore.reset();
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		api = undefined;
		kanbanStore.reset();
		document.body.innerHTML = '';
	});

	function mountBoard(source = SOURCE, edit: (board: KanbanBoard) => KanbanBoard = (b) => b): void {
		component = mount(KanbanViewHarness, {
			target,
			props: {
				initialMarkdown: serializeKanbanBoard(edit(setViewMode(parseKanbanBoard(source), 'board'))),
				register: (a: HarnessApi) => { api = a; },
			},
		});
		flushSync();
	}

	async function settle(): Promise<void> {
		for (let i = 0; i < 5; i++) await Promise.resolve();
		flushSync();
	}

	function card(text: string): HTMLElement {
		const found = [...target.querySelectorAll<HTMLElement>('[data-item-id]')].find((el) => el.textContent?.includes(text));
		if (!found) throw new Error(`card "${text}" not found`);
		return found;
	}

	/** Opens the card's context menu and returns its "Move to" submenu trigger. */
	async function moveToTrigger(text: string): Promise<HTMLElement> {
		card(text).dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 1, clientY: 1 }));
		await settle();
		const trigger = [...document.querySelectorAll<HTMLElement>('[data-slot="context-menu-sub-trigger"]')].find((el) => el.textContent?.includes('Move to'));
		if (!trigger) throw new Error('no "Move to" submenu');
		return trigger;
	}

	/** Opens "Move to" on the card and returns the lane titles it lists. */
	async function openMoveTo(text: string): Promise<HTMLElement[]> {
		const trigger = await moveToTrigger(text);
		trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
		await settle();
		const sub = document.querySelector<HTMLElement>('[data-slot="context-menu-sub-content"]');
		if (!sub) throw new Error('"Move to" submenu did not open');
		return [...sub.querySelectorAll<HTMLElement>('[role="menuitem"]')];
	}

	async function moveTo(text: string, lane: string): Promise<void> {
		const item = (await openMoveTo(text)).find((el) => el.textContent?.trim() === lane);
		if (!item) throw new Error(`"Move to" does not list ${lane}`);
		item.click();
		flushSync();
	}

	/** Each lane's card texts in the persisted markdown, by lane title. */
	function persistedLanes(): Record<string, string[]> {
		return Object.fromEntries(parseKanbanBoard(api!.getMarkdown()).lanes.map((l) => [l.title, l.items.map((i) => i.text)]));
	}

	describe('Move to', () => {
		it('"Move to" > "Done" on a To Do card puts it last in Done and removes it from To Do', async () => {
			mountBoard();
			await moveTo('first card', 'Done');

			expect(persistedLanes()).toEqual({
				'To Do': ['second card #x'],
				Done: ['done one', 'done two #x', 'first card'],
			});
		});

		it('moving into an auto-complete lane checks the card', async () => {
			mountBoard(SOURCE, (b) => setLaneAutoComplete(b, 'Done', true));
			await moveTo('first card', 'Done');

			const done = parseKanbanBoard(api!.getMarkdown()).lanes.find((l) => l.title === 'Done')!;
			expect(done.items.at(-1)).toMatchObject({ text: 'first card', checked: true });
		});

		it('moving into a lane without auto-complete keeps the card unchecked', async () => {
			mountBoard();
			await moveTo('first card', 'Done');

			const done = parseKanbanBoard(api!.getMarkdown()).lanes.find((l) => l.title === 'Done')!;
			expect(done.items.at(-1)).toMatchObject({ text: 'first card', checked: false });
		});

		it('with a filter hiding cards in the target lane, the card lands after the hidden ones', async () => {
			mountBoard();
			kanbanStore.setFilterQuery('#x');
			flushSync();
			await moveTo('second card', 'Done');

			// The filter shows one Done card; an index among the shown cards would put the moved card before "done two #x".
			expect(persistedLanes()).toEqual({
				'To Do': ['first card'],
				Done: ['done one', 'done two #x', 'second card #x'],
			});
		});

		it('works while the board is sorted', async () => {
			mountBoard(SOURCE, (b) => setSortMode(b, 'text-desc'));
			await moveTo('first card', 'Done');

			expect(persistedLanes()).toEqual({
				'To Do': ['second card #x'],
				Done: ['done one', 'done two #x', 'first card'],
			});
		});

		it('lists the other lanes by title, not the card\'s own lane', async () => {
			mountBoard('## To Do\n\n- [ ] first card\n\n## Doing\n\n## Done\n\n');
			const entries = (await openMoveTo('first card')).map((el) => el.textContent?.trim());
			expect(entries).toEqual(['Doing', 'Done']);
		});

		it('with a single lane the "Move to" trigger is disabled', async () => {
			mountBoard('## To Do\n\n- [ ] first card\n\n');
			const trigger = await moveToTrigger('first card');
			expect(trigger.hasAttribute('data-disabled')).toBe(true);
			expect(trigger.getAttribute('aria-disabled')).toBe('true');
		});
	});

	describe('"Manual order paused" chip', () => {
		function chip(): HTMLElement | null {
			return [...target.querySelectorAll<HTMLElement>('[data-manual-order-paused]')][0] ?? null;
		}

		it('is absent in manual order with no filter', () => {
			mountBoard();
			expect(chip()).toBeNull();
		});

		it('shows with a sort other than manual, and its title names the card menu', () => {
			mountBoard(SOURCE, (b) => setSortMode(b, 'date-asc'));
			expect(chip()?.textContent?.trim()).toBe('Manual order paused');
			expect(chip()?.title).toContain('card menu');
			expect(chip()?.title).toContain('Move to');
		});

		it('shows with a filter and goes away when the filter clears', () => {
			mountBoard();
			kanbanStore.setFilterQuery('#x');
			flushSync();
			expect(chip()?.textContent?.trim()).toBe('Manual order paused');

			kanbanStore.setFilterQuery('');
			flushSync();
			expect(chip()).toBeNull();
		});

		it('is absent in list view, which has no drag and no card menu', () => {
			mountBoard(SOURCE, (b) => setViewMode(setSortMode(b, 'date-asc'), 'list'));
			expect(chip()).toBeNull();
		});
	});

	describe('card drag', () => {
		function laneList(title: string): HTMLElement {
			const list = target.querySelector<HTMLElement>(`[role="group"][aria-label="${title}"] [role="list"]`);
			if (!list) throw new Error(`no lane "${title}"`);
			return list;
		}

		it('in manual order with no filter, cards are draggable and a drop into another lane moves the card', () => {
			mountBoard();
			const dragged = card('first card');
			expect(dragged.getAttribute('draggable')).toBe('true');

			dragged.dispatchEvent(new MouseEvent('dragstart', { bubbles: true }));
			flushSync();
			// jsdom lays every card out at y=0, so a drop below that appends.
			laneList('Done').dispatchEvent(new MouseEvent('drop', { bubbles: true, cancelable: true, clientY: 100 }));
			flushSync();

			expect(persistedLanes()).toEqual({
				'To Do': ['second card #x'],
				Done: ['done one', 'done two #x', 'first card'],
			});
		});

		it('cards are not draggable while sorted or filtered', () => {
			mountBoard(SOURCE, (b) => setSortMode(b, 'text-asc'));
			expect(card('first card').getAttribute('draggable')).toBe('false');
			unmount(component!);
			component = null;
			kanbanStore.reset();

			mountBoard();
			kanbanStore.setFilterQuery('#x');
			flushSync();
			expect(card('second card').getAttribute('draggable')).toBe('false');
		});
	});
});
