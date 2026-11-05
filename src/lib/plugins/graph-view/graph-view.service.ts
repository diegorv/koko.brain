import { call } from '#lib/contracts/ipc.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { findTabIndex, GRAPH_VIRTUAL_PATH, isMarkdownNoteTab } from '#lib/core/editor/editor.logic.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { buildGraphData } from './graph-view.logic';
import { graphViewStore } from './graph-view.store.svelte';
import type { GraphData } from './graph-view.types';

/**
 * Fetches the full vault index snapshot from Rust and builds the graph
 * representation. Async because the snapshot crosses an IPC boundary.
 * GraphView re-invokes this on `vaultStore.vaultIndexVersion` bumps.
 */
export async function buildGraph(): Promise<GraphData> {
	const entries = await call('get_all_vault_entries_v2');
	return buildGraphData(entries, vaultStore.path);
}

/**
 * Records the active markdown note as the graph's center, or null when the
 * active tab is not one. Must run before the graph tab becomes active, since
 * after that the active tab is the graph itself.
 */
function captureCenterPath(): void {
	const tab = editorStore.activeTab;
	graphViewStore.setCenterPath(tab && isMarkdownNoteTab(tab) ? tab.path : null);
}

/**
 * Opens or focuses the Graph View tab. Creates it if it doesn't exist. When
 * the graph is already the active tab the center is kept, since there is no
 * note to capture.
 */
export function openGraphTab(): void {
	if (editorStore.activeTabPath === GRAPH_VIRTUAL_PATH) return;
	captureCenterPath();
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
		captureCenterPath();
		editorStore.setActiveIndex(existingIndex);
	}
}

/** Resets all graph view state */
export function resetGraphView() {
	graphViewStore.reset();
	closeGraphTab();
}
