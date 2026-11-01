/**
 * A store shaped like the app's stores (ADR-0034): module-level `$state`, two
 * module-level deriveds, and a getter object. Svelte forbids exporting the
 * deriveds themselves (`derived_invalid_export`), so getters return them.
 */
let items = $state<number[]>([]);

/** Plain `$derived`. */
const count = $derived(items.length);

/** `$derived.by`, with a run counter so a test can see whether reads are memoized. */
let totalRuns = 0;
const total = $derived.by(() => {
	totalRuns++;
	return items.reduce((sum, n) => sum + n, 0);
});

/** Getter-based store over the deriveds above. */
export const derivedSyncStore = {
	/** Number of items, from `$derived`. */
	get count() {
		return count;
	},
	/** Sum of items, from `$derived.by`. */
	get total() {
		return total;
	},
	/** How many times the `total` derivation has run. */
	get totalRuns() {
		return totalRuns;
	},
	/** Replaces the items array. */
	setItems(next: number[]) {
		items = next;
	},
	/** Appends one item by mutating the `$state` proxy in place. */
	push(n: number) {
		items.push(n);
	},
};

/**
 * Subscribes an effect to `total`, the way a mounted component would. Returns
 * the teardown. Needs the jsdom environment: effects do not run under node.
 */
export function subscribeToTotal(): () => void {
	return $effect.root(() => {
		$effect(() => {
			void derivedSyncStore.total;
		});
	});
}
