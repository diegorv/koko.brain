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

/**
 * Renames recorded by `renameTabViewState` (old path -> new path) that the
 * MarkdownEditor has not consumed yet. A change of the active path is a
 * rename only when it is listed here: matching on content alone would also
 * match closing the active tab onto a tab whose content is the same.
 */
const pendingRenames = new Map<string, string>();

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

/**
 * Removes and returns the saved editor state of a tab, or undefined if none.
 * The tab becoming active takes its state back into the view, so the map
 * never holds a stale copy of the active tab.
 */
export function takeTabEditorState(path: string): EditorState | undefined {
	const state = tabEditorStates.get(path);
	tabEditorStates.delete(path);
	return state;
}

/**
 * Removes every saved editor state and every unconsumed rename record;
 * scroll/cursor states are kept. Both belong to one MarkdownEditor instance:
 * a rename recorded while no editor was mounted must not be read as a rename
 * by the next instance, whose first path change may come from a new tab that
 * reuses the old path.
 */
export function clearTabEditorStates(): void {
	tabEditorStates.clear();
	pendingRenames.clear();
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
	pendingRenames.set(oldPath, newPath);
}

/**
 * Returns the path `oldPath` was renamed to since the last call, or undefined
 * if it was not renamed, and forgets every recorded rename.
 */
export function takeTabRename(oldPath: string): string | undefined {
	const newPath = pendingRenames.get(oldPath);
	pendingRenames.clear();
	return newPath;
}

/** Clears all saved view and editor states (e.g. on vault switch) */
export function clearAllTabViewStates(): void {
	tabViewStates.clear();
	tabEditorStates.clear();
	pendingRenames.clear();
}
