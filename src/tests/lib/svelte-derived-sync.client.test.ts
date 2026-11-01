// @vitest-environment jsdom
// jsdom: vitest then resolves the Svelte client runtime, the one the app runs.
import { beforeEach, describe, expect, it } from 'vitest';
import { flushSync } from 'svelte';

import { derivedSyncStore as store, subscribeToTotal } from '../fixtures/derived-sync.svelte.js';

/**
 * Pins the ADR-0034 premise in the client runtime: a module-level `$derived` /
 * `$derived.by` behind a store getter is fresh right after a `$state` write
 * and is memoized between writes, with or without an effect subscribed.
 * `svelte-derived-sync.test.ts` pins the node (server runtime) side.
 */
describe('module-level $derived behind store getters (jsdom, client runtime)', () => {
	beforeEach(() => {
		store.setItems([]);
	});

	it('reads the empty state', () => {
		expect(store.count).toBe(0);
		expect(store.total).toBe(0);
	});

	it('is fresh synchronously after a reassignment and after an in-place mutation', () => {
		store.setItems([1, 2]);
		expect(store.count).toBe(2);
		expect(store.total).toBe(3);
		store.push(10);
		expect(store.count).toBe(3);
		expect(store.total).toBe(13);
	});

	it('memoizes between writes with no subscriber', () => {
		store.setItems([5, 5]);
		expect(store.total).toBe(10);
		const runs = store.totalRuns;
		expect(store.total).toBe(10);
		expect(store.total).toBe(10);
		expect(store.totalRuns).toBe(runs);

		store.push(1);
		expect(store.total).toBe(11);
		expect(store.totalRuns).toBe(runs + 1);
	});

	it('with an effect subscribed, a read before the flush is already fresh and memoized', () => {
		store.setItems([5, 5]);
		const stop = subscribeToTotal();
		try {
			flushSync();
			const runs = store.totalRuns;
			expect(store.total).toBe(10);
			expect(store.totalRuns).toBe(runs);

			store.push(1);
			expect(store.total).toBe(11);
			expect(store.total).toBe(11);
			expect(store.totalRuns).toBe(runs + 1);
		} finally {
			stop();
		}
	});
});
