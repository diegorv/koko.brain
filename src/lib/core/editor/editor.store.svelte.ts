import type { EditorView } from '@codemirror/view';
import type { EditorTab } from './editor.types';
import { reorderTabsAfterPinChange, getPinnedBoundary } from './editor.logic';

// --- Reactive state (Svelte 5 runes) ---

/** All currently open tabs */
let tabs = $state<EditorTab[]>([]);
/** Index of the focused tab (-1 means no tab is active) */
let activeIndex = $state(-1);
/** Scroll position to restore after a tab switch (consumed once by the editor component) */
let pendingScrollPosition = $state<number | null>(null);
/** Whether the editor shows a live markdown preview alongside the source */
let isLivePreview = $state(true);
/** Reference to the active CodeMirror EditorView instance (set by MarkdownEditor on mount) */
let editorView = $state<EditorView | null>(null);

// --- Derived state (implemented as getters for vitest compatibility) ---

/**
 * Central store for all editor tab state.
 * Exposes getters for reactive reads and methods for mutations.
 */
export const editorStore = {
	get tabs() { return tabs; },
	get activeIndex() { return activeIndex; },
	/** The currently focused tab object, or null if none */
	get activeTab() { return activeIndex >= 0 && activeIndex < tabs.length ? tabs[activeIndex] : null; },
	/** Shortcut to the active tab's file path, or null */
	get activeTabPath() { return activeIndex >= 0 && activeIndex < tabs.length ? tabs[activeIndex].path : null; },
	get activeTabContent() { return tabs[activeIndex]?.content ?? null; },
	get pendingScrollPosition() { return pendingScrollPosition; },
	get isLivePreview() { return isLivePreview; },
	get editorView() { return editorView; },

	/** Opens a new tab and makes it active (unpinned tabs go after pinned ones) */
	addTab(tab: EditorTab) {
		if (tab.pinned) {
			const boundary = getPinnedBoundary(tabs);
			tabs.splice(boundary, 0, tab);
			activeIndex = boundary;
		} else {
			tabs.push(tab);
			activeIndex = tabs.length - 1;
		}
	},

	/** Switches focus to the tab at the given index */
	setActiveIndex(index: number) {
		if (index >= 0 && index < tabs.length) {
			activeIndex = index;
		}
	},

	/** Closes a tab and adjusts activeIndex to keep a valid selection */
	removeTab(index: number) {
		if (index < 0 || index >= tabs.length) return;
		tabs.splice(index, 1);
		if (tabs.length === 0) {
			activeIndex = -1;
		} else if (index < activeIndex) {
			activeIndex--;
		} else if (index === activeIndex) {
			activeIndex = Math.min(activeIndex, tabs.length - 1);
		}
	},

	/** Updates the in-memory content of the active tab (called on every keystroke) */
	updateContent(content: string) {
		if (activeIndex >= 0 && activeIndex < tabs.length) {
			tabs[activeIndex].content = content;
		}
	},

	/** Syncs savedContent with the written content for a specific tab by path */
	markSavedByPath(path: string, writtenContent: string) {
		const tab = tabs.find((t) => t.path === path);
		if (tab) {
			tab.savedContent = writtenContent;
		}
	},

	/** Updates the encryption flag for a tab identified by path */
	setEncrypted(path: string, encrypted: boolean) {
		const tab = tabs.find((t) => t.path === path);
		if (tab) {
			tab.encrypted = encrypted;
		}
	},

	setPendingScrollPosition(pos: number | null) {
		pendingScrollPosition = pos;
	},

	setLivePreview(enabled: boolean) {
		isLivePreview = enabled;
	},

	/** Stores the active CodeMirror EditorView reference for external access (e.g. command palette) */
	setEditorView(view: EditorView | null) {
		editorView = view;
	},

	/** Updates the path and display name of a tab identified by its old path */
	updateTabPath(oldPath: string, newPath: string, newName: string) {
		const tab = tabs.find((t) => t.path === oldPath);
		if (tab) {
			tab.path = newPath;
			tab.name = newName;
		}
	},

	/** Replaces the content and savedContent of a tab identified by its path (no dirty flag) */
	updateTabContentByPath(path: string, content: string) {
		const tab = tabs.find((t) => t.path === path);
		if (tab) {
			tab.content = content;
			tab.savedContent = content;
		}
	},

	/** Updates only the content of a tab (preserves savedContent and dirty state) */
	updateTabContentOnly(path: string, content: string) {
		const tab = tabs.find((t) => t.path === path);
		if (tab) {
			tab.content = content;
		}
	},

	/** Toggles the pinned state of the tab at the given index and reorders tabs */
	togglePin(index: number) {
		if (index < 0 || index >= tabs.length) return;
		const pin = !tabs[index].pinned;
		const result = reorderTabsAfterPinChange(tabs, index, activeIndex, pin);
		tabs = result.tabs;
		activeIndex = result.activeIndex;
	},

	/** Sets the pinned state of the tab at the given index */
	setPinned(index: number, pinned: boolean) {
		if (index < 0 || index >= tabs.length) return;
		if (tabs[index].pinned === pinned) return;
		const result = reorderTabsAfterPinChange(tabs, index, activeIndex, pinned);
		tabs = result.tabs;
		activeIndex = result.activeIndex;
	},

	/** Resets all state to initial values (e.g. when switching vaults) */
	reset() {
		tabs = [];
		activeIndex = -1;
		pendingScrollPosition = null;
		isLivePreview = true;
		editorView = null;
	},
};
