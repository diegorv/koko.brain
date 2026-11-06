// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

// vaultStore persists recent vaults via localStorage; Node's built-in
// localStorage (no backing file) shadows jsdom's, so stub it explicitly.
setupLocalStorage();

// The fetch service hits Tauri IPC — legitimately mocked. Stores stay real
// (CLAUDE.md rule 1): the panel's effects are exercised against the real
// editorStore / vaultStore / outgoingLinksStore.
vi.mock('#lib/features/outgoing-links/outgoing-links.service.js', () => ({
	fetchOutgoingLinksV2: vi.fn(() => Promise.resolve()),
}));

vi.mock('#lib/core/editor/editor.service.js', () => ({
	openFileInEditor: vi.fn(),
}));

import { mount, unmount, flushSync } from 'svelte';
import OutgoingLinksPanel from '#lib/features/outgoing-links/OutgoingLinksPanel.svelte';
import { fetchOutgoingLinksV2 } from '#lib/features/outgoing-links/outgoing-links.service.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { outgoingLinksStore } from '#lib/features/outgoing-links/outgoing-links.store.svelte.js';

describe('OutgoingLinksPanel — vaultIndexVersion refetch', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open('/vault');
		editorStore.reset();
		editorStore.addTab({ path: '/vault/note.md', name: 'note.md', content: '', savedContent: '' });
		outgoingLinksStore.reset();
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	function mountPanel(): void {
		component = mount(OutgoingLinksPanel, { target });
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
		expect(fetchOutgoingLinksV2).not.toHaveBeenCalled();

		vaultStore.bumpVaultIndexVersion(1);
		flushSync();

		expect(fetchOutgoingLinksV2).not.toHaveBeenCalled();
	});

	it('fetches once for the active tab when expanded', () => {
		mountPanel();
		clickTrigger();

		expect(fetchOutgoingLinksV2).toHaveBeenCalledTimes(1);
		expect(fetchOutgoingLinksV2).toHaveBeenCalledWith('/vault/note.md', '');
	});

	it('refetches when vaultIndexVersion bumps while expanded', () => {
		mountPanel();
		clickTrigger();
		expect(fetchOutgoingLinksV2).toHaveBeenCalledTimes(1);

		vaultStore.bumpVaultIndexVersion(1);
		flushSync();

		expect(fetchOutgoingLinksV2).toHaveBeenCalledTimes(2);
		expect(fetchOutgoingLinksV2).toHaveBeenLastCalledWith('/vault/note.md', '');
	});

	it('stops refetching after the panel is collapsed again', () => {
		mountPanel();
		clickTrigger();
		clickTrigger();
		expect(fetchOutgoingLinksV2).toHaveBeenCalledTimes(1);

		vaultStore.bumpVaultIndexVersion(1);
		flushSync();

		expect(fetchOutgoingLinksV2).toHaveBeenCalledTimes(1);
	});

	it('titles the panel with the title role and the empty message with the meta role', () => {
		mountPanel();
		clickTrigger();

		const title = target.querySelector('h2')!;
		expect(title.textContent).toBe('Outgoing links');
		expect(title.classList).toContain('text-title');
		expect(title.classList).not.toContain('uppercase');
		const empty = [...target.querySelectorAll('p')].find((p) => p.textContent === 'No outgoing links')!;
		expect(empty.classList).toContain('text-meta');
	});

	it('draws its header as the shared sidebar section header', () => {
		mountPanel();

		const header = target.querySelector('[data-sidebar-section-header]')!;
		expect(header).toBe(target.querySelector('button'));
		expect(header.querySelector('[data-sidebar-section-chevron]')).not.toBeNull();
		expect(header.querySelector('h2')!.textContent).toBe('Outgoing links');
	});

	it('renders resolved and unresolved links with the row role', () => {
		mountPanel();
		clickTrigger();
		outgoingLinksStore.setOutgoingLinks([
			{ target: 'Alpha', alias: null, heading: null, resolvedPath: '/vault/Alpha.md', position: 0 },
			{ target: 'Missing', alias: null, heading: null, resolvedPath: null, position: 10 },
		]);
		flushSync();

		const spans = [...target.querySelectorAll('span')];
		expect(spans.find((s) => s.textContent === 'Alpha')!.classList).toContain('text-row');
		expect(spans.find((s) => s.textContent === 'Missing')!.classList).toContain('text-row');
	});
});
