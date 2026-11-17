// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import { SvelteSet } from 'svelte/reactivity';
import { setupLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

import TagItem from '#lib/features/tags/TagItem.svelte';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import type { TagTreeNode } from '#lib/features/tags/tags.types.js';

function node(fullPath: string, count: number, children: TagTreeNode[] = []): TagTreeNode {
	const segment = fullPath.split('/').at(-1)!;
	const totalCount = count + children.reduce((sum, c) => sum + c.totalCount, 0);
	return { segment, fullPath, count, totalCount, filePaths: [], children };
}

const parent = node('work', 3, [node('work/project', 5)]);
const leaf = node('home', 2);

describe('TagItem rows', () => {
	let target: HTMLElement;
	const components: Record<string, unknown>[] = [];

	/** Mounts each node as a top-level TagItem, siblings in one container, as TagsView does. */
	function mountRows(...nodes: TagTreeNode[]) {
		for (const n of nodes) {
			components.push(mount(TagItem, { target, props: { node: n, onTagClick: vi.fn(), onColorChange: vi.fn() } }));
		}
		flushSync();
	}

	/** The row holding a tag's name button: leading element, dot trigger, name button. */
	function rowOf(segment: string): HTMLElement {
		const nameButton = [...target.querySelectorAll('button')].find(
			(b) => b.querySelector('span.truncate')?.textContent?.trim() === segment,
		);
		expect(nameButton).toBeDefined();
		return nameButton!.parentElement!;
	}

	function dotTriggers(): HTMLElement[] {
		return [...target.querySelectorAll<HTMLElement>('button[aria-label^="Color of"]')];
	}

	beforeEach(() => {
		settingsStore.reset();
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		for (const c of components.splice(0)) unmount(c);
		document.body.innerHTML = '';
	});

	it('gives a leaf the same leading slot, name and count classes as a parent', () => {
		mountRows(parent, leaf);
		const parentRow = rowOf('work');
		const leafRow = rowOf('home');

		const [pLead, pDot, pName] = [...parentRow.children] as HTMLElement[];
		const [lLead, lDot, lName] = [...leafRow.children] as HTMLElement[];
		expect(parentRow.children).toHaveLength(3);
		expect(leafRow.children).toHaveLength(3);

		expect(pLead.dataset.slot).toBe('collapsible-trigger');
		expect(lLead.tagName).toBe('SPAN');
		for (const lead of [pLead, lLead]) {
			expect(lead.classList).toContain('w-5');
			expect(lead.classList).toContain('shrink-0');
		}

		expect(pDot.getAttribute('aria-label')).toContain('work');
		expect(lDot.getAttribute('aria-label')).toContain('home');

		expect(lName.className).toBe(pName.className);
		const [pText, pCount] = [...pName.children] as HTMLElement[];
		const [lText, lCount] = [...lName.children] as HTMLElement[];
		expect(lText.className).toBe(pText.className);
		expect(lCount.className).toBe(pCount.className);
		expect(pCount.textContent).toBe('8');
		expect(lCount.textContent).toBe('2');
		expect(leafRow.className).toBe(parentRow.className);
	});

	it('names the chevron after the tag path and lets aria-expanded carry the state', () => {
		mountRows(parent);
		const chevron = rowOf('work').firstElementChild as HTMLElement;
		const name = chevron.getAttribute('aria-label');

		expect(name).toContain('work');
		expect(chevron.getAttribute('title')).toBe(name);
		expect(chevron.getAttribute('aria-expanded')).toBe('false');

		chevron.click();
		flushSync();

		expect(chevron.getAttribute('aria-expanded')).toBe('true');
		expect(chevron.getAttribute('aria-label')).toBe(name);
	});

	it('names the colour dot of every row after its tag path', () => {
		mountRows(parent, leaf);
		(rowOf('work').firstElementChild as HTMLElement).click();
		flushSync();

		const labels = dotTriggers().map((d) => d.getAttribute('aria-label'));
		expect(labels).toHaveLength(3);
		expect(labels[0]).toContain('work');
		expect(labels[1]).toContain('work/project');
		expect(labels[2]).toContain('home');
		for (const dot of dotTriggers()) expect(dot.getAttribute('title')).toBe(dot.getAttribute('aria-label'));
	});

	it('renders no chevron and no dot label beyond its own for a lone leaf', () => {
		mountRows(leaf);
		expect(target.querySelector('[data-slot="collapsible-trigger"]')).toBeNull();
		expect(dotTriggers().map((d) => d.getAttribute('aria-label'))).toEqual(['Color of home']);
	});
});

describe('TagItem forceOpen', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	const nested = node('area', 0, [node('area/home', 0, [node('area/home/garden', 1)])]);

	function mountRow(forceOpen: ReadonlySet<string>) {
		component = mount(TagItem, { target, props: { node: nested, forceOpen, onTagClick: vi.fn(), onColorChange: vi.fn() } });
		flushSync();
	}

	function chevron(path: string): HTMLElement {
		const el = target.querySelector<HTMLElement>(`[aria-label="Subtags of ${path}"]`);
		expect(el).not.toBeNull();
		return el!;
	}

	/**
	 * The tag names in open rows. A closed row keeps its children in the DOM,
	 * hidden only after its exit animation, so the content's state decides.
	 */
	function listed(): string[] {
		return [...target.querySelectorAll('span.truncate')]
			.filter((s) => s.closest('[data-slot="collapsible-content"][data-state="closed"]') === null)
			.map((s) => s.textContent?.trim() ?? '');
	}

	beforeEach(() => {
		settingsStore.reset();
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	it('shows a forced row and its forced children expanded without a click', () => {
		mountRow(new Set(['area', 'area/home']));
		expect(listed()).toEqual(['area', 'home', 'garden']);
		expect(chevron('area').getAttribute('aria-expanded')).toBe('true');
	});

	it('keeps a forced row open when its chevron is clicked', () => {
		mountRow(new Set(['area']));
		chevron('area').click();
		flushSync();
		expect(chevron('area').getAttribute('aria-expanded')).toBe('true');
		expect(listed()).toEqual(['area', 'home']);
	});

	it('returns to the row\'s own state when the path leaves the set', () => {
		const forced = new SvelteSet<string>();
		mountRow(forced);
		chevron('area').click();
		flushSync();
		expect(chevron('area').getAttribute('aria-expanded')).toBe('true');

		// Forced while the user had it open: a chevron click during it must not
		// overwrite the user's open state.
		forced.add('area');
		forced.add('area/home');
		flushSync();
		chevron('area').click();
		flushSync();
		expect(listed()).toEqual(['area', 'home', 'garden']);

		forced.clear();
		flushSync();
		expect(chevron('area').getAttribute('aria-expanded')).toBe('true');
		expect(chevron('area/home').getAttribute('aria-expanded')).toBe('false');
		expect(listed()).toEqual(['area', 'home']);
	});
});
