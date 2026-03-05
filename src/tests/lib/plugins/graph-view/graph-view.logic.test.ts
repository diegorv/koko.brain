import { describe, it, expect } from 'vitest';
import { parseWikilinks } from '$lib/features/backlinks/backlinks.logic';
import {
	buildGraphData,
	filterGraphData,
	getLocalGraph,
	getNodeRadius,
	getFolderFromPath,
	getUniqueFolders,
	getUniqueTags,
} from '$lib/plugins/graph-view/graph-view.logic';
import type { GraphData, GraphNode } from '$lib/plugins/graph-view/graph-view.types';

describe('getFolderFromPath', () => {
	it('extracts folder from a file path', () => {
		expect(getFolderFromPath('/vault/folder/Note.md')).toBe('/vault/folder');
	});

	it('extracts root folder for top-level files', () => {
		expect(getFolderFromPath('/vault/Note.md')).toBe('/vault');
	});

	it('returns / for paths without slashes', () => {
		expect(getFolderFromPath('Note.md')).toBe('/');
	});

	it('handles deeply nested paths', () => {
		expect(getFolderFromPath('/vault/a/b/c/Note.md')).toBe('/vault/a/b/c');
	});
});

describe('buildGraphData', () => {
	const allPaths = [
		'/vault/Note A.md',
		'/vault/Note B.md',
		'/vault/folder/Note C.md',
		'/vault/Orphan.md',
	];

	it('creates nodes for all file paths', () => {
		const noteIndex = new Map<string, ReturnType<typeof parseWikilinks>>();
		const noteContents = new Map<string, string>();
		for (const p of allPaths) {
			noteIndex.set(p, []);
			noteContents.set(p, '');
		}

		const data = buildGraphData(noteIndex, noteContents, allPaths);
		expect(data.nodes).toHaveLength(4);
		expect(data.nodes.map((n) => n.id)).toEqual(allPaths);
	});

	it('creates edges from wikilinks', () => {
		const noteIndex = new Map([
			['/vault/Note A.md', parseWikilinks('Link to [[Note B]]')],
			['/vault/Note B.md', parseWikilinks('Link to [[Note C]]')],
			['/vault/folder/Note C.md', []],
			['/vault/Orphan.md', []],
		]);
		const noteContents = new Map([
			['/vault/Note A.md', 'Link to [[Note B]]'],
			['/vault/Note B.md', 'Link to [[Note C]]'],
			['/vault/folder/Note C.md', ''],
			['/vault/Orphan.md', ''],
		]);

		const data = buildGraphData(noteIndex, noteContents, allPaths);
		expect(data.links).toHaveLength(2);
		expect(data.links).toContainEqual({ source: '/vault/Note A.md', target: '/vault/Note B.md', bidirectional: false });
		expect(data.links).toContainEqual({ source: '/vault/Note B.md', target: '/vault/folder/Note C.md', bidirectional: false });
	});

	it('deduplicates bidirectional edges and marks them', () => {
		const noteIndex = new Map([
			['/vault/Note A.md', parseWikilinks('Link to [[Note B]]')],
			['/vault/Note B.md', parseWikilinks('Link to [[Note A]]')],
			['/vault/folder/Note C.md', []],
			['/vault/Orphan.md', []],
		]);
		const noteContents = new Map([
			['/vault/Note A.md', 'Link to [[Note B]]'],
			['/vault/Note B.md', 'Link to [[Note A]]'],
			['/vault/folder/Note C.md', ''],
			['/vault/Orphan.md', ''],
		]);

		const data = buildGraphData(noteIndex, noteContents, allPaths);
		expect(data.links).toHaveLength(1);
		expect(data.links[0].bidirectional).toBe(true);
	});

	it('marks one-way links as not bidirectional', () => {
		const noteIndex = new Map([
			['/vault/Note A.md', parseWikilinks('Link to [[Note B]]')],
			['/vault/Note B.md', []],
			['/vault/folder/Note C.md', []],
			['/vault/Orphan.md', []],
		]);
		const noteContents = new Map([
			['/vault/Note A.md', 'Link to [[Note B]]'],
			['/vault/Note B.md', ''],
			['/vault/folder/Note C.md', ''],
			['/vault/Orphan.md', ''],
		]);

		const data = buildGraphData(noteIndex, noteContents, allPaths);
		expect(data.links).toHaveLength(1);
		expect(data.links[0].bidirectional).toBe(false);
	});

	it('excludes self-links', () => {
		const noteIndex = new Map([
			['/vault/Note A.md', parseWikilinks('Link to [[Note A]]')],
			['/vault/Note B.md', []],
			['/vault/folder/Note C.md', []],
			['/vault/Orphan.md', []],
		]);
		const noteContents = new Map([
			['/vault/Note A.md', 'Link to [[Note A]]'],
			['/vault/Note B.md', ''],
			['/vault/folder/Note C.md', ''],
			['/vault/Orphan.md', ''],
		]);

		const data = buildGraphData(noteIndex, noteContents, allPaths);
		expect(data.links).toHaveLength(0);
	});

	it('excludes unresolved links', () => {
		const noteIndex = new Map([
			['/vault/Note A.md', parseWikilinks('Link to [[Nonexistent]]')],
			['/vault/Note B.md', []],
			['/vault/folder/Note C.md', []],
			['/vault/Orphan.md', []],
		]);
		const noteContents = new Map([
			['/vault/Note A.md', 'Link to [[Nonexistent]]'],
			['/vault/Note B.md', ''],
			['/vault/folder/Note C.md', ''],
			['/vault/Orphan.md', ''],
		]);

		const data = buildGraphData(noteIndex, noteContents, allPaths);
		expect(data.links).toHaveLength(0);
	});

	it('computes linkCount correctly', () => {
		const noteIndex = new Map([
			['/vault/Note A.md', parseWikilinks('Link to [[Note B]] and [[Note C]]')],
			['/vault/Note B.md', parseWikilinks('Link to [[Note C]]')],
			['/vault/folder/Note C.md', []],
			['/vault/Orphan.md', []],
		]);
		const noteContents = new Map([
			['/vault/Note A.md', 'Link to [[Note B]] and [[Note C]]'],
			['/vault/Note B.md', 'Link to [[Note C]]'],
			['/vault/folder/Note C.md', ''],
			['/vault/Orphan.md', ''],
		]);

		const data = buildGraphData(noteIndex, noteContents, allPaths);
		const nodeA = data.nodes.find((n) => n.id === '/vault/Note A.md')!;
		const nodeB = data.nodes.find((n) => n.id === '/vault/Note B.md')!;
		const nodeC = data.nodes.find((n) => n.id === '/vault/folder/Note C.md')!;
		const orphan = data.nodes.find((n) => n.id === '/vault/Orphan.md')!;

		expect(nodeA.linkCount).toBe(2);
		expect(nodeB.linkCount).toBe(2);
		expect(nodeC.linkCount).toBe(2);
		expect(orphan.linkCount).toBe(0);
	});

	it('extracts tags from note contents', () => {
		const noteIndex = new Map([
			['/vault/Note A.md', []],
			['/vault/Note B.md', []],
			['/vault/folder/Note C.md', []],
			['/vault/Orphan.md', []],
		]);
		const noteContents = new Map([
			['/vault/Note A.md', '# Note\n\nSome text with #project and #work'],
			['/vault/Note B.md', '---\ntags: [journal]\n---\nContent'],
			['/vault/folder/Note C.md', ''],
			['/vault/Orphan.md', ''],
		]);

		const data = buildGraphData(noteIndex, noteContents, allPaths);
		const nodeA = data.nodes.find((n) => n.id === '/vault/Note A.md')!;
		const nodeB = data.nodes.find((n) => n.id === '/vault/Note B.md')!;

		expect(nodeA.tags).toContain('project');
		expect(nodeA.tags).toContain('work');
		expect(nodeB.tags).toContain('journal');
	});

	it('sets correct folder for each node', () => {
		const noteIndex = new Map<string, ReturnType<typeof parseWikilinks>>();
		const noteContents = new Map<string, string>();
		for (const p of allPaths) {
			noteIndex.set(p, []);
			noteContents.set(p, '');
		}

		const data = buildGraphData(noteIndex, noteContents, allPaths);
		const nodeA = data.nodes.find((n) => n.id === '/vault/Note A.md')!;
		const nodeC = data.nodes.find((n) => n.id === '/vault/folder/Note C.md')!;

		expect(nodeA.folder).toBe('/vault');
		expect(nodeC.folder).toBe('/vault/folder');
	});
});

describe('filterGraphData', () => {
	const makeData = (): GraphData => ({
		nodes: [
			{ id: '/vault/A.md', name: 'A', folder: '/vault', tags: ['project'], linkCount: 1 },
			{ id: '/vault/B.md', name: 'B', folder: '/vault', tags: ['journal'], linkCount: 1 },
			{ id: '/vault/sub/C.md', name: 'C', folder: '/vault/sub', tags: ['project'], linkCount: 2 },
			{ id: '/vault/sub/D.md', name: 'D', folder: '/vault/sub', tags: [], linkCount: 0 },
		],
		links: [
			{ source: '/vault/A.md', target: '/vault/B.md' },
			{ source: '/vault/sub/C.md', target: '/vault/A.md' },
			{ source: '/vault/sub/C.md', target: '/vault/sub/D.md' },
		],
	});

	it('returns all data when no filters applied', () => {
		const data = makeData();
		const filtered = filterGraphData(data, { tag: null, folder: null, searchQuery: '', showOrphans: true });
		expect(filtered.nodes).toHaveLength(4);
		expect(filtered.links).toHaveLength(3);
	});

	it('filters by tag', () => {
		const data = makeData();
		const filtered = filterGraphData(data, { tag: 'project', folder: null, searchQuery: '', showOrphans: true });
		expect(filtered.nodes).toHaveLength(2);
		expect(filtered.nodes.map((n) => n.name)).toContain('A');
		expect(filtered.nodes.map((n) => n.name)).toContain('C');
	});

	it('filters links to only include filtered nodes', () => {
		const data = makeData();
		const filtered = filterGraphData(data, { tag: 'project', folder: null, searchQuery: '', showOrphans: true });
		expect(filtered.links).toHaveLength(1);
		expect(filtered.links[0]).toEqual({ source: '/vault/sub/C.md', target: '/vault/A.md' });
	});

	it('filters by folder', () => {
		const data = makeData();
		const filtered = filterGraphData(data, { tag: null, folder: '/vault/sub', searchQuery: '', showOrphans: true });
		expect(filtered.nodes).toHaveLength(2);
		expect(filtered.nodes.map((n) => n.name)).toContain('C');
		expect(filtered.nodes.map((n) => n.name)).toContain('D');
	});

	it('filters by search query', () => {
		const data = makeData();
		const filtered = filterGraphData(data, { tag: null, folder: null, searchQuery: 'c', showOrphans: true });
		expect(filtered.nodes).toHaveLength(1);
		expect(filtered.nodes[0].name).toBe('C');
	});

	it('combines tag and folder filters', () => {
		const data = makeData();
		const filtered = filterGraphData(data, { tag: 'project', folder: '/vault/sub', searchQuery: '', showOrphans: true });
		expect(filtered.nodes).toHaveLength(1);
		expect(filtered.nodes[0].name).toBe('C');
	});

	it('is case-insensitive for tag filter', () => {
		const data = makeData();
		const filtered = filterGraphData(data, { tag: 'PROJECT', folder: null, searchQuery: '', showOrphans: true });
		expect(filtered.nodes).toHaveLength(2);
	});

	it('hides orphan nodes when showOrphans is false', () => {
		const data: GraphData = {
			nodes: [
				{ id: '/vault/A.md', name: 'A', folder: '/vault', tags: [], linkCount: 1 },
				{ id: '/vault/B.md', name: 'B', folder: '/vault', tags: [], linkCount: 1 },
				{ id: '/vault/Orphan.md', name: 'Orphan', folder: '/vault', tags: [], linkCount: 0 },
			],
			links: [{ source: '/vault/A.md', target: '/vault/B.md' }],
		};
		const filtered = filterGraphData(data, { tag: null, folder: null, searchQuery: '', showOrphans: false });
		expect(filtered.nodes).toHaveLength(2);
		expect(filtered.nodes.map((n) => n.name)).toEqual(['A', 'B']);
		expect(filtered.links).toHaveLength(1);
	});

	it('keeps all nodes when showOrphans is true', () => {
		const data: GraphData = {
			nodes: [
				{ id: '/vault/A.md', name: 'A', folder: '/vault', tags: [], linkCount: 1 },
				{ id: '/vault/Orphan.md', name: 'Orphan', folder: '/vault', tags: [], linkCount: 0 },
			],
			links: [],
		};
		const filtered = filterGraphData(data, { tag: null, folder: null, searchQuery: '', showOrphans: true });
		expect(filtered.nodes).toHaveLength(2);
	});

	it('combines showOrphans with other filters', () => {
		const data: GraphData = {
			nodes: [
				{ id: '/vault/A.md', name: 'A', folder: '/vault', tags: ['work'], linkCount: 1 },
				{ id: '/vault/B.md', name: 'B', folder: '/vault', tags: ['personal'], linkCount: 1 },
				{ id: '/vault/C.md', name: 'C', folder: '/vault', tags: ['work'], linkCount: 0 },
			],
			links: [{ source: '/vault/A.md', target: '/vault/B.md' }],
		};
		const filtered = filterGraphData(data, { tag: 'work', folder: null, searchQuery: '', showOrphans: false });
		expect(filtered.nodes).toHaveLength(1);
		expect(filtered.nodes[0].name).toBe('A');
	});
});

describe('getLocalGraph', () => {
	const makeData = (): GraphData => ({
		nodes: [
			{ id: '/vault/A.md', name: 'A', folder: '/vault', tags: [], linkCount: 2 },
			{ id: '/vault/B.md', name: 'B', folder: '/vault', tags: [], linkCount: 2 },
			{ id: '/vault/C.md', name: 'C', folder: '/vault', tags: [], linkCount: 1 },
			{ id: '/vault/D.md', name: 'D', folder: '/vault', tags: [], linkCount: 1 },
			{ id: '/vault/E.md', name: 'E', folder: '/vault', tags: [], linkCount: 0 },
		],
		links: [
			{ source: '/vault/A.md', target: '/vault/B.md' },
			{ source: '/vault/A.md', target: '/vault/C.md' },
			{ source: '/vault/B.md', target: '/vault/D.md' },
		],
	});

	it('returns center node and direct connections at depth 1', () => {
		const data = makeData();
		const local = getLocalGraph(data, '/vault/A.md', 1);
		expect(local.nodes.map((n) => n.id).sort()).toEqual([
			'/vault/A.md',
			'/vault/B.md',
			'/vault/C.md',
		]);
		expect(local.links).toHaveLength(2);
	});

	it('returns extended connections at depth 2', () => {
		const data = makeData();
		const local = getLocalGraph(data, '/vault/A.md', 2);
		expect(local.nodes.map((n) => n.id).sort()).toEqual([
			'/vault/A.md',
			'/vault/B.md',
			'/vault/C.md',
			'/vault/D.md',
		]);
		expect(local.links).toHaveLength(3);
	});

	it('returns only center node at depth 0', () => {
		const data = makeData();
		const local = getLocalGraph(data, '/vault/A.md', 0);
		expect(local.nodes).toHaveLength(1);
		expect(local.nodes[0].id).toBe('/vault/A.md');
		expect(local.links).toHaveLength(0);
	});

	it('returns only center node when it has no connections', () => {
		const data = makeData();
		const local = getLocalGraph(data, '/vault/E.md', 1);
		expect(local.nodes).toHaveLength(1);
		expect(local.nodes[0].id).toBe('/vault/E.md');
		expect(local.links).toHaveLength(0);
	});

	it('returns empty when center path does not exist', () => {
		const data = makeData();
		const local = getLocalGraph(data, '/vault/Nonexistent.md', 1);
		expect(local.nodes).toHaveLength(0);
		expect(local.links).toHaveLength(0);
	});
});

describe('getNodeRadius', () => {
	it('returns minRadius for zero links', () => {
		expect(getNodeRadius(0)).toBe(4);
	});

	it('returns value between min and max for positive links', () => {
		const r = getNodeRadius(5);
		expect(r).toBeGreaterThan(4);
		expect(r).toBeLessThanOrEqual(16);
	});

	it('caps at maxRadius for very high link counts', () => {
		expect(getNodeRadius(1000)).toBe(16);
	});

	it('respects custom min and max', () => {
		expect(getNodeRadius(0, 2, 20)).toBe(2);
		expect(getNodeRadius(1000, 2, 20)).toBe(20);
	});
});

describe('getUniqueFolders', () => {
	it('returns unique sorted folders', () => {
		const nodes: GraphNode[] = [
			{ id: '1', name: 'A', folder: '/vault/b', tags: [], linkCount: 0 },
			{ id: '2', name: 'B', folder: '/vault/a', tags: [], linkCount: 0 },
			{ id: '3', name: 'C', folder: '/vault/b', tags: [], linkCount: 0 },
		];
		expect(getUniqueFolders(nodes)).toEqual(['/vault/a', '/vault/b']);
	});

	it('returns empty for empty nodes', () => {
		expect(getUniqueFolders([])).toEqual([]);
	});
});

describe('getUniqueTags', () => {
	it('returns unique sorted tags', () => {
		const nodes: GraphNode[] = [
			{ id: '1', name: 'A', folder: '/vault', tags: ['project', 'work'], linkCount: 0 },
			{ id: '2', name: 'B', folder: '/vault', tags: ['journal', 'work'], linkCount: 0 },
		];
		expect(getUniqueTags(nodes)).toEqual(['journal', 'project', 'work']);
	});

	it('returns empty for nodes with no tags', () => {
		const nodes: GraphNode[] = [
			{ id: '1', name: 'A', folder: '/vault', tags: [], linkCount: 0 },
		];
		expect(getUniqueTags(nodes)).toEqual([]);
	});
});
