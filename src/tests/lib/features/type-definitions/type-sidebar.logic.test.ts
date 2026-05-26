import { describe, it, expect } from 'vitest';
import { buildTypeSections, countInbox, countNavItems, getNotesForSelection } from '$lib/features/type-definitions/type-sidebar.logic';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';
import type { TypeMetadata } from '$lib/features/type-definitions/type-definitions.logic';
import type { NoteEntryV2 } from '$lib/types/vault-v2.types';

function meta(name: string, overrides: Partial<TypeMetadata> = {}): TypeMetadata {
	return {
		name,
		icon: 'file-text',
		color: 'gray',
		order: 50,
		sidebarLabel: `${name}s`,
		template: null,
		sort: 'title',
		view: 'all',
		visible: true,
		listPropertiesDisplay: [],
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
			['Sprint', meta('Sprint', { order: 1, sidebarLabel: 'Sprints' })],
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
});
