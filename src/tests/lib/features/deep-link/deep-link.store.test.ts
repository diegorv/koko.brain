import { describe, it, expect, beforeEach } from 'vitest';
import { deepLinkStore } from '$lib/features/deep-link/deep-link.store.svelte';
import type { DeepLinkAction } from '$lib/features/deep-link/deep-link.types';

const openAction: DeepLinkAction = { type: 'open', vault: 'TestVault', file: 'notes/test.md' };
const searchAction: DeepLinkAction = { type: 'search', vault: 'TestVault', query: 'hello' };

describe('deepLinkStore', () => {
	beforeEach(() => {
		deepLinkStore.reset();
	});

	it('starts with no pending action', () => {
		expect(deepLinkStore.pendingAction).toBeNull();
		expect(deepLinkStore.hasPending).toBe(false);
	});

	describe('setPendingAction', () => {
		it('stores the action', () => {
			deepLinkStore.setPendingAction(openAction);
			expect(deepLinkStore.pendingAction).toEqual(openAction);
			expect(deepLinkStore.hasPending).toBe(true);
		});

		it('overwrites a previous pending action', () => {
			deepLinkStore.setPendingAction(openAction);
			deepLinkStore.setPendingAction(searchAction);
			expect(deepLinkStore.pendingAction).toEqual(searchAction);
		});
	});

	describe('consumePendingAction', () => {
		it('returns and clears the pending action', () => {
			deepLinkStore.setPendingAction(openAction);
			const consumed = deepLinkStore.consumePendingAction();
			expect(consumed).toEqual(openAction);
			expect(deepLinkStore.pendingAction).toBeNull();
			expect(deepLinkStore.hasPending).toBe(false);
		});

		it('returns null when no action is pending', () => {
			const consumed = deepLinkStore.consumePendingAction();
			expect(consumed).toBeNull();
		});

		it('returns null on second consume', () => {
			deepLinkStore.setPendingAction(openAction);
			deepLinkStore.consumePendingAction();
			const second = deepLinkStore.consumePendingAction();
			expect(second).toBeNull();
		});
	});

	describe('reset', () => {
		it('clears the pending action', () => {
			deepLinkStore.setPendingAction(openAction);
			deepLinkStore.reset();
			expect(deepLinkStore.pendingAction).toBeNull();
			expect(deepLinkStore.hasPending).toBe(false);
		});
	});
});
