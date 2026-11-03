import { describe, it, expect } from 'vitest';
import { buildTagTree, sortTagTree, filterTagTree, tagTreeShape } from '#lib/features/tags/tags.logic.js';

describe('buildTagTree', () => {
	it('builds a flat list for simple tags', () => {
		const entries = [
			{ name: 'javascript', count: 3, filePaths: ['/a.md', '/b.md', '/c.md'] },
			{ name: 'svelte', count: 2, filePaths: ['/a.md', '/b.md'] },
		];

		const tree = buildTagTree(entries);
		expect(tree).toHaveLength(2);
		expect(tree[0].segment).toBe('javascript');
		expect(tree[0].children).toHaveLength(0);
		expect(tree[0].count).toBe(3);
	});

	it('builds nested tree for slash-separated tags', () => {
		const entries = [
			{ name: 'project/work', count: 2, filePaths: ['/a.md', '/b.md'] },
			{ name: 'project/personal', count: 1, filePaths: ['/c.md'] },
		];

		const tree = buildTagTree(entries);
		expect(tree).toHaveLength(1);
		expect(tree[0].segment).toBe('project');
		expect(tree[0].children).toHaveLength(2);
		expect(tree[0].totalCount).toBe(3);
	});

	it('handles mixed flat and nested tags', () => {
		const entries = [
			{ name: 'project', count: 1, filePaths: ['/a.md'] },
			{ name: 'project/work', count: 2, filePaths: ['/b.md', '/c.md'] },
		];

		const tree = buildTagTree(entries);
		expect(tree).toHaveLength(1);
		expect(tree[0].count).toBe(1);
		expect(tree[0].totalCount).toBe(3);
		expect(tree[0].children).toHaveLength(1);
	});

	it('returns empty array for empty entries', () => {
		expect(buildTagTree([])).toEqual([]);
	});

	it('handles deeply nested tags', () => {
		const entries = [
			{ name: 'a/b/c', count: 1, filePaths: ['/x.md'] },
		];

		const tree = buildTagTree(entries);
		expect(tree).toHaveLength(1);
		expect(tree[0].segment).toBe('a');
		expect(tree[0].children[0].segment).toBe('b');
		expect(tree[0].children[0].children[0].segment).toBe('c');
		expect(tree[0].children[0].children[0].count).toBe(1);
	});

	it('preserves fullPath for each node', () => {
		const entries = [
			{ name: 'project/work/backend', count: 1, filePaths: ['/x.md'] },
		];

		const tree = buildTagTree(entries);
		expect(tree[0].fullPath).toBe('project');
		expect(tree[0].children[0].fullPath).toBe('project/work');
		expect(tree[0].children[0].children[0].fullPath).toBe('project/work/backend');
	});

	it('parent nodes without direct tags have count 0', () => {
		const entries = [
			{ name: 'project/work', count: 2, filePaths: ['/a.md', '/b.md'] },
		];

		const tree = buildTagTree(entries);
		expect(tree[0].count).toBe(0);
		expect(tree[0].totalCount).toBe(2);
	});

	it('merges segments case-insensitively under the first-seen casing', () => {
		const tree = buildTagTree([
			{ name: 'Work/a', count: 1, filePaths: ['/a.md'] },
			{ name: 'work/B', count: 2, filePaths: ['/b.md'] },
		]);

		expect(tree).toHaveLength(1);
		expect(tree[0].segment).toBe('Work');
		expect(tree[0].fullPath).toBe('Work');
		expect(tree[0].totalCount).toBe(3);
		expect(tree[0].children.map((c) => [c.segment, c.fullPath])).toEqual([
			['a', 'Work/a'],
			// fullPath is built from the entry's own spelling, not the merged parent's.
			['B', 'work/B'],
		]);
	});

	it('keeps first-seen insertion order at every level', () => {
		const tree = buildTagTree([
			{ name: 'zeta', count: 1, filePaths: [] },
			{ name: 'alpha/y', count: 1, filePaths: [] },
			{ name: 'mid', count: 1, filePaths: [] },
			{ name: 'alpha/x', count: 1, filePaths: [] },
			{ name: 'ALPHA', count: 4, filePaths: [] },
		]);

		expect(tree.map((n) => n.segment)).toEqual(['zeta', 'alpha', 'mid']);
		expect(tree[1].children.map((n) => n.segment)).toEqual(['y', 'x']);
		expect(tree[1].count).toBe(4);
	});

	it('keeps a leading-slash tag separate from the bare tag', () => {
		const tree = buildTagTree([
			{ name: '/b', count: 1, filePaths: ['/x.md'] },
			{ name: 'b', count: 2, filePaths: ['/y.md'] },
		]);

		expect(tree.map((n) => [n.segment, n.fullPath, n.count])).toEqual([
			['', '', 0],
			['b', 'b', 2],
		]);
		expect(tree[0].children.map((n) => [n.segment, n.fullPath, n.count])).toEqual([['b', 'b', 1]]);
	});

	it('keeps an empty middle segment as its own node', () => {
		const tree = buildTagTree([
			{ name: 'a//c', count: 1, filePaths: ['/x.md'] },
			{ name: 'a/c', count: 2, filePaths: ['/y.md'] },
		]);

		expect(tree).toHaveLength(1);
		const a = tree[0];
		expect(a.children.map((n) => [n.segment, n.fullPath])).toEqual([
			['', 'a/'],
			['c', 'a/c'],
		]);
		expect(a.children[0].children.map((n) => [n.segment, n.fullPath, n.count])).toEqual([
			['c', 'a//c', 1],
		]);
		expect(a.totalCount).toBe(3);
	});

	it('builds 6,040 flat mixed-case tags in under 200 ms', () => {
		// Flat mixed-case tags are the quadratic worst case for a per-level
		// linear scan; 6,040 matches the owner's vault.
		const entries = Array.from({ length: 6040 }, (_, i) => ({
			name: i % 2 === 0 ? `Topic${i}` : `topic-Mixed${i}`,
			count: 1,
			filePaths: [],
		}));

		const start = performance.now();
		const tree = buildTagTree(entries);
		const elapsed = performance.now() - start;

		expect(tree).toHaveLength(6040);
		expect(elapsed).toBeLessThan(200);
	});
});

describe('tagTreeShape', () => {
	it('counts roots, parent-child pairs and the uppercase segment share', () => {
		const entries = [
			{ name: 'Work/a', count: 1, filePaths: [] },
			{ name: 'work/b/C', count: 1, filePaths: [] },
			{ name: 'solo', count: 1, filePaths: [] },
		];

		const shape = tagTreeShape(entries, buildTagTree(entries));

		// Roots: Work, solo. Pairs: Work>a, Work>b, b>C.
		expect(shape.roots).toBe(2);
		expect(shape.pairs).toBe(3);
		// Segments: Work, a, work, b, C, solo -> 2 of 6 carry an uppercase letter.
		expect(shape.upperShare).toBeCloseTo(2 / 6);
	});

	it('returns zeros for an empty tree', () => {
		expect(tagTreeShape([], [])).toEqual({ roots: 0, pairs: 0, upperShare: 0 });
	});
});

describe('sortTagTree', () => {
	it('sorts by name alphabetically', () => {
		const nodes = [
			{ segment: 'zebra', fullPath: 'zebra', count: 1, totalCount: 1, filePaths: [], children: [] },
			{ segment: 'alpha', fullPath: 'alpha', count: 3, totalCount: 3, filePaths: [], children: [] },
		];

		const sorted = sortTagTree(nodes, 'name');
		expect(sorted[0].segment).toBe('alpha');
		expect(sorted[1].segment).toBe('zebra');
	});

	it('sorts by count descending', () => {
		const nodes = [
			{ segment: 'alpha', fullPath: 'alpha', count: 1, totalCount: 1, filePaths: [], children: [] },
			{ segment: 'zebra', fullPath: 'zebra', count: 5, totalCount: 5, filePaths: [], children: [] },
		];

		const sorted = sortTagTree(nodes, 'count');
		expect(sorted[0].segment).toBe('zebra');
		expect(sorted[1].segment).toBe('alpha');
	});

	it('sorts children recursively', () => {
		const nodes = [
			{
				segment: 'project',
				fullPath: 'project',
				count: 0,
				totalCount: 3,
				filePaths: [],
				children: [
					{ segment: 'work', fullPath: 'project/work', count: 1, totalCount: 1, filePaths: [], children: [] },
					{ segment: 'alpha', fullPath: 'project/alpha', count: 2, totalCount: 2, filePaths: [], children: [] },
				],
			},
		];

		const sorted = sortTagTree(nodes, 'name');
		expect(sorted[0].children[0].segment).toBe('alpha');
		expect(sorted[0].children[1].segment).toBe('work');
	});

	it('breaks count ties alphabetically', () => {
		const nodes = [
			{ segment: 'beta', fullPath: 'beta', count: 2, totalCount: 2, filePaths: [], children: [] },
			{ segment: 'alpha', fullPath: 'alpha', count: 2, totalCount: 2, filePaths: [], children: [] },
		];

		const sorted = sortTagTree(nodes, 'count');
		expect(sorted[0].segment).toBe('alpha');
		expect(sorted[1].segment).toBe('beta');
	});

	it('handles empty array', () => {
		expect(sortTagTree([], 'name')).toEqual([]);
	});
});

describe('filterTagTree', () => {
	function makeNode(segment: string, count: number, totalCount: number, children: any[] = []): any {
		return { segment, fullPath: segment, count, totalCount, filePaths: [], children };
	}

	it('returns empty array for empty input', () => {
		expect(filterTagTree([], 1)).toEqual([]);
	});

	it('filters out leaf nodes with count below minCount', () => {
		const tree = [
			makeNode('popular', 5, 5),
			makeNode('rare', 1, 1),
		];
		const result = filterTagTree(tree, 2);
		expect(result).toHaveLength(1);
		expect(result[0].segment).toBe('popular');
	});

	it('keeps leaf nodes with count equal to minCount', () => {
		const tree = [
			makeNode('exact', 10, 10),
			makeNode('below', 9, 9),
		];
		const result = filterTagTree(tree, 10);
		expect(result).toHaveLength(1);
		expect(result[0].segment).toBe('exact');
	});

	it('keeps parent if it has surviving children', () => {
		const tree = [
			makeNode('project', 0, 6, [
				makeNode('work', 5, 5),
				makeNode('old', 1, 1),
			]),
		];
		const result = filterTagTree(tree, 2);
		expect(result).toHaveLength(1);
		expect(result[0].segment).toBe('project');
		expect(result[0].children).toHaveLength(1);
		expect(result[0].children[0].segment).toBe('work');
	});

	it('removes parent if no surviving children and own count below minCount', () => {
		const tree = [
			makeNode('project', 0, 2, [
				makeNode('a', 1, 1),
				makeNode('b', 1, 1),
			]),
		];
		const result = filterTagTree(tree, 2);
		expect(result).toEqual([]);
	});

	it('keeps all nodes when minCount is 0', () => {
		const tree = [
			makeNode('a', 1, 1),
			makeNode('b', 3, 3),
		];
		const result = filterTagTree(tree, 0);
		expect(result).toHaveLength(2);
	});

	it('recomputes totalCount after filtering out children', () => {
		const tree = [
			makeNode('project', 2, 10, [
				makeNode('work', 5, 5),
				makeNode('rare', 1, 1),
			]),
		];
		const result = filterTagTree(tree, 2);
		expect(result).toHaveLength(1);
		expect(result[0].children).toHaveLength(1);
		// totalCount should be own count (2) + surviving child work (5) = 7, not original 10
		expect(result[0].totalCount).toBe(7);
	});
});
