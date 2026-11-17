// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync, tick } from 'svelte';
import { setupLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
} as unknown as typeof ResizeObserver;
// jsdom has no layout: give the graph container a size so the simulation
// starts, and no 2D canvas, so render() returns early on a null context.
Element.prototype.getBoundingClientRect = () =>
	({ x: 0, y: 0, top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600, toJSON() {} }) as DOMRect;
HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext'];
// jsdom lacks the pointer-capture and scroll APIs the Select calls when it opens.
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= () => {};
Element.prototype.scrollIntoView ??= () => {};

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { graphViewStore } from '#lib/plugins/graph-view/graph-view.store.svelte.js';
import { openGraphTab } from '#lib/plugins/graph-view/graph-view.service.js';
import GraphView from '#lib/plugins/graph-view/GraphView.svelte';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

/** Lets queued promises and Svelte updates run. */
async function settle(): Promise<void> {
	for (let i = 0; i < 20; i++) {
		await Promise.resolve();
		await tick();
	}
	flushSync();
}

/**
 * The controls are mounted through GraphView, their only parent, because the
 * filter options depend on which nodes GraphView passes in.
 */
describe('GraphControls', () => {
	let component: Record<string, unknown> | null = null;
	let target: HTMLElement;

	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
		graphViewStore.reset();
		vi.mocked(invoke).mockResolvedValue([
			entryV2('/vault/a/one.md', { tags: ['work'] }),
			entryV2('/vault/a/two.md'),
			entryV2('/vault/b/three.md', { tags: ['home'] }),
		]);
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
		graphViewStore.reset();
	});

	async function render(): Promise<void> {
		openGraphTab();
		component = mount(GraphView, { target });
		flushSync();
		await vi.waitFor(() => expect(target.textContent).toContain('3 notes'));
	}

	function trigger(label: string): HTMLElement | null {
		return target.querySelector<HTMLElement>(`[data-slot="select-trigger"][aria-label="${label}"]`);
	}

	/** Opens the Select labelled `label` and returns its options' text. */
	async function openOptions(label: string): Promise<string[]> {
		const el = trigger(label);
		if (!el) throw new Error(`no ${label} control in: ${target.textContent}`);
		el.focus();
		el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		flushSync();
		return vi.waitFor(() => {
			// Scoped to this trigger's listbox: an earlier Select's content may still be in the DOM.
			const listbox = document.getElementById(el.getAttribute('aria-controls') ?? '');
			const found = [...(listbox?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])].map((o) => o.textContent?.trim() ?? '');
			if (found.length === 0) throw new Error(`${label} did not open`);
			return found;
		});
	}

	/** Opens the Select labelled `label`, unless it is already open, and picks `option`. */
	async function choose(label: string, option: string): Promise<void> {
		// Enter on an open trigger closes it.
		if (trigger(label)?.getAttribute('aria-expanded') !== 'true') await openOptions(label);
		const listbox = document.getElementById(trigger(label)!.getAttribute('aria-controls') ?? '');
		const item = [...(listbox?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])].find((o) => o.textContent?.trim() === option);
		if (!item) throw new Error(`no option ${option}`);
		item.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0, pointerType: 'mouse' }));
		item.click();
		await settle();
	}

	/** The switch whose label reads `name`. */
	function switchNamed(name: string): HTMLButtonElement {
		const found = [...target.querySelectorAll<HTMLButtonElement>('[role="switch"]')].find(
			(s) => s.labels?.[0]?.textContent?.trim() === name,
		);
		if (!found) throw new Error(`no switch named ${name}`);
		return found;
	}

	describe('folder filter', () => {
		it('keeps the control and its other folders after picking a folder with no subfolders', async () => {
			await render();

			await choose('Folder filter', 'a');

			expect(graphViewStore.filters.folder).toBe('/vault/a');
			await vi.waitFor(() => expect(target.textContent).toContain('2 notes'));
			expect(await openOptions('Folder filter')).toEqual(['All folders', 'a', 'b']);
		});

		it('clears the folder with All folders', async () => {
			await render();
			await choose('Folder filter', 'a');

			await choose('Folder filter', 'All folders');

			expect(graphViewStore.filters.folder).toBeNull();
			await vi.waitFor(() => expect(target.textContent).toContain('3 notes'));
		});

		it('keeps a set folder clearable when local mode offers one folder', async () => {
			await render();
			await choose('Folder filter', 'b');

			graphViewStore.setCenterPath('/vault/a/one.md');
			graphViewStore.setMode('local');
			await settle();

			expect(await openOptions('Folder filter')).toEqual(['All folders', 'a']);
			await choose('Folder filter', 'All folders');
			expect(graphViewStore.filters.folder).toBeNull();
		});
	});

	describe('tag filter', () => {
		it('sets the picked tag and clears it with All tags', async () => {
			await render();

			await choose('Tag filter', '#work');
			expect(graphViewStore.filters.tag).toBe('work');

			await choose('Tag filter', 'All tags');
			expect(graphViewStore.filters.tag).toBeNull();
		});

		it('keeps the tag control when a tag and folder leave no nodes', async () => {
			await render();
			await choose('Folder filter', 'a');

			await choose('Tag filter', '#home');

			await vi.waitFor(() => expect(target.textContent).toContain('0 notes'));
			expect(await openOptions('Tag filter')).toEqual(['All tags', '#home', '#work']);
		});

		it('keeps a set tag clearable when local mode offers no tags', async () => {
			await render();
			await choose('Tag filter', '#home');

			graphViewStore.setCenterPath('/vault/a/two.md');
			graphViewStore.setMode('local');
			await settle();

			expect(await openOptions('Tag filter')).toEqual(['All tags']);
			await choose('Tag filter', 'All tags');
			expect(graphViewStore.filters.tag).toBeNull();
		});
	});

	describe('switches', () => {
		it('toggles orphans through a named switch', async () => {
			await render();
			const orphans = switchNamed('Orphans');
			expect(orphans.getAttribute('aria-checked')).toBe('true');

			orphans.click();
			flushSync();

			expect(graphViewStore.filters.showOrphans).toBe(false);
			expect(orphans.getAttribute('aria-checked')).toBe('false');
		});

		it('toggles orphans once per click on its label text', async () => {
			await render();
			const orphans = switchNamed('Orphans');

			orphans.labels![0].querySelector('span')!.click();
			flushSync();

			expect(graphViewStore.filters.showOrphans).toBe(false);
			expect(orphans.getAttribute('aria-checked')).toBe('false');
		});

		it('toggles arrows through a named switch', async () => {
			await render();
			const arrows = switchNamed('Arrows');
			expect(arrows.getAttribute('aria-checked')).toBe('false');

			arrows.click();
			flushSync();

			expect(graphViewStore.display.showArrows).toBe(true);
			expect(arrows.getAttribute('aria-checked')).toBe('true');
		});
	});

	describe('depth stepper', () => {
		function depthGroup(): HTMLElement | null {
			return target.querySelector<HTMLElement>('[role="group"][aria-label="Link depth"]');
		}

		function depthButton(name: string): HTMLButtonElement {
			const found = depthGroup()?.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`);
			if (!found) throw new Error(`no ${name} button in: ${target.textContent}`);
			return found;
		}

		it('is hidden in global mode', async () => {
			await render();

			expect(depthGroup()).toBeNull();
		});

		it('shows the current depth in local mode with Decrease disabled at 1', async () => {
			await render();

			graphViewStore.setMode('local');
			flushSync();

			expect(depthGroup()?.textContent).toContain('1');
			expect(depthButton('Decrease depth').disabled).toBe(true);
			expect(depthButton('Increase depth').disabled).toBe(false);
		});

		it('steps the depth up to 3 and back down', async () => {
			await render();
			graphViewStore.setMode('local');
			flushSync();

			depthButton('Increase depth').click();
			flushSync();
			expect(graphViewStore.localDepth).toBe(2);
			expect(depthGroup()?.textContent).toContain('2');

			depthButton('Increase depth').click();
			flushSync();
			expect(graphViewStore.localDepth).toBe(3);
			expect(depthGroup()?.textContent).toContain('3');
			expect(depthButton('Increase depth').disabled).toBe(true);
			expect(depthButton('Decrease depth').disabled).toBe(false);

			depthButton('Decrease depth').click();
			flushSync();
			expect(graphViewStore.localDepth).toBe(2);
		});
	});

	describe('panel', () => {
		it('has no native select', async () => {
			await render();

			expect(target.querySelector('select')).toBeNull();
		});

		it('has no Close button', async () => {
			await render();

			const names = [...target.querySelectorAll('button')].map((b) => `${b.getAttribute('aria-label')} ${b.title} ${b.textContent}`);
			expect(names.some((n) => /close/i.test(n))).toBe(false);
		});

		it('names the mode and zoom buttons', async () => {
			await render();

			for (const name of ['Global graph', 'Local graph', 'Zoom in', 'Zoom out']) {
				expect(target.querySelector(`button[aria-label="${name}"]`), name).not.toBeNull();
			}
		});
	});
});
