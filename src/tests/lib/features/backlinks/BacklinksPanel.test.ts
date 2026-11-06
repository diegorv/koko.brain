// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

// vaultStore persists recent vaults via localStorage; Node's built-in
// localStorage (no backing file) shadows jsdom's, so stub it explicitly.
setupLocalStorage();

// Fetch services hit Tauri IPC — legitimately mocked. Stores stay real
// (CLAUDE.md rule 1): the panel's effects are exercised against the real
// editorStore / vaultStore / backlinksStore.
vi.mock('#lib/features/backlinks/backlinks.service.js', () => ({
	fetchBacklinksV2: vi.fn(() => Promise.resolve()),
	fetchRelationshipBacklinks: vi.fn(() => Promise.resolve()),
}));

vi.mock('#lib/core/editor/editor.service.js', () => ({
	openFileInEditor: vi.fn(),
}));

import { mount, unmount, flushSync } from 'svelte';
import BacklinksPanel from '#lib/features/backlinks/BacklinksPanel.svelte';
import { fetchBacklinksV2, fetchRelationshipBacklinks } from '#lib/features/backlinks/backlinks.service.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { backlinksStore } from '#lib/features/backlinks/backlinks.store.svelte.js';

describe('BacklinksPanel — vaultIndexVersion refetch', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open('/vault');
		editorStore.reset();
		editorStore.addTab({ path: '/vault/note.md', name: 'note.md', content: '', savedContent: '' });
		backlinksStore.reset();
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	function mountPanel(): void {
		component = mount(BacklinksPanel, { target });
		flushSync();
	}

	/** Clicks the Collapsible trigger to expand/collapse the panel. */
	function clickTrigger(): void {
		const trigger = target.querySelector('button');
		if (!trigger) throw new Error('Collapsible trigger not found');
		trigger.click();
		flushSync();
	}

	it('does not fetch while collapsed, even when the index version bumps', () => {
		mountPanel();
		expect(fetchBacklinksV2).not.toHaveBeenCalled();

		vaultStore.bumpVaultIndexVersion(1);
		flushSync();

		expect(fetchBacklinksV2).not.toHaveBeenCalled();
	});

	it('fetches once for the active tab when expanded', () => {
		mountPanel();
		clickTrigger();

		expect(fetchBacklinksV2).toHaveBeenCalledTimes(1);
		expect(fetchBacklinksV2).toHaveBeenCalledWith('/vault/note.md');
		expect(fetchRelationshipBacklinks).toHaveBeenCalledWith('/vault/note.md');
	});

	it('refetches when vaultIndexVersion bumps while expanded', () => {
		mountPanel();
		clickTrigger();
		expect(fetchBacklinksV2).toHaveBeenCalledTimes(1);

		vaultStore.bumpVaultIndexVersion(1);
		flushSync();

		expect(fetchBacklinksV2).toHaveBeenCalledTimes(2);
		expect(fetchBacklinksV2).toHaveBeenLastCalledWith('/vault/note.md');
	});

	it('stops refetching after the panel is collapsed again', () => {
		mountPanel();
		clickTrigger();
		clickTrigger();
		expect(fetchBacklinksV2).toHaveBeenCalledTimes(1);

		vaultStore.bumpVaultIndexVersion(1);
		flushSync();

		expect(fetchBacklinksV2).toHaveBeenCalledTimes(1);
	});

	it('shows the indexing placeholder while the index is not ready, even at a non-zero version (second vault)', () => {
		// Second-vault condition: the process-global counter is already
		// non-zero, but this vault's index has not been built yet.
		vaultStore.bumpVaultIndexVersion(5);
		vaultStore.resetIndexReady();

		mountPanel();
		clickTrigger();

		expect(target.textContent).toContain('Indexing vault...');
	});

	it('replaces the indexing placeholder once the index build completes', () => {
		vaultStore.bumpVaultIndexVersion(5);
		vaultStore.resetIndexReady();
		mountPanel();
		clickTrigger();
		expect(target.textContent).toContain('Indexing vault...');

		vaultStore.markIndexReady();
		flushSync();

		expect(target.textContent).not.toContain('Indexing vault...');
		expect(target.textContent).toContain('No backlinks found');
	});
});

describe('BacklinksPanel — text roles', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open('/vault');
		vaultStore.markIndexReady();
		editorStore.reset();
		editorStore.addTab({ path: '/vault/note.md', name: 'note.md', content: '', savedContent: '' });
		backlinksStore.reset();
		target = document.body.appendChild(document.createElement('div'));
		component = mount(BacklinksPanel, { target });
		flushSync();
		target.querySelector('button')!.click();
		flushSync();
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	it('titles the panel in sentence case with the title role', () => {
		const title = target.querySelector('h2')!;
		expect(title.textContent).toBe('Backlinks');
		expect(title.classList).toContain('text-title');
		expect(title.classList).not.toContain('uppercase');
	});

	it('draws its header as the shared sidebar section header', () => {
		const header = target.querySelector('[data-sidebar-section-header]')!;
		expect(header).toBe(target.querySelector('button'));
		expect(header.querySelector('[data-sidebar-section-chevron]')).not.toBeNull();
		expect(header.querySelector('h2')!.textContent).toBe('Backlinks');
	});

	it('renders the empty message with the meta role', () => {
		const empty = [...target.querySelectorAll('p')].find((p) => p.textContent === 'No backlinks found')!;
		expect(empty.classList).toContain('text-meta');
	});

	it('renders counts with the meta role and relationship items like LinkItem', () => {
		backlinksStore.setLinkedMentions([
			{ sourcePath: '/vault/a.md', sourceName: 'a', snippets: [] },
			{ sourcePath: '/vault/b.md', sourceName: 'b', snippets: [] },
		]);
		backlinksStore.setRelationshipBacklinks([
			{ sourcePath: '/vault/c.md', sourceName: 'c', relationshipType: 'belongs_to' },
		]);
		flushSync();

		const spans = [...target.querySelectorAll('span')];
		const linkedCount = spans.find((s) => s.textContent === '2')!;
		const relationshipCount = spans.find((s) => s.textContent === '1')!;
		expect(linkedCount.classList).toContain('text-meta');
		expect(relationshipCount.classList).toContain('text-meta');

		const name = spans.find((s) => s.textContent === 'c')!;
		const type = spans.find((s) => s.textContent === 'belongs to')!;
		expect(name.classList).toContain('text-row');
		expect(type.classList).toContain('text-meta');
	});
});
