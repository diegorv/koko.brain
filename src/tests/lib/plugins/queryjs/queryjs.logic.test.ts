import { describe, it, expect } from 'vitest';
import {
	buildKBLink,
	buildKBPage,
	buildReverseIndex,
	resolveInlinks,
	resolveWikiLinkTarget,
	parseSource,
} from '$lib/plugins/queryjs/queryjs.logic';
import { buildResolutionCache } from '$lib/features/backlinks/backlinks.logic';
import { KBDateTime } from '$lib/plugins/queryjs/kb-datetime';
import type { NoteRecord } from '$lib/features/collection/collection.types';
import type { NoteEntryV2, TaskV2, WikiLinkV2 } from '$lib/types/vault-v2.types';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

function makeRecord(overrides: Partial<NoteRecord> = {}): NoteRecord {
	return {
		path: '/vault/notes/test.md',
		name: 'test.md',
		basename: 'test',
		folder: '/vault/notes',
		ext: 'md',
		mtime: 1700000000000,
		ctime: 1690000000000,
		size: 256,
		properties: new Map(),
		...overrides,
	};
}

function makeLink(target: string): WikiLinkV2 {
	return { target, alias: null, heading: null, position: 0 };
}

function makeTask(text: string, line: number, completed = false): TaskV2 {
	return {
		text,
		checked: completed,
		indent: 0,
		lineNumber: line,
		status: completed ? 'done' : 'todo',
		metadata: { description: text, tags: [] },
	};
}

describe('buildKBLink', () => {
	it('creates link from path', () => {
		const link = buildKBLink('/vault/notes/hello.md');
		expect(link.path).toBe('/vault/notes/hello.md');
		expect(link.display).toBe('hello');
	});

	it('handles nested paths', () => {
		const link = buildKBLink('/vault/deep/nested/file.md');
		expect(link.display).toBe('file');
	});

	it('handles files without extension', () => {
		const link = buildKBLink('/vault/README');
		expect(link.display).toBe('README');
	});
});

describe('resolveWikiLinkTarget', () => {
	const allPaths = ['/vault/notes/Alpha.md', '/vault/notes/Beta.md', '/vault/other/Gamma.md'];

	it('resolves case-insensitive match', () => {
		expect(resolveWikiLinkTarget('alpha', allPaths)).toBe('/vault/notes/Alpha.md');
		expect(resolveWikiLinkTarget('BETA', allPaths)).toBe('/vault/notes/Beta.md');
	});

	it('returns null for no match', () => {
		expect(resolveWikiLinkTarget('nonexistent', allPaths)).toBeNull();
	});

	it('resolves full-path wikilink targets', () => {
		expect(resolveWikiLinkTarget('notes/Alpha', allPaths)).toBe('/vault/notes/Alpha.md');
		expect(resolveWikiLinkTarget('other/Gamma', allPaths)).toBe('/vault/other/Gamma.md');
	});

	it('resolves deeply nested path targets', () => {
		const paths = ['/vault/a/b/c/Deep.md'];
		expect(resolveWikiLinkTarget('a/b/c/Deep', paths)).toBe('/vault/a/b/c/Deep.md');
	});
});

describe('buildReverseIndex', () => {
	it('builds basename-to-sources mapping', () => {
		const entries: NoteEntryV2[] = [
			entryV2('/vault/a.md', { outgoingLinks: [makeLink('test'), makeLink('other')] }),
			entryV2('/vault/b.md', { outgoingLinks: [makeLink('test')] }),
		];
		const reverse = buildReverseIndex(entries);
		expect(reverse.get('test')).toEqual(new Set(['/vault/a.md', '/vault/b.md']));
		expect(reverse.get('other')).toEqual(new Set(['/vault/a.md']));
	});

	it('normalizes nested path targets to basename', () => {
		const entries: NoteEntryV2[] = [
			entryV2('/vault/a.md', { outgoingLinks: [makeLink('folder/sub/note')] }),
		];
		const reverse = buildReverseIndex(entries);
		expect(reverse.get('note')).toEqual(new Set(['/vault/a.md']));
	});

	it('returns empty map for no entries', () => {
		const reverse = buildReverseIndex([]);
		expect(reverse.size).toBe(0);
	});
});

describe('resolveInlinks', () => {
	it('finds files linking to target', () => {
		const entries: NoteEntryV2[] = [
			entryV2('/vault/a.md', { outgoingLinks: [makeLink('test')] }),
			entryV2('/vault/b.md', { outgoingLinks: [makeLink('other')] }),
			entryV2('/vault/c.md', { outgoingLinks: [makeLink('Test')] }),
		];
		const reverse = buildReverseIndex(entries);

		const inlinks = resolveInlinks('/vault/notes/test.md', reverse);
		expect(inlinks).toHaveLength(2);
		expect(inlinks.map((l) => l.path).sort()).toEqual(['/vault/a.md', '/vault/c.md']);
	});

	it('does not include self-links', () => {
		const entries: NoteEntryV2[] = [
			entryV2('/vault/test.md', { outgoingLinks: [makeLink('test')] }),
		];
		const reverse = buildReverseIndex(entries);
		const inlinks = resolveInlinks('/vault/test.md', reverse);
		expect(inlinks).toHaveLength(0);
	});

	it('returns empty for no inlinks', () => {
		const entries: NoteEntryV2[] = [
			entryV2('/vault/a.md', { outgoingLinks: [makeLink('other')] }),
		];
		const reverse = buildReverseIndex(entries);
		const inlinks = resolveInlinks('/vault/notes/test.md', reverse);
		expect(inlinks).toHaveLength(0);
	});

	it('resolves inlinks from full-path wikilinks', () => {
		const entries: NoteEntryV2[] = [
			entryV2('/vault/meeting.md', {
				outgoingLinks: [makeLink('_notes/2026/02-Feb/_journal-day-15')],
			}),
		];
		const reverse = buildReverseIndex(entries);
		const inlinks = resolveInlinks('/vault/notes/_journal-day-15.md', reverse);
		expect(inlinks).toHaveLength(1);
		expect(inlinks[0].path).toBe('/vault/meeting.md');
	});

	it('resolves inlinks from deeply nested path targets', () => {
		const entries: NoteEntryV2[] = [
			entryV2('/vault/a.md', { outgoingLinks: [makeLink('folder/sub/test')] }),
			entryV2('/vault/b.md', { outgoingLinks: [makeLink('other/path/test')] }),
		];
		const reverse = buildReverseIndex(entries);
		const inlinks = resolveInlinks('/vault/notes/test.md', reverse);
		expect(inlinks).toHaveLength(2);
	});

	it('returns empty for empty reverse index', () => {
		const reverse = new Map<string, Set<string>>();
		const inlinks = resolveInlinks('/vault/test.md', reverse);
		expect(inlinks).toHaveLength(0);
	});
});

describe('buildKBPage', () => {
	const allPaths = ['/vault/notes/test.md'];

	it('maps NoteRecord correctly', () => {
		const record = makeRecord();
		const entry = entryV2('/vault/notes/test.md');
		const page = buildKBPage(record, entry, allPaths);

		expect(page.file.path).toBe('/vault/notes/test.md');
		expect(page.file.name).toBe('test.md');
		expect(page.file.basename).toBe('test');
		expect(page.file.folder).toBe('/vault/notes');
		expect(page.file.size).toBe(256);
		expect(page.file.link.display).toBe('test');
	});

	it('uses tags from entry directly (Rust pre-parses)', () => {
		const entry = entryV2('/vault/notes/test.md', { tags: ['journal', 'inline-tag'] });
		const page = buildKBPage(makeRecord(), entry, allPaths);
		expect(page.file.tags).toContain('journal');
		expect(page.file.tags).toContain('inline-tag');
	});

	it('populates inlinks', () => {
		const entries: NoteEntryV2[] = [
			entryV2('/vault/other.md', { outgoingLinks: [makeLink('test')] }),
		];
		const reverse = buildReverseIndex(entries);
		const page = buildKBPage(makeRecord(), entryV2('/vault/notes/test.md'), allPaths, reverse);
		expect(page.file.inlinks).toHaveLength(1);
		expect(page.file.inlinks[0].path).toBe('/vault/other.md');
	});

	it('populates outlinks', () => {
		const entry = entryV2('/vault/notes/test.md', { outgoingLinks: [makeLink('test')] });
		const paths = ['/vault/notes/test.md'];
		const page = buildKBPage(makeRecord(), entry, paths);
		expect(page.file.outlinks).toHaveLength(1);
	});

	it('outlinks resolved via resolutionCache match the O(N) fallback', () => {
		const entry = entryV2('/vault/notes/test.md', {
			outgoingLinks: [
				makeLink('Alpha'),
				makeLink('other/Gamma'),
				makeLink('missing'),
			],
		});
		const paths = [
			'/vault/notes/test.md',
			'/vault/notes/Alpha.md',
			'/vault/other/Gamma.md',
		];

		const pageSlow = buildKBPage(makeRecord(), entry, paths);
		const cache = buildResolutionCache(paths);
		const pageFast = buildKBPage(makeRecord(), entry, paths, undefined, cache);

		expect(pageFast.file.outlinks).toEqual(pageSlow.file.outlinks);
		expect(pageFast.file.outlinks).toHaveLength(2);
		expect(pageFast.file.outlinks[0].path).toBe('/vault/notes/Alpha.md');
		expect(pageFast.file.outlinks[1].path).toBe('/vault/other/Gamma.md');
	});

	it('spreads frontmatter properties onto page root', () => {
		const record = makeRecord({
			properties: new Map<string, unknown>([
				['status', 'active'],
				['priority', 5],
			]),
		});
		const page = buildKBPage(record, entryV2('/vault/notes/test.md'), allPaths);
		expect(page.status).toBe('active');
		expect(page.priority).toBe(5);
	});

	it('converts date strings to KBDateTime', () => {
		const record = makeRecord({
			properties: new Map<string, unknown>([['created', '2024-06-15']]),
		});
		const page = buildKBPage(record, entryV2('/vault/notes/test.md'), allPaths);
		expect(page.created).toBeInstanceOf(KBDateTime);
		expect((page.created as KBDateTime).year).toBe(2024);
	});

	it('does not override file property from frontmatter', () => {
		const record = makeRecord({
			properties: new Map<string, unknown>([['file', 'should-not-override']]),
		});
		const page = buildKBPage(record, entryV2('/vault/notes/test.md'), allPaths);
		expect(page.file.path).toBe('/vault/notes/test.md');
	});

	it('returns empty tasks when entry has no tasks', () => {
		const page = buildKBPage(makeRecord(), entryV2('/vault/notes/test.md'), allPaths);
		expect(page.file.tasks).toEqual([]);
	});

	it('returns empty tasks when entry is undefined', () => {
		const page = buildKBPage(makeRecord(), undefined, allPaths);
		expect(page.file.tasks).toEqual([]);
	});

	it('maps TaskV2 fields to KBTask correctly', () => {
		const entry = entryV2('/vault/notes/test.md', {
			tasks: [
				makeTask('Buy milk', 2, false),
				makeTask('Write tests', 3, true),
			],
		});
		const page = buildKBPage(makeRecord(), entry, allPaths);
		expect(page.file.tasks).toHaveLength(2);
		expect(page.file.tasks[0]).toEqual({
			text: 'Buy milk',
			completed: false,
			line: 2,
			path: '/vault/notes/test.md',
		});
		expect(page.file.tasks[1]).toEqual({
			text: 'Write tests',
			completed: true,
			line: 3,
			path: '/vault/notes/test.md',
		});
	});

	it('sets correct path on each task', () => {
		const customPath = '/vault/journal/2026-02-16.md';
		const record = makeRecord({ path: customPath });
		const entry = entryV2(customPath, { tasks: [makeTask('Task one', 1, false)] });
		const page = buildKBPage(record, entry, [customPath]);
		expect(page.file.tasks[0].path).toBe(customPath);
	});
});

describe('parseSource', () => {
	it('returns null for undefined', () => {
		expect(parseSource(undefined)).toBeNull();
	});

	it('returns null for empty string', () => {
		expect(parseSource('')).toBeNull();
		expect(parseSource('  ')).toBeNull();
	});

	it('filters by tag', () => {
		const filter = parseSource('#journal')!;
		expect(filter).not.toBeNull();

		const page = { file: { tags: ['journal'] } } as any;
		expect(filter(page)).toBe(true);

		const noMatch = { file: { tags: ['other'] } } as any;
		expect(filter(noMatch)).toBe(false);
	});

	it('filters by tag with subtag hierarchy', () => {
		const filter = parseSource('#type')!;
		const page = { file: { tags: ['type/meeting'] } } as any;
		expect(filter(page)).toBe(true);
	});

	it('tag filter is case-insensitive', () => {
		const filter = parseSource('#Journal')!;
		const page = { file: { tags: ['journal'] } } as any;
		expect(filter(page)).toBe(true);
	});

	it('filters by folder', () => {
		const filter = parseSource('"notes"')!;
		expect(filter).not.toBeNull();

		const page = { file: { folder: '/vault/notes' } } as any;
		expect(filter(page)).toBe(true);

		const noMatch = { file: { folder: '/vault/other' } } as any;
		expect(filter(noMatch)).toBe(false);
	});

	it('folder filter with single quotes', () => {
		const filter = parseSource("'archive'")!;
		const page = { file: { folder: '/vault/archive/2024' } } as any;
		expect(filter(page)).toBe(true);
	});

	it('rejects mismatched quotes', () => {
		expect(parseSource('"folder\'')).toBeNull();
		expect(parseSource('\'folder"')).toBeNull();
	});

	it('returns null for unrecognized source', () => {
		expect(parseSource('no-quotes')).toBeNull();
	});
});
