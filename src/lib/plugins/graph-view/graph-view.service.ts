import { noteIndexStore } from '$lib/features/backlinks/note-index.store.svelte';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { findTabIndex, GRAPH_VIRTUAL_PATH } from '$lib/core/editor/editor.logic';
import { buildGraphData } from './graph-view.logic';
import { graphViewStore } from './graph-view.store.svelte';
import type { GraphData } from './graph-view.types';

export function buildGraph(): GraphData {
	const noteIndex = noteIndexStore.noteIndex;
	const noteContents = noteIndexStore.noteContents;
	const allFilePaths = Array.from(noteIndex.keys());

	return buildGraphData(noteIndex, noteContents, allFilePaths);
}

/** Opens or focuses the Graph View tab. Creates it if it doesn't exist. */
export function openGraphTab(): void {
	const existingIndex = findTabIndex(editorStore.tabs, GRAPH_VIRTUAL_PATH);
	if (existingIndex >= 0) {
		editorStore.setActiveIndex(existingIndex);
		return;
	}
	editorStore.addTab({
		path: GRAPH_VIRTUAL_PATH,
		name: 'Graph View',
		content: '',
		savedContent: '',
		fileType: 'graph',
	});
}

/** Closes the Graph View tab if it exists. */
export function closeGraphTab(): void {
	const index = findTabIndex(editorStore.tabs, GRAPH_VIRTUAL_PATH);
	if (index >= 0) {
		editorStore.removeTab(index);
	}
}

/** Toggles the Graph View tab: opens if closed, closes if active, focuses if open but not active. */
export function toggleGraphTab(): void {
	const existingIndex = findTabIndex(editorStore.tabs, GRAPH_VIRTUAL_PATH);
	if (existingIndex < 0) {
		openGraphTab();
	} else if (existingIndex === editorStore.activeIndex) {
		editorStore.removeTab(existingIndex);
	} else {
		editorStore.setActiveIndex(existingIndex);
	}
}

/** Resets all graph view state */
export function resetGraphView() {
	graphViewStore.reset();
	closeGraphTab();
}
