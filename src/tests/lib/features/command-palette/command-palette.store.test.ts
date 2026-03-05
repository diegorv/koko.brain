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

import { commandPaletteStore } from '$lib/features/command-palette/command-palette.store.svelte';

describe('commandPaletteStore', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorageMock.clear();
		commandPaletteStore.reset();
	});

	it('starts closed with empty recent commands', () => {
		expect(commandPaletteStore.isOpen).toBe(false);
		expect(commandPaletteStore.recentCommandIds).toEqual([]);
	});

	describe('open / close / toggle', () => {
		it('open sets isOpen to true', () => {
			commandPaletteStore.open();
			expect(commandPaletteStore.isOpen).toBe(true);
		});

		it('close sets isOpen to false', () => {
			commandPaletteStore.open();
			commandPaletteStore.close();
			expect(commandPaletteStore.isOpen).toBe(false);
		});

		it('toggle flips isOpen', () => {
			commandPaletteStore.toggle();
			expect(commandPaletteStore.isOpen).toBe(true);
			commandPaletteStore.toggle();
			expect(commandPaletteStore.isOpen).toBe(false);
		});
	});

	describe('addRecentCommand', () => {
		it('adds command id to the front', () => {
			commandPaletteStore.addRecentCommand('cmd-1');
			expect(commandPaletteStore.recentCommandIds[0]).toBe('cmd-1');
		});

		it('deduplicates command ids', () => {
			commandPaletteStore.addRecentCommand('cmd-1');
			commandPaletteStore.addRecentCommand('cmd-2');
			commandPaletteStore.addRecentCommand('cmd-1');

			expect(commandPaletteStore.recentCommandIds).toEqual(['cmd-1', 'cmd-2']);
		});

		it('limits to 20 entries', () => {
			for (let i = 0; i < 25; i++) {
				commandPaletteStore.addRecentCommand(`cmd-${i}`);
			}

			expect(commandPaletteStore.recentCommandIds).toHaveLength(20);
			expect(commandPaletteStore.recentCommandIds[0]).toBe('cmd-24');
		});

		it('persists to localStorage', () => {
			commandPaletteStore.addRecentCommand('cmd-1');
			expect(localStorageMock.setItem).toHaveBeenCalled();
		});
	});

	describe('reset', () => {
		it('clears state and localStorage', () => {
			commandPaletteStore.open();
			commandPaletteStore.addRecentCommand('cmd-1');

			commandPaletteStore.reset();

			expect(commandPaletteStore.isOpen).toBe(false);
			expect(commandPaletteStore.recentCommandIds).toEqual([]);
			expect(localStorageMock.removeItem).toHaveBeenCalled();
		});
	});
});
