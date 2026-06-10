// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

// vaultStore persists recent vaults via localStorage; Node's built-in
// localStorage (no backing file) shadows jsdom's, so stub it explicitly.
setupLocalStorage();

// The fetch service hits Tauri IPC — legitimately mocked. Stores stay real
// (CLAUDE.md rule 1): the panel's effects are exercised against the real
// editorStore / vaultStore / outgoingLinksStore.
vi.mock('$lib/features/outgoing-links/outgoing-links.service', () => ({
	fetchOutgoingLinksV2: vi.fn(() => Promise.resolve()),
}));

vi.mock('$lib/core/editor/editor.service', () => ({
	openFileInEditor: vi.fn(),
}));

import { mount, unmount, flushSync } from 'svelte';
import OutgoingLinksPanel from '$lib/features/outgoing-links/OutgoingLinksPanel.svelte';
import { fetchOutgoingLinksV2 } from '$lib/features/outgoing-links/outgoing-links.service';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { outgoingLinksStore } from '$lib/features/outgoing-links/outgoing-links.store.svelte';

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
});
