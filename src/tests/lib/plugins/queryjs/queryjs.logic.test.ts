import { describe, it, expect } from 'vitest';
import {
	buildDVLink,
	buildDVPage,
	buildReverseIndex,
	resolveInlinks,
	resolveWikiLinkTarget,
	parseSource,
} from '$lib/plugins/queryjs/queryjs.logic';
import { DVDateTime } from '$lib/plugins/queryjs/dv-datetime';
import type { NoteRecord } from '$lib/features/collection/collection.types';
import type { WikiLink } from '$lib/features/backlinks/backlinks.types';

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

function makeWikiLink(target: string): WikiLink {
	return { target, alias: null, heading: null, position: 0 };
}

describe('buildDVLink', () => {
	it('creates link from path', () => {
		const link = buildDVLink('/vault/notes/hello.md');
		expect(link.path).toBe('/vault/notes/hello.md');
		expect(link.display).toBe('hello');
	});

	it('handles nested paths', () => {
		const link = buildDVLink('/vault/deep/nested/file.md');
		expect(link.display).toBe('file');
	});

	it('handles files without extension', () => {
		const link = buildDVLink('/vault/README');
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
		const noteIndex = new Map<string, WikiLink[]>([
			['/vault/a.md', [makeWikiLink('test'), makeWikiLink('other')]],
			['/vault/b.md', [makeWikiLink('test')]],
		]);
		const reverse = buildReverseIndex(noteIndex);
		expect(reverse.get('test')).toEqual(new Set(['/vault/a.md', '/vault/b.md']));
		expect(reverse.get('other')).toEqual(new Set(['/vault/a.md']));
	});

	it('normalizes nested path targets to basename', () => {
		const noteIndex = new Map<string, WikiLink[]>([
			['/vault/a.md', [makeWikiLink('folder/sub/note')]],
		]);
		const reverse = buildReverseIndex(noteIndex);
		expect(reverse.get('note')).toEqual(new Set(['/vault/a.md']));
	});

	it('returns empty map for empty noteIndex', () => {
		const reverse = buildReverseIndex(new Map());
		expect(reverse.size).toBe(0);
	});
});

describe('resolveInlinks', () => {
	it('finds files linking to target', () => {
		const noteIndex = new Map<string, WikiLink[]>([
			['/vault/a.md', [makeWikiLink('test')]],
			['/vault/b.md', [makeWikiLink('other')]],
			['/vault/c.md', [makeWikiLink('Test')]],
		]);
		const reverse = buildReverseIndex(noteIndex);

		const inlinks = resolveInlinks('/vault/notes/test.md', reverse);
		expect(inlinks).toHaveLength(2);
		expect(inlinks.map((l) => l.path).sort()).toEqual(['/vault/a.md', '/vault/c.md']);
	});

	it('does not include self-links', () => {
		const noteIndex = new Map<string, WikiLink[]>([
			['/vault/test.md', [makeWikiLink('test')]],
		]);
		const reverse = buildReverseIndex(noteIndex);
		const inlinks = resolveInlinks('/vault/test.md', reverse);
		expect(inlinks).toHaveLength(0);
	});

	it('returns empty for no inlinks', () => {
		const noteIndex = new Map<string, WikiLink[]>([
			['/vault/a.md', [makeWikiLink('other')]],
		]);
		const reverse = buildReverseIndex(noteIndex);
		const inlinks = resolveInlinks('/vault/notes/test.md', reverse);
		expect(inlinks).toHaveLength(0);
	});

	it('resolves inlinks from full-path wikilinks', () => {
		const noteIndex = new Map<string, WikiLink[]>([
			['/vault/meeting.md', [makeWikiLink('_notes/2026/02-Feb/_journal-day-15')]],
		]);
		const reverse = buildReverseIndex(noteIndex);
		const inlinks = resolveInlinks('/vault/notes/_journal-day-15.md', reverse);
		expect(inlinks).toHaveLength(1);
		expect(inlinks[0].path).toBe('/vault/meeting.md');
	});

	it('resolves inlinks from deeply nested path targets', () => {
		const noteIndex = new Map<string, WikiLink[]>([
			['/vault/a.md', [makeWikiLink('folder/sub/test')]],
			['/vault/b.md', [makeWikiLink('other/path/test')]],
		]);
		const reverse = buildReverseIndex(noteIndex);
		const inlinks = resolveInlinks('/vault/notes/test.md', reverse);
		expect(inlinks).toHaveLength(2);
	});

	it('returns empty for empty reverse index', () => {
		const reverse = new Map<string, Set<string>>();
		const inlinks = resolveInlinks('/vault/test.md', reverse);
		expect(inlinks).toHaveLength(0);
	});
});

describe('buildDVPage', () => {
	const noteIndex = new Map<string, WikiLink[]>();
	const noteContents = new Map<string, string>();
	const allPaths = ['/vault/notes/test.md'];

	it('maps NoteRecord correctly', () => {
		const record = makeRecord();
		const page = buildDVPage(record, noteIndex, noteContents, allPaths);

		expect(page.file.path).toBe('/vault/notes/test.md');
		expect(page.file.name).toBe('test.md');
		expect(page.file.basename).toBe('test');
		expect(page.file.folder).toBe('/vault/notes');
		expect(page.file.size).toBe(256);
		expect(page.file.link.display).toBe('test');
	});

	it('extracts tags from content', () => {
		const contents = new Map([
			['/vault/notes/test.md', '---\ntags: [journal]\n---\nSome #inline-tag content'],
		]);
		const page = buildDVPage(makeRecord(), noteIndex, contents, allPaths);
		expect(page.file.tags).toContain('journal');
		expect(page.file.tags).toContain('inline-tag');
	});

	it('populates inlinks', () => {
		const index = new Map<string, WikiLink[]>([
			['/vault/other.md', [makeWikiLink('test')]],
		]);
		const reverse = buildReverseIndex(index);
		const page = buildDVPage(makeRecord(), index, noteContents, allPaths, reverse);
		expect(page.file.inlinks).toHaveLength(1);
		expect(page.file.inlinks[0].path).toBe('/vault/other.md');
	});

	it('populates outlinks', () => {
		const index = new Map<string, WikiLink[]>([
			['/vault/notes/test.md', [makeWikiLink('test')]],
		]);
		const paths = ['/vault/notes/test.md'];
		const page = buildDVPage(makeRecord(), index, noteContents, paths);
		expect(page.file.outlinks).toHaveLength(1);
	});

	it('spreads frontmatter properties onto page root', () => {
		const record = makeRecord({
			properties: new Map<string, unknown>([
				['status', 'active'],
				['priority', 5],
			]),
		});
		const page = buildDVPage(record, noteIndex, noteContents, allPaths);
		expect(page.status).toBe('active');
		expect(page.priority).toBe(5);
	});

	it('converts date strings to DVDateTime', () => {
		const record = makeRecord({
			properties: new Map<string, unknown>([['created', '2024-06-15']]),
		});
		const page = buildDVPage(record, noteIndex, noteContents, allPaths);
		expect(page.created).toBeInstanceOf(DVDateTime);
		expect((page.created as DVDateTime).year).toBe(2024);
	});

	it('does not override file property from frontmatter', () => {
		const record = makeRecord({
			properties: new Map<string, unknown>([['file', 'should-not-override']]),
		});
		const page = buildDVPage(record, noteIndex, noteContents, allPaths);
		expect(page.file.path).toBe('/vault/notes/test.md');
	});

	it('returns empty tasks when content has no tasks', () => {
		const contents = new Map([['/vault/notes/test.md', 'Just some text\nNo tasks here']]);
		const page = buildDVPage(makeRecord(), noteIndex, contents, allPaths);
		expect(page.file.tasks).toEqual([]);
	});

	it('returns empty tasks when content is empty', () => {
		const page = buildDVPage(makeRecord(), noteIndex, noteContents, allPaths);
		expect(page.file.tasks).toEqual([]);
	});

	it('extracts tasks from content', () => {
		const contents = new Map([
			['/vault/notes/test.md', '# My note\n- [ ] Buy milk\n- [x] Write tests\nSome text'],
		]);
		const page = buildDVPage(makeRecord(), noteIndex, contents, allPaths);
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

	it('skips tasks inside code blocks', () => {
		const contents = new Map([
			[
				'/vault/notes/test.md',
				'- [ ] Real task\n```\n- [ ] Fake task\n```\n- [x] Another real task',
			],
		]);
		const page = buildDVPage(makeRecord(), noteIndex, contents, allPaths);
		expect(page.file.tasks).toHaveLength(2);
		expect(page.file.tasks[0].text).toBe('Real task');
		expect(page.file.tasks[1].text).toBe('Another real task');
	});

	it('sets correct path on each task', () => {
		const customPath = '/vault/journal/2026-02-16.md';
		const record = makeRecord({ path: customPath });
		const contents = new Map([[customPath, '- [ ] Task one']]);
		const paths = [customPath];
		const page = buildDVPage(record, noteIndex, contents, paths);
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
