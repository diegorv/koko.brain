// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(() => Promise.resolve([])),
}));

import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import EditorTabs from '#lib/core/markdown-editor/EditorTabs.svelte';

// jsdom has no layout, so it has no `scrollIntoView`; the spy records the calls.
Element.prototype.scrollIntoView ??= () => {};

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
