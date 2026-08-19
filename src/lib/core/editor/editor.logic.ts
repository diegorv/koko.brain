import { basename } from '$lib/utils/path';

import type { EditorTab } from './editor.types';

/** Virtual path used for the singleton Tasks tab */
export const TASKS_VIRTUAL_PATH = '__virtual__/tasks';

/** Virtual path used for the singleton Graph View tab */
export const GRAPH_VIRTUAL_PATH = '__virtual__/graph';

/** Virtual path used for the singleton Tags tab */
export const TAGS_VIRTUAL_PATH = '__virtual__/tags';

/** Returns true if the tab represents a virtual (non-file) view */
export function isVirtualTab(tab: Pick<EditorTab, 'path'>): boolean {
	return tab.path.startsWith('__virtual__/');
}

/** Extracts the file name from a full path (e.g. "/docs/note.md" → "note.md") */
export function getFileName(path: string): string {
	return basename(path);
}

/** Returns the index of an already-open tab by its file path, or -1 if not found */
export function findTabIndex(tabs: Pick<EditorTab, 'path'>[], path: string): number {
	return tabs.findIndex((t) => t.path === path);
}

/** Checks whether a tab has unsaved changes by comparing current content to the last saved snapshot */
export function isTabDirty(tab: Pick<EditorTab, 'content' | 'savedContent'>): boolean {
	return tab.content !== tab.savedContent;
}

/** Returns whether a tab is pinned */
export function isTabPinned(tab: Pick<EditorTab, 'pinned'>): boolean {
	return tab.pinned === true;
}

/**
 * Returns the boundary index between pinned and unpinned tabs.
 * All tabs at indices 0..(boundary-1) are pinned; tabs at boundary+ are unpinned.
 */
export function getPinnedBoundary(tabs: Pick<EditorTab, 'pinned'>[]): number {
	let boundary = 0;
	for (const tab of tabs) {
		if (tab.pinned) boundary++;
		else break;
	}
	return boundary;
}

/**
 * Computes the new active index after pinning/unpinning a tab.
 * When pinning, the tab moves to the end of the pinned group.
 * When unpinning, the tab moves to the start of the unpinned group.
 * Returns { tabs, activeIndex } with the reordered tab list and updated active index.
 */
export function reorderTabsAfterPinChange(
	tabs: EditorTab[],
	tabIndex: number,
	activeIndex: number,
	pin: boolean,
): { tabs: EditorTab[]; activeIndex: number } {
	const tab = tabs[tabIndex];
	if (!tab) return { tabs, activeIndex };

	const updated = { ...tab, pinned: pin };
	const remaining = tabs.filter((_, i) => i !== tabIndex);

	const boundary = getPinnedBoundary(remaining);
	const insertAt = boundary;

	const newTabs = [...remaining.slice(0, insertAt), updated, ...remaining.slice(insertAt)];

	// Compute where the active tab ended up
	let newActiveIndex: number;
	if (tabIndex === activeIndex) {
		// The toggled tab is the active one — follow it
		newActiveIndex = insertAt;
	} else {
		// Find where the previously active tab is now
		const activePath = tabs[activeIndex]?.path;
		newActiveIndex = newTabs.findIndex((t) => t.path === activePath);
		if (newActiveIndex < 0) newActiveIndex = Math.min(activeIndex, newTabs.length - 1);
	}

	return { tabs: newTabs, activeIndex: newActiveIndex };
}

/**
 * Returns the document position of the first line after a YAML frontmatter block.
 * Returns 0 if the content has no valid frontmatter (must start with `---` on the first line
 * and have a matching closing `---` on a subsequent line).
 */
export function getPositionAfterFrontmatter(content: string): number {
	const lines = content.split('\n');
	if (lines.length < 2 || !/^---\s*$/.test(lines[0])) return 0;
	for (let i = 1; i < lines.length; i++) {
		if (/^---\s*$/.test(lines[i])) {
			let pos = 0;
			for (let j = 0; j <= i; j++) {
				pos += lines[j].length + 1;
			}
			return Math.min(pos, content.length);
		}
	}
	return 0;
}

/**
 * Converts a 1-indexed line number to the character offset where that line
 * starts. Semantic/hybrid search results carry a 1-indexed `lineStart`, while
 * the editor's `pendingScrollPosition` is a character offset (consumed via
 * `EditorSelection.cursor`). Clamps: values below 1 map to 0, values past the
 * last line map to the start of the last line.
 */
export function lineStartToOffset(content: string, lineStart: number): number {
	let offset = 0;
	for (let line = 1; line < lineStart; line++) {
		const nl = content.indexOf('\n', offset);
		if (nl === -1) return offset;
		offset = nl + 1;
	}
	return offset;
}
