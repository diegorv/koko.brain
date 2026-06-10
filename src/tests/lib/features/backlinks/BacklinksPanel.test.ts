// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

// vaultStore persists recent vaults via localStorage; Node's built-in
// localStorage (no backing file) shadows jsdom's, so stub it explicitly.
setupLocalStorage();

// Fetch services hit Tauri IPC — legitimately mocked. Stores stay real
// (CLAUDE.md rule 1): the panel's effects are exercised against the real
// editorStore / vaultStore / backlinksStore.
vi.mock('$lib/features/backlinks/backlinks.service', () => ({
	fetchBacklinksV2: vi.fn(() => Promise.resolve()),
	fetchRelationshipBacklinks: vi.fn(() => Promise.resolve()),
}));

vi.mock('$lib/core/editor/editor.service', () => ({
	openFileInEditor: vi.fn(),
}));

import { mount, unmount, flushSync } from 'svelte';
import BacklinksPanel from '$lib/features/backlinks/BacklinksPanel.svelte';
import { fetchBacklinksV2, fetchRelationshipBacklinks } from '$lib/features/backlinks/backlinks.service';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { backlinksStore } from '$lib/features/backlinks/backlinks.store.svelte';

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
});
