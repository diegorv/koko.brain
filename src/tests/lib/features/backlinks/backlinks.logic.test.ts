import { describe, it, expect } from 'vitest';
import { parseWikilinks, noteEntryV2ToBacklinkEntry } from '#lib/features/backlinks/backlinks.logic.js';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';

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

	it('trims target but preserves alias whitespace around the pipe', () => {
		const result = parseWikilinks('See [[note | alias ]]');
		expect(result).toHaveLength(1);
		expect(result[0].target).toBe('note');
		// Alias is the raw substring after the pipe — whitespace is preserved
		// for consumers to trim as needed.
		expect(result[0].alias).toBe(' alias ');
		expect(result[0].heading).toBeNull();
	});

	it('trims target but preserves heading whitespace after the hash', () => {
		const result = parseWikilinks('See [[note# heading ]]');
		expect(result).toHaveLength(1);
		expect(result[0].target).toBe('note');
		// Heading is the raw substring after the hash — whitespace preserved.
		expect(result[0].heading).toBe(' heading ');
		expect(result[0].alias).toBeNull();
	});

	it('handles spaces around both hash and pipe in the same link', () => {
		const result = parseWikilinks('[[ note # heading | alias ]]');
		expect(result).toHaveLength(1);
		expect(result[0].target).toBe('note');
		expect(result[0].heading).toBe(' heading ');
		expect(result[0].alias).toBe(' alias ');
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
			tasks: [],
			isA: null,
			organized: false,
			archived: false,
			favorite: false,
			belongsTo: [],
			relatedTo: [],
			hasMany: [],
			relationships: {},
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
