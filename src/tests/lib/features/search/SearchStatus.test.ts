// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

// settingsStore reads localStorage at module load; stub it before any import pulls it in.
setupLocalStorage();

import { mount, unmount, flushSync } from 'svelte';
import SearchStatus from '#lib/features/search/SearchStatus.svelte';
import { searchStore } from '#lib/features/search/search.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';

const STATS = { totalDocuments: 12, added: 0, updated: 0, removed: 0, unchanged: 12 };

describe('SearchStatus (the status bar owner of the index status)', () => {
	let target: HTMLElement;
	let component: Record<string, unknown> | null = null;

	function mountStatus() {
		component = mount(SearchStatus, { target });
		flushSync();
	}

	beforeEach(() => {
		clearLocalStorage();
		searchStore.reset();
		settingsStore.reset();
		target = document.body.appendChild(document.createElement('div'));
	});

	afterEach(() => {
		if (component) unmount(component);
		component = null;
		document.body.innerHTML = '';
	});

	it('shows the indexed note count', () => {
		searchStore.setIndexStats(STATS);
		mountStatus();
		expect(target.textContent?.trim()).toBe('12 notes indexed');
	});

	it('shows "Indexing..." while the text index builds', () => {
		searchStore.setIndexStats(STATS);
		searchStore.setIsIndexing(true);
		mountStatus();
		expect(target.textContent?.trim()).toBe('Indexing...');
	});

	it('shows the semantic progress message while semantic indexing', () => {
		searchStore.setIndexStats(STATS);
		searchStore.setIsSemanticIndexing(true);
		searchStore.setSemanticProgress({ phase: 'embedding', current: 5, total: 20, message: 'Embedding 5/20' });
		mountStatus();
		expect(target.textContent?.trim()).toBe('Embedding 5/20');
	});

	it('shows nothing when there are no index stats', () => {
		mountStatus();
		expect(target.textContent?.trim()).toBe('');
	});
});
