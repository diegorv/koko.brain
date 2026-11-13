import { describe, it, expect } from 'vitest';
import { detectTagContext, rankTags } from '#lib/core/markdown-editor/extensions/tag/completion.logic.js';

/** Runs the detector with the cursor at the end of `doc`. */
function detectAtEnd(doc: string) {
	return detectTagContext(doc, doc.length);
}

describe('detectTagContext', () => {
	it('returns the typed prefix after a # at line start', () => {
		expect(detectAtEnd('#pro')).toEqual({ from: 1, to: 4, query: 'pro' });
	});

	it('returns the prefix after a # that follows whitespace', () => {
		expect(detectAtEnd('see #pro')).toEqual({ from: 5, to: 8, query: 'pro' });
		expect(detectAtEnd('see\t#pro')).toEqual({ from: 5, to: 8, query: 'pro' });
	});

	it('returns an empty prefix right after #', () => {
		expect(detectAtEnd('#')).toEqual({ from: 1, to: 1, query: '' });
		expect(detectAtEnd('line one\nsee #')).toEqual({ from: 14, to: 14, query: '' });
	});

	it('keeps nested segments, dashes, digits and non-ASCII letters in the prefix', () => {
		expect(detectAtEnd('#area/sub-2')?.query).toBe('area/sub-2');
		expect(detectAtEnd('#ação')?.query).toBe('ação');
		expect(detectAtEnd('#_draft')?.query).toBe('_draft');
	});

	it('reads the query up to the cursor and covers the rest of the tag after it', () => {
		expect(detectTagContext('#project more', 4)).toEqual({ from: 1, to: 8, query: 'pro' });
		expect(detectTagContext('#area/sub-2 x', 3)).toEqual({ from: 1, to: 11, query: 'ar' });
		expect(detectTagContext('#pro more', 4)).toEqual({ from: 1, to: 4, query: 'pro' });
	});

	it('returns null after a non-space character', () => {
		expect(detectAtEnd('foo#')).toBeNull();
		expect(detectAtEnd('foo#bar')).toBeNull();
		expect(detectAtEnd('[[Note#')).toBeNull();
		expect(detectAtEnd('https://x.com/#a')).toBeNull();
	});

	it('returns null for a heading or a second #', () => {
		expect(detectAtEnd('# ')).toBeNull();
		expect(detectAtEnd('# Title')).toBeNull();
		expect(detectAtEnd('##')).toBeNull();
		expect(detectAtEnd('## Title')).toBeNull();
	});

	it('returns null when the name does not start with a letter or _', () => {
		expect(detectAtEnd('#1')).toBeNull();
		expect(detectAtEnd('#-a')).toBeNull();
		expect(detectAtEnd('#/a')).toBeNull();
	});

	it('returns null inside inline code', () => {
		expect(detectAtEnd('run `#pro')).toBeNull();
		expect(detectAtEnd('run `x #pro')).toBeNull();
		expect(detectAtEnd('run ``a ` #pro')).toBeNull();
	});

	it('returns the prefix after a closed inline code span', () => {
		expect(detectAtEnd('run `x` #pro')?.query).toBe('pro');
		expect(detectAtEnd('run ``a ` b`` #pro')?.query).toBe('pro');
	});

	it('returns null inside a fenced code block', () => {
		expect(detectAtEnd('text\n```\n#pro')).toBeNull();
		expect(detectAtEnd('text\n~~~js\ncode\n#pro')).toBeNull();
		expect(detectAtEnd('````\n```\n#pro')).toBeNull();
	});

	it('returns null inside a fenced code block indented in a list item', () => {
		expect(detectAtEnd('- item\n    ```\n    #pro')).toBeNull();
		expect(detectAtEnd('- item\n\t~~~\n\t#pro')).toBeNull();
		expect(detectAtEnd('- item\n    ```\n    code\n    ```\n#pro')?.query).toBe('pro');
	});

	it('returns the prefix after a fenced code block closes', () => {
		expect(detectAtEnd('```\ncode\n```\n#pro')?.query).toBe('pro');
		expect(detectAtEnd('~~~\n```\n~~~\n#pro')?.query).toBe('pro');
	});

	it('returns null inside frontmatter', () => {
		expect(detectTagContext('---\ntags: #pro\n---\nbody', 14)).toBeNull();
		expect(detectTagContext('---\n#pro\n---\n', 8)).toBeNull();
	});

	it('returns the prefix after frontmatter closes', () => {
		expect(detectAtEnd('---\ntitle: x\n---\n#pro')?.query).toBe('pro');
	});

	it('treats an unclosed --- block as body, as the indexer does', () => {
		expect(detectAtEnd('---\n#pro')?.query).toBe('pro');
	});

	it('treats an opening --- with trailing spaces as body, as the indexer does', () => {
		expect(detectTagContext('---  \n#pro\n---\n', 10)?.query).toBe('pro');
	});

	it('returns null for an empty document', () => {
		expect(detectTagContext('', 0)).toBeNull();
	});
});

describe('rankTags', () => {
	const tags = [
		{ name: 'project', count: 3 },
		{ name: 'area/sub', count: 1 },
		{ name: 'prose', count: 9 },
		{ name: 'area', count: 5 },
	];

	it('returns every tag, most-used first, for an empty prefix', () => {
		expect(rankTags('', tags).map((t) => t.name)).toEqual(['prose', 'area', 'project', 'area/sub']);
	});

	it('keeps only the tags the fuzzy matcher accepts, best match first', () => {
		expect(rankTags('proj', tags).map((t) => t.name)).toEqual(['project']);
		expect(rankTags('area', tags).map((t) => t.name)).toEqual(['area', 'area/sub']);
	});

	it('ranks the most-used tag first among equal matches', () => {
		const tied = [
			{ name: 'work', count: 2 },
			{ name: 'wiki', count: 7 },
		];
		expect(rankTags('w', tied).map((t) => t.name)).toEqual(['wiki', 'work']);
	});

	it('breaks a full tie by name', () => {
		const tied = [
			{ name: 'beta', count: 1 },
			{ name: 'alfa', count: 1 },
		];
		expect(rankTags('', tied).map((t) => t.name)).toEqual(['alfa', 'beta']);
	});

	it('matches case-insensitively and keeps the tag as stored', () => {
		expect(rankTags('PRO', tags).map((t) => t.name)).toEqual(['prose', 'project']);
	});

	it('returns an empty list when nothing matches or there are no tags', () => {
		expect(rankTags('zzz', tags)).toEqual([]);
		expect(rankTags('a', [])).toEqual([]);
	});

	it('does not reorder the input array', () => {
		const input = [...tags];
		rankTags('', input);
		expect(input).toEqual(tags);
	});
});
