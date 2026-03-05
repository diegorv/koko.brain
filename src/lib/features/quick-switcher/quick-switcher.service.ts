import { quickSwitcherStore } from './quick-switcher.store.svelte';

/** Resets the quick switcher store to its initial state. Used during vault teardown. */
export function resetQuickSwitcher(): void {
	quickSwitcherStore.reset();
}
