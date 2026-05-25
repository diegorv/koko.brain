import { describe, it, expect } from 'vitest';
import { buildTypeSections, countInbox } from '$lib/features/type-definitions/type-sidebar.logic';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';
import type { TypeMetadata } from '$lib/features/type-definitions/type-definitions.logic';

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

	it('hides sections with visible: false', () => {
		const entries = [
			entryV2('/v/a.md', { title: 'A', isA: 'Hidden' }),
		];
		const map = new Map([['Hidden', meta('Hidden', { visible: false })]]);
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
