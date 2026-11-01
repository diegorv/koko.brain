import { beforeEach, describe, expect, it } from 'vitest';

import { derivedSyncStore as store } from '../fixtures/derived-sync.svelte.js';

/**
 * Pins the ADR-0034 premise under vitest.config.ts in the default node
 * environment, where most store tests run: a module-level `$derived` /
 * `$derived.by` read through a store getter is fresh right after a `$state`
 * write, with no `flushSync()` and no mounted component.
 *
 * Node runs the Svelte server runtime, whose module-level derived re-runs on
 * every read (`svelte/src/internal/server/index.js`, `derived`). The client
 * runtime the app uses memoizes; `svelte-derived-sync.client.test.ts` pins it.
 * If a Svelte or vitest bump breaks either file, revisit ADR-0034.
 */
describe('module-level $derived behind store getters (node, server runtime)', () => {
	beforeEach(() => {
		store.setItems([]);
	});

	it('reads the empty state', () => {
		expect(store.count).toBe(0);
		expect(store.total).toBe(0);
	});

	it('$derived is fresh synchronously after a $state reassignment', () => {
		store.setItems([1, 2, 3]);
		expect(store.count).toBe(3);
		store.setItems([4]);
		expect(store.count).toBe(1);
	});

	it('$derived.by is fresh synchronously after an in-place proxy mutation', () => {
		store.setItems([1, 2]);
		expect(store.total).toBe(3);
		store.push(10);
		expect(store.total).toBe(13);
		expect(store.count).toBe(3);
	});

	it('re-runs the derivation on every read (server runtime, no memoization)', () => {
		store.setItems([5, 5]);
		const runs = store.totalRuns;
		expect(store.total).toBe(10);
		expect(store.total).toBe(10);
		expect(store.totalRuns).toBe(runs + 2);
	});
});
