/**
 * Per-tab view state (scroll position, cursor) preserved across tab switches
 * AND across MarkdownEditor component remounts (e.g. when switching to a
 * non-markdown tab type and back).
 *
 * Lives at module level so it survives component destroy/recreate cycles.
 */

export interface TabViewState {
	scrollTop: number;
	scrollLeft: number;
	cursorPos: number;
}

/** Maps tab paths to their saved view state */
const tabViewStates = new Map<string, TabViewState>();

/** Saves scroll/cursor state for a tab */
export function saveTabViewState(path: string, state: TabViewState): void {
	tabViewStates.set(path, state);
}

/** Retrieves saved view state for a tab, or undefined if none */
export function getTabViewState(path: string): TabViewState | undefined {
	return tabViewStates.get(path);
}

/** Removes saved view state for a tab (e.g. when the tab is closed) */
export function deleteTabViewState(path: string): void {
	tabViewStates.delete(path);
}

/** Clears all saved view states (e.g. on vault switch) */
export function clearAllTabViewStates(): void {
	tabViewStates.clear();
}
