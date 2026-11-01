import { commandPaletteStore } from './command-palette.store.svelte';

/** Resets the command palette store to its initial state. Used during vault teardown. */
export function resetCommandPalette(): void {
	commandPaletteStore.reset();
}
