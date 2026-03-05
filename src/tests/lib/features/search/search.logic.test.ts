import { describe, it, expect } from 'vitest';
import {
	parseSearchQuery,
	searchFileContent,
	searchFileName,
	getSearchContextSnippet,
	sanitizeSnippetHtml,
	matchesTagFilter,
	matchesPathFilter,
	getRelativePath,
	getFileName,
	performSearchOverFiles,
} from '$lib/features/search/search.logic';

describe('parseSearchQuery', () => {
	it('parses plain text query', () => {
		const result = parseSearchQuery('hello world');
		expect(result.text).toBe('hello world');
		expect(result.tags).toHaveLength(0);
		expect(result.paths).toHaveLength(0);
	});

	it('extracts tag operator', () => {
		const result = parseSearchQuery('tag:javascript some text');
		expect(result.text).toBe('some text');
		expect(result.tags).toEqual(['javascript']);
	});

	it('extracts multiple tag operators', () => {
		const result = parseSearchQuery('tag:js tag:web notes');
		expect(result.text).toBe('notes');
		expect(result.tags).toEqual(['js', 'web']);
	});

	it('extracts path operator', () => {
		const result = parseSearchQuery('path:daily/ my search');
		expect(result.text).toBe('my search');
		expect(result.paths).toEqual(['daily/']);
	});

	it('extracts mixed operators', () => {
		const result = parseSearchQuery('tag:todo path:projects/ fix bug');
		expect(result.text).toBe('fix bug');
		expect(result.tags).toEqual(['todo']);
		expect(result.paths).toEqual(['projects/']);
	});

	it('handles only operators, no text', () => {
		const result = parseSearchQuery('tag:review');
		expect(result.text).toBe('');
		expect(result.tags).toEqual(['review']);
	});

	it('handles empty query', () => {
		const result = parseSearchQuery('');
		expect(result.text).toBe('');
		expect(result.tags).toHaveLength(0);
		expect(result.paths).toHaveLength(0);
	});
});

describe('searchFileContent', () => {
	it('finds all occurrences', () => {
		const content = 'hello world hello again hello';
		const matches = searchFileContent(content, 'hello');
		expect(matches).toHaveLength(3);
		expect(matches[0].position).toBe(0);
		expect(matches[1].position).toBe(12);
		expect(matches[2].position).toBe(24);
	});

	it('is case-insensitive', () => {
		const matches = searchFileContent('Hello HELLO hello', 'hello');
		expect(matches).toHaveLength(3);
	});

	it('returns correct line numbers', () => {
		const content = 'line one\nline two has match\nline three';
		const matches = searchFileContent(content, 'match');
		expect(matches).toHaveLength(1);
		expect(matches[0].lineNumber).toBe(2);
	});

	it('returns empty for no matches', () => {
		const matches = searchFileContent('some content', 'nothere');
		expect(matches).toHaveLength(0);
	});

	it('returns empty for empty query', () => {
		const matches = searchFileContent('some content', '');
		expect(matches).toHaveLength(0);
	});
});

describe('searchFileName', () => {
	it('matches case-insensitively', () => {
		expect(searchFileName('My Note', 'note')).toBe(true);
	});

	it('matches partial names', () => {
		expect(searchFileName('Daily Notes 2024', 'daily')).toBe(true);
	});

	it('returns false for no match', () => {
		expect(searchFileName('My Note', 'other')).toBe(false);
	});

	it('returns false for empty query', () => {
		expect(searchFileName('My Note', '')).toBe(false);
	});
});

describe('getSearchContextSnippet', () => {
	it('extracts snippet around a match', () => {
		const content = 'This is some text with the search term in it';
		const snippet = getSearchContextSnippet(content, 27, 6);
		expect(snippet.text).toContain('search');
		expect(snippet.matchStart).toBeGreaterThanOrEqual(0);
		expect(snippet.matchEnd).toBeGreaterThan(snippet.matchStart);
	});

	it('handles match at start of line', () => {
		const content = 'search term at the beginning';
		const snippet = getSearchContextSnippet(content, 0, 6);
		expect(snippet.text).toContain('search');
		expect(snippet.matchStart).toBe(0);
	});

	it('handles match at end of content', () => {
		const content = 'something then search';
		const snippet = getSearchContextSnippet(content, 15, 6);
		expect(snippet.text).toContain('search');
	});

	it('extracts from the correct line in multiline content', () => {
		const content = 'first line\nsecond line with match here\nthird line';
		const position = content.indexOf('match');
		const snippet = getSearchContextSnippet(content, position, 5);
		expect(snippet.text).toContain('match');
		expect(snippet.text).not.toContain('first line');
		expect(snippet.text).not.toContain('third line');
	});

	it('clamps matchEnd within text length when trailing whitespace is trimmed', () => {
		// Line has trailing whitespace — trim() removes it, potentially making matchEnd > text.length
		const content = 'match   ';
		const snippet = getSearchContextSnippet(content, 0, 5);
		expect(snippet.matchStart).toBe(0);
		expect(snippet.matchEnd).toBeLessThanOrEqual(snippet.text.length);
		expect(snippet.text).toContain('match');
	});

	it('handles match at exact end of snippet after trim', () => {
		const content = 'some text search   ';
		const position = content.indexOf('search');
		const snippet = getSearchContextSnippet(content, position, 6);
		expect(snippet.matchEnd).toBeLessThanOrEqual(snippet.text.length);
		expect(snippet.text.substring(snippet.matchStart, snippet.matchEnd)).toBe('search');
	});

	it('adds ellipsis for long lines', () => {
		const longLine = 'a '.repeat(100) + 'search' + ' b'.repeat(100);
		const position = longLine.indexOf('search');
		const snippet = getSearchContextSnippet(longLine, position, 6, 20);
		expect(snippet.text).toMatch(/^\.\.\./);
		expect(snippet.text).toMatch(/\.\.\.$/);
	});
});

describe('matchesTagFilter', () => {
	it('matches a tag in content', () => {
		expect(matchesTagFilter('This has #javascript in it', 'javascript')).toBe(true);
	});

	it('matches tag with hash prefix in filter', () => {
		expect(matchesTagFilter('This has #todo in it', '#todo')).toBe(true);
	});

	it('is case-insensitive', () => {
		expect(matchesTagFilter('This has #JavaScript', 'javascript')).toBe(true);
	});

	it('does not match partial tags', () => {
		expect(matchesTagFilter('This has #javascripts', 'javascript')).toBe(false);
	});

	it('matches tag at end of content', () => {
		expect(matchesTagFilter('End with #todo', 'todo')).toBe(true);
	});

	it('matches tag followed by punctuation', () => {
		expect(matchesTagFilter('Tag #todo, here', 'todo')).toBe(true);
	});

	it('returns false when tag is not present', () => {
		expect(matchesTagFilter('No tags here', 'missing')).toBe(false);
	});

	it('matches tags in frontmatter', () => {
		const content = '---\ntags: [javascript, web-dev]\n---\nSome content';
		expect(matchesTagFilter(content, 'javascript')).toBe(true);
	});

	it('matches nested frontmatter tags with prefix', () => {
		const content = '---\ntags:\n  - type/journal/daily\n---\nSome content';
		expect(matchesTagFilter(content, 'type')).toBe(true);
		expect(matchesTagFilter(content, 'type/journal')).toBe(true);
		expect(matchesTagFilter(content, 'type/journal/daily')).toBe(true);
	});

	it('does not match partial frontmatter tag names', () => {
		const content = '---\ntags: [javascript]\n---\nContent';
		expect(matchesTagFilter(content, 'java')).toBe(false);
	});

	it('does not match tags inside fenced code blocks', () => {
		const content = '# Title\n```\n#todo this is code\n```\nSome body text';
		expect(matchesTagFilter(content, 'todo')).toBe(false);
	});

	it('does not match tags inside inline code', () => {
		const content = 'Use the `#todo` syntax for tagging';
		expect(matchesTagFilter(content, 'todo')).toBe(false);
	});

	it('does not match tags inside a URL fragment', () => {
		const content = 'Visit https://example.com#todo for more info';
		expect(matchesTagFilter(content, 'todo')).toBe(false);
	});

	it('does not match tags concatenated to another word', () => {
		const content = 'The CSS selector is div#todo and it works';
		expect(matchesTagFilter(content, 'todo')).toBe(false);
	});
});

describe('matchesPathFilter', () => {
	it('matches path prefix', () => {
		expect(matchesPathFilter('/vault/daily/2024-01-01.md', 'daily/')).toBe(true);
	});

	it('is case-insensitive', () => {
		expect(matchesPathFilter('/vault/Daily/note.md', 'daily/')).toBe(true);
	});

	it('matches partial path', () => {
		expect(matchesPathFilter('/vault/projects/web/index.md', 'projects/')).toBe(true);
	});

	it('returns false for non-matching path', () => {
		expect(matchesPathFilter('/vault/notes/file.md', 'daily/')).toBe(false);
	});
});

describe('getRelativePath', () => {
	it('strips vault prefix', () => {
		expect(getRelativePath('/vault/notes/file.md', '/vault')).toBe('notes/file.md');
	});

	it('handles vault path with trailing slash', () => {
		expect(getRelativePath('/vault/file.md', '/vault')).toBe('file.md');
	});

	it('returns original path if not under vault', () => {
		expect(getRelativePath('/other/file.md', '/vault')).toBe('/other/file.md');
	});
});

describe('getFileName', () => {
	it('extracts name without extension', () => {
		expect(getFileName('/vault/My Note.md')).toBe('My Note');
	});

	it('handles nested paths', () => {
		expect(getFileName('/vault/folder/subfolder/Note.md')).toBe('Note');
	});

	it('handles files without extension', () => {
		expect(getFileName('/vault/README')).toBe('README');
	});
});

describe('performSearchOverFiles', () => {
	const noteContents = new Map([
		['/vault/Note A.md', 'This note talks about JavaScript and #programming'],
		['/vault/Note B.md', 'Python is great for #data-science'],
		['/vault/daily/2024-01-01.md', 'Today I learned JavaScript basics #programming'],
		['/vault/projects/web.md', 'Web project using JavaScript framework'],
	]);

	it('finds text matches across files', () => {
		const query = { text: 'javascript', tags: [], paths: [] };
		const results = performSearchOverFiles(noteContents, query, '/vault');
		expect(results.length).toBe(3);
		expect(results.every((r) => r.matches.length > 0)).toBe(true);
	});

	it('filters by tag', () => {
		const query = { text: '', tags: ['programming'], paths: [] };
		const results = performSearchOverFiles(noteContents, query, '/vault');
		expect(results.length).toBe(2);
	});

	it('filters by path', () => {
		const query = { text: 'javascript', tags: [], paths: ['daily/'] };
		const results = performSearchOverFiles(noteContents, query, '/vault');
		expect(results.length).toBe(1);
		expect(results[0].filePath).toBe('/vault/daily/2024-01-01.md');
	});

	it('combines tag and text filters', () => {
		const query = { text: 'javascript', tags: ['programming'], paths: [] };
		const results = performSearchOverFiles(noteContents, query, '/vault');
		expect(results.length).toBe(2);
	});

	it('returns empty for no matches', () => {
		const query = { text: 'nonexistent', tags: [], paths: [] };
		const results = performSearchOverFiles(noteContents, query, '/vault');
		expect(results.length).toBe(0);
	});

	it('returns empty for empty query', () => {
		const query = { text: '', tags: [], paths: [] };
		const results = performSearchOverFiles(noteContents, query, '/vault');
		expect(results.length).toBe(0);
	});

	it('includes context snippets limited to 3', () => {
		const manyMatches = new Map([
			['/vault/test.md', 'match match match match match'],
		]);
		const query = { text: 'match', tags: [], paths: [] };
		const results = performSearchOverFiles(manyMatches, query, '/vault');
		expect(results[0].snippets.length).toBeLessThanOrEqual(3);
	});

	it('sorts by match count descending', () => {
		const query = { text: 'javascript', tags: [], paths: [] };
		const results = performSearchOverFiles(noteContents, query, '/vault');
		for (let i = 1; i < results.length; i++) {
			expect(results[i - 1].matches.length).toBeGreaterThanOrEqual(results[i].matches.length);
		}
	});

	it('matches filename even if content does not match', () => {
		const files = new Map([
			['/vault/JavaScript Guide.md', 'This guide covers basic concepts'],
		]);
		const query = { text: 'javascript', tags: [], paths: [] };
		const results = performSearchOverFiles(files, query, '/vault');
		expect(results.length).toBe(1);
	});
});

describe('sanitizeSnippetHtml', () => {
	it('preserves <mark> tags from FTS5', () => {
		const html = 'Hello <mark>world</mark> test';
		expect(sanitizeSnippetHtml(html)).toBe('Hello <mark>world</mark> test');
	});

	it('escapes other HTML tags', () => {
		const html = '<script>alert(1)</script> <mark>match</mark>';
		expect(sanitizeSnippetHtml(html)).toBe('&lt;script&gt;alert(1)&lt;/script&gt; <mark>match</mark>');
	});

	it('escapes img onerror XSS payload', () => {
		const html = '<img src=x onerror=alert(1)> <mark>test</mark>';
		expect(sanitizeSnippetHtml(html)).toBe('&lt;img src=x onerror=alert(1)&gt; <mark>test</mark>');
	});

	it('handles multiple mark tags', () => {
		const html = '<mark>one</mark> and <mark>two</mark>';
		expect(sanitizeSnippetHtml(html)).toBe('<mark>one</mark> and <mark>two</mark>');
	});

	it('handles plain text without any tags', () => {
		const html = 'just plain text';
		expect(sanitizeSnippetHtml(html)).toBe('just plain text');
	});

	it('escapes ampersands and quotes', () => {
		const html = 'A &amp; B "quoted" <mark>match</mark>';
		expect(sanitizeSnippetHtml(html)).toBe('A &amp;amp; B &quot;quoted&quot; <mark>match</mark>');
	});
});
