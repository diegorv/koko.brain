import { describe, it, expect } from 'vitest';
import { noteEntryV2ToBacklinkEntry } from '#lib/features/backlinks/backlinks.logic.js';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';

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
