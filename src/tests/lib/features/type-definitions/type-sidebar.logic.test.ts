import { describe, it, expect } from 'vitest';
import { buildTypeSections, countInbox, countNavItems, getNotesForSelection, getNotesForViewPaths, shouldShowSubFilter, countSubFilters, countSubFiltersForPaths, formatNoteDate, formatRelativeTime, formatDatePair, formatPropertyValue, splitPropertyIntoPills, collectViewFiles, updateViewIconYaml, getViewLabel, getViewOrder, getViewSort, getViewListProperties, sortViewFiles, isInsideSystemFolder, excludeSystemFolder } from '$lib/features/type-definitions/type-sidebar.logic';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';
import type { TypeMetadata } from '$lib/features/type-definitions/type-definitions.logic';
import type { NoteEntryV2 } from '$lib/types/vault-v2.types';

function meta(name: string, overrides: Partial<TypeMetadata> = {}): TypeMetadata {
	return {
		name,
		path: null,
		icon: 'file-text',
		color: 'gray',
		order: 50,
		sidebarLabel: `${name}s`,
		template: null,
		sort: 'title',
		view: 'all',
		visible: true,
		listPropertiesDisplay: [],
		archiveTo: null,
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

	it('favorites filter shows only favorites', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A', isA: 'Project', favorite: true }),
			entryV2('/v/b.md', { title: 'B', isA: 'Project', favorite: false }),
		];
		const { sections } = buildTypeSections(entries, new Map(), 'favorites');
		expect(sections[0].notes.length).toBe(1);
	});

	it('sorts favorites by _favorite_index then title', () => {
		const entries = [
			entryV2('/v/c.md', { title: 'C', isA: 'Project', favorite: true, frontmatter: { _favorite_index: 3 } }),
			entryV2('/v/a.md', { title: 'A', isA: 'Project', favorite: true, frontmatter: { _favorite_index: 1 } }),
			entryV2('/v/b.md', { title: 'B', isA: 'Project', favorite: true, frontmatter: { _favorite_index: 2 } }),
			entryV2('/v/d.md', { title: 'D', isA: 'Project', favorite: true }),
			entryV2('/v/e.md', { title: 'E', isA: 'Project', favorite: true }),
		];
		const { sections } = buildTypeSections(entries, new Map(), 'favorites');
		expect(sections[0].notes.map((n) => n.title)).toEqual(['A', 'B', 'C', 'D', 'E']);
	});

	it('favorites ignores _order and uses _favorite_index', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A', isA: 'Project', favorite: true, frontmatter: { _order: 1, _favorite_index: 2 } }),
			entryV2('/v/b.md', { title: 'B', isA: 'Project', favorite: true, frontmatter: { _order: 2, _favorite_index: 1 } }),
		];
		const { sections } = buildTypeSections(entries, new Map(), 'favorites');
		expect(sections[0].notes.map((n) => n.title)).toEqual(['B', 'A']);
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

describe('countInbox', () => {
	it('counts non-organized non-archived non-Type entries', () => {
		const entries = [
			entryV2('/v/a.md', { organized: false, archived: false, isA: null }),
			entryV2('/v/b.md', { organized: true, archived: false, isA: null }),
			entryV2('/v/c.md', { organized: false, archived: true, isA: null }),
			entryV2('/v/d.md', { organized: false, archived: false, isA: 'Type' }),
		];
		expect(countInbox(entries)).toBe(1);
	});
});

describe('countNavItems', () => {
	it('counts all nav item categories', () => {
		const entries = [
			entryV2('/v/a.md', { organized: false, archived: false, isA: 'Project' }),
			entryV2('/v/b.md', { organized: true, archived: false, isA: 'Project' }),
			entryV2('/v/c.md', { organized: false, archived: true, isA: 'Project' }),
			entryV2('/v/d.md', { organized: true, archived: false, favorite: true, isA: 'Person' }),
		];
		const counts = countNavItems(entries);
		expect(counts.inbox).toBe(1);
		expect(counts.all).toBe(3);
		expect(counts.archive).toBe(1);
		expect(counts.favorites).toBe(1);
	});

	it('excludes Type entries from all counts', () => {
		const entries = [
			entryV2('/v/Project.md', { isA: 'Type', organized: false, archived: false }),
			entryV2('/v/a.md', { isA: 'Project', organized: true, archived: false }),
		];
		const counts = countNavItems(entries);
		expect(counts.all).toBe(1);
		expect(counts.inbox).toBe(0);
	});

	it('returns zeros for empty entries', () => {
		const counts = countNavItems([]);
		expect(counts).toEqual({ inbox: 0, all: 0, archive: 0, favorites: 0 });
	});

	it('does not count archived favorites', () => {
		const entries = [
			entryV2('/v/a.md', { favorite: true, archived: true, organized: true, isA: 'Project' }),
		];
		const counts = countNavItems(entries);
		expect(counts.favorites).toBe(0);
		expect(counts.archive).toBe(1);
	});
});

describe('getNotesForSelection', () => {
	it('returns notes matching selected type', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A', isA: 'Project' }),
			entryV2('/v/b.md', { title: 'B', isA: 'Person' }),
			entryV2('/v/c.md', { title: 'C', isA: 'Project' }),
		];
		const notes = getNotesForSelection(entries, { kind: 'type', name: 'Project' }, new Map());
		expect(notes.length).toBe(2);
		expect(notes.map((n) => n.title)).toEqual(['A', 'C']);
	});

	it('excludes archived notes for type selection', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A', isA: 'Project', archived: false }),
			entryV2('/v/b.md', { title: 'B', isA: 'Project', archived: true }),
		];
		const notes = getNotesForSelection(entries, { kind: 'type', name: 'Project' }, new Map());
		expect(notes.length).toBe(1);
		expect(notes[0].title).toBe('A');
	});

	it('uses type sort setting', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A', isA: 'Project', modifiedAt: 100 }),
			entryV2('/v/b.md', { title: 'B', isA: 'Project', modifiedAt: 300 }),
		];
		const map = new Map([['Project', meta('Project', { sort: 'modified' })]]);
		const notes = getNotesForSelection(entries, { kind: 'type', name: 'Project' }, map);
		expect(notes.map((n) => n.title)).toEqual(['B', 'A']);
	});

	it('returns untyped notes for untyped selection', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A', isA: null }),
			entryV2('/v/b.md', { title: 'B', isA: 'Project' }),
			entryV2('/v/c.md', { title: 'C', isA: null }),
		];
		const notes = getNotesForSelection(entries, { kind: 'untyped' }, new Map());
		expect(notes.length).toBe(2);
		expect(notes.map((n) => n.title)).toEqual(['A', 'C']);
	});

	it('returns empty when no notes match type', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A', isA: 'Person' }),
		];
		const notes = getNotesForSelection(entries, { kind: 'type', name: 'Project' }, new Map());
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
			const notes = getNotesForSelection(entries, { kind: 'nav', id: 'all' }, new Map());
			expect(notes.map((n) => n.title)).toEqual(['A', 'D']);
		});

		it('inbox returns unorganized non-archived entries', () => {
			const entries = [
				entryV2('/v/a.md', { title: 'A', organized: false, archived: false, isA: 'Project' }),
				entryV2('/v/b.md', { title: 'B', organized: true, archived: false, isA: 'Project' }),
				entryV2('/v/c.md', { title: 'C', organized: false, archived: true, isA: 'Project' }),
			];
			const notes = getNotesForSelection(entries, { kind: 'nav', id: 'inbox' }, new Map());
			expect(notes.length).toBe(1);
			expect(notes[0].title).toBe('A');
		});

		it('archive returns only archived entries', () => {
			const entries = [
				entryV2('/v/a.md', { title: 'A', archived: true, isA: 'Project' }),
				entryV2('/v/b.md', { title: 'B', archived: false, isA: 'Project' }),
			];
			const notes = getNotesForSelection(entries, { kind: 'nav', id: 'archive' }, new Map());
			expect(notes.length).toBe(1);
			expect(notes[0].title).toBe('A');
		});

		it('favorites returns favorited non-archived entries', () => {
			const entries = [
				entryV2('/v/a.md', { title: 'A', favorite: true, archived: false, isA: 'Project' }),
				entryV2('/v/b.md', { title: 'B', favorite: false, archived: false, isA: 'Project' }),
				entryV2('/v/c.md', { title: 'C', favorite: true, archived: true, isA: 'Project' }),
			];
			const notes = getNotesForSelection(entries, { kind: 'nav', id: 'favorites' }, new Map());
			expect(notes.length).toBe(1);
			expect(notes[0].title).toBe('A');
		});

		it('nav sorts by modified (newest first)', () => {
			const entries = [
				entryV2('/v/a.md', { title: 'A', isA: 'Project', modifiedAt: 100 }),
				entryV2('/v/b.md', { title: 'B', isA: 'Project', modifiedAt: 300 }),
				entryV2('/v/c.md', { title: 'C', isA: 'Project', modifiedAt: 200 }),
			];
			const notes = getNotesForSelection(entries, { kind: 'nav', id: 'all' }, new Map());
			expect(notes.map((n) => n.title)).toEqual(['B', 'C', 'A']);
		});
	});

	describe('sub-filter', () => {
		it('type selection with archived sub-filter shows only archived', () => {
			const entries = [
				entryV2('/v/a.md', { title: 'A', isA: 'Project', archived: false }),
				entryV2('/v/b.md', { title: 'B', isA: 'Project', archived: true }),
			];
			const notes = getNotesForSelection(entries, { kind: 'type', name: 'Project' }, new Map(), 'archived');
			expect(notes.length).toBe(1);
			expect(notes[0].title).toBe('B');
		});

		it('type selection with open sub-filter shows only non-archived', () => {
			const entries = [
				entryV2('/v/a.md', { title: 'A', isA: 'Project', archived: false }),
				entryV2('/v/b.md', { title: 'B', isA: 'Project', archived: true }),
			];
			const notes = getNotesForSelection(entries, { kind: 'type', name: 'Project' }, new Map(), 'open');
			expect(notes.length).toBe(1);
			expect(notes[0].title).toBe('A');
		});

		it('all nav with archived sub-filter shows archived notes', () => {
			const entries = [
				entryV2('/v/a.md', { title: 'A', isA: 'Project', archived: false }),
				entryV2('/v/b.md', { title: 'B', isA: 'Project', archived: true }),
			];
			const notes = getNotesForSelection(entries, { kind: 'nav', id: 'all' }, new Map(), 'archived');
			expect(notes.length).toBe(1);
			expect(notes[0].title).toBe('B');
		});

		it('type selection with favorites sub-filter shows only favorited non-archived', () => {
			const entries = [
				entryV2('/v/a.md', { title: 'A', isA: 'Project', favorite: true, archived: false }),
				entryV2('/v/b.md', { title: 'B', isA: 'Project', favorite: false, archived: false }),
				entryV2('/v/c.md', { title: 'C', isA: 'Project', favorite: true, archived: true }),
			];
			const notes = getNotesForSelection(entries, { kind: 'type', name: 'Project' }, new Map(), 'favorites');
			expect(notes.length).toBe(1);
			expect(notes[0].title).toBe('A');
		});
	});
});

describe('shouldShowSubFilter', () => {
	it('returns true for type selection', () => {
		expect(shouldShowSubFilter({ kind: 'type', name: 'Project' })).toBe(true);
	});

	it('returns true for untyped selection', () => {
		expect(shouldShowSubFilter({ kind: 'untyped' })).toBe(true);
	});

	it('returns true for all nav item', () => {
		expect(shouldShowSubFilter({ kind: 'nav', id: 'all' })).toBe(true);
	});

	it('returns false for inbox nav item', () => {
		expect(shouldShowSubFilter({ kind: 'nav', id: 'inbox' })).toBe(false);
	});

	it('returns false for archive nav item', () => {
		expect(shouldShowSubFilter({ kind: 'nav', id: 'archive' })).toBe(false);
	});

	it('returns false for favorites nav item', () => {
		expect(shouldShowSubFilter({ kind: 'nav', id: 'favorites' })).toBe(false);
	});

	it('returns true for view selection so the sub-filter row mirrors type listings', () => {
		expect(shouldShowSubFilter({ kind: 'view', path: '/v/projects.view' })).toBe(true);
	});
});

describe('countSubFilters', () => {
	it('counts open, archived, and favorites for type selection', () => {
		const entries = [
			entryV2('/v/a.md', { isA: 'Project', archived: false, favorite: true }),
			entryV2('/v/b.md', { isA: 'Project', archived: true }),
			entryV2('/v/c.md', { isA: 'Project', archived: false, favorite: false }),
			entryV2('/v/d.md', { isA: 'Person', archived: false }),
		];
		const counts = countSubFilters(entries, { kind: 'type', name: 'Project' });
		expect(counts.open).toBe(2);
		expect(counts.archived).toBe(1);
		expect(counts.favorites).toBe(1);
	});

	it('does not count archived favorites', () => {
		const entries = [
			entryV2('/v/a.md', { isA: 'Project', archived: true, favorite: true }),
		];
		const counts = countSubFilters(entries, { kind: 'type', name: 'Project' });
		expect(counts.favorites).toBe(0);
		expect(counts.archived).toBe(1);
	});

	it('counts for all nav item across types', () => {
		const entries = [
			entryV2('/v/a.md', { isA: 'Project', archived: false }),
			entryV2('/v/b.md', { isA: 'Person', archived: true }),
			entryV2('/v/c.md', { isA: 'Type', archived: false }),
		];
		const counts = countSubFilters(entries, { kind: 'nav', id: 'all' });
		expect(counts.open).toBe(1);
		expect(counts.archived).toBe(1);
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

describe('formatDatePair', () => {
	it('returns empty for both zero', () => {
		expect(formatDatePair(0, 0)).toBe('');
	});

	it('returns only modified when no created', () => {
		const result = formatDatePair(Math.floor(Date.now() / 1000), 0);
		expect(result).toBe('just now');
	});

	it('returns only created when no modified', () => {
		const epoch = Math.floor(new Date(2020, 5, 10).getTime() / 1000);
		expect(formatDatePair(0, epoch)).toBe('created Jun 10, 2020');
	});

	it('combines modified and created', () => {
		const now = Math.floor(Date.now() / 1000);
		const created = Math.floor(new Date(2020, 5, 10).getTime() / 1000);
		const result = formatDatePair(now, created);
		expect(result).toContain('just now');
		expect(result).toContain('created Jun 10, 2020');
		expect(result).toContain('·');
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

	it('omits archived notes by default (open sub-filter)', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A', archived: false }),
			entryV2('/v/b.md', { title: 'B', archived: true }),
		];
		const matching = new Set(['/v/a.md', '/v/b.md']);
		const result = getNotesForViewPaths(entries, matching, 'title', 'open');
		expect(result.map((n) => n.title)).toEqual(['A']);
	});

	it('returns only archived notes for the archived sub-filter', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A', archived: false }),
			entryV2('/v/b.md', { title: 'B', archived: true }),
		];
		const matching = new Set(['/v/a.md', '/v/b.md']);
		const result = getNotesForViewPaths(entries, matching, 'title', 'archived');
		expect(result.map((n) => n.title)).toEqual(['B']);
	});

	it('returns only non-archived favorites for the favorites sub-filter', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A', favorite: true, archived: false }),
			entryV2('/v/b.md', { title: 'B', favorite: true, archived: true }),
			entryV2('/v/c.md', { title: 'C', favorite: false }),
		];
		const matching = new Set(['/v/a.md', '/v/b.md', '/v/c.md']);
		const result = getNotesForViewPaths(entries, matching, 'title', 'favorites');
		expect(result.map((n) => n.title)).toEqual(['A']);
	});
});

describe('countSubFiltersForPaths', () => {
	it('counts open, archived, and favorites limited to the matching set', () => {
		const entries = [
			entryV2('/v/a.md', { archived: false, favorite: true }),
			entryV2('/v/b.md', { archived: true }),
			entryV2('/v/c.md', { archived: false, favorite: false }),
			entryV2('/v/outside.md', { archived: false, favorite: true }),
		];
		const matching = new Set(['/v/a.md', '/v/b.md', '/v/c.md']);
		const counts = countSubFiltersForPaths(entries, matching);
		expect(counts).toEqual({ open: 2, archived: 1, favorites: 1 });
	});

	it('does not count archived favorites', () => {
		const entries = [entryV2('/v/a.md', { archived: true, favorite: true })];
		const matching = new Set(['/v/a.md']);
		const counts = countSubFiltersForPaths(entries, matching);
		expect(counts.favorites).toBe(0);
		expect(counts.archived).toBe(1);
	});

	it('returns zero counts when no entry matches', () => {
		const entries = [entryV2('/v/a.md', { archived: false })];
		const counts = countSubFiltersForPaths(entries, new Set(['/v/missing.md']));
		expect(counts).toEqual({ open: 0, archived: 0, favorites: 0 });
	});
});

describe('updateViewIconYaml', () => {
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
	it('sorts by _order then alphabetically', () => {
		const views = [
			{ path: '/v/b.view', name: 'b' },
			{ path: '/v/a.view', name: 'a' },
			{ path: '/v/c.view', name: 'c' },
		];
		const entries = [
			entryV2('/v/b.view', { frontmatter: { _order: 10 } }),
			entryV2('/v/a.view', { frontmatter: { _order: 5 } }),
			entryV2('/v/c.view', { frontmatter: { _order: 10 } }),
		];
		const result = sortViewFiles(views, entries);
		expect(result.map((v) => v.name)).toEqual(['a', 'b', 'c']);
	});

	it('defaults to order 50 when missing', () => {
		const views = [
			{ path: '/v/high.view', name: 'high' },
			{ path: '/v/low.view', name: 'low' },
		];
		const entries = [
			entryV2('/v/low.view', { frontmatter: { _order: 1 } }),
		];
		const result = sortViewFiles(views, entries);
		expect(result.map((v) => v.name)).toEqual(['low', 'high']);
	});
});

describe('isInsideSystemFolder', () => {
	it('returns true for paths inside the configured folder', () => {
		expect(isInsideSystemFolder('/vault/_system/templates/x.md', '/vault', '_system')).toBe(true);
		expect(isInsideSystemFolder('/vault/_system/types/Task.md', '/vault', '_system')).toBe(true);
	});

	it('returns false for paths outside the configured folder', () => {
		expect(isInsideSystemFolder('/vault/notes/a.md', '/vault', '_system')).toBe(false);
		expect(isInsideSystemFolder('/vault/_system.md', '/vault', '_system')).toBe(false);
	});

	it('returns false when systemFolder is empty', () => {
		expect(isInsideSystemFolder('/vault/_system/x.md', '/vault', '')).toBe(false);
		expect(isInsideSystemFolder('/vault/_system/x.md', '/vault', '   ')).toBe(false);
	});

	it('returns false when vaultPath is null or empty', () => {
		expect(isInsideSystemFolder('/vault/_system/x.md', null, '_system')).toBe(false);
		expect(isInsideSystemFolder('/vault/_system/x.md', '', '_system')).toBe(false);
	});

	it('tolerates trailing slash on vaultPath and leading/trailing slashes on folder', () => {
		expect(isInsideSystemFolder('/vault/_system/x.md', '/vault/', '/_system/')).toBe(true);
		expect(isInsideSystemFolder('/vault/_system/x.md', '/vault/', '_system')).toBe(true);
	});

	it('supports nested folder paths', () => {
		expect(isInsideSystemFolder('/v/foo/bar/x.md', '/v', 'foo/bar')).toBe(true);
		expect(isInsideSystemFolder('/v/foo/baz/x.md', '/v', 'foo/bar')).toBe(false);
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

	it('returns the input when systemFolder is empty', () => {
		const entries = [
			entryV2('/vault/notes/a.md'),
			entryV2('/vault/_system/x.md'),
		];
		const result = excludeSystemFolder(entries, '/vault', '');
		expect(result.length).toBe(2);
	});

	it('returns the input when vaultPath is null', () => {
		const entries = [
			entryV2('/vault/notes/a.md'),
			entryV2('/vault/_system/x.md'),
		];
		const result = excludeSystemFolder(entries, null, '_system');
		expect(result.length).toBe(2);
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

	it('removes notes that would otherwise count in nav/inbox helpers', () => {
		const entries = [
			entryV2('/vault/notes/a.md', { isA: 'Task', organized: false, archived: false }),
			entryV2('/vault/_system/templates/types/Task.md', { isA: 'Task', organized: false, archived: false }),
		];
		const filtered = excludeSystemFolder(entries, '/vault', '_system');
		// countInbox/countNavItems are pure — they don't know about systemFolder, the upstream filter must.
		expect(countInbox(filtered)).toBe(1);
		expect(countNavItems(filtered).inbox).toBe(1);
		const list = getNotesForSelection(filtered, { kind: 'type', name: 'Task' }, new Map(), 'open');
		expect(list.length).toBe(1);
		expect(list[0].path).toBe('/vault/notes/a.md');
	});
});

