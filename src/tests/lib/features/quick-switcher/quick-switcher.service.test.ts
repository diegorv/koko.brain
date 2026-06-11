import { describe, it, expect, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

import { quickSwitcherStore } from '$lib/features/quick-switcher/quick-switcher.store.svelte';
import { resetQuickSwitcher } from '$lib/features/quick-switcher/quick-switcher.service';

describe('resetQuickSwitcher', () => {
	beforeEach(() => {
		clearLocalStorage();
		quickSwitcherStore.reset();
	});

	it('closes the switcher and clears recent paths', () => {
		quickSwitcherStore.open();
		quickSwitcherStore.addRecentPath('/vault/a.md');
		quickSwitcherStore.addRecentPath('/vault/b.md');
		expect(quickSwitcherStore.isOpen).toBe(true);
		expect(quickSwitcherStore.recentPaths).toHaveLength(2);

		resetQuickSwitcher();

		expect(quickSwitcherStore.isOpen).toBe(false);
		expect(quickSwitcherStore.recentPaths).toEqual([]);
	});

	it('removes the persisted recent-files entry from localStorage', () => {
		quickSwitcherStore.addRecentPath('/vault/a.md');
		expect(localStorage.getItem('kokobrain:recent-files')).not.toBeNull();

		resetQuickSwitcher();

		expect(localStorage.getItem('kokobrain:recent-files')).toBeNull();
	});

	it('is safe to call on already-empty state', () => {
		expect(() => resetQuickSwitcher()).not.toThrow();

		expect(quickSwitcherStore.isOpen).toBe(false);
		expect(quickSwitcherStore.recentPaths).toEqual([]);
	});
});
