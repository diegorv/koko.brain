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

import { mount, unmount, flushSync, tick } from 'svelte';
import KanbanViewHarness from '../../../fixtures/KanbanViewHarness.svelte';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { kanbanStore } from '#lib/plugins/kanban/kanban.store.svelte.js';
import { parseKanbanBoard, serializeKanbanBoard, setSortMode, setTagColor, setViewMode, toggleLaneCollapsed } from '#lib/plugins/kanban/kanban.logic.js';
import type { KanbanSortMode, KanbanViewMode } from '#lib/plugins/kanban/kanban.types.js';

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
		expect(await openMenu(card)).toEqual(['Edit', 'Archive', 'Card color', 'Delete']);
	});

	it('adds "Tag color" only on a card with tags', async () => {
		const tagged = [...document.querySelectorAll('[data-item-id]')].find((el) => el.textContent?.includes('tagged'))!;
		expect(await openMenu(tagged)).toEqual(['Edit', 'Archive', 'Card color', 'Tag color', 'Delete']);
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
