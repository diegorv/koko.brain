import { describe, it, expect } from 'vitest';
import {
	parseWikilinks,
	getNoteName,
	resolveWikilink,
	buildResolutionCache,
	resolveWikilinkCached,
	getContextSnippet,
	findUnlinkedMentions,
	findPlainTextMentionPositions,
	stripNonBodyContent,
	noteEntryV2ToBacklinkEntry,
} from '$lib/features/backlinks/backlinks.logic';
import type { NoteEntryV2 } from '$lib/types/vault-v2.types';

describe('parseWikilinks', () => {
	it('parses a basic wikilink', () => {
		const result = parseWikilinks('See [[My Note]] for details');
		expect(result).toHaveLength(1);
		expect(result[0].target).toBe('My Note');
		expect(result[0].alias).toBeNull();
		expect(result[0].heading).toBeNull();
		expect(result[0].position).toBe(4);
	});

	it('parses a wikilink with alias', () => {
		const result = parseWikilinks('Check [[My Note|display text]]');
		expect(result).toHaveLength(1);
		expect(result[0].target).toBe('My Note');
		expect(result[0].alias).toBe('display text');
		expect(result[0].heading).toBeNull();
	});

	it('parses a wikilink with heading', () => {
		const result = parseWikilinks('Go to [[My Note#Section One]]');
		expect(result).toHaveLength(1);
		expect(result[0].target).toBe('My Note');
		expect(result[0].heading).toBe('Section One');
		expect(result[0].alias).toBeNull();
	});

	it('parses a wikilink with heading and alias', () => {
		const result = parseWikilinks('See [[My Note#Section|click here]]');
		expect(result).toHaveLength(1);
		expect(result[0].target).toBe('My Note');
		expect(result[0].heading).toBe('Section');
		expect(result[0].alias).toBe('click here');
	});

	it('parses multiple wikilinks', () => {
		const result = parseWikilinks('Link to [[Note A]] and [[Note B]] and [[Note C]]');
		expect(result).toHaveLength(3);
		expect(result[0].target).toBe('Note A');
		expect(result[1].target).toBe('Note B');
		expect(result[2].target).toBe('Note C');
	});

	it('returns empty array for no wikilinks', () => {
		const result = parseWikilinks('Just plain text with no links');
		expect(result).toHaveLength(0);
	});

	it('handles empty content', () => {
		const result = parseWikilinks('');
		expect(result).toHaveLength(0);
	});

	it('trims whitespace from target', () => {
		const result = parseWikilinks('See [[ My Note ]]');
		expect(result[0].target).toBe('My Note');
	});
});

describe('getNoteName', () => {
	it('extracts name from a simple path', () => {
		expect(getNoteName('/vault/My Note.md')).toBe('My Note');
	});

	it('extracts name from a nested path', () => {
		expect(getNoteName('/vault/folder/subfolder/Note.md')).toBe('Note');
	});

	it('handles files without extension', () => {
		expect(getNoteName('/vault/README')).toBe('README');
	});

	it('handles .markdown extension', () => {
		expect(getNoteName('/vault/Note.markdown')).toBe('Note');
	});
});

describe('resolveWikilink', () => {
	const allPaths = [
		'/vault/Note A.md',
		'/vault/folder/Note B.md',
		'/vault/Daily/2024-01-01.md',
	];

	it('resolves an exact match', () => {
		expect(resolveWikilink('Note A', allPaths)).toBe('/vault/Note A.md');
	});

	it('resolves case-insensitively', () => {
		expect(resolveWikilink('note a', allPaths)).toBe('/vault/Note A.md');
	});

	it('resolves a nested file', () => {
		expect(resolveWikilink('Note B', allPaths)).toBe('/vault/folder/Note B.md');
	});

	it('returns null for no match', () => {
		expect(resolveWikilink('Nonexistent', allPaths)).toBeNull();
	});

	it('returns null for empty target', () => {
		expect(resolveWikilink('', allPaths)).toBeNull();
	});

	it('resolves full-path wikilink targets', () => {
		expect(resolveWikilink('folder/Note B', allPaths)).toBe('/vault/folder/Note B.md');
		expect(resolveWikilink('Daily/2024-01-01', allPaths)).toBe('/vault/Daily/2024-01-01.md');
	});

	it('resolves deeply nested path targets by basename', () => {
		const paths = ['/vault/a/b/c/Deep.md'];
		expect(resolveWikilink('a/b/c/Deep', paths)).toBe('/vault/a/b/c/Deep.md');
	});
});

describe('buildResolutionCache', () => {
	it('builds a map from lowercase note name to file path', () => {
		const cache = buildResolutionCache(['/vault/Note A.md', '/vault/folder/Note B.md']);
		expect(cache.get('note a')).toBe('/vault/Note A.md');
		expect(cache.get('note b')).toBe('/vault/folder/Note B.md');
	});

	it('keeps the first path on name collisions', () => {
		const cache = buildResolutionCache(['/vault/a/Note.md', '/vault/b/Note.md']);
		expect(cache.get('note')).toBe('/vault/a/Note.md');
	});

	it('returns an empty map for empty input', () => {
		const cache = buildResolutionCache([]);
		expect(cache.size).toBe(0);
	});
});

describe('resolveWikilinkCached', () => {
	const allPaths = [
		'/vault/Note A.md',
		'/vault/folder/Note B.md',
		'/vault/Daily/2024-01-01.md',
	];
	const cache = buildResolutionCache(allPaths);

	it('resolves an exact match', () => {
		expect(resolveWikilinkCached('Note A', cache)).toBe('/vault/Note A.md');
	});

	it('resolves case-insensitively', () => {
		expect(resolveWikilinkCached('note a', cache)).toBe('/vault/Note A.md');
	});

	it('resolves a nested file', () => {
		expect(resolveWikilinkCached('Note B', cache)).toBe('/vault/folder/Note B.md');
	});

	it('returns null for no match', () => {
		expect(resolveWikilinkCached('Nonexistent', cache)).toBeNull();
	});

	it('returns null for empty target', () => {
		expect(resolveWikilinkCached('', cache)).toBeNull();
	});

	it('resolves full-path wikilink targets by basename', () => {
		expect(resolveWikilinkCached('folder/Note B', cache)).toBe('/vault/folder/Note B.md');
		expect(resolveWikilinkCached('Daily/2024-01-01', cache)).toBe('/vault/Daily/2024-01-01.md');
	});
});

describe('getContextSnippet', () => {
	it('extracts a snippet around a link', () => {
		const content = 'Some text before [[My Note]] and text after';
		const snippet = getContextSnippet(content, 17);
		expect(snippet.text).toContain('[[My Note]]');
		expect(snippet.linkStart).toBeGreaterThanOrEqual(0);
		expect(snippet.linkEnd).toBeGreaterThan(snippet.linkStart);
	});

	it('handles link at start of content', () => {
		const content = '[[My Note]] is referenced here';
		const snippet = getContextSnippet(content, 0);
		expect(snippet.text).toContain('[[My Note]]');
	});

	it('handles link at end of content', () => {
		const content = 'This references [[My Note]]';
		const snippet = getContextSnippet(content, 16);
		expect(snippet.text).toContain('[[My Note]]');
	});

	it('handles multiline content by extracting current line', () => {
		const content = 'Line one\nSee [[My Note]] here\nLine three';
		const position = content.indexOf('[[');
		const snippet = getContextSnippet(content, position);
		expect(snippet.text).toContain('[[My Note]]');
		expect(snippet.text).not.toContain('Line one');
		expect(snippet.text).not.toContain('Line three');
	});
});
describe('findUnlinkedMentions', () => {
	it('finds plain text mentions of the note name', () => {
		const noteContents = new Map([
			['/vault/Note A.md', 'This mentions Current in plain text'],
			['/vault/Note B.md', 'No mention here'],
		]);
		const noteIndex = new Map([
			['/vault/Note A.md', [] as ReturnType<typeof parseWikilinks>],
			['/vault/Note B.md', [] as ReturnType<typeof parseWikilinks>],
		]);

		const result = findUnlinkedMentions('/vault/Current.md', 'Current', noteContents, noteIndex);
		expect(result).toHaveLength(1);
		expect(result[0].sourceName).toBe('Note A');
	});

	it('excludes notes that already have a wikilink to the current note', () => {
		const noteContents = new Map([
			['/vault/Note A.md', 'Has [[Current]] wikilink and also mentions Current in text'],
		]);
		const noteIndex = new Map([
			['/vault/Note A.md', parseWikilinks('Has [[Current]] wikilink and also mentions Current in text')],
		]);

		const result = findUnlinkedMentions('/vault/Current.md', 'Current', noteContents, noteIndex);
		expect(result).toHaveLength(0);
	});

	it('excludes notes that have a path-prefixed wikilink to the current note', () => {
		const noteContents = new Map([
			['/vault/Note A.md', 'Has [[folder/Current]] wikilink and also mentions Current in text'],
		]);
		const noteIndex = new Map([
			['/vault/Note A.md', parseWikilinks('Has [[folder/Current]] wikilink and also mentions Current in text')],
		]);

		const result = findUnlinkedMentions('/vault/Current.md', 'Current', noteContents, noteIndex);
		expect(result).toHaveLength(0);
	});

	it('matches case-insensitively', () => {
		const noteContents = new Map([
			['/vault/Note A.md', 'this mentions current in lowercase'],
		]);
		const noteIndex = new Map([
			['/vault/Note A.md', [] as ReturnType<typeof parseWikilinks>],
		]);

		const result = findUnlinkedMentions('/vault/Current.md', 'Current', noteContents, noteIndex);
		expect(result).toHaveLength(1);
	});

	it('excludes self-references', () => {
		const noteContents = new Map([
			['/vault/Current.md', 'This is the Current note itself'],
		]);
		const noteIndex = new Map([
			['/vault/Current.md', [] as ReturnType<typeof parseWikilinks>],
		]);

		const result = findUnlinkedMentions('/vault/Current.md', 'Current', noteContents, noteIndex);
		expect(result).toHaveLength(0);
	});

	it('returns empty for empty note name', () => {
		const noteContents = new Map([
			['/vault/Note A.md', 'Some content'],
		]);
		const noteIndex = new Map([
			['/vault/Note A.md', [] as ReturnType<typeof parseWikilinks>],
		]);

		const result = findUnlinkedMentions('/vault/Current.md', '', noteContents, noteIndex);
		expect(result).toHaveLength(0);
	});

	it('respects word boundaries', () => {
		const noteContents = new Map([
			['/vault/Note A.md', 'The word Currently is not the same as Current'],
		]);
		const noteIndex = new Map([
			['/vault/Note A.md', [] as ReturnType<typeof parseWikilinks>],
		]);

		const result = findUnlinkedMentions('/vault/Current.md', 'Current', noteContents, noteIndex);
		expect(result).toHaveLength(1);
		expect(result[0].snippets).toHaveLength(1);
	});

	it('does not find unlinked mentions inside frontmatter', () => {
		const noteContents = new Map([
			['/vault/Status.md', '# Status\nThis is the status page.'],
			['/vault/Other.md', '---\nstatus: active\n---\nBody without the word.'],
		]);
		const noteIndex = new Map([
			['/vault/Status.md', [] as ReturnType<typeof parseWikilinks>],
			['/vault/Other.md', [] as ReturnType<typeof parseWikilinks>],
		]);

		const result = findUnlinkedMentions('/vault/Status.md', 'Status', noteContents, noteIndex);
		expect(result).toHaveLength(0);
	});

	it('does not find unlinked mentions inside fenced code blocks', () => {
		const noteContents = new Map([
			['/vault/Config.md', '# Config\nConfiguration docs.'],
			['/vault/Guide.md', '# Guide\n```\nconst config = getConfig();\n```\nNo mention in body.'],
		]);
		const noteIndex = new Map([
			['/vault/Config.md', [] as ReturnType<typeof parseWikilinks>],
			['/vault/Guide.md', [] as ReturnType<typeof parseWikilinks>],
		]);

		const result = findUnlinkedMentions('/vault/Config.md', 'Config', noteContents, noteIndex);
		expect(result).toHaveLength(0);
	});
});

describe('findPlainTextMentionPositions', () => {
	function prep(content: string) {
		const stripped = stripNonBodyContent(content);
		return { content, strippedLower: stripped.toLowerCase() };
	}

	it('finds a plain text mention', () => {
		const { content, strippedLower } = prep('This mentions Current in text');
		const positions = findPlainTextMentionPositions(content, strippedLower, 'Current');
		expect(positions).toHaveLength(1);
		expect(positions[0]).toBe(content.indexOf('Current'));
	});

	it('finds multiple mentions', () => {
		const { content, strippedLower } = prep('Current is here and Current is there');
		const positions = findPlainTextMentionPositions(content, strippedLower, 'Current');
		expect(positions).toHaveLength(2);
	});

	it('matches case-insensitively', () => {
		const { content, strippedLower } = prep('mentions current in lowercase');
		const positions = findPlainTextMentionPositions(content, strippedLower, 'Current');
		expect(positions).toHaveLength(1);
	});

	it('respects word boundaries', () => {
		const { content, strippedLower } = prep('Currently is not the same as Current');
		const positions = findPlainTextMentionPositions(content, strippedLower, 'Current');
		expect(positions).toHaveLength(1);
	});

	it('excludes matches inside wikilinks', () => {
		const { content, strippedLower } = prep('See [[Current]] and also Current outside');
		const positions = findPlainTextMentionPositions(content, strippedLower, 'Current');
		expect(positions).toHaveLength(1);
		expect(content.substring(positions[0], positions[0] + 7)).toBe('Current');
		expect(positions[0]).toBeGreaterThan(content.indexOf(']]'));
	});

	it('excludes matches inside frontmatter', () => {
		const { content, strippedLower } = prep('---\ntitle: Current\n---\nBody text.');
		const positions = findPlainTextMentionPositions(content, strippedLower, 'Current');
		expect(positions).toHaveLength(0);
	});

	it('excludes matches inside fenced code blocks', () => {
		const { content, strippedLower } = prep('# Title\n```\nCurrent is in code\n```\nBody text.');
		const positions = findPlainTextMentionPositions(content, strippedLower, 'Current');
		expect(positions).toHaveLength(0);
	});

	it('returns empty for no matches', () => {
		const { content, strippedLower } = prep('Nothing relevant here');
		const positions = findPlainTextMentionPositions(content, strippedLower, 'Current');
		expect(positions).toHaveLength(0);
	});

	it('returns empty for empty content', () => {
		const positions = findPlainTextMentionPositions('', '', 'Current');
		expect(positions).toHaveLength(0);
	});
});

describe('noteEntryV2ToBacklinkEntry', () => {
	function makeEntry(overrides: Partial<NoteEntryV2> = {}): NoteEntryV2 {
		return {
			path: '/vault/note.md',
			title: 'note',
			frontmatter: {},
			outgoingLinks: [],
			tags: [],
			modifiedAt: 0,
			createdAt: 0,
			size: 0,
			wordCount: 0,
			snippet: '',
			...overrides,
		};
	}

	it('maps path to sourcePath and title to sourceName', () => {
		const result = noteEntryV2ToBacklinkEntry(makeEntry({
			path: '/vault/folder/foo.md',
			title: 'foo',
			snippet: 'preview',
		}));
		expect(result.sourcePath).toBe('/vault/folder/foo.md');
		expect(result.sourceName).toBe('foo');
	});

	it('wraps a non-empty snippet in a single positioned entry with linkStart/linkEnd both 0', () => {
		const result = noteEntryV2ToBacklinkEntry(makeEntry({ snippet: 'Hello world' }));
		expect(result.snippets).toEqual([{ text: 'Hello world', linkStart: 0, linkEnd: 0 }]);
	});

	it('returns an empty snippets array for empty snippet (suppresses preview row)', () => {
		const result = noteEntryV2ToBacklinkEntry(makeEntry({ snippet: '' }));
		expect(result.snippets).toEqual([]);
	});

	it('preserves whitespace-only snippet (Rust trims; truthy strings render)', () => {
		const result = noteEntryV2ToBacklinkEntry(makeEntry({ snippet: '   ' }));
		expect(result.snippets).toEqual([{ text: '   ', linkStart: 0, linkEnd: 0 }]);
	});

	it('does not read tags / outgoingLinks / frontmatter (they map to nothing in BacklinkEntry)', () => {
		const result = noteEntryV2ToBacklinkEntry(makeEntry({
			tags: ['#x', '#y'],
			outgoingLinks: [{ target: 'a', alias: null, heading: null, position: 0 }],
			frontmatter: { title: 'override' },
			snippet: 'body',
		}));
		expect(Object.keys(result).sort()).toEqual(['snippets', 'sourceName', 'sourcePath']);
	});
});
