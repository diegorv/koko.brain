// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync, createRawSnippet, tick } from 'svelte';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(() => Promise.resolve([])),
}));

import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import {
	EVENT_CALENDAR_VIRTUAL_PATH,
	GRAPH_VIRTUAL_PATH,
	TAGS_VIRTUAL_PATH,
	TASKS_VIRTUAL_PATH,
	tabTooltipText,
} from '#lib/core/editor/editor.logic.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import type { EditorTab } from '#lib/core/editor/editor.types.js';
import EditorTabs from '#lib/core/markdown-editor/EditorTabs.svelte';

// jsdom has no layout, so it has no `scrollIntoView`; the spy records the calls.
Element.prototype.scrollIntoView ??= () => {};

// The strip measures itself through a ResizeObserver, which jsdom lacks.
class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

function addNote(name: string): void {
	editorStore.addTab({ path: `/vault/${name}.md`, name, content: '', savedContent: '' });
}

describe('EditorTabs active tab scroll', () => {
	let component: Record<string, unknown> | null = null;
	let target: HTMLElement;

	beforeEach(() => {
		editorStore.reset();
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		target.remove();
		editorStore.reset();
		vi.restoreAllMocks();
	});

	it('scrolls the newly active tab into view when the active tab changes', () => {
		addNote('One');
		addNote('Two');
		addNote('Three');
		component = mount(EditorTabs, { target });
		flushSync();
		const spy = vi.spyOn(Element.prototype, 'scrollIntoView');

		editorStore.setActiveIndex(0);
		flushSync();

		const tabs = target.querySelectorAll('[role="tab"]');
		expect(tabs[0].getAttribute('aria-selected')).toBe('true');
		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy.mock.contexts[0]).toBe(tabs[0]);
		expect(spy.mock.calls[0][0]).toMatchObject({ block: 'nearest', inline: 'nearest' });
	});

	it('scrolls a tab opened at the end of the strip into view', () => {
		addNote('One');
		component = mount(EditorTabs, { target });
		flushSync();
		const spy = vi.spyOn(Element.prototype, 'scrollIntoView');

		addNote('Two');
		flushSync();

		const tabs = target.querySelectorAll('[role="tab"]');
		expect(tabs).toHaveLength(2);
		expect(spy.mock.contexts.at(-1)).toBe(tabs[1]);
	});

	it('does not scroll when a tab after the active one closes', () => {
		addNote('One');
		addNote('Two');
		addNote('Three');
		editorStore.setActiveIndex(0);
		component = mount(EditorTabs, { target });
		flushSync();
		const spy = vi.spyOn(Element.prototype, 'scrollIntoView');

		editorStore.removeTab(2);
		flushSync();

		expect(target.querySelectorAll('[role="tab"]')).toHaveLength(2);
		expect(editorStore.activeIndex).toBe(0);
		expect(spy).not.toHaveBeenCalled();
	});

	it('scrolls the active tab into view when tabs are restored into an empty strip', () => {
		component = mount(EditorTabs, { target });
		flushSync();
		const spy = vi.spyOn(Element.prototype, 'scrollIntoView');

		addNote('One');
		addNote('Two');
		addNote('Three');
		editorStore.setActiveIndex(1);
		flushSync();

		const tabs = target.querySelectorAll('[role="tab"]');
		expect(tabs).toHaveLength(3);
		expect(spy.mock.contexts.at(-1)).toBe(tabs[1]);
	});

	it('renders no strip and scrolls nothing without tabs', () => {
		const spy = vi.spyOn(Element.prototype, 'scrollIntoView');
		component = mount(EditorTabs, { target });
		flushSync();

		expect(target.querySelector('[role="tablist"]')).toBeNull();
		expect(spy).not.toHaveBeenCalled();
	});
});

describe('EditorTabs tab menu', () => {
	let component: Record<string, unknown> | null = null;
	let target: HTMLElement;

	beforeEach(() => {
		editorStore.reset();
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.replaceChildren();
		editorStore.reset();
	});

	/** Right-clicks the first tab and returns the open menu's entries, separators as `---`. */
	async function openTabMenu(): Promise<string[]> {
		target.querySelector('[role="tab"]')!.dispatchEvent(
			new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 1, clientY: 1 }),
		);
		for (let i = 0; i < 5; i++) await Promise.resolve();
		flushSync();
		const menu = [...document.querySelectorAll('[role="menu"]')].find((el) => el.getAttribute('data-state') === 'open')!;
		return [...menu.children].map((el) =>
			el.getAttribute('data-slot') === 'context-menu-separator' ? '---' : (el.textContent?.trim() ?? ''),
		);
	}

	it('lists Pin tab and Close tab as one group, in sentence case', async () => {
		addNote('One');
		component = mount(EditorTabs, { target });
		flushSync();

		expect(await openTabMenu()).toEqual(['Pin tab', 'Close tab']);
	});

	it('offers only Unpin tab on a pinned tab', async () => {
		addNote('One');
		editorStore.togglePin(0);
		component = mount(EditorTabs, { target });
		flushSync();

		expect(await openTabMenu()).toEqual(['Unpin tab']);
	});
});

describe('EditorTabs tab icon', () => {
	let component: Record<string, unknown> | null = null;
	let target: HTMLElement;

	beforeEach(() => {
		editorStore.reset();
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.replaceChildren();
		editorStore.reset();
	});

	function tabIconClass(): string {
		return target.querySelector('[role="tab"] svg')?.getAttribute('class') ?? '';
	}

	it('shows a tag icon, not the note icon, on the Tags tab', () => {
		editorStore.addTab({ path: TAGS_VIRTUAL_PATH, name: 'Tags', content: '', savedContent: '', fileType: 'tags' });
		const tabIcon = createRawSnippet((_tab: () => EditorTab) => ({ render: () => '<i class="from-snippet"></i>' }));
		component = mount(EditorTabs, { target, props: { tabIcon } });
		flushSync();

		const tab = target.querySelector('[role="tab"]')!;
		expect(tabIconClass()).toContain('lucide-tag');
		expect(tab.querySelector('.lucide-file-text')).toBeNull();
		expect(tab.querySelector('.from-snippet')).toBeNull();
	});

	it('still shows the file icon on a note tab without a tabIcon snippet', () => {
		addNote('One');
		component = mount(EditorTabs, { target });
		flushSync();

		expect(tabIconClass()).toContain('lucide-file-text');
		expect(tabIconClass()).not.toContain('lucide-tag');
	});

	it('still renders a note tab through the tabIcon snippet', () => {
		addNote('One');
		const tabIcon = createRawSnippet((tab: () => EditorTab) => ({
			render: () => `<i class="from-snippet" data-path="${tab().path}"></i>`,
		}));
		component = mount(EditorTabs, { target, props: { tabIcon } });
		flushSync();

		const tab = target.querySelector('[role="tab"]')!;
		expect(tab.querySelector('.from-snippet')?.getAttribute('data-path')).toBe('/vault/One.md');
		expect(tab.querySelector('svg.lucide-file-text')).toBeNull();
		expect(tab.querySelector('svg.lucide-tag')).toBeNull();
	});
});

describe('EditorTabs overflow', () => {
	let component: Record<string, unknown> | null = null;
	let target: HTMLElement;

	// jsdom has no layout: every unpinned tab is TAB_WIDTH wide and a pinned one PINNED_WIDTH,
	// laid out from the strip's left edge and moved by its scrollLeft, so a tab opened or
	// pinned later gets a rect without a resize.
	const TAB_WIDTH = 150;
	const PINNED_WIDTH = 40;
	const STRIP_WIDTH = 300;
	let stripScrollLeft = 0;
	const realRect = Element.prototype.getBoundingClientRect;

	const rect = (left: number, right: number) =>
		({ x: left, y: 0, left, right, top: 0, bottom: 32, width: right - left, height: 32, toJSON: () => ({}) }) as DOMRect;
	const isStrip = (el: Element) => el.classList.contains('editor-tabs-bar');
	const widthOf = (tab: EditorTab) => (tab.pinned ? PINNED_WIDTH : TAB_WIDTH);
	const leftOf = (i: number) => editorStore.tabs.slice(0, i).reduce((sum, tab) => sum + widthOf(tab), 0);

	beforeEach(() => {
		editorStore.reset();
		settingsStore.reset();
		stripScrollLeft = 0;
		target = document.body.appendChild(document.createElement('div'));
		vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
			if (isStrip(this)) return rect(0, STRIP_WIDTH);
			const strip = this.closest('.editor-tabs-bar');
			if (strip && this.getAttribute('role') === 'tab') {
				const i = [...strip.querySelectorAll('[role="tab"]')].indexOf(this);
				const left = leftOf(i) - stripScrollLeft;
				return rect(left, left + widthOf(editorStore.tabs[i]));
			}
			return realRect.call(this);
		});
		vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(function (this: Element) {
			return isStrip(this) ? STRIP_WIDTH : 0;
		});
		vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockImplementation(function (this: Element) {
			return isStrip(this) ? Math.max(STRIP_WIDTH, leftOf(editorStore.tabs.length)) : 0;
		});
		vi.spyOn(Element.prototype, 'scrollLeft', 'get').mockImplementation(function (this: Element) {
			return isStrip(this) ? stripScrollLeft : 0;
		});
		vi.spyOn(Element.prototype, 'scrollLeft', 'set').mockImplementation(function (this: Element, value: number) {
			if (isStrip(this)) stripScrollLeft = value;
		});
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.replaceChildren();
		editorStore.reset();
		settingsStore.reset();
		vi.restoreAllMocks();
	});

	const strip = () => target.querySelector<HTMLElement>('.editor-tabs-bar')!;
	const fade = (side: 'left' | 'right') => target.querySelector(`[data-tab-fade="${side}"]`);
	const badge = () => target.querySelector('[aria-label="List all tabs"] [data-hidden-tabs]')?.textContent?.trim() ?? null;

	function mountWith(names: string[]): void {
		for (const name of names) addNote(name);
		component = mount(EditorTabs, { target });
		flushSync();
	}

	function scrollStripTo(left: number): void {
		strip().scrollLeft = left;
		strip().dispatchEvent(new Event('scroll'));
		flushSync();
	}

	function wheel(deltaY: number, deltaX = 0): WheelEvent {
		const event = new WheelEvent('wheel', { deltaY, deltaX, bubbles: true, cancelable: true });
		strip().dispatchEvent(event);
		flushSync();
		return event;
	}

	it('shows both fades and the hidden count on an overflowing strip scrolled to the middle', () => {
		mountWith(['One', 'Two', 'Three', 'Four', 'Five']);
		scrollStripTo(225);

		expect(fade('left')).not.toBeNull();
		expect(fade('right')).not.toBeNull();
		// Only Three (75..225) is inside the 300 px strip; Two and Four straddle its edges.
		expect(badge()).toBe('4');
	});

	it('shows no fade and no count when nothing overflows', () => {
		mountWith(['One', 'Two']);
		scrollStripTo(0);

		expect(fade('left')).toBeNull();
		expect(fade('right')).toBeNull();
		expect(badge()).toBeNull();
		expect(target.querySelector('[aria-label="List all tabs"]')).not.toBeNull();
	});

	it('updates the count when one more tab opens, with no resize or scroll', () => {
		mountWith(['One', 'Two']);
		expect(badge()).toBeNull();

		addNote('Three');
		flushSync();

		expect(badge()).toBe('1');
		expect(fade('right')).not.toBeNull();
	});

	it('updates the count when a tab is pinned or unpinned, with no resize or scroll', () => {
		mountWith(['One', 'Two', 'Three']);
		expect(badge()).toBe('1');

		editorStore.togglePin(2);
		editorStore.togglePin(2);
		flushSync();
		expect(badge()).toBeNull();
		expect(fade('right')).toBeNull();

		editorStore.togglePin(0);
		flushSync();
		expect(badge()).toBe('1');
		expect(fade('right')).not.toBeNull();
	});

	it('pads the scroller by the fade width so the reveal clears it', () => {
		mountWith(['One']);
		expect(strip().style.scrollPaddingInline).toBe('34px');
	});

	it('sizes unpinned tabs to shrink from 220 px to 100 px and keeps pinned tabs whole', () => {
		addNote('Pinned');
		editorStore.togglePin(0);
		mountWith(['One', 'Two']);

		const items = [...strip().children];
		expect(items).toHaveLength(3);
		expect(items[0].classList).toContain('shrink-0');
		expect(items[0].classList).not.toContain('flex-[0_1_220px]');
		for (const item of items.slice(1)) {
			expect(item.classList).toContain('flex-[0_1_220px]');
			expect(item.classList).toContain('min-w-[100px]');
			expect(item.querySelector('[role="tab"]')!.classList).toContain('min-w-0');
		}
		expect(strip().querySelector('[class*="max-w-40"]')).toBeNull();
	});

	it('scrolls sideways on a vertical wheel over an overflowing strip', () => {
		mountWith(['One', 'Two', 'Three', 'Four', 'Five']);

		const event = wheel(100);

		expect(strip().scrollLeft).toBe(100);
		expect(event.defaultPrevented).toBe(true);
	});

	it('leaves the wheel alone when the strip does not overflow', () => {
		mountWith(['One', 'Two']);

		const event = wheel(100);

		expect(strip().scrollLeft).toBe(0);
		expect(event.defaultPrevented).toBe(false);
	});

	it('leaves a mostly horizontal wheel to the browser', () => {
		mountWith(['One', 'Two', 'Three', 'Four', 'Five']);

		const event = wheel(10, 50);

		expect(strip().scrollLeft).toBe(0);
		expect(event.defaultPrevented).toBe(false);
	});
});

describe('EditorTabs list menu', () => {
	let component: Record<string, unknown> | null = null;
	let target: HTMLElement;

	beforeEach(() => {
		editorStore.reset();
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.replaceChildren();
		editorStore.reset();
	});

	const openMenu = () => document.querySelector<HTMLElement>('[role="menu"][data-state="open"]');
	const rows = () => [...(openMenu()?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];

	async function settle(): Promise<void> {
		for (let i = 0; i < 4; i++) {
			await tick();
			flushSync();
		}
	}

	async function openListMenu(): Promise<void> {
		target
			.querySelector('[aria-label="List all tabs"]')!
			.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 }));
		await settle();
	}

	beforeEach(() => {
		addNote('Alpha');
		editorStore.togglePin(0);
		editorStore.addTab({ path: '/vault/Beta.md', name: 'Beta', content: 'edited', savedContent: '' });
		editorStore.addTab({ path: TASKS_VIRTUAL_PATH, name: 'Tasks', content: 'x', savedContent: '', fileType: 'tasks' });
		editorStore.setActiveIndex(0);
	});

	it('lists every tab in strip order with dirty dots, pin marks and the active row', async () => {
		component = mount(EditorTabs, { target });
		flushSync();
		await openListMenu();

		const items = rows();
		expect(items.map((r) => r.textContent?.trim())).toEqual(['Alpha', 'Beta', 'Tasks']);
		expect(items.map((r) => r.querySelector('[data-dirty-dot]') !== null)).toEqual([false, true, false]);
		expect(items.map((r) => r.querySelector('[data-pin-mark]') !== null)).toEqual([true, false, false]);
		expect(items.map((r) => r.getAttribute('aria-current'))).toEqual(['true', null, null]);
		expect(items[2].querySelector('.lucide-list-checks')).not.toBeNull();
	});

	it('switches to the chosen tab and closes the menu', async () => {
		component = mount(EditorTabs, { target });
		flushSync();
		await openListMenu();

		rows()[2].click();
		await settle();

		expect(editorStore.activeIndex).toBe(2);
		expect(openMenu()).toBeNull();
	});
});

describe('EditorTabs right sidebar toggle reserve', () => {
	let component: Record<string, unknown> | null = null;
	let target: HTMLElement;

	beforeEach(() => {
		editorStore.reset();
		settingsStore.reset();
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.replaceChildren();
		editorStore.reset();
		settingsStore.reset();
	});

	const wrapper = () => target.querySelector<HTMLElement>('[data-tab-strip]')!;

	function mountOn(path: string, name: string, fileType?: EditorTab['fileType']): void {
		editorStore.addTab({ path, name, content: '', savedContent: '', fileType });
		component = mount(EditorTabs, { target });
		flushSync();
	}

	it('leaves room for the toggle on a note while the right sidebar is hidden', () => {
		settingsStore.updateLayout({ rightSidebarVisible: false });
		mountOn('/vault/Note.md', 'Note');

		expect(wrapper().classList).toContain('pr-10');

		settingsStore.updateLayout({ rightSidebarVisible: true });
		flushSync();
		expect(wrapper().classList).not.toContain('pr-10');
	});

	it.each([
		['/vault/Board.kanban', 'Board'],
		['/vault/Map.canvas', 'Map'],
		['/vault/Table.view', 'Table'],
		[TAGS_VIRTUAL_PATH, 'Tags', 'tags'],
		[TASKS_VIRTUAL_PATH, 'Tasks', 'tasks'],
		[GRAPH_VIRTUAL_PATH, 'Graph', 'graph'],
		[EVENT_CALENDAR_VIRTUAL_PATH, 'Calendar', 'event-calendar'],
	] as [string, string, EditorTab['fileType']?][])('leaves no room on %s, which has no toggle', (path, name, fileType) => {
		settingsStore.updateLayout({ rightSidebarVisible: false });
		mountOn(path, name, fileType);

		expect(wrapper().classList).not.toContain('pr-10');
	});

	it('marks the wrapper and the scroller as drag regions, with the tablist on the scroller', () => {
		mountOn('/vault/Note.md', 'Note');

		const strip = target.querySelector('.editor-tabs-bar')!;
		expect(wrapper().hasAttribute('data-tauri-drag-region')).toBe(true);
		expect(strip.hasAttribute('data-tauri-drag-region')).toBe(true);
		expect(strip.getAttribute('role')).toBe('tablist');
		expect(wrapper().contains(strip)).toBe(true);
		expect(wrapper().querySelector('[aria-label="List all tabs"]')).not.toBeNull();
	});
});

describe('EditorTabs labels, names and hover text', () => {
	let component: Record<string, unknown> | null = null;
	let target: HTMLElement;

	beforeEach(() => {
		editorStore.reset();
		vaultStore.open('/vault');
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.replaceChildren();
		editorStore.reset();
		vaultStore.close();
	});

	const tabs = () => [...target.querySelectorAll<HTMLElement>('[role="tab"]')];

	function mountTabs(list: EditorTab[]): void {
		for (const tab of list) editorStore.addTab(tab);
		component = mount(EditorTabs, { target });
		flushSync();
	}

	it('drops .md from a markdown note label and keeps other extensions', () => {
		mountTabs([
			{ path: '/vault/Projects/Roadmap.md', name: 'Roadmap.md', content: '', savedContent: '' },
			{ path: '/vault/Map.canvas', name: 'Map.canvas', content: '', savedContent: '', fileType: 'canvas' },
			{ path: '/vault/notes.txt', name: 'notes.txt', content: '', savedContent: '' },
		]);

		expect(tabs().map((tab) => tab.textContent?.trim())).toEqual(['Roadmap', 'Map.canvas', 'notes.txt']);
		expect(tabs()[0].querySelector('button')?.getAttribute('aria-label')).toBe('Close Roadmap.md');
		expect(editorStore.tabs[0].name).toBe('Roadmap.md');
	});

	it('names every tab, pinned included, and gives it the tooltip text as its title', () => {
		mountTabs([
			{ path: '/vault/Daily.md', name: 'Daily.md', content: '', savedContent: '', pinned: true },
			{ path: '/vault/Projects/Roadmap.md', name: 'Roadmap.md', content: 'edited', savedContent: '' },
			{ path: TASKS_VIRTUAL_PATH, name: 'Tasks', content: 'x', savedContent: '', fileType: 'tasks' },
		]);

		expect(tabs().map((tab) => tab.getAttribute('aria-label'))).toEqual(['Daily.md', 'Roadmap.md', 'Tasks']);
		expect(tabs().map((tab) => tab.getAttribute('title'))).toEqual(
			editorStore.tabs.map((tab) => tabTooltipText(tab, '/vault')),
		);
		expect(tabs()[0].getAttribute('title')).toBe('Daily.md\nDaily.md\nPinned');
		expect(tabs()[1].getAttribute('title')).toBe('Roadmap.md\nProjects/Roadmap.md\nUnsaved changes');
		expect(tabs()[2].getAttribute('title')).toBe('Tasks');
		expect(tabs().map((tab) => tab.getAttribute('tabindex'))).toEqual(['0', '0', '0']);
	});

	it('titles the dirty dot Unsaved changes', () => {
		mountTabs([{ path: '/vault/Roadmap.md', name: 'Roadmap.md', content: 'edited', savedContent: '' }]);

		const dots = tabs()[0].querySelectorAll('[title="Unsaved changes"]');
		expect(dots).toHaveLength(1);
		expect(dots[0].classList).toContain('rounded-full');
	});

	it('gives an inactive tab a hover tinted by its text color, and the active tab none', () => {
		mountTabs([
			{ path: '/vault/One.md', name: 'One.md', content: '', savedContent: '' },
			{ path: '/vault/Two.md', name: 'Two.md', content: '', savedContent: '' },
		]);
		editorStore.setActiveIndex(1);
		flushSync();

		const [inactive, active] = tabs();
		expect(inactive.classList).toContain('hover:bg-tab-text-inactive/10');
		expect(inactive.classList).not.toContain('hover:bg-muted/30');
		expect(active.classList).not.toContain('hover:bg-tab-text-inactive/10');
	});
});

describe('EditorTabs drag to reorder', () => {
	let component: Record<string, unknown> | null = null;
	let target: HTMLElement;

	// jsdom has no layout: every tab is TAB_WIDTH wide, laid out from the strip's left edge
	// and moved by its scrollLeft.
	const TAB_WIDTH = 100;
	const STRIP_WIDTH = 300;
	let stripScrollLeft = 0;
	const realRect = Element.prototype.getBoundingClientRect;
	const rect = (left: number, right: number) =>
		({ x: left, y: 0, left, right, top: 0, bottom: 32, width: right - left, height: 32, toJSON: () => ({}) }) as DOMRect;
	const isStrip = (el: Element) => el.classList.contains('editor-tabs-bar');

	beforeEach(() => {
		editorStore.reset();
		stripScrollLeft = 0;
		target = document.body.appendChild(document.createElement('div'));
		vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
			if (isStrip(this)) return rect(0, STRIP_WIDTH);
			const strip = this.closest('.editor-tabs-bar');
			if (strip && this.getAttribute('role') === 'tab') {
				const left = [...strip.querySelectorAll('[role="tab"]')].indexOf(this) * TAB_WIDTH - stripScrollLeft;
				return rect(left, left + TAB_WIDTH);
			}
			return realRect.call(this);
		});
		vi.spyOn(Element.prototype, 'scrollLeft', 'get').mockImplementation(function (this: Element) {
			return isStrip(this) ? stripScrollLeft : 0;
		});
		vi.spyOn(Element.prototype, 'scrollLeft', 'set').mockImplementation(function (this: Element, value: number) {
			if (isStrip(this)) stripScrollLeft = value;
		});
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.replaceChildren();
		editorStore.reset();
		vi.restoreAllMocks();
	});

	const strip = () => target.querySelector<HTMLElement>('.editor-tabs-bar')!;
	const tabs = () => [...target.querySelectorAll<HTMLElement>('[role="tab"]')];
	const markers = () => target.querySelectorAll<HTMLElement>('[data-tab-drop-marker]');
	const paths = () => editorStore.tabs.map((tab) => tab.path.replace('/vault/', '').replace('.md', ''));

	/** A fake DataTransfer: jsdom has no DragEvent, so the drag events carry this one. */
	function fakeDataTransfer(types?: string[]) {
		const data = new Map<string, string>();
		const setData = vi.fn((type: string, value: string) => void data.set(type, value));
		return {
			setData,
			getData: (type: string) => data.get(type) ?? '',
			get types() {
				return types ?? [...data.keys()];
			},
			effectAllowed: 'uninitialized',
			dropEffect: 'none',
		};
	}
	type FakeDataTransfer = ReturnType<typeof fakeDataTransfer>;

	function fire(el: Element, type: string, dataTransfer: FakeDataTransfer, clientX = 0): Event {
		const event = new Event(type, { bubbles: true, cancelable: true });
		Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
		Object.defineProperty(event, 'clientX', { value: clientX });
		el.dispatchEvent(event);
		flushSync();
		return event;
	}

	function mountWith(names: string[], pinned = 0): void {
		for (const name of names) addNote(name);
		for (let i = 0; i < pinned; i++) editorStore.togglePin(i);
		component = mount(EditorTabs, { target });
		flushSync();
	}

	/** Starts dragging the tab at `index` and returns its data transfer. */
	function startDrag(index: number): FakeDataTransfer {
		const dataTransfer = fakeDataTransfer();
		fire(tabs()[index], 'dragstart', dataTransfer);
		return dataTransfer;
	}

	it('makes every tab draggable', () => {
		mountWith(['A', 'B'], 1);

		expect(tabs().map((tab) => tab.getAttribute('draggable'))).toEqual(['true', 'true']);
	});

	it('puts only the private tab type in the drag payload, never text/plain', () => {
		mountWith(['A', 'B', 'C']);

		const dataTransfer = startDrag(2);

		expect(dataTransfer.setData.mock.calls).toEqual([['application/x-kokobrain-tab', '2']]);
		expect(dataTransfer.types).not.toContain('text/plain');
		expect(dataTransfer.effectAllowed).toBe('move');
	});

	it('shows one marker at the slot past the hovered tab midpoint', () => {
		mountWith(['A', 'B', 'C']);
		const dataTransfer = startDrag(0);

		const event = fire(tabs()[1], 'dragover', dataTransfer, 160);
		fire(tabs()[1], 'dragover', dataTransfer, 170);

		expect(event.defaultPrevented).toBe(true);
		expect(markers()).toHaveLength(1);
		// Past B's midpoint (150), so the slot is after B, at C's left edge.
		expect(markers()[0].style.left).toBe('200px');
	});

	it('reorders the real store on drop and keeps the active tab', () => {
		mountWith(['P', 'A', 'B', 'C'], 1);
		editorStore.setActiveIndex(3);
		flushSync();
		const dataTransfer = startDrag(3);

		fire(tabs()[1], 'dragover', dataTransfer, 110);
		const drop = fire(tabs()[1], 'drop', dataTransfer, 110);

		expect(drop.defaultPrevented).toBe(true);
		expect(paths()).toEqual(['P', 'C', 'A', 'B']);
		expect(editorStore.activeTabPath).toBe('/vault/C.md');
		expect(tabs()[1].getAttribute('aria-selected')).toBe('true');
		expect(markers()).toHaveLength(0);
	});

	it('keeps an unpinned tab out of the pinned group', () => {
		mountWith(['P', 'A', 'B'], 1);
		const dataTransfer = startDrag(2);

		fire(tabs()[0], 'dragover', dataTransfer, 10);
		expect(markers()[0].style.left).toBe('100px');
		fire(tabs()[0], 'drop', dataTransfer, 10);

		expect(paths()).toEqual(['P', 'B', 'A']);
	});

	it('keeps a pinned tab dragged past the unpinned group at the end of the pinned group', () => {
		mountWith(['P1', 'P2', 'A'], 2);
		const dataTransfer = startDrag(0);

		fire(tabs()[2], 'dragover', dataTransfer, 290);
		fire(tabs()[2], 'drop', dataTransfer, 290);

		expect(paths()).toEqual(['P2', 'P1', 'A']);
		expect(editorStore.tabs.slice(0, 2).every((tab) => tab.pinned)).toBe(true);
	});

	it('removes the marker and keeps the order when the drag ends without a drop', () => {
		mountWith(['A', 'B', 'C']);
		const dataTransfer = startDrag(0);
		fire(tabs()[2], 'dragover', dataTransfer, 260);
		expect(markers()).toHaveLength(1);

		fire(tabs()[0], 'dragend', dataTransfer);

		expect(markers()).toHaveLength(0);
		expect(paths()).toEqual(['A', 'B', 'C']);
	});

	it('ignores a text/plain drag over the strip: no marker, not prevented, a drop changes nothing', () => {
		mountWith(['A', 'B', 'C']);
		// A tab drag is in progress, so the payload type is the only gate left.
		startDrag(0);
		const dataTransfer = fakeDataTransfer(['text/plain']);

		const over = fire(tabs()[1], 'dragover', dataTransfer, 160);
		const drop = fire(tabs()[1], 'drop', dataTransfer, 160);

		expect(over.defaultPrevented).toBe(false);
		expect(drop.defaultPrevented).toBe(false);
		expect(markers()).toHaveLength(0);
		expect(paths()).toEqual(['A', 'B', 'C']);
	});

	it('scrolls the strip while the drag is within 40 px of an edge', () => {
		mountWith(['A', 'B', 'C', 'D', 'E']);
		const dataTransfer = startDrag(0);

		fire(strip(), 'dragover', dataTransfer, STRIP_WIDTH - 10);
		expect(strip().scrollLeft).toBeGreaterThan(0);
		const scrolled = strip().scrollLeft;

		fire(strip(), 'dragover', dataTransfer, 150);
		expect(strip().scrollLeft).toBe(scrolled);

		fire(strip(), 'dragover', dataTransfer, 10);
		expect(strip().scrollLeft).toBeLessThan(scrolled);
	});
});
