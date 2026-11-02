/**
 * Per-tab view state (scroll position, cursor) preserved across tab switches
 * AND across MarkdownEditor component remounts (e.g. when switching to a
 * non-markdown tab type and back).
 *
 * Lives at module level so it survives component destroy/recreate cycles.
 */

import type { EditorState } from '@codemirror/state';

export interface TabViewState {
	scrollTop: number;
	scrollLeft: number;
	cursorPos: number;
}

/** Maps tab paths to their saved view state */
const tabViewStates = new Map<string, TabViewState>();

/**
 * Maps background tab paths to the CodeMirror state they had when the user
 * left them, so each note keeps its own undo history. Unlike `tabViewStates`
 * these are only valid for the MarkdownEditor instance that built them (its
 * compartments and suppress-flag closures), so that instance clears them on
 * destroy with `clearTabEditorStates`.
 */
const tabEditorStates = new Map<string, EditorState>();

/** Saves scroll/cursor state for a tab */
export function saveTabViewState(path: string, state: TabViewState): void {
	tabViewStates.set(path, state);
}

/** Retrieves saved view state for a tab, or undefined if none */
export function getTabViewState(path: string): TabViewState | undefined {
	return tabViewStates.get(path);
}

/** Saves the editor state of a tab the user is leaving */
export function saveTabEditorState(path: string, state: EditorState): void {
	tabEditorStates.set(path, state);
}

/** Retrieves the saved editor state of a tab, or undefined if none */
export function getTabEditorState(path: string): EditorState | undefined {
	return tabEditorStates.get(path);
}

/** Removes every saved editor state; scroll/cursor states are kept */
export function clearTabEditorStates(): void {
	tabEditorStates.clear();
}

/** Removes saved view and editor state for a tab (e.g. when the tab is closed) */
export function deleteTabViewState(path: string): void {
	tabViewStates.delete(path);
	tabEditorStates.delete(path);
}

/** Moves a tab's saved view and editor state to its new path after a rename or move */
export function renameTabViewState(oldPath: string, newPath: string): void {
	const view = tabViewStates.get(oldPath);
	if (view) tabViewStates.set(newPath, view);
	const editor = tabEditorStates.get(oldPath);
	if (editor) tabEditorStates.set(newPath, editor);
	deleteTabViewState(oldPath);
}

/** Clears all saved view and editor states (e.g. on vault switch) */
export function clearAllTabViewStates(): void {
	tabViewStates.clear();
	tabEditorStates.clear();
}
