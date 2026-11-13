// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Navigation to a heading goes through the editor; it is not exercised here.
vi.mock('#lib/core/editor/open-note-at.service.js', () => ({
	openNoteAt: vi.fn(),
}));

import { mount, unmount, flushSync } from 'svelte';
import TableOfContentsPanel from '#lib/plugins/table-of-contents/TableOfContentsPanel.svelte';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { tocStore } from '#lib/plugins/table-of-contents/toc.store.svelte.js';
import { showTableOfContents } from '#lib/plugins/table-of-contents/toc.service.js';

const A = '/vault/a.md';
const B = '/vault/b.md';

describe('TableOfContentsPanel', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		editorStore.reset();
		settingsStore.reset();
		tocStore.reset();
		tocStore.setExpandedPath(null);
		editorStore.addTab({ path: A, name: 'a.md', content: '# Alpha\n## Beta\n', savedContent: '' });
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	function mountPanel(): void {
		component = mount(TableOfContentsPanel, { target });
		flushSync();
	}

	/** The Collapsible root's state; closed content can linger in jsdom (presence). */
	function isOpen(): boolean {
		return target.querySelector('[data-slot="collapsible"]')?.getAttribute('data-state') === 'open';
	}

	function headingTexts(): string[] {
		return [...target.querySelectorAll('button[title]')].map((b) => b.textContent?.trim() ?? '');
	}

	it('starts collapsed with no headings shown', () => {
		mountPanel();

		expect(isOpen()).toBe(false);
		expect(headingTexts()).toEqual([]);
		expect(tocStore.expandedPath).toBeNull();
	});

	it('opens on the active note when showTableOfContents runs, and lists its headings', () => {
		mountPanel();

		showTableOfContents(A);
		flushSync();

		expect(isOpen()).toBe(true);
		expect(headingTexts()).toEqual(['Alpha', 'Beta']);
	});

	it('is already open when it mounts after showTableOfContents (sidebar was hidden)', () => {
		showTableOfContents(A);
		mountPanel();

		expect(headingTexts()).toEqual(['Alpha', 'Beta']);
	});

	it('collapses on a tab switch and stays collapsed on the way back', () => {
		mountPanel();
		showTableOfContents(A);
		flushSync();

		editorStore.addTab({ path: B, name: 'b.md', content: '# Other\n', savedContent: '' });
		flushSync();
		expect(isOpen()).toBe(false);
		expect(tocStore.expandedPath).toBeNull();

		editorStore.setActiveIndex(0);
		flushSync();
		expect(isOpen()).toBe(false);
	});

	it('comes back collapsed after it unmounts open (sidebar hidden and shown)', () => {
		mountPanel();
		showTableOfContents(A);
		flushSync();
		expect(isOpen()).toBe(true);

		if (component) unmount(component);
		component = null;
		flushSync();
		expect(tocStore.expandedPath).toBeNull();

		mountPanel();
		expect(isOpen()).toBe(false);
	});

	it('the section header still toggles it by hand', () => {
		mountPanel();
		const trigger = target.querySelector('button');
		if (!trigger) throw new Error('trigger not found');

		trigger.click();
		flushSync();
		expect(tocStore.expandedPath).toBe(A);
		expect(isOpen()).toBe(true);
		expect(headingTexts()).toEqual(['Alpha', 'Beta']);

		trigger.click();
		flushSync();
		expect(tocStore.expandedPath).toBeNull();
		expect(isOpen()).toBe(false);
	});

	it('shows "No headings found" for a note without headings', () => {
		editorStore.updateContent('Just text\n');
		mountPanel();
		showTableOfContents(A);
		flushSync();

		expect(target.textContent).toContain('No headings found');
	});

	it('draws its header as the shared sidebar section header', () => {
		mountPanel();

		const header = target.querySelector('[data-sidebar-section-header]')!;
		expect(header).toBe(target.querySelector('button'));
		expect(header.querySelector('[data-sidebar-section-chevron]')).not.toBeNull();
		expect(header.querySelector('h2')!.textContent).toBe('Table of contents');
	});

	it('titles the panel in sentence case, above its entries by size', () => {
		mountPanel();
		showTableOfContents(A);
		flushSync();

		const title = target.querySelector('h2')!;
		expect(title.textContent).toBe('Table of contents');
		expect(title.classList).toContain('text-title');
		expect(title.classList).not.toContain('uppercase');
		for (const entry of target.querySelectorAll('button[title]')) {
			expect(entry.classList).toContain('text-row');
		}
	});

	it('renders the empty message with the meta role', () => {
		editorStore.updateContent('Just text\n');
		mountPanel();
		showTableOfContents(A);
		flushSync();

		const empty = [...target.querySelectorAll('p')].find((p) => p.textContent === 'No headings found')!;
		expect(empty.classList).toContain('text-meta');
	});
});
