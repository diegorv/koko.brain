import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';

/**
 * Runs an effect that reads one setting through `read` and counts how many
 * times it ran. Returns the run counter and a disposer.
 */
export function countEffectRuns(read: () => unknown): { runs: () => number; dispose: () => void } {
	let runs = 0;
	const dispose = $effect.root(() => {
		$effect(() => {
			void read();
			runs++;
		});
	});
	return { runs: () => runs, dispose };
}

/** Re-exported so the test reads the same store instance the fixture subscribes to. */
export { settingsStore };
