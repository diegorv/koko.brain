import { describe, it, expect } from 'vitest';
import { buildTypeSections, getNotesForSelection, getNotesForViewPaths, formatNoteDate, formatRelativeTime, formatPropertyValue, splitPropertyIntoPills, collectViewFiles, updateViewColorsYaml, updateViewIconYaml, updateViewRailYaml, showViewInViewsYaml, updateViewListPropertiesYaml, buildNewViewYaml, getViewLabel, getViewOpensInEditor, getViewGroup, getViewVisible, getViewOrder, getViewSort, getViewListProperties, sortViewFiles, excludeSystemFolder, isListableNote, ignoredKeyNotes, railViewNameNote, RESERVED_KEY_RULES, VIEW_SORTS, effectiveViewSortLabel } from '#lib/features/type-definitions/type-sidebar.logic.js';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { parseCollectionYaml, railViewIndex } from '#lib/features/collection/yaml-parser.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';
import type { TypeMetadata } from '#lib/features/type-definitions/type-definitions.logic.js';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';
import type { CollectionFilter, CollectionViewDef } from '#lib/features/collection/collection.types.js';
import type { FilterGroup } from '#lib/features/collection/toolbar/toolbar.types.js';
import { parseFilterToGroups } from '#lib/features/collection/toolbar/filter.logic.js';
import { seedToolbarStateFromDefinition } from '#lib/features/type-definitions/type-note-list.logic.js';

function meta(name: string, overrides: Partial<TypeMetadata> = {}): TypeMetadata {
	return {
		name,
		path: null,
		icon: 'file-text',
		color: 'gray',
		order: 50,
		sidebarLabel: `${name}s`,
		template: null,
		folder: null,
		sort: 'title',
		view: 'all',
		visible: true,
		listPropertiesDisplay: [],
		archiveTo: null,
		hub: false,
		...overrides,
	};
}

describe('buildTypeSections', () => {
	it('groups entries by type', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A', isA: 'Project' }),
			entryV2('/v/b.md', { title: 'B', isA: 'Project' }),
			entryV2('/v/c.md', { title: 'C', isA: 'Person' }),
		];
		const map = new Map([
			['Project', meta('Project', { order: 1 })],
			['Person', meta('Person', { order: 2 })],
		]);
		const { sections, untyped } = buildTypeSections(entries, map, 'all');
		expect(sections.length).toBe(2);
		expect(sections[0].metadata.name).toBe('Project');
		expect(sections[0].notes.length).toBe(2);
		expect(sections[1].metadata.name).toBe('Person');
		expect(untyped.length).toBe(0);
	});

	it('puts notes without isA into untyped', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A', isA: null }),
			entryV2('/v/b.md', { title: 'B', isA: 'Project' }),
		];
		const { sections, untyped } = buildTypeSections(entries, new Map(), 'all');
		expect(sections.length).toBe(1);
		expect(untyped.length).toBe(1);
		expect(untyped[0].title).toBe('A');
	});

	it('excludes Type Definition entries from sections', () => {
		const entries = [
			entryV2('/v/Project.md', { title: 'Project', isA: 'Type' }),
			entryV2('/v/a.md', { title: 'A', isA: 'Project' }),
		];
		const { sections } = buildTypeSections(entries, new Map(), 'all');
		expect(sections[0].notes.length).toBe(1);
	});

	it('filters archived in all mode', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A', isA: 'Project', archived: false }),
			entryV2('/v/b.md', { title: 'B', isA: 'Project', archived: true }),
		];
		const { sections } = buildTypeSections(entries, new Map(), 'all');
		expect(sections[0].notes.length).toBe(1);
	});

	it('inbox filter shows only non-organized non-archived', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A', isA: 'Project', organized: false, archived: false }),
			entryV2('/v/b.md', { title: 'B', isA: 'Project', organized: true, archived: false }),
		];
		const { sections } = buildTypeSections(entries, new Map(), 'inbox');
		expect(sections[0].notes.length).toBe(1);
		expect(sections[0].notes[0].title).toBe('A');
	});

	it('archived filter shows only archived', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A', isA: 'Project', archived: true }),
			entryV2('/v/b.md', { title: 'B', isA: 'Project', archived: false }),
		];
		const { sections } = buildTypeSections(entries, new Map(), 'archived');
		expect(sections[0].notes.length).toBe(1);
		expect(sections[0].notes[0].title).toBe('A');
	});

	it('sorts sections by order', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A', isA: 'Person' }),
			entryV2('/v/b.md', { title: 'B', isA: 'Project' }),
		];
		const map = new Map([
			['Project', meta('Project', { order: 1 })],
			['Person', meta('Person', { order: 2 })],
		]);
		const { sections } = buildTypeSections(entries, map, 'all');
		expect(sections[0].metadata.name).toBe('Project');
		expect(sections[1].metadata.name).toBe('Person');
	});

	it('sorts notes within a section by _order then title', () => {
		const entries = [
			entryV2('/v/c.md', { title: 'C', isA: 'Project', frontmatter: { _order: 3 } }),
			entryV2('/v/a.md', { title: 'A', isA: 'Project', frontmatter: { _order: 1 } }),
			entryV2('/v/b.md', { title: 'B', isA: 'Project', frontmatter: { _order: 2 } }),
			entryV2('/v/d.md', { title: 'D', isA: 'Project' }),
			entryV2('/v/e.md', { title: 'E', isA: 'Project' }),
		];
		const { sections } = buildTypeSections(entries, new Map(), 'all');
		expect(sections[0].notes.map((n) => n.title)).toEqual(['A', 'B', 'C', 'D', 'E']);
	});

	it('handles string _order values from quoted YAML', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A', isA: 'Project', frontmatter: { _order: '2' } }),
			entryV2('/v/b.md', { title: 'B', isA: 'Project', frontmatter: { _order: '1' } }),
			entryV2('/v/c.md', { title: 'C', isA: 'Project', frontmatter: { _order: '3' } }),
		];
		const { sections } = buildTypeSections(entries, new Map(), 'all');
		expect(sections[0].notes.map((n) => n.title)).toEqual(['B', 'A', 'C']);
	});

	it('sorts notes by modified (newest first) when _sort is modified', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A', isA: 'Project', modifiedAt: 100 }),
			entryV2('/v/b.md', { title: 'B', isA: 'Project', modifiedAt: 300 }),
			entryV2('/v/c.md', { title: 'C', isA: 'Project', modifiedAt: 200 }),
		];
		const map = new Map([['Project', meta('Project', { sort: 'modified' })]]);
		const { sections } = buildTypeSections(entries, map, 'all');
		expect(sections[0].notes.map((n) => n.title)).toEqual(['B', 'C', 'A']);
	});

	it('sorts notes by created (newest first) when _sort is created', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A', isA: 'Project', createdAt: 300 }),
			entryV2('/v/b.md', { title: 'B', isA: 'Project', createdAt: 100 }),
			entryV2('/v/c.md', { title: 'C', isA: 'Project', createdAt: 200 }),
		];
		const map = new Map([['Project', meta('Project', { sort: 'created' })]]);
		const { sections } = buildTypeSections(entries, map, 'all');
		expect(sections[0].notes.map((n) => n.title)).toEqual(['A', 'C', 'B']);
	});

	it('_order overrides _sort as primary sort key', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A', isA: 'Project', modifiedAt: 100, frontmatter: { _order: 1 } }),
			entryV2('/v/b.md', { title: 'B', isA: 'Project', modifiedAt: 300 }),
			entryV2('/v/c.md', { title: 'C', isA: 'Project', modifiedAt: 200 }),
		];
		const map = new Map([['Project', meta('Project', { sort: 'modified' })]]);
		const { sections } = buildTypeSections(entries, map, 'all');
		expect(sections[0].notes[0].title).toBe('A');
		expect(sections[0].notes[1].title).toBe('B');
	});

	it('sorts notes alphabetically when _sort is title', () => {
		const entries = [
			entryV2('/v/c.md', { title: 'C', isA: 'Project' }),
			entryV2('/v/a.md', { title: 'A', isA: 'Project' }),
			entryV2('/v/b.md', { title: 'B', isA: 'Project' }),
		];
		const map = new Map([['Project', meta('Project', { sort: 'title' })]]);
		const { sections } = buildTypeSections(entries, map, 'all');
		expect(sections[0].notes.map((n) => n.title)).toEqual(['A', 'B', 'C']);
	});

	it('sorts notes by modified-asc (oldest first)', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A', isA: 'Project', modifiedAt: 300 }),
			entryV2('/v/b.md', { title: 'B', isA: 'Project', modifiedAt: 100 }),
			entryV2('/v/c.md', { title: 'C', isA: 'Project', modifiedAt: 200 }),
		];
		const map = new Map([['Project', meta('Project', { sort: 'modified-asc' })]]);
		const { sections } = buildTypeSections(entries, map, 'all');
		expect(sections[0].notes.map((n) => n.title)).toEqual(['B', 'C', 'A']);
	});

	it('sorts notes by created-asc (oldest first)', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A', isA: 'Project', createdAt: 200 }),
			entryV2('/v/b.md', { title: 'B', isA: 'Project', createdAt: 300 }),
			entryV2('/v/c.md', { title: 'C', isA: 'Project', createdAt: 100 }),
		];
		const map = new Map([['Project', meta('Project', { sort: 'created-asc' })]]);
		const { sections } = buildTypeSections(entries, map, 'all');
		expect(sections[0].notes.map((n) => n.title)).toEqual(['C', 'A', 'B']);
	});

	it('falls back to title sort for unknown _sort value', () => {
		const entries = [
			entryV2('/v/c.md', { title: 'C', isA: 'Project' }),
			entryV2('/v/a.md', { title: 'A', isA: 'Project' }),
			entryV2('/v/b.md', { title: 'B', isA: 'Project' }),
		];
		const map = new Map([['Project', meta('Project', { sort: 'nonsense' })]]);
		const { sections } = buildTypeSections(entries, map, 'all');
		expect(sections[0].notes.map((n) => n.title)).toEqual(['A', 'B', 'C']);
	});

	it('hides sections with visible: false', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A', isA: 'Hidden' }),
		];
		const map = new Map([['Hidden', meta('Hidden', { visible: false })]]);
		const { sections } = buildTypeSections(entries, map, 'all');
		expect(sections.length).toBe(0);
	});

	it('shows type definitions with no notes as empty sections', () => {
		const entries = [
			entryV2('/v/Sprint.md', { title: 'Sprint', isA: 'Type' }),
			entryV2('/v/a.md', { title: 'A', isA: 'Project' }),
		];
		const map = new Map([
			['Sprint', meta('Sprint', { order: 1, sidebarLabel: 'Sprints', path: '/v/Sprint.md' })],
			['Project', meta('Project', { order: 2 })],
		]);
		const { sections } = buildTypeSections(entries, map, 'all');
		expect(sections.length).toBe(2);
		expect(sections[0].metadata.name).toBe('Sprint');
		expect(sections[0].notes.length).toBe(0);
		expect(sections[0].definitionPath).toBe('/v/Sprint.md');
		expect(sections[1].metadata.name).toBe('Project');
		expect(sections[1].notes.length).toBe(1);
	});

	it('resolves definitionPath from metadata even when the Type Definition entry is absent from the input array', () => {
		// Regression: Type definitions living in the system folder are
		// filtered out by `excludeSystemFolder` before `buildTypeSections`
		// runs. The definitionPath must still come from the metadata map
		// (which is built upstream from unfiltered entries), so the sidebar
		// context menu can offer "Open type definition" rather than
		// silently creating a duplicate at the vault root.
		const entries = [
			entryV2('/v/people/alice.md', { title: 'Alice', isA: 'Person' }),
		];
		const map = new Map([
			['Person', meta('Person', { path: '/v/_system/types/Person.md' })],
		]);
		const { sections } = buildTypeSections(entries, map, 'all');
		expect(sections.length).toBe(1);
		expect(sections[0].definitionPath).toBe('/v/_system/types/Person.md');
		expect(sections[0].notes.length).toBe(1);
	});

	it('leaves definitionPath null when metadata has no backing file (builtin/fallback)', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A', isA: 'Project' }),
		];
		const { sections } = buildTypeSections(entries, new Map(), 'all');
		expect(sections.length).toBe(1);
		expect(sections[0].definitionPath).toBeNull();
	});

	it('does not show empty sections for invisible type definitions', () => {
		const entries: NoteEntryV2[] = [];
		const map = new Map([
			['Hidden', meta('Hidden', { visible: false })],
		]);
		const { sections } = buildTypeSections(entries, map, 'all');
		expect(sections.length).toBe(0);
	});
});

describe('getNotesForSelection', () => {
	it('returns notes matching selected type', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A', isA: 'Project' }),
			entryV2('/v/b.md', { title: 'B', isA: 'Person' }),
			entryV2('/v/c.md', { title: 'C', isA: 'Project' }),
		];
		const notes = getNotesForSelection(entries, { kind: 'type', name: 'Project' });
		expect(notes.length).toBe(2);
		expect(notes.map((n) => n.title)).toEqual(['A', 'C']);
	});

	it('excludes archived notes for type selection', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A', isA: 'Project', archived: false }),
			entryV2('/v/b.md', { title: 'B', isA: 'Project', archived: true }),
		];
		const notes = getNotesForSelection(entries, { kind: 'type', name: 'Project' });
		expect(notes.length).toBe(1);
		expect(notes[0].title).toBe('A');
	});

	it('sorts a type by most-recently-modified', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A', isA: 'Project', modifiedAt: 100 }),
			entryV2('/v/b.md', { title: 'B', isA: 'Project', modifiedAt: 300 }),
			entryV2('/v/c.md', { title: 'C', isA: 'Project', modifiedAt: 200 }),
		];
		const notes = getNotesForSelection(entries, { kind: 'type', name: 'Project' });
		expect(notes.map((n) => n.title)).toEqual(['B', 'C', 'A']);
	});

	it('keeps _order pins above the modified-desc order for a type', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A', isA: 'Project', modifiedAt: 100 }),
			entryV2('/v/b.md', { title: 'B', isA: 'Project', modifiedAt: 300 }),
			// Oldest, but pinned with _order -> floats to the top.
			entryV2('/v/c.md', { title: 'C', isA: 'Project', modifiedAt: 50, frontmatter: { _order: 1 } }),
		];
		const notes = getNotesForSelection(entries, { kind: 'type', name: 'Project' });
		expect(notes.map((n) => n.title)).toEqual(['C', 'B', 'A']);
	});

	it('returns untyped notes for untyped selection', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A', isA: null }),
			entryV2('/v/b.md', { title: 'B', isA: 'Project' }),
			entryV2('/v/c.md', { title: 'C', isA: null }),
		];
		const notes = getNotesForSelection(entries, { kind: 'untyped' });
		expect(notes.length).toBe(2);
		expect(notes.map((n) => n.title)).toEqual(['A', 'C']);
	});

	it('sorts untyped notes by most-recently-modified', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A', isA: null, modifiedAt: 100 }),
			entryV2('/v/b.md', { title: 'B', isA: null, modifiedAt: 300 }),
			entryV2('/v/c.md', { title: 'C', isA: null, modifiedAt: 200 }),
		];
		const notes = getNotesForSelection(entries, { kind: 'untyped' });
		expect(notes.map((n) => n.title)).toEqual(['B', 'C', 'A']);
	});

	it('excludes every typed note from untyped selection, including isA "Type" and empty string', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A', isA: '' }),
			entryV2('/v/b.md', { title: 'B', isA: 'Type' }),
			entryV2('/v/c.md', { title: 'C', isA: 'Project' }),
			entryV2('/v/d.md', { title: 'D', isA: null }),
		];
		const notes = getNotesForSelection(entries, { kind: 'untyped' });
		// '' is falsy -> untyped; 'Type' and 'Project' are typed.
		expect(notes.map((n) => n.title)).toEqual(['A', 'D']);
	});

	it('returns empty when no notes match type', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A', isA: 'Person' }),
		];
		const notes = getNotesForSelection(entries, { kind: 'type', name: 'Project' });
		expect(notes.length).toBe(0);
	});

	describe('nav selections', () => {
		it('all returns non-archived, non-Type entries', () => {
			const entries = [
				entryV2('/v/a.md', { title: 'A', isA: 'Project', archived: false }),
				entryV2('/v/b.md', { title: 'B', isA: 'Project', archived: true }),
				entryV2('/v/c.md', { title: 'C', isA: 'Type' }),
				entryV2('/v/d.md', { title: 'D', isA: null, archived: false }),
			];
			const notes = getNotesForSelection(entries, { kind: 'nav', id: 'all' });
			expect(notes.map((n) => n.title)).toEqual(['A', 'D']);
		});

		it('inbox returns unorganized non-archived entries', () => {
			const entries = [
				entryV2('/v/a.md', { title: 'A', organized: false, archived: false, isA: 'Project' }),
				entryV2('/v/b.md', { title: 'B', organized: true, archived: false, isA: 'Project' }),
				entryV2('/v/c.md', { title: 'C', organized: false, archived: true, isA: 'Project' }),
			];
			const notes = getNotesForSelection(entries, { kind: 'nav', id: 'inbox' });
			expect(notes.length).toBe(1);
			expect(notes[0].title).toBe('A');
		});

		it('archive returns only archived entries', () => {
			const entries = [
				entryV2('/v/a.md', { title: 'A', archived: true, isA: 'Project' }),
				entryV2('/v/b.md', { title: 'B', archived: false, isA: 'Project' }),
			];
			const notes = getNotesForSelection(entries, { kind: 'nav', id: 'archive' });
			expect(notes.length).toBe(1);
			expect(notes[0].title).toBe('A');
		});

		it('favorites returns favorited non-archived entries', () => {
			const entries = [
				entryV2('/v/a.md', { title: 'A', favorite: true, archived: false, isA: 'Project' }),
				entryV2('/v/b.md', { title: 'B', favorite: false, archived: false, isA: 'Project' }),
				entryV2('/v/c.md', { title: 'C', favorite: true, archived: true, isA: 'Project' }),
			];
			const notes = getNotesForSelection(entries, { kind: 'nav', id: 'favorites' });
			expect(notes.length).toBe(1);
			expect(notes[0].title).toBe('A');
		});

		it('nav sorts by modified (newest first)', () => {
			const entries = [
				entryV2('/v/a.md', { title: 'A', isA: 'Project', modifiedAt: 100 }),
				entryV2('/v/b.md', { title: 'B', isA: 'Project', modifiedAt: 300 }),
				entryV2('/v/c.md', { title: 'C', isA: 'Project', modifiedAt: 200 }),
			];
			const notes = getNotesForSelection(entries, { kind: 'nav', id: 'all' });
			expect(notes.map((n) => n.title)).toEqual(['B', 'C', 'A']);
		});
	});
});

describe('formatNoteDate', () => {
	it('returns empty for zero', () => {
		expect(formatNoteDate(0)).toBe('');
	});

	it('omits year for current year', () => {
		const now = new Date();
		const epoch = Math.floor(new Date(now.getFullYear(), 0, 15).getTime() / 1000);
		expect(formatNoteDate(epoch)).toBe('Jan 15');
	});

	it('includes year for different year', () => {
		const epoch = Math.floor(new Date(2020, 5, 10).getTime() / 1000);
		expect(formatNoteDate(epoch)).toBe('Jun 10, 2020');
	});
});

describe('formatRelativeTime', () => {
	const base = 1700000000000;

	it('returns empty for zero', () => {
		expect(formatRelativeTime(0, base)).toBe('');
	});

	it('returns just now for < 1 minute', () => {
		const epoch = (base - 30000) / 1000;
		expect(formatRelativeTime(epoch, base)).toBe('just now');
	});

	it('returns minutes ago', () => {
		const epoch = (base - 5 * 60000) / 1000;
		expect(formatRelativeTime(epoch, base)).toBe('5m ago');
	});

	it('returns hours ago', () => {
		const epoch = (base - 3 * 3600000) / 1000;
		expect(formatRelativeTime(epoch, base)).toBe('3h ago');
	});

	it('returns days ago', () => {
		const epoch = (base - 7 * 86400000) / 1000;
		expect(formatRelativeTime(epoch, base)).toBe('7d ago');
	});

	it('falls back to absolute date after 30 days', () => {
		const epoch = (base - 45 * 86400000) / 1000;
		expect(formatRelativeTime(epoch, base)).toMatch(/\w+ \d+/);
	});
});

describe('formatPropertyValue', () => {
	it('returns empty for null', () => {
		expect(formatPropertyValue(null)).toBe('');
	});

	it('returns empty for undefined', () => {
		expect(formatPropertyValue(undefined)).toBe('');
	});

	it('returns string as-is', () => {
		expect(formatPropertyValue('active')).toBe('active');
	});

	it('converts number to string', () => {
		expect(formatPropertyValue(42)).toBe('42');
	});

	it('converts boolean to string', () => {
		expect(formatPropertyValue(true)).toBe('true');
	});

	it('joins array values with commas', () => {
		expect(formatPropertyValue(['a', 'b', 'c'])).toBe('a, b, c');
	});

	it('filters null values from arrays', () => {
		expect(formatPropertyValue(['a', null, 'b'])).toBe('a, b');
	});

	it('returns empty for objects', () => {
		expect(formatPropertyValue({ key: 'val' })).toBe('');
	});
});

describe('splitPropertyIntoPills', () => {
	it('returns empty for null', () => {
		expect(splitPropertyIntoPills(null)).toEqual([]);
	});

	it('returns empty for undefined', () => {
		expect(splitPropertyIntoPills(undefined)).toEqual([]);
	});

	it('returns plain text for non-wikilink string', () => {
		expect(splitPropertyIntoPills('active')).toEqual([{ text: 'active' }]);
	});

	it('extracts single wikilink', () => {
		expect(splitPropertyIntoPills('[[My Note]]')).toEqual([
			{ text: 'My Note', wikilink: 'My Note' },
		]);
	});

	it('handles wikilink with alias', () => {
		expect(splitPropertyIntoPills('[[path/Note|Display Name]]')).toEqual([
			{ text: 'Display Name', wikilink: 'path/Note' },
		]);
	});

	it('splits mixed text and wikilink', () => {
		expect(splitPropertyIntoPills('status: [[Done]]')).toEqual([
			{ text: 'status:' },
			{ text: 'Done', wikilink: 'Done' },
		]);
	});

	it('handles multiple wikilinks', () => {
		expect(splitPropertyIntoPills('[[A]] and [[B]]')).toEqual([
			{ text: 'A', wikilink: 'A' },
			{ text: 'and' },
			{ text: 'B', wikilink: 'B' },
		]);
	});

	it('flattens array with wikilinks', () => {
		expect(splitPropertyIntoPills(['[[Note A]]', '[[Note B]]'])).toEqual([
			{ text: 'Note A', wikilink: 'Note A' },
			{ text: 'Note B', wikilink: 'Note B' },
		]);
	});

	it('handles array with mixed plain and wikilink values', () => {
		expect(splitPropertyIntoPills(['plain', '[[Link]]'])).toEqual([
			{ text: 'plain' },
			{ text: 'Link', wikilink: 'Link' },
		]);
	});

	it('returns plain pill for number', () => {
		expect(splitPropertyIntoPills(42)).toEqual([{ text: '42' }]);
	});

	it('returns plain pill for boolean', () => {
		expect(splitPropertyIntoPills(true)).toEqual([{ text: 'true' }]);
	});
});

describe('collectViewFiles', () => {
	it('finds .view files in flat tree', () => {
		const tree = [
			{ name: 'tasks.view', path: '/v/tasks.view', isDirectory: false },
			{ name: 'note.md', path: '/v/note.md', isDirectory: false },
		];
		const result = collectViewFiles(tree);
		expect(result).toEqual([{ path: '/v/tasks.view', name: 'tasks' }]);
	});

	it('finds .view files in nested directories', () => {
		const tree = [
			{
				name: 'views', path: '/v/views', isDirectory: true,
				children: [
					{ name: 'projects.view', path: '/v/views/projects.view', isDirectory: false },
				],
			},
			{ name: 'top.view', path: '/v/top.view', isDirectory: false },
		];
		const result = collectViewFiles(tree);
		expect(result.map((v) => v.name)).toEqual(['projects', 'top']);
	});

	it('returns empty when no .view files exist', () => {
		const tree = [
			{ name: 'note.md', path: '/v/note.md', isDirectory: false },
			{ name: 'data.collection', path: '/v/data.collection', isDirectory: false },
		];
		expect(collectViewFiles(tree)).toEqual([]);
	});

	it('is case insensitive for extension', () => {
		const tree = [
			{ name: 'TEST.VIEW', path: '/v/TEST.VIEW', isDirectory: false },
		];
		const result = collectViewFiles(tree);
		expect(result).toEqual([{ path: '/v/TEST.VIEW', name: 'TEST' }]);
	});

	it('sorts alphabetically by name', () => {
		const tree = [
			{ name: 'zebra.view', path: '/v/zebra.view', isDirectory: false },
			{ name: 'alpha.view', path: '/v/alpha.view', isDirectory: false },
			{ name: 'mid.view', path: '/v/mid.view', isDirectory: false },
		];
		const result = collectViewFiles(tree);
		expect(result.map((v) => v.name)).toEqual(['alpha', 'mid', 'zebra']);
	});

	it('sorts numbers in names by value, like the file tree', () => {
		const tree = [
			{ name: 'Week 10.view', path: '/v/Week 10.view', isDirectory: false },
			{ name: 'Week 2.view', path: '/v/Week 2.view', isDirectory: false },
		];
		expect(collectViewFiles(tree).map((v) => v.name)).toEqual(['Week 2', 'Week 10']);
	});
});

describe('getNotesForViewPaths', () => {
	it('returns notes matching the given paths', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A', modifiedAt: 100 }),
			entryV2('/v/b.md', { title: 'B', modifiedAt: 200 }),
			entryV2('/v/c.md', { title: 'C', modifiedAt: 50 }),
		];
		const matching = new Set(['/v/a.md', '/v/c.md']);
		const result = getNotesForViewPaths(entries, matching);
		expect(result.map((n) => n.title)).toEqual(['A', 'C']);
	});

	it('sorts by modified (newest first)', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A', modifiedAt: 100 }),
			entryV2('/v/b.md', { title: 'B', modifiedAt: 300 }),
			entryV2('/v/c.md', { title: 'C', modifiedAt: 200 }),
		];
		const matching = new Set(['/v/a.md', '/v/b.md', '/v/c.md']);
		const result = getNotesForViewPaths(entries, matching);
		expect(result.map((n) => n.title)).toEqual(['B', 'C', 'A']);
	});

	it('returns empty when no paths match', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A' }),
		];
		const matching = new Set(['/v/x.md']);
		expect(getNotesForViewPaths(entries, matching)).toEqual([]);
	});

	it('omits archived notes', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A', archived: false }),
			entryV2('/v/b.md', { title: 'B', archived: true }),
		];
		const matching = new Set(['/v/a.md', '/v/b.md']);
		const result = getNotesForViewPaths(entries, matching, 'title');
		expect(result.map((n) => n.title)).toEqual(['A']);
	});
	it('keeps the iteration order of the matching paths when sort is null', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A', modifiedAt: 300 }),
			entryV2('/v/b.md', { title: 'B', modifiedAt: 100 }),
			entryV2('/v/c.md', { title: 'C', modifiedAt: 200 }),
		];
		const matching = new Set(['/v/b.md', '/v/a.md', '/v/c.md']);
		const result = getNotesForViewPaths(entries, matching, null);
		expect(result.map((n) => n.title)).toEqual(['B', 'A', 'C']);
	});

	it('omits archived notes and skips unknown paths when sort is null', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A', archived: true }),
			entryV2('/v/b.md', { title: 'B' }),
		];
		const matching = new Set(['/v/x.md', '/v/a.md', '/v/b.md']);
		expect(getNotesForViewPaths(entries, matching, null).map((n) => n.title)).toEqual(['B']);
	});

	it('keeps archived notes with includeArchived, sorted or in matching order', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A', archived: true }),
			entryV2('/v/b.md', { title: 'B' }),
		];
		const matching = new Set(['/v/b.md', '/v/a.md']);
		expect(getNotesForViewPaths(entries, matching, 'title', true).map((n) => n.title)).toEqual(['A', 'B']);
		expect(getNotesForViewPaths(entries, matching, null, true).map((n) => n.title)).toEqual(['B', 'A']);
	});

	// VIEW_SORTS and the comparator's case labels are two lists: a mode in
	// VIEW_SORTS with no case would silently fall back to title order.
	it('orders by each VIEW_SORTS mode, not by the title fallback', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A', modifiedAt: 200, createdAt: 100 }),
			entryV2('/v/b.md', { title: 'B', modifiedAt: 300, createdAt: 300 }),
			entryV2('/v/c.md', { title: 'C', modifiedAt: 100, createdAt: 200 }),
		];
		const matching = new Set(entries.map((e) => e.path));
		const expected: Record<string, string[]> = {
			modified: ['B', 'A', 'C'],
			created: ['B', 'C', 'A'],
			'modified-asc': ['C', 'A', 'B'],
			'created-asc': ['A', 'C', 'B'],
			title: ['A', 'B', 'C'],
		};
		expect([...VIEW_SORTS].sort()).toEqual(Object.keys(expected).sort());
		for (const sort of VIEW_SORTS) {
			expect(getNotesForViewPaths(entries, matching, sort).map((n) => n.title)).toEqual(expected[sort]);
		}
	});
});

describe('updateViewIconYaml', () => {
	it.each([
		['the same values', '# c\n_icon: lucide:star\n_color: red\n_title_color: blue\n', 'lucide:star', 'red', 'blue'],
		['a bare name', '# c\n_icon: star\n', 'lucide:star', undefined, undefined],
		['the aliases', '# c\nicon: star\ncolor: red\n', 'lucide:star', 'red', undefined],
		['a color that is not a string', '# c\n_icon: star\n_color: 5\n', 'lucide:star', undefined, undefined],
	])('returns the input for %s', (_label, input, icon, color, titleColor) => {
		expect(updateViewIconYaml(input, icon, color, titleColor)).toBe(input);
	});

	it.each([
		['a different color', '# c\n_icon: star\n_color: red\n', 'lucide:star', 'blue', undefined],
		['a cleared title color', '# c\n_icon: star\n_title_color: red\n', 'lucide:star', undefined, undefined],
		['another pack', '# c\n_icon: star\n', 'feather:star', undefined, undefined],
		['an icon value the parser rejects', '# c\n', 'mdi:home', undefined, undefined],
	])('rewrites for %s', (_label, input, icon, color, titleColor) => {
		expect(updateViewIconYaml(input, icon, color, titleColor)).not.toBe(input);
	});

	it('removes an _icon the parser rejects when no icon is given', () => {
		expect(parseYaml(updateViewIconYaml('_icon: mdi:home\n_order: 1\n'))).toEqual({ _order: 1 });
	});

	it('sets _icon, _color, and _title_color', () => {
		const input = '_sidebar_label: Test\nviews:\n  - type: table\n    name: All\n';
		const result = updateViewIconYaml(input, 'lucide:rocket', 'red', '#fff');
		expect(result).toContain('_icon: lucide:rocket');
		expect(result).toContain('_color: red');
		expect(result).toContain('_title_color: "#fff"');
		expect(result).toContain('_sidebar_label: Test');
	});

	it('removes _icon, _color, and _title_color when undefined/empty', () => {
		const input = '_icon: lucide:star\n_color: blue\n_title_color: white\n_sidebar_label: Test\n';
		const result = updateViewIconYaml(input, undefined, undefined, undefined);
		expect(result).not.toContain('_icon');
		expect(result).not.toContain('_color');
		expect(result).not.toContain('_title_color');
		expect(result).toContain('_sidebar_label: Test');
	});

	it('handles empty content', () => {
		const result = updateViewIconYaml('', 'lucide:star', 'red');
		expect(result).toContain('_icon: lucide:star');
		expect(result).toContain('_color: red');
	});

	it('sets _color and _title_color to empty string without deleting', () => {
		const input = '_icon: lucide:star\n_color: blue\n_title_color: white\n';
		const result = updateViewIconYaml(input, undefined, '', '');
		expect(result).not.toContain('_icon');
		expect(result).toContain('_color: ""');
		expect(result).toContain('_title_color: ""');
	});

	it('preserves other fields', () => {
		const input = '_order: 5\nfilters: "type = \'Project\'"\n';
		const result = updateViewIconYaml(input, 'lucide:rocket', 'green');
		expect(result).toContain('_order: 5');
		expect(result).toContain('_icon: lucide:rocket');
		expect(result).toContain('_color: green');
	});

	it('drops the color aliases when clearing, so the name and the icon lose their color', () => {
		const result = parseYaml(updateViewIconYaml('_icon: lucide:star\ncolor: red\ntitle_color: blue\n', 'lucide:star'));
		expect(result).toEqual({ _icon: 'lucide:star' });
	});

	it('replaces a color alias with its key when changing, leaving one key', () => {
		const result = parseYaml(updateViewIconYaml('_icon: lucide:star\ntitle_color: blue\n', 'lucide:star', undefined, 'green'));
		expect(result).toEqual({ _icon: 'lucide:star', _title_color: 'green' });
	});

	it('removes the three aliases when removing the icon', () => {
		const result = parseYaml(updateViewIconYaml('icon: rocket\ncolor: red\ntitle_color: blue\n_order: 1\n'));
		expect(result).toEqual({ _order: 1 });
	});

	it('replaces an icon alias when picking an icon', () => {
		const result = parseYaml(updateViewIconYaml('_icon: lucide:star\nicon: rocket\n', 'lucide:check'));
		expect(result).toEqual({ _icon: 'lucide:check' });
	});
});

describe('updateViewColorsYaml', () => {
	it.each([
		['a pack the parser rejects', '_icon: mdi:home\n', 'mdi:home'],
		['a value that is not a string', '_icon: 12\n', 12],
		['a name the parser accepts', '_icon: lucide:star\n', 'lucide:star'],
	])('leaves an _icon with %s untouched', (_label, input, icon) => {
		const result = parseYaml(updateViewColorsYaml(input, 'red', 'blue'));
		expect(result).toEqual({ _icon: icon, _color: 'red', _title_color: 'blue' });
	});

	it('leaves an icon alias untouched', () => {
		const result = parseYaml(updateViewColorsYaml('icon: rocket\n', 'red'));
		expect(result).toEqual({ icon: 'rocket', _color: 'red' });
	});

	it('removes a color that comes back absent', () => {
		const result = parseYaml(updateViewColorsYaml('_color: red\n_title_color: blue\n_order: 1\n', undefined, 'blue'));
		expect(result).toEqual({ _title_color: 'blue', _order: 1 });
	});

	it('clears a color held by its alias', () => {
		const result = parseYaml(updateViewColorsYaml('title_color: blue\n_order: 1\n'));
		expect(result).toEqual({ _order: 1 });
	});

	it('changes a color held by its alias, leaving one key', () => {
		const result = parseYaml(updateViewColorsYaml('color: red\n', 'green'));
		expect(result).toEqual({ _color: 'green' });
	});

	it('clears a color set under both keys, whichever came last', () => {
		expect(parseYaml(updateViewColorsYaml('_color: red\ncolor: blue\n'))).toEqual({});
		expect(parseYaml(updateViewColorsYaml('color: blue\n_color: red\n'))).toEqual({});
	});

	it('keeps the other color alias when only one color changes', () => {
		const result = parseYaml(updateViewColorsYaml('color: red\ntitle_color: blue\n', 'green', 'blue'));
		expect(result).toEqual({ title_color: 'blue', _color: 'green' });
	});

	it.each([
		['no color at all, with a comment', '# my view\n_order: 1\n', undefined, undefined],
		['the same colors, with a comment', '# my view\n_color: red\n_title_color: blue\n', 'red', 'blue'],
		['the same colors held by aliases', '# my view\ncolor: red\ntitle_color: blue\n', 'red', 'blue'],
		['the winner of two keys', '# my view\n_color: red\ncolor: blue\n', 'blue', undefined],
		['an _icon the parser rejects', '# my view\n_icon: mdi:home\n', undefined, undefined],
		['a color that is not a string', '# my view\n_color: 12\n', undefined, undefined],
		['a value with spaces around it', '# my view\n_color: " red "\n', 'red', undefined],
	])('returns the same text when nothing changes: %s', (_label, input, color, titleColor) => {
		expect(updateViewColorsYaml(input, color, titleColor)).toBe(input);
	});

	it('returns YAML that does not parse as it is', () => {
		expect(updateViewColorsYaml('views: [', 'red')).toBe('views: [');
	});

	it('returns YAML that is not a mapping as it is', () => {
		expect(updateViewColorsYaml('- a\n- b\n', 'red')).toBe('- a\n- b\n');
	});

	it('writes to an empty file', () => {
		expect(parseYaml(updateViewColorsYaml('', 'red'))).toEqual({ _color: 'red' });
	});
});

describe('updateViewRailYaml', () => {
	it('sets _rail: true and keeps the other keys', () => {
		const input = '_sidebar_label: Test\nviews:\n  - type: table\n    name: All\n';
		const top = parseYaml(updateViewRailYaml(input, true)) as Record<string, unknown>;
		expect(top._rail).toBe(true);
		expect(top._sidebar_label).toBe('Test');
		expect(top.views).toEqual([{ type: 'table', name: 'All' }]);
	});

	it('replaces a _rail that is not the boolean true', () => {
		expect((parseYaml(updateViewRailYaml('_rail: "true"\n', true)) as Record<string, unknown>)._rail).toBe(true);
	});

	it('deletes the key to unpin, whatever its value', () => {
		for (const input of ['_rail: true\n_order: 5\n', '_rail: "true"\n_order: 5\n']) {
			const top = parseYaml(updateViewRailYaml(input, false)) as Record<string, unknown>;
			expect(top).not.toHaveProperty('_rail');
			expect(top._order).toBe(5);
		}
	});

	it('pins an empty file', () => {
		expect(parseYaml(updateViewRailYaml('', true))).toEqual({ _rail: true });
	});

	it('throws on YAML that does not parse', () => {
		expect(() => updateViewRailYaml('views: [', true)).toThrow("The .view file's YAML does not parse");
		expect(() => updateViewRailYaml('views: [', false)).toThrow("The .view file's YAML does not parse");
	});
});

describe('showViewInViewsYaml', () => {
	it('removes _visible and _open_in_editor and keeps the other keys', () => {
		const input = '_visible: false\n_open_in_editor: true\n_sidebar_label: Board\nviews:\n  - type: table\n    name: All\n';
		expect(parseYaml(showViewInViewsYaml(input))).toEqual({ _sidebar_label: 'Board', views: [{ type: 'table', name: 'All' }] });
	});

	it('removes the visible alias Rust folds onto _visible, so the view does not stay hidden', () => {
		expect(parseYaml(showViewInViewsYaml('visible: false\nviews: []\n'))).toEqual({ views: [] });
	});

	it('returns the bytes unchanged when none of the keys is there, so nothing is written', () => {
		const input = '# kept\n_sidebar_label: Board\n';
		expect(showViewInViewsYaml(input)).toBe(input);
		expect(showViewInViewsYaml('')).toBe('');
	});

	it('throws on YAML that does not parse', () => {
		expect(() => showViewInViewsYaml('views: [')).toThrow("The .view file's YAML does not parse");
	});
});

describe('updateViewListPropertiesYaml', () => {
	it('drops the alias Rust folds onto the key, so a save and a clear both take effect', () => {
		const input = 'list_properties_display:\n  - a\n';
		expect(parseYaml(updateViewListPropertiesYaml(input, ['b']))).toEqual({ _list_properties_display: ['b'] });
		expect(parseYaml(updateViewListPropertiesYaml(input, []))).toEqual({});
	});

	it('sets _list_properties_display in order and keeps the other keys', () => {
		const input = '_sidebar_label: Test\nviews:\n  - type: table\n    name: All\n';
		const top = parseYaml(updateViewListPropertiesYaml(input, ['budget', 'status'])) as Record<string, unknown>;
		expect(top._list_properties_display).toEqual(['budget', 'status']);
		expect(top._sidebar_label).toBe('Test');
		expect(top.views).toEqual([{ type: 'table', name: 'All' }]);
	});

	it('replaces an existing list', () => {
		const input = '_list_properties_display:\n  - budget\n';
		expect(parseYaml(updateViewListPropertiesYaml(input, ['status']))).toEqual({ _list_properties_display: ['status'] });
	});

	it('deletes the key for an empty list', () => {
		const top = parseYaml(updateViewListPropertiesYaml('_list_properties_display:\n  - budget\n_order: 5\n', [])) as Record<string, unknown>;
		expect(top).not.toHaveProperty('_list_properties_display');
		expect(top._order).toBe(5);
	});

	it('writes an empty file', () => {
		expect(parseYaml(updateViewListPropertiesYaml('', ['budget']))).toEqual({ _list_properties_display: ['budget'] });
	});

	it('throws on YAML that does not parse, for a list and for an empty list', () => {
		expect(() => updateViewListPropertiesYaml('views: [', ['budget'])).toThrow("The .view file's YAML does not parse");
		expect(() => updateViewListPropertiesYaml('views: [', [])).toThrow("The .view file's YAML does not parse");
	});
});

describe('getViewLabel', () => {
	it('returns _sidebar_label from frontmatter', () => {
		const entry = entryV2('/v/test.view', { frontmatter: { _sidebar_label: 'My View' } });
		expect(getViewLabel(entry, 'fallback')).toBe('My View');
	});

	it('returns fallback when no label', () => {
		const entry = entryV2('/v/test.view', {});
		expect(getViewLabel(entry, 'fallback')).toBe('fallback');
	});

	it('returns fallback for undefined entry', () => {
		expect(getViewLabel(undefined, 'fallback')).toBe('fallback');
	});
});

describe('buildNewViewYaml', () => {
	const LONG = Array.from({ length: 20 }, (_, i) => `word${i}`).join(' ').padEnd(200, 'x');
	const NAMES = ['#tag', '123', '1e3', '0x1F', 'true', 'yes', 'null', '~', 'NaN', 'inf', '[x]', '- x', `it's "quoted"`, LONG];

	it('uses a 200-character name with spaces', () => {
		expect(LONG).toHaveLength(200);
		expect(LONG).toContain(' ');
	});

	it.each(NAMES)('writes %j as the label and the table view name, sorted by title, with no filters or _order', (name) => {
		const yaml = buildNewViewYaml(name);
		const parsed = parseCollectionYaml(yaml);
		if (!parsed.success) throw new Error(`parse failed: ${parsed.error}`);
		expect(parsed.definition.views[0].name).toBe(name);
		expect(parsed.definition.views[0].type).toBe('table');

		const top = parseYaml(yaml) as Record<string, unknown>;
		expect(top._sidebar_label).toBe(name);
		expect(top._sort).toBe('title');
		expect(top).not.toHaveProperty('filters');
		expect(top).not.toHaveProperty('_order');
	});

	it.each(NAMES)('gives %j back through getViewLabel', (name) => {
		const frontmatter = parseYaml(buildNewViewYaml(name)) as NoteEntryV2['frontmatter'];
		const entry = entryV2(`/vault/${name}.view`, { frontmatter });
		expect(getViewLabel(entry, 'fallback')).toBe(name);
	});

	it('keeps a long label on a single line', () => {
		const labelLines = buildNewViewYaml(LONG).split('\n').filter((line) => line.startsWith('_sidebar_label:'));
		expect(labelLines).toHaveLength(1);
		expect(parseYaml(labelLines[0])).toEqual({ _sidebar_label: LONG });
	});

	/** Rows without their per-parse ids. */
	function rowsOf(groups: FilterGroup[]) {
		return groups.map((g) => ({ conjunction: g.conjunction, rows: g.rows.map(({ id: _id, ...rest }) => rest) }));
	}

	it.each<[string, CollectionFilter | string]>([
		['a single expression with double quotes', '_type == "Project"'],
		['an and object of two rows', { and: ['_type == "Project"', "status != 'done'"] }],
	])('puts %s on the first view, where the Filter panel loads it under This view', (_label, filters) => {
		const yaml = buildNewViewYaml('Reading', filters);
		const parsed = parseCollectionYaml(yaml);
		if (!parsed.success) throw new Error(`parse failed: ${parsed.error}`);
		const { definition } = parsed;
		expect(definition.views[0].filters).toEqual(filters);
		expect(definition.filters).toBeUndefined();

		const seed = seedToolbarStateFromDefinition(definition, definition.views[0]);
		expect(seed.globalFilters).toEqual([]);
		expect(rowsOf(seed.viewFilters)).toEqual(rowsOf(parseFilterToGroups(filters)));
		expect(seed.viewFilters[0].rows[0]).toMatchObject({ property: '_type', operator: 'is', value: 'Project' });
		expect(seed.viewFilters[0].rows[0].raw).toBeUndefined();
	});

	it('writes no filters key anywhere when filters is undefined', () => {
		const yaml = buildNewViewYaml('Reading', undefined);
		expect(yaml).not.toContain('filters');
		const top = parseYaml(yaml) as { views: Record<string, unknown>[] };
		expect(top).not.toHaveProperty('filters');
		expect(top.views[0]).not.toHaveProperty('filters');
	});
});

describe('getViewOpensInEditor', () => {
	it('is true only for the boolean true', () => {
		expect(getViewOpensInEditor(entryV2('/v/test.view', { frontmatter: { _open_in_editor: true } }))).toBe(true);
	});

	it('is false for false, the string "true" and other values', () => {
		for (const value of [false, 'true', 1, 'yes', null]) {
			expect(getViewOpensInEditor(entryV2('/v/test.view', { frontmatter: { _open_in_editor: value } }))).toBe(false);
		}
	});

	it('is false without the key or the entry', () => {
		expect(getViewOpensInEditor(entryV2('/v/test.view', {}))).toBe(false);
		expect(getViewOpensInEditor(undefined)).toBe(false);
	});
});

describe('getViewGroup', () => {
	it('gives the trimmed _group text', () => {
		expect(getViewGroup(entryV2('/v/test.view', { frontmatter: { _group: 'Work' } }))).toBe('Work');
		expect(getViewGroup(entryV2('/v/test.view', { frontmatter: { _group: '  Work  ' } }))).toBe('Work');
	});

	it('keeps the case of the name', () => {
		expect(getViewGroup(entryV2('/v/test.view', { frontmatter: { _group: 'work' } }))).toBe('work');
	});

	it('is null for a missing, blank or non-text _group, and without the entry', () => {
		for (const value of ['', '   ', 3, true, null, ['Work']]) {
			expect(getViewGroup(entryV2('/v/test.view', { frontmatter: { _group: value } }))).toBeNull();
		}
		expect(getViewGroup(entryV2('/v/test.view', {}))).toBeNull();
		expect(getViewGroup(undefined)).toBeNull();
	});
});

describe('getViewVisible', () => {
	it('is false only for the boolean false', () => {
		expect(getViewVisible(entryV2('/v/test.view', { frontmatter: { _visible: false } }))).toBe(false);
	});

	it('is true for true, the string "false" and other values', () => {
		for (const value of [true, 'false', 0, 'no', null]) {
			expect(getViewVisible(entryV2('/v/test.view', { frontmatter: { _visible: value } }))).toBe(true);
		}
	});

	it('is true without the key or the entry', () => {
		expect(getViewVisible(entryV2('/v/test.view', {}))).toBe(true);
		expect(getViewVisible(undefined)).toBe(true);
	});
});

describe('ignoredKeyNotes', () => {
	it('reports a non-number _order and a non-boolean _open_in_editor with the value it expected', () => {
		expect(ignoredKeyNotes({ _order: '1', _open_in_editor: 'true' })).toEqual([
			'Ignored key _order: expected a number, got "1"',
			'Ignored key _open_in_editor: expected true or false, got "true"',
		]);
	});

	it('reports a key present with no value, which is ignored as well', () => {
		expect(ignoredKeyNotes({ _order: null })).toEqual(['Ignored key _order: expected a number, got null']);
	});

	it('has no notes for values the readers use, absent keys, or keys outside the table', () => {
		expect(ignoredKeyNotes({ _order: 3, _open_in_editor: false, _sidebar_label: 7 })).toEqual([]);
		expect(ignoredKeyNotes({})).toEqual([]);
	});

	it('agrees with the readers on which values work', () => {
		for (const value of [1, '1', true, 'true', null]) {
			const entry = entryV2('/v/test.view', { frontmatter: { _order: value, _open_in_editor: value } });
			const notes = ignoredKeyNotes(entry.frontmatter);
			expect(notes.some((n) => n.includes('_order'))).toBe(getViewOrder(entry) === 50);
			expect(notes.some((n) => n.includes('_open_in_editor'))).toBe(typeof value !== 'boolean');
		}
	});

	it('reports a _sort that is not one of the view sorts, a string or not', () => {
		const expected = 'one of modified, created, modified-asc, created-asc, title';
		expect(ignoredKeyNotes({ _sort: 'rank' })).toEqual([`Ignored key _sort: expected ${expected}, got "rank"`]);
		expect(ignoredKeyNotes({ _sort: 3 })).toEqual([`Ignored key _sort: expected ${expected}, got 3`]);
		for (const sort of VIEW_SORTS) expect(ignoredKeyNotes({ _sort: sort })).toEqual([]);
	});

	it('agrees with getViewSort on which _sort values work', () => {
		for (const value of ['title', 'created-asc', 'Title', 'rank', 1, null]) {
			const entry = entryV2('/v/test.view', { frontmatter: { _sort: value } });
			const noted = ignoredKeyNotes(entry.frontmatter).some((n) => n.includes('_sort'));
			expect(noted).toBe(getViewSort(entry) !== value);
		}
	});

	it('reports a non-boolean _visible and a non-text _group', () => {
		expect(ignoredKeyNotes({ _visible: 'false', _group: 3 })).toEqual([
			'Ignored key _visible: expected true or false, got "false"',
			'Ignored key _group: expected text, got 3',
		]);
		expect(ignoredKeyNotes({ _visible: false, _group: 'Work' })).toEqual([]);
	});

	it('reports a _rail that is not a boolean', () => {
		for (const value of ['true', 1, null]) {
			expect(ignoredKeyNotes({ _rail: value })).toEqual([`Ignored key _rail: expected true or false, got ${JSON.stringify(value)}`]);
		}
		expect(ignoredKeyNotes({ _rail: true })).toEqual([]);
		expect(ignoredKeyNotes({ _rail: false })).toEqual([]);
	});

	it('agrees with getViewVisible and getViewGroup on which values work', () => {
		for (const value of [false, true, 'false', 3, null]) {
			const entry = entryV2('/v/test.view', { frontmatter: { _visible: value } });
			const noted = ignoredKeyNotes(entry.frontmatter).some((n) => n.includes('_visible'));
			expect(noted).toBe(typeof value !== 'boolean');
		}
		for (const value of ['Work', 3, true, null]) {
			const entry = entryV2('/v/test.view', { frontmatter: { _group: value } });
			const noted = ignoredKeyNotes(entry.frontmatter).some((n) => n.includes('_group'));
			expect(noted).toBe(getViewGroup(entry) === null);
		}
	});

	describe('_rail_view', () => {
		const views = [{ type: 'table', name: 'Table' }, { type: 'table', name: 'Board' }];

		it('has no note for a name one of the views carries', () => {
			expect(ignoredKeyNotes({ _rail_view: 'Board', views })).toEqual([]);
			expect(ignoredKeyNotes({ _rail_view: 'Table', views })).toEqual([]);
		});

		it('says a name no view carries runs the first view, from the parsed definition', () => {
			const parsed = views as CollectionViewDef[];
			expect(railViewNameNote({ views: parsed, railView: 'Bord' })).toBe('Ignored key _rail_view: "Bord" names no view; the first view runs');
			expect(railViewNameNote({ views: parsed, railView: 'board' })).toBe('Ignored key _rail_view: "board" names no view; the first view runs');
			expect(railViewNameNote({ views: parsed, railView: 'Board' })).toBeNull();
			expect(railViewNameNote({ views: parsed })).toBeNull();
		});

		it('tests only the kind of the value in the entry, where Rust projects each view to null', () => {
			const rustViews = [null, null];
			expect(ignoredKeyNotes({ _rail_view: 'Board', views: rustViews })).toEqual([]);
			expect(ignoredKeyNotes({ _rail_view: 'Bord', views: rustViews })).toEqual([]);
			expect(ignoredKeyNotes({ _rail_view: 3, views: rustViews })).toEqual(['Ignored key _rail_view: expected the name of one of its views, got 3']);
			expect(ignoredKeyNotes({ _rail_view: '  ', views: rustViews })).toEqual(['Ignored key _rail_view: "  " names no view; the first view runs']);
		});

		it('has no note for a record without views, such as a type definition', () => {
			expect(ignoredKeyNotes({ _rail_view: 'Board' })).toEqual([]);
			expect(ignoredKeyNotes({ _rail_view: 3, views: 'Board' })).toEqual([]);
		});

		it('reports a value that is not text with the value it expected', () => {
			for (const value of [2, true, null, ['Board']]) {
				expect(ignoredKeyNotes({ _rail_view: value, views })).toEqual([
					`Ignored key _rail_view: expected the name of one of its views, got ${JSON.stringify(value)}`,
				]);
			}
		});

		it('agrees with railViewIndex on which values pick a view', () => {
			for (const value of ['Board', 'Table', 'Bord', '', ' Board', 2, null]) {
				const yaml = stringifyYaml({ _rail_view: value, views });
				const parsed = parseCollectionYaml(yaml);
				if (!parsed.success) throw new Error(parsed.error);
				const picks = parsed.definition.railView !== undefined && parsed.definition.views[railViewIndex(parsed.definition)].name === parsed.definition.railView;
				const noted = ignoredKeyNotes(parseYaml(yaml)).some((n) => n.includes('_rail_view')) || railViewNameNote(parsed.definition) !== null;
				expect(noted).toBe(!picks);
			}
		});
	});

	it('reads its keys from the reserved-key table', () => {
		expect(RESERVED_KEY_RULES.map((r) => r.key)).toEqual(['_order', '_open_in_editor', '_sort', '_visible', '_group', '_rail', '_rail_view']);
	});
});

describe('getViewOrder', () => {
	it('returns _order from frontmatter', () => {
		const entry = entryV2('/v/test.view', { frontmatter: { _order: 5 } });
		expect(getViewOrder(entry)).toBe(5);
	});

	it('defaults to 50', () => {
		expect(getViewOrder(undefined)).toBe(50);
		expect(getViewOrder(entryV2('/v/test.view', {}))).toBe(50);
	});
});

describe('getViewSort', () => {
	it('returns _sort from frontmatter', () => {
		const entry = entryV2('/v/test.view', { frontmatter: { _sort: 'title' } });
		expect(getViewSort(entry)).toBe('title');
	});

	it('defaults to modified', () => {
		expect(getViewSort(undefined)).toBe('modified');
	});

	it('ignores a _sort that is not one of the view sorts: the default applies, not title', () => {
		expect(getViewSort(entryV2('/v/test.view', { frontmatter: { _sort: 'rank' } }))).toBe('modified');
		expect(getViewSort(entryV2('/v/test.view', { frontmatter: { _sort: 7 } }))).toBe('modified');
	});
});

describe('effectiveViewSortLabel', () => {
	it('names the _sort that orders the list', () => {
		expect(effectiveViewSortLabel(entryV2('/v/test.view', { frontmatter: { _sort: 'title' } }))).toBe('Sorted by _sort: title');
	});

	it('names the default without a _sort, or with one that is ignored', () => {
		const label = 'Sorted by the default: modified, newest first';
		expect(effectiveViewSortLabel(undefined)).toBe(label);
		expect(effectiveViewSortLabel(entryV2('/v/test.view'))).toBe(label);
		expect(effectiveViewSortLabel(entryV2('/v/test.view', { frontmatter: { _sort: 'rank' } }))).toBe(label);
	});
});

describe('getViewListProperties', () => {
	it('returns string array from frontmatter', () => {
		const entry = entryV2('/v/test.view', { frontmatter: { _list_properties_display: ['status', 'due'] } });
		expect(getViewListProperties(entry)).toEqual(['status', 'due']);
	});

	it('filters non-string items', () => {
		const entry = entryV2('/v/test.view', { frontmatter: { _list_properties_display: ['ok', 42, null] } });
		expect(getViewListProperties(entry)).toEqual(['ok']);
	});

	it('returns empty for undefined', () => {
		expect(getViewListProperties(undefined)).toEqual([]);
	});
});

describe('sortViewFiles', () => {
	function byPath(...entries: NoteEntryV2[]): Map<string, NoteEntryV2> {
		return new Map(entries.map((e) => [e.path, e]));
	}

	it('sorts by _order, then by label', () => {
		const views = [
			{ path: '/v/b.view', name: 'b' },
			{ path: '/v/a.view', name: 'a' },
			{ path: '/v/c.view', name: 'c' },
		];
		const entries = byPath(
			entryV2('/v/b.view', { frontmatter: { _order: 10 } }),
			entryV2('/v/a.view', { frontmatter: { _order: 5 } }),
			entryV2('/v/c.view', { frontmatter: { _order: 10 } }),
		);
		const result = sortViewFiles(views, entries);
		expect(result.map((v) => v.name)).toEqual(['a', 'b', 'c']);
	});

	it('defaults to order 50 when missing', () => {
		const views = [
			{ path: '/v/high.view', name: 'high' },
			{ path: '/v/low.view', name: 'low' },
		];
		const entries = byPath(entryV2('/v/low.view', { frontmatter: { _order: 1 } }));
		const result = sortViewFiles(views, entries);
		expect(result.map((v) => v.name)).toEqual(['low', 'high']);
	});

	it('falls back to label order (the filename) for an empty map', () => {
		const views = [
			{ path: '/v/c.view', name: 'c' },
			{ path: '/v/a.view', name: 'a' },
			{ path: '/v/b.view', name: 'b' },
		];
		const result = sortViewFiles(views, new Map());
		expect(result.map((v) => v.name)).toEqual(['a', 'b', 'c']);
	});

	it('orders equal _order values by label', () => {
		const views = [
			{ path: '/v/c.view', name: 'c' },
			{ path: '/v/b.view', name: 'b' },
			{ path: '/v/a.view', name: 'a' },
		];
		const entries = byPath(
			entryV2('/v/a.view', { frontmatter: { _order: 7 } }),
			entryV2('/v/b.view', { frontmatter: { _order: 7 } }),
			entryV2('/v/c.view', { frontmatter: { _order: 7 } }),
		);
		const result = sortViewFiles(views, entries);
		expect(result.map((v) => v.name)).toEqual(['a', 'b', 'c']);
	});

	it('orders by the shown label, not the filename', () => {
		const views = [
			{ path: '/v/a.view', name: 'a' },
			{ path: '/v/b.view', name: 'b' },
		];
		const entries = byPath(entryV2('/v/a.view', { frontmatter: { _sidebar_label: 'Zulu' } }));
		expect(sortViewFiles(views, entries).map((v) => v.name)).toEqual(['b', 'a']);
	});

	it('compares labels naturally: "Week 2" before "Week 10"', () => {
		const views = [
			{ path: '/v/w10.view', name: 'w10' },
			{ path: '/v/w2.view', name: 'w2' },
		];
		const entries = byPath(
			entryV2('/v/w10.view', { frontmatter: { _sidebar_label: 'Week 10' } }),
			entryV2('/v/w2.view', { frontmatter: { _sidebar_label: 'Week 2' } }),
		);
		expect(sortViewFiles(views, entries).map((v) => v.name)).toEqual(['w2', 'w10']);
	});

	it('orders views with the same _order and label by path', () => {
		const views = [
			{ path: '/v/z/Reading.view', name: 'Reading' },
			{ path: '/v/a/Reading.view', name: 'Reading' },
		];
		expect(sortViewFiles(views, new Map()).map((v) => v.path)).toEqual(['/v/a/Reading.view', '/v/z/Reading.view']);
	});

	it('does not mutate the input array', () => {
		const views = [
			{ path: '/v/b.view', name: 'b' },
			{ path: '/v/a.view', name: 'a' },
		];
		sortViewFiles(views, new Map());
		expect(views.map((v) => v.name)).toEqual(['b', 'a']);
	});
});

describe('isListableNote', () => {
	it('is false for a .view entry, in any casing', () => {
		expect(isListableNote(entryV2('/vault/Projects.view'))).toBe(false);
		expect(isListableNote(entryV2('/vault/Shouty.VIEW'))).toBe(false);
	});

	it('is false for a type definition', () => {
		expect(isListableNote(entryV2('/vault/types/Project.md', { isA: 'Type' }))).toBe(false);
	});

	it('is true for a plain or a typed note', () => {
		expect(isListableNote(entryV2('/vault/notes/a.md'))).toBe(true);
		expect(isListableNote(entryV2('/vault/notes/b.md', { isA: 'Project' }))).toBe(true);
	});

	it('is true for a note whose name only contains "view"', () => {
		expect(isListableNote(entryV2('/vault/review.md'))).toBe(true);
		expect(isListableNote(entryV2('/vault/my.view.md'))).toBe(true);
	});
});

describe('excludeSystemFolder', () => {
	it('removes entries inside the system folder', () => {
		const entries = [
			entryV2('/vault/notes/a.md', { title: 'A', isA: 'Task' }),
			entryV2('/vault/_system/templates/types/Task.md', { title: 'Task', isA: 'Task' }),
			entryV2('/vault/_system/queryjs/x.md', { title: 'X', isA: 'Task' }),
		];
		const result = excludeSystemFolder(entries, '/vault', '_system');
		expect(result.length).toBe(1);
		expect(result[0].path).toBe('/vault/notes/a.md');
	});

	it('returns the input when systemFolder is empty or whitespace-only', () => {
		const entries = [
			entryV2('/vault/notes/a.md'),
			entryV2('/vault/_system/x.md'),
		];
		// Exclusion is disabled, so the input array is handed back untouched.
		expect(excludeSystemFolder(entries, '/vault', '')).toBe(entries);
		expect(excludeSystemFolder(entries, '/vault', '   ')).toBe(entries);
	});

	it('returns the input when vaultPath is null or empty', () => {
		const entries = [
			entryV2('/vault/notes/a.md'),
			entryV2('/vault/_system/x.md'),
		];
		expect(excludeSystemFolder(entries, null, '_system')).toBe(entries);
		expect(excludeSystemFolder(entries, '', '_system')).toBe(entries);
	});

	it('tolerates a trailing slash on vaultPath and leading/trailing slashes on folder', () => {
		const entries = [
			entryV2('/vault/notes/a.md'),
			entryV2('/vault/_system/x.md'),
		];
		expect(excludeSystemFolder(entries, '/vault/', '/_system/').map((e) => e.path)).toEqual(['/vault/notes/a.md']);
		expect(excludeSystemFolder(entries, '/vault/', '_system').map((e) => e.path)).toEqual(['/vault/notes/a.md']);
	});

	it('supports nested folder paths', () => {
		const entries = [
			entryV2('/v/foo/bar/x.md'),
			entryV2('/v/foo/baz/x.md'),
		];
		expect(excludeSystemFolder(entries, '/v', 'foo/bar').map((e) => e.path)).toEqual(['/v/foo/baz/x.md']);
	});

	it('returns empty when all entries are inside the system folder', () => {
		const entries = [
			entryV2('/vault/_system/a.md'),
			entryV2('/vault/_system/b.md'),
		];
		const result = excludeSystemFolder(entries, '/vault', '_system');
		expect(result.length).toBe(0);
	});

	it('keeps entries whose name only prefix-matches the folder', () => {
		// `_system.md` and `_system-archive/` must not be treated as inside `_system/`.
		const entries = [
			entryV2('/vault/_system.md'),
			entryV2('/vault/_system-archive/x.md'),
			entryV2('/vault/_system/x.md'),
		];
		const result = excludeSystemFolder(entries, '/vault', '_system');
		expect(result.map((e) => e.path)).toEqual(['/vault/_system.md', '/vault/_system-archive/x.md']);
	});

	it('removes notes that would otherwise be listed for their type', () => {
		const entries = [
			entryV2('/vault/notes/a.md', { isA: 'Task', organized: false, archived: false }),
			entryV2('/vault/_system/templates/types/Task.md', { isA: 'Task', organized: false, archived: false }),
		];
		const filtered = excludeSystemFolder(entries, '/vault', '_system');
		const list = getNotesForSelection(filtered, { kind: 'type', name: 'Task' });
		expect(list.length).toBe(1);
		expect(list[0].path).toBe('/vault/notes/a.md');
	});
});

