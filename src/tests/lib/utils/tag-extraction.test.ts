import { describe, it, expect } from 'vitest';
import { extractFrontmatterTags, extractInlineTags, extractAllTags, findInlineTags } from '#lib/utils/tag-extraction.js';

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

describe('findInlineTags', () => {
	it('returns the range from the # to the end of the tag, and the tag name', () => {
		expect(findInlineTags('see #work today')).toEqual([{ from: 4, to: 9, tag: 'work' }]);
	});

	it('matches at line start and after any whitespace', () => {
		expect(findInlineTags('#a\tb #c\n#d').map((t) => t.tag)).toEqual(['a', 'c', 'd']);
	});

	it('keeps a nested tag as one range', () => {
		expect(findInlineTags('x #area/sub y')).toEqual([{ from: 2, to: 11, tag: 'area/sub' }]);
	});

	it('leaves trailing slashes out of the range', () => {
		expect(findInlineTags('#area/ next')).toEqual([{ from: 0, to: 5, tag: 'area' }]);
	});

	it('returns every occurrence, duplicates included, in order', () => {
		expect(findInlineTags('#a #b #a').map((t) => t.from)).toEqual([0, 3, 6]);
	});

	it('rejects what the indexer rejects', () => {
		expect(findInlineTags('foo#bar')).toEqual([]);
		expect(findInlineTags('#1984')).toEqual([]);
		expect(findInlineTags('# Heading')).toEqual([]);
		expect(findInlineTags('[[Note#Heading]]')).toEqual([]);
		expect(findInlineTags('https://example.com/page#anchor')).toEqual([]);
		expect(findInlineTags('#/')).toEqual([]);
	});

	it('accepts unicode letters and an underscore first', () => {
		expect(findInlineTags('#café #_x').map((t) => t.tag)).toEqual(['café', '_x']);
	});

	it('returns [] for empty input', () => {
		expect(findInlineTags('')).toEqual([]);
	});
});
