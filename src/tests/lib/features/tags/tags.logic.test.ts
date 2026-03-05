import { describe, it, expect } from 'vitest';
import {
	extractFrontmatterTags,
	extractInlineTags,
	extractAllTags,
	aggregateTags,
	buildTagTree,
	sortTagTree,
	filterTagTree,
	removeFileFromTagMap,
	addFileToTagMap,
	tagMapToEntries,
	tagsEqual,
	type TagAggregateMap,
} from '$lib/features/tags/tags.logic';

describe('extractFrontmatterTags', () => {
	it('extracts tags from inline array format', () => {
		const content = '---\ntags: [javascript, web-dev, svelte]\n---\nContent here';
		expect(extractFrontmatterTags(content)).toEqual(['javascript', 'web-dev', 'svelte']);
	});

	it('extracts tags from block array format', () => {
		const content = '---\ntags:\n  - javascript\n  - web-dev\n---\nContent here';
		expect(extractFrontmatterTags(content)).toEqual(['javascript', 'web-dev']);
	});

	it('extracts tags from block array without indentation', () => {
		const content = '---\ntags:\n- javascript\n- web-dev\n---\nContent here';
		expect(extractFrontmatterTags(content)).toEqual(['javascript', 'web-dev']);
	});

	it('extracts single tag value', () => {
		const content = '---\ntags: javascript\n---\nContent here';
		expect(extractFrontmatterTags(content)).toEqual(['javascript']);
	});

	it('handles quoted tag values in array', () => {
		const content = '---\ntags: ["javascript", \'web-dev\']\n---\nContent';
		expect(extractFrontmatterTags(content)).toEqual(['javascript', 'web-dev']);
	});

	it('strips # prefix from frontmatter tags', () => {
		const content = '---\ntags: [#javascript, #web-dev]\n---\nContent';
		expect(extractFrontmatterTags(content)).toEqual(['javascript', 'web-dev']);
	});

	it('returns empty array when no frontmatter', () => {
		expect(extractFrontmatterTags('Just plain content')).toEqual([]);
	});

	it('returns empty array when no tags field', () => {
		const content = '---\ntitle: My Note\n---\nContent';
		expect(extractFrontmatterTags(content)).toEqual([]);
	});

	it('returns empty array for empty content', () => {
		expect(extractFrontmatterTags('')).toEqual([]);
	});

	it('handles nested tags in frontmatter', () => {
		const content = '---\ntags: [project/work, type/journal]\n---\n';
		expect(extractFrontmatterTags(content)).toEqual(['project/work', 'type/journal']);
	});

	it('handles tags field with other frontmatter fields', () => {
		const content = '---\ntitle: My Note\ntags: [foo, bar]\ndate: 2024-01-01\n---\nContent';
		expect(extractFrontmatterTags(content)).toEqual(['foo', 'bar']);
	});

	it('does not match tags: inside a multi-line quoted string', () => {
		// A multi-line double-quoted value where "tags:" appears at column 0 on a continuation line
		const content = '---\ndescription: "some text\ntags: fake"\ndate: 2024-01-01\n---\nContent';
		// "tags: fake"" is inside the quoted string for description, NOT a real tags key
		// Should return empty, not ['fake"']
		expect(extractFrontmatterTags(content)).toEqual([]);
	});

	it('handles single quoted tag value', () => {
		const content = '---\ntags: "my-tag"\n---\nContent';
		expect(extractFrontmatterTags(content)).toEqual(['my-tag']);
	});
});

describe('extractInlineTags', () => {
	it('extracts simple inline tags', () => {
		const content = 'This has #javascript and #svelte tags';
		expect(extractInlineTags(content)).toEqual(['javascript', 'svelte']);
	});

	it('extracts tags at the start of a line', () => {
		const content = '#javascript is great';
		expect(extractInlineTags(content)).toEqual(['javascript']);
	});

	it('extracts nested tags with slashes', () => {
		const content = 'Tagged with #project/work and #type/journal/daily';
		expect(extractInlineTags(content)).toEqual(['project/work', 'type/journal/daily']);
	});

	it('ignores tags in fenced code blocks', () => {
		const content = '```\n#not-a-tag\n```\n#real-tag here';
		expect(extractInlineTags(content)).toEqual(['real-tag']);
	});

	it('ignores tags in inline code', () => {
		const content = 'Use `#not-a-tag` but #real-tag is valid';
		expect(extractInlineTags(content)).toEqual(['real-tag']);
	});

	it('ignores frontmatter content for inline extraction', () => {
		const content = '---\ntags: [should-not-match]\n---\n#real-tag here';
		expect(extractInlineTags(content)).toEqual(['real-tag']);
	});

	it('deduplicates tags', () => {
		const content = '#javascript is great #javascript is everywhere';
		expect(extractInlineTags(content)).toEqual(['javascript']);
	});

	it('returns empty array for content without tags', () => {
		expect(extractInlineTags('No tags here')).toEqual([]);
	});

	it('returns empty array for empty content', () => {
		expect(extractInlineTags('')).toEqual([]);
	});

	it('does not match headings as tags', () => {
		const content = '# Heading\n## Second heading\nReal #tag here';
		expect(extractInlineTags(content)).toEqual(['tag']);
	});

	it('handles tags with hyphens and underscores', () => {
		const content = '#web-dev and #my_project are valid';
		expect(extractInlineTags(content)).toEqual(['web-dev', 'my_project']);
	});

	it('strips trailing slashes from tags', () => {
		const content = 'A tag with trailing slash #project/';
		expect(extractInlineTags(content)).toEqual(['project']);
	});

	it('extracts tags on multiple lines', () => {
		const content = 'Line one #tag1\nLine two #tag2\nLine three #tag3';
		expect(extractInlineTags(content)).toEqual(['tag1', 'tag2', 'tag3']);
	});

	it('does not match hash followed by numbers only', () => {
		const content = 'Issue #123 is not a tag but #valid is';
		const tags = extractInlineTags(content);
		expect(tags).toContain('valid');
		expect(tags).not.toContain('123');
	});

	it('ignores tags inside HTML comments', () => {
		const content = '<!-- #draft #wip -->\nReal #published tag here';
		expect(extractInlineTags(content)).toEqual(['published']);
	});

	it('ignores tags inside multi-line HTML comments', () => {
		const content = '<!--\n#hidden-tag\n#another-hidden\n-->\n#visible here';
		expect(extractInlineTags(content)).toEqual(['visible']);
	});
});

describe('extractAllTags', () => {
	it('combines frontmatter and inline tags', () => {
		const content = '---\ntags: [frontmatter-tag]\n---\n#inline-tag here';
		const tags = extractAllTags(content);
		expect(tags).toContain('frontmatter-tag');
		expect(tags).toContain('inline-tag');
	});

	it('deduplicates across frontmatter and inline', () => {
		const content = '---\ntags: [javascript]\n---\n#javascript is here';
		const tags = extractAllTags(content);
		expect(tags).toHaveLength(1);
		expect(tags).toContain('javascript');
	});

	it('deduplicates case-insensitively keeping first occurrence', () => {
		const content = '---\ntags: [JavaScript]\n---\n#javascript is here';
		const tags = extractAllTags(content);
		expect(tags).toHaveLength(1);
		expect(tags[0]).toBe('JavaScript');
	});

	it('handles content with no tags', () => {
		expect(extractAllTags('Just plain text')).toEqual([]);
	});
});

describe('aggregateTags', () => {
	it('aggregates tags across multiple files', () => {
		const noteContents = new Map([
			['/vault/note1.md', '#javascript and #svelte'],
			['/vault/note2.md', '#javascript and #rust'],
		]);

		const entries = aggregateTags(noteContents);
		const jsEntry = entries.find((e) => e.name.toLowerCase() === 'javascript');
		expect(jsEntry).toBeDefined();
		expect(jsEntry!.count).toBe(2);
		expect(jsEntry!.filePaths).toHaveLength(2);
	});

	it('returns empty array for empty contents', () => {
		expect(aggregateTags(new Map())).toEqual([]);
	});

	it('counts unique file paths per tag', () => {
		const noteContents = new Map([
			['/vault/note1.md', '#tag appears #tag twice'],
		]);

		const entries = aggregateTags(noteContents);
		expect(entries).toHaveLength(1);
		expect(entries[0].count).toBe(1);
	});

	it('handles frontmatter and inline tags together', () => {
		const noteContents = new Map([
			['/vault/note1.md', '---\ntags: [javascript]\n---\n#svelte here'],
			['/vault/note2.md', '#javascript and #rust'],
		]);

		const entries = aggregateTags(noteContents);
		expect(entries.length).toBeGreaterThanOrEqual(3);

		const jsEntry = entries.find((e) => e.name.toLowerCase() === 'javascript');
		expect(jsEntry!.count).toBe(2);
	});
});

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

describe('removeFileFromTagMap', () => {
	it('removes a file from tag entries', () => {
		const tagMap: TagAggregateMap = new Map([
			['javascript', { name: 'javascript', filePaths: new Set(['/a.md', '/b.md']) }],
			['svelte', { name: 'svelte', filePaths: new Set(['/a.md']) }],
		]);

		removeFileFromTagMap(tagMap, '/a.md', ['javascript', 'svelte']);

		expect(tagMap.get('javascript')!.filePaths.size).toBe(1);
		expect(tagMap.has('svelte')).toBe(false); // removed because empty
	});

	it('deletes tag entry when no files remain', () => {
		const tagMap: TagAggregateMap = new Map([
			['tag1', { name: 'tag1', filePaths: new Set(['/only.md']) }],
		]);

		removeFileFromTagMap(tagMap, '/only.md', ['tag1']);

		expect(tagMap.size).toBe(0);
	});

	it('handles empty oldTags gracefully', () => {
		const tagMap: TagAggregateMap = new Map([
			['tag1', { name: 'tag1', filePaths: new Set(['/a.md']) }],
		]);

		removeFileFromTagMap(tagMap, '/a.md', []);

		expect(tagMap.size).toBe(1);
	});

	it('handles tags not present in map', () => {
		const tagMap: TagAggregateMap = new Map();

		removeFileFromTagMap(tagMap, '/a.md', ['nonexistent']);

		expect(tagMap.size).toBe(0);
	});

	it('matches tags case-insensitively', () => {
		const tagMap: TagAggregateMap = new Map([
			['javascript', { name: 'JavaScript', filePaths: new Set(['/a.md']) }],
		]);

		removeFileFromTagMap(tagMap, '/a.md', ['JavaScript']);

		expect(tagMap.size).toBe(0);
	});
});

describe('addFileToTagMap', () => {
	it('adds a file to existing tag entries', () => {
		const tagMap: TagAggregateMap = new Map([
			['javascript', { name: 'javascript', filePaths: new Set(['/a.md']) }],
		]);

		addFileToTagMap(tagMap, '/b.md', ['javascript']);

		expect(tagMap.get('javascript')!.filePaths.size).toBe(2);
	});

	it('creates new entries for new tags', () => {
		const tagMap: TagAggregateMap = new Map();

		addFileToTagMap(tagMap, '/a.md', ['newtag']);

		expect(tagMap.size).toBe(1);
		expect(tagMap.get('newtag')!.name).toBe('newtag');
		expect(tagMap.get('newtag')!.filePaths.has('/a.md')).toBe(true);
	});

	it('handles multiple tags at once', () => {
		const tagMap: TagAggregateMap = new Map();

		addFileToTagMap(tagMap, '/a.md', ['tag1', 'tag2', 'tag3']);

		expect(tagMap.size).toBe(3);
	});

	it('handles empty tags array', () => {
		const tagMap: TagAggregateMap = new Map();

		addFileToTagMap(tagMap, '/a.md', []);

		expect(tagMap.size).toBe(0);
	});

	it('does not duplicate file paths', () => {
		const tagMap: TagAggregateMap = new Map([
			['tag1', { name: 'tag1', filePaths: new Set(['/a.md']) }],
		]);

		addFileToTagMap(tagMap, '/a.md', ['tag1']);

		expect(tagMap.get('tag1')!.filePaths.size).toBe(1);
	});
});

describe('tagMapToEntries', () => {
	it('converts tag map to entries array', () => {
		const tagMap: TagAggregateMap = new Map([
			['javascript', { name: 'JavaScript', filePaths: new Set(['/a.md', '/b.md']) }],
			['svelte', { name: 'svelte', filePaths: new Set(['/a.md']) }],
		]);

		const entries = tagMapToEntries(tagMap);

		expect(entries).toHaveLength(2);
		const js = entries.find((e) => e.name === 'JavaScript');
		expect(js!.count).toBe(2);
		expect(js!.filePaths).toEqual(expect.arrayContaining(['/a.md', '/b.md']));
	});

	it('returns empty array for empty map', () => {
		expect(tagMapToEntries(new Map())).toEqual([]);
	});

	it('converts Set to Array for filePaths', () => {
		const tagMap: TagAggregateMap = new Map([
			['tag', { name: 'tag', filePaths: new Set(['/a.md']) }],
		]);

		const entries = tagMapToEntries(tagMap);

		expect(Array.isArray(entries[0].filePaths)).toBe(true);
	});
});

describe('tagsEqual', () => {
	it('returns true for identical tags', () => {
		expect(tagsEqual(['a', 'b'], ['a', 'b'])).toBe(true);
	});

	it('returns true for same tags in different order', () => {
		expect(tagsEqual(['b', 'a'], ['a', 'b'])).toBe(true);
	});

	it('returns true when only casing differs (case-insensitive to match aggregation)', () => {
		expect(tagsEqual(['JavaScript', 'Svelte'], ['javascript', 'svelte'])).toBe(true);
	});

	it('returns true for exact case match', () => {
		expect(tagsEqual(['JavaScript', 'Svelte'], ['JavaScript', 'Svelte'])).toBe(true);
	});

	it('returns false for different lengths', () => {
		expect(tagsEqual(['a'], ['a', 'b'])).toBe(false);
	});

	it('returns false for different tags', () => {
		expect(tagsEqual(['a', 'b'], ['a', 'c'])).toBe(false);
	});

	it('returns true for empty arrays', () => {
		expect(tagsEqual([], [])).toBe(true);
	});
});

describe('filterTagTree', () => {
	function makeNode(segment: string, count: number, totalCount: number, children: any[] = []): any {
		return { segment, fullPath: segment, count, totalCount, filePaths: [], children };
	}

	it('returns empty array for empty input', () => {
		expect(filterTagTree([], 1)).toEqual([]);
	});

	it('filters out leaf nodes with count <= minCount', () => {
		const tree = [
			makeNode('popular', 5, 5),
			makeNode('rare', 1, 1),
		];
		const result = filterTagTree(tree, 1);
		expect(result).toHaveLength(1);
		expect(result[0].segment).toBe('popular');
	});

	it('keeps parent if it has surviving children', () => {
		const tree = [
			makeNode('project', 0, 6, [
				makeNode('work', 5, 5),
				makeNode('old', 1, 1),
			]),
		];
		const result = filterTagTree(tree, 1);
		expect(result).toHaveLength(1);
		expect(result[0].segment).toBe('project');
		expect(result[0].children).toHaveLength(1);
		expect(result[0].children[0].segment).toBe('work');
	});

	it('removes parent if no surviving children and own count <= minCount', () => {
		const tree = [
			makeNode('project', 0, 2, [
				makeNode('a', 1, 1),
				makeNode('b', 1, 1),
			]),
		];
		const result = filterTagTree(tree, 1);
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
		const result = filterTagTree(tree, 1);
		expect(result).toHaveLength(1);
		expect(result[0].children).toHaveLength(1);
		// totalCount should be own count (2) + surviving child work (5) = 7, not original 10
		expect(result[0].totalCount).toBe(7);
	});
});
