import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: vi.fn((key: string) => store[key] ?? null),
		setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
		removeItem: vi.fn((key: string) => { delete store[key]; }),
		clear: vi.fn(() => { store = {}; }),
	};
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

import { quickSwitcherStore } from '$lib/features/quick-switcher/quick-switcher.store.svelte';

describe('quickSwitcherStore', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorageMock.clear();
		quickSwitcherStore.reset();
	});

	it('starts closed with empty recent paths', () => {
		expect(quickSwitcherStore.isOpen).toBe(false);
		expect(quickSwitcherStore.recentPaths).toEqual([]);
	});

	describe('open / close / toggle', () => {
		it('open sets isOpen to true', () => {
			quickSwitcherStore.open();
			expect(quickSwitcherStore.isOpen).toBe(true);
		});

		it('close sets isOpen to false', () => {
			quickSwitcherStore.open();
			quickSwitcherStore.close();
			expect(quickSwitcherStore.isOpen).toBe(false);
		});

		it('toggle flips isOpen', () => {
			quickSwitcherStore.toggle();
			expect(quickSwitcherStore.isOpen).toBe(true);
			quickSwitcherStore.toggle();
			expect(quickSwitcherStore.isOpen).toBe(false);
		});
	});

	describe('addRecentPath', () => {
		it('adds path to the front', () => {
			quickSwitcherStore.addRecentPath('/vault/a.md');
			expect(quickSwitcherStore.recentPaths[0]).toBe('/vault/a.md');
		});

		it('deduplicates paths', () => {
			quickSwitcherStore.addRecentPath('/vault/a.md');
			quickSwitcherStore.addRecentPath('/vault/b.md');
			quickSwitcherStore.addRecentPath('/vault/a.md');

			expect(quickSwitcherStore.recentPaths).toEqual(['/vault/a.md', '/vault/b.md']);
		});

		it('limits to 20 entries', () => {
			for (let i = 0; i < 25; i++) {
				quickSwitcherStore.addRecentPath(`/vault/${i}.md`);
			}

			expect(quickSwitcherStore.recentPaths).toHaveLength(20);
			expect(quickSwitcherStore.recentPaths[0]).toBe('/vault/24.md');
		});

		it('persists to localStorage', () => {
			quickSwitcherStore.addRecentPath('/vault/a.md');
			expect(localStorageMock.setItem).toHaveBeenCalled();
		});
	});

	describe('removeRecentPath', () => {
		it('removes an existing path', () => {
			quickSwitcherStore.addRecentPath('/vault/a.md');
			quickSwitcherStore.addRecentPath('/vault/b.md');
			quickSwitcherStore.removeRecentPath('/vault/a.md');

			expect(quickSwitcherStore.recentPaths).toEqual(['/vault/b.md']);
		});

		it('persists after removal', () => {
			quickSwitcherStore.addRecentPath('/vault/a.md');
			vi.clearAllMocks();
			quickSwitcherStore.removeRecentPath('/vault/a.md');

			expect(localStorageMock.setItem).toHaveBeenCalled();
		});

		it('does nothing when path is not in the list', () => {
			quickSwitcherStore.addRecentPath('/vault/a.md');
			vi.clearAllMocks();
			quickSwitcherStore.removeRecentPath('/vault/nonexistent.md');

			expect(localStorageMock.setItem).not.toHaveBeenCalled();
			expect(quickSwitcherStore.recentPaths).toEqual(['/vault/a.md']);
		});

		it('removes child paths when a directory is deleted', () => {
			quickSwitcherStore.addRecentPath('/vault/docs/a.md');
			quickSwitcherStore.addRecentPath('/vault/docs/sub/b.md');
			quickSwitcherStore.addRecentPath('/vault/other.md');

			quickSwitcherStore.removeRecentPath('/vault/docs');

			expect(quickSwitcherStore.recentPaths).toEqual(['/vault/other.md']);
		});

		it('does not remove paths that share a prefix but are not children', () => {
			quickSwitcherStore.addRecentPath('/vault/docs-extra/a.md');
			quickSwitcherStore.addRecentPath('/vault/docs/b.md');

			quickSwitcherStore.removeRecentPath('/vault/docs');

			expect(quickSwitcherStore.recentPaths).toEqual(['/vault/docs-extra/a.md']);
		});
	});

	describe('reset', () => {
		it('clears state and localStorage', () => {
			quickSwitcherStore.open();
			quickSwitcherStore.addRecentPath('/vault/a.md');

			quickSwitcherStore.reset();

			expect(quickSwitcherStore.isOpen).toBe(false);
			expect(quickSwitcherStore.recentPaths).toEqual([]);
			expect(localStorageMock.removeItem).toHaveBeenCalled();
		});
	});
});
