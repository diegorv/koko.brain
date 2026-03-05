import { describe, it, expect, vi, beforeEach } from 'vitest';

import { noteIndexStore } from '$lib/features/backlinks/note-index.store.svelte';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { graphViewStore } from '$lib/plugins/graph-view/graph-view.store.svelte';
import { GRAPH_VIRTUAL_PATH } from '$lib/core/editor/editor.logic';
import {
	buildGraph,
	openGraphTab,
	closeGraphTab,
	toggleGraphTab,
	resetGraphView,
} from '$lib/plugins/graph-view/graph-view.service';

describe('buildGraph', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		noteIndexStore.reset();
		editorStore.reset();
		graphViewStore.reset();
	});

	it('builds graph data from backlinks store with real nodes and links', () => {
		noteIndexStore.setNoteIndex(new Map([
			['/vault/a.md', [{ target: 'b', alias: null, heading: null, position: 0 }]],
			['/vault/b.md', []],
		]));
		noteIndexStore.setNoteContents(new Map([
			['/vault/a.md', 'content a'],
			['/vault/b.md', 'content b'],
		]));

		const result = buildGraph();

		expect(result.nodes).toHaveLength(2);
		expect(result.nodes.map(n => n.id)).toContain('/vault/a.md');
		expect(result.nodes.map(n => n.id)).toContain('/vault/b.md');
		expect(result.links).toHaveLength(1);
		expect(result.links[0].source).toBe('/vault/a.md');
		expect(result.links[0].target).toBe('/vault/b.md');
	});

	it('computes link counts correctly', () => {
		noteIndexStore.setNoteIndex(new Map([
			['/vault/a.md', [{ target: 'b', alias: null, heading: null, position: 0 }]],
			['/vault/b.md', [{ target: 'a', alias: null, heading: null, position: 0 }]],
		]));
		noteIndexStore.setNoteContents(new Map([
			['/vault/a.md', ''],
			['/vault/b.md', ''],
		]));

		const result = buildGraph();

		// a->b edge is deduplicated (sorted edge key), so only 1 link
		expect(result.links).toHaveLength(1);
		const nodeA = result.nodes.find(n => n.id === '/vault/a.md');
		const nodeB = result.nodes.find(n => n.id === '/vault/b.md');
		expect(nodeA!.linkCount).toBe(1);
		expect(nodeB!.linkCount).toBe(1);
	});

	it('extracts tags from note contents', () => {
		noteIndexStore.setNoteIndex(new Map([
			['/vault/a.md', []],
		]));
		noteIndexStore.setNoteContents(new Map([
			['/vault/a.md', 'Some text with #javascript and #svelte'],
		]));

		const result = buildGraph();

		const node = result.nodes.find(n => n.id === '/vault/a.md');
		expect(node!.tags).toContain('javascript');
		expect(node!.tags).toContain('svelte');
	});

	it('returns empty graph when no notes exist', () => {
		noteIndexStore.setNoteIndex(new Map());
		noteIndexStore.setNoteContents(new Map());

		const result = buildGraph();

		expect(result.nodes).toHaveLength(0);
		expect(result.links).toHaveLength(0);
	});

	it('computes folder from file path', () => {
		noteIndexStore.setNoteIndex(new Map([
			['/vault/sub/note.md', []],
		]));
		noteIndexStore.setNoteContents(new Map([
			['/vault/sub/note.md', ''],
		]));

		const result = buildGraph();

		expect(result.nodes[0].folder).toBe('/vault/sub');
	});
});

describe('openGraphTab', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
		graphViewStore.reset();
	});

	it('creates a graph tab in editorStore', () => {
		openGraphTab();

		expect(editorStore.tabs).toHaveLength(1);
		expect(editorStore.tabs[0].path).toBe(GRAPH_VIRTUAL_PATH);
		expect(editorStore.tabs[0].name).toBe('Graph View');
		expect(editorStore.tabs[0].fileType).toBe('graph');
		expect(editorStore.activeIndex).toBe(0);
	});

	it('focuses existing tab instead of duplicating', () => {
		openGraphTab();
		// Add another tab to move focus away
		editorStore.addTab({ path: '/vault/other.md', name: 'other.md', content: '', savedContent: '' });
		expect(editorStore.activeIndex).toBe(1);

		openGraphTab();

		expect(editorStore.tabs).toHaveLength(2);
		expect(editorStore.activeIndex).toBe(0);
	});
});

describe('closeGraphTab', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
		graphViewStore.reset();
	});

	it('removes graph tab from editorStore', () => {
		openGraphTab();
		expect(editorStore.tabs).toHaveLength(1);

		closeGraphTab();

		expect(editorStore.tabs).toHaveLength(0);
		expect(editorStore.activeIndex).toBe(-1);
	});

	it('does nothing when no graph tab exists', () => {
		editorStore.addTab({ path: '/vault/note.md', name: 'note.md', content: '', savedContent: '' });

		closeGraphTab();

		expect(editorStore.tabs).toHaveLength(1);
	});
});

describe('toggleGraphTab', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
		graphViewStore.reset();
	});

	it('opens graph tab when not present', () => {
		toggleGraphTab();

		expect(editorStore.tabs).toHaveLength(1);
		expect(editorStore.tabs[0].path).toBe(GRAPH_VIRTUAL_PATH);
	});

	it('closes graph tab when it is the active tab', () => {
		openGraphTab();
		expect(editorStore.activeIndex).toBe(0);

		toggleGraphTab();

		expect(editorStore.tabs).toHaveLength(0);
	});

	it('focuses graph tab when open but not active', () => {
		openGraphTab();
		editorStore.addTab({ path: '/vault/other.md', name: 'other.md', content: '', savedContent: '' });
		expect(editorStore.activeIndex).toBe(1);

		toggleGraphTab();

		expect(editorStore.tabs).toHaveLength(2);
		expect(editorStore.activeIndex).toBe(0);
	});
});

describe('resetGraphView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
		graphViewStore.reset();
	});

	it('resets graphViewStore mode to global', () => {
		graphViewStore.setMode('local');

		resetGraphView();

		expect(graphViewStore.mode).toBe('global');
	});

	it('removes graph tab from editorStore', () => {
		openGraphTab();
		expect(editorStore.tabs).toHaveLength(1);

		resetGraphView();

		expect(editorStore.tabs).toHaveLength(0);
	});

	it('clears filters and highlighted node', () => {
		graphViewStore.setFilters({ tag: 'test', searchQuery: 'query' });
		graphViewStore.setHighlightedNode('/vault/a.md');

		resetGraphView();

		expect(graphViewStore.filters).toEqual({ tag: null, folder: null, searchQuery: '', showOrphans: true });
		expect(graphViewStore.highlightedNodeId).toBeNull();
	});
});
