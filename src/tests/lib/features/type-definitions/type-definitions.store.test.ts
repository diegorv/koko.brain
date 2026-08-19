import { describe, it, expect, beforeEach } from 'vitest';
import { typeDefinitionsStore } from '$lib/features/type-definitions/type-definitions.store.svelte';
import type { TypeMetadata } from '$lib/features/type-definitions/type-definitions.logic';

function makeMeta(overrides: Partial<TypeMetadata> & { name: string; order: number }): TypeMetadata {
	return {
		path: null,
		icon: 'file',
		color: 'blue',
		sidebarLabel: overrides.name + 's',
		template: null,
		folder: null,
		sort: 'title',
		view: 'list',
		visible: true,
		listPropertiesDisplay: [],
		archiveTo: null,
		...overrides,
	};
}

describe('typeDefinitionsStore', () => {
	beforeEach(() => {
		typeDefinitionsStore.reset();
	});

	it('starts with empty state', () => {
		expect(typeDefinitionsStore.typeMetadataMap.size).toBe(0);
		expect(typeDefinitionsStore.entries).toEqual([]);
		expect(typeDefinitionsStore.entriesVersion).toBe(0);
	});

	describe('setTypeMetadataMap', () => {
		it('replaces the metadata map', () => {
			const map = new Map([['Project', makeMeta({ name: 'Project', order: 1 })]]);
			typeDefinitionsStore.setTypeMetadataMap(map);

			expect(typeDefinitionsStore.typeMetadataMap).toBe(map);
			expect(typeDefinitionsStore.typeMetadataMap.size).toBe(1);
		});
	});

	describe('getTypeMetadata', () => {
		it('returns metadata for a known type', () => {
			const meta = makeMeta({ name: 'Project', order: 1, icon: 'rocket' });
			typeDefinitionsStore.setTypeMetadataMap(new Map([['Project', meta]]));

			expect(typeDefinitionsStore.getTypeMetadata('Project')).toBe(meta);
		});

		it('returns undefined for an unknown type', () => {
			expect(typeDefinitionsStore.getTypeMetadata('NonExistent')).toBeUndefined();
		});
	});

	describe('sortedTypes', () => {
		it('returns types sorted by order (ascending)', () => {
			const map = new Map([
				['Person', makeMeta({ name: 'Person', order: 3 })],
				['Project', makeMeta({ name: 'Project', order: 1 })],
				['Area', makeMeta({ name: 'Area', order: 2 })],
			]);
			typeDefinitionsStore.setTypeMetadataMap(map);

			const sorted = typeDefinitionsStore.sortedTypes;

			expect(sorted).toHaveLength(3);
			expect(sorted[0].name).toBe('Project');
			expect(sorted[1].name).toBe('Area');
			expect(sorted[2].name).toBe('Person');
		});

		it('returns empty array when map is empty', () => {
			expect(typeDefinitionsStore.sortedTypes).toEqual([]);
		});
	});

	describe('setEntries', () => {
		it('stores entries and increments version', () => {
			const entries = [{ path: '/a.md' }] as any;
			typeDefinitionsStore.setEntries(entries);

			expect(typeDefinitionsStore.entries).toBe(entries);
			expect(typeDefinitionsStore.entriesVersion).toBe(1);
		});

		it('increments version on each call', () => {
			typeDefinitionsStore.setEntries([]);
			typeDefinitionsStore.setEntries([]);
			typeDefinitionsStore.setEntries([]);

			expect(typeDefinitionsStore.entriesVersion).toBe(3);
		});
	});

	describe('getEntryByPath', () => {
		it('returns the entry for a known path', () => {
			typeDefinitionsStore.setEntries([
				{ path: '/vault/a.md', title: 'a', isA: null },
				{ path: '/vault/b.md', title: 'b', isA: 'Project' },
			] as any);

			expect(typeDefinitionsStore.getEntryByPath('/vault/b.md')?.title).toBe('b');
		});

		it('returns undefined for an unknown path', () => {
			typeDefinitionsStore.setEntries([{ path: '/vault/a.md', title: 'a', isA: null }] as any);

			expect(typeDefinitionsStore.getEntryByPath('/vault/missing.md')).toBeUndefined();
		});

		it('reflects the latest setEntries call (old paths drop out)', () => {
			typeDefinitionsStore.setEntries([{ path: '/vault/old.md', title: 'old', isA: null }] as any);
			typeDefinitionsStore.setEntries([{ path: '/vault/new.md', title: 'new', isA: null }] as any);

			expect(typeDefinitionsStore.getEntryByPath('/vault/old.md')).toBeUndefined();
			expect(typeDefinitionsStore.getEntryByPath('/vault/new.md')?.title).toBe('new');
		});
	});

	describe('entriesByPath', () => {
		it('exposes the O(1) index of the latest snapshot', () => {
			typeDefinitionsStore.setEntries([
				{ path: '/vault/a.md', title: 'a', isA: null },
				{ path: '/vault/b.md', title: 'b', isA: 'Project' },
			] as any);

			const index = typeDefinitionsStore.entriesByPath;

			expect(index.size).toBe(2);
			expect(index.get('/vault/b.md')?.title).toBe('b');
		});

		it('yields undefined for an unknown path', () => {
			typeDefinitionsStore.setEntries([{ path: '/vault/a.md', title: 'a', isA: null }] as any);

			expect(typeDefinitionsStore.entriesByPath.get('/vault/missing.md')).toBeUndefined();
		});

		it('is replaced (not merged) on each setEntries', () => {
			typeDefinitionsStore.setEntries([{ path: '/vault/old.md', title: 'old', isA: null }] as any);
			typeDefinitionsStore.setEntries([{ path: '/vault/new.md', title: 'new', isA: null }] as any);

			const index = typeDefinitionsStore.entriesByPath;

			expect(index.size).toBe(1);
			expect(index.has('/vault/old.md')).toBe(false);
			expect(index.get('/vault/new.md')?.title).toBe('new');
		});

		it('is empty after reset', () => {
			typeDefinitionsStore.setEntries([{ path: '/vault/a.md', title: 'a', isA: null }] as any);
			typeDefinitionsStore.reset();

			expect(typeDefinitionsStore.entriesByPath.size).toBe(0);
		});

		it('agrees with getEntryByPath', () => {
			typeDefinitionsStore.setEntries([
				{ path: '/vault/a.md', title: 'a', isA: null },
			] as any);

			expect(typeDefinitionsStore.entriesByPath.get('/vault/a.md')).toBe(
				typeDefinitionsStore.getEntryByPath('/vault/a.md')
			);
		});
	});

	describe('getTypeDefinitionPath', () => {
		it('returns the definition path for a Type entry keyed by title', () => {
			typeDefinitionsStore.setEntries([
				{ path: '/vault/note.md', title: 'note', isA: 'Newsletter' },
				{ path: '/vault/Newsletter.md', title: 'Newsletter', isA: 'Type' },
			] as any);

			expect(typeDefinitionsStore.getTypeDefinitionPath('Newsletter')).toBe('/vault/Newsletter.md');
		});

		it('returns undefined for a type without a definition entry', () => {
			typeDefinitionsStore.setEntries([
				{ path: '/vault/note.md', title: 'note', isA: 'Newsletter' },
			] as any);

			expect(typeDefinitionsStore.getTypeDefinitionPath('Newsletter')).toBeUndefined();
		});

		it('keeps the first definition when titles collide (matches scan order)', () => {
			typeDefinitionsStore.setEntries([
				{ path: '/vault/first/Project.md', title: 'Project', isA: 'Type' },
				{ path: '/vault/second/Project.md', title: 'Project', isA: 'Type' },
			] as any);

			expect(typeDefinitionsStore.getTypeDefinitionPath('Project')).toBe('/vault/first/Project.md');
		});
	});

	describe('selectedTypeOrNav', () => {
		it('starts null', () => {
			expect(typeDefinitionsStore.selectedTypeOrNav).toBeNull();
		});

		it('sets a type selection', () => {
			typeDefinitionsStore.setSelection({ kind: 'type', name: 'Project' });
			expect(typeDefinitionsStore.selectedTypeOrNav).toEqual({ kind: 'type', name: 'Project' });
		});

		it('sets a nav selection', () => {
			typeDefinitionsStore.setSelection({ kind: 'nav', id: 'inbox' });
			expect(typeDefinitionsStore.selectedTypeOrNav).toEqual({ kind: 'nav', id: 'inbox' });
		});

		it('sets an untyped selection', () => {
			typeDefinitionsStore.setSelection({ kind: 'untyped' });
			expect(typeDefinitionsStore.selectedTypeOrNav).toEqual({ kind: 'untyped' });
		});

		it('clears selection with null', () => {
			typeDefinitionsStore.setSelection({ kind: 'type', name: 'Project' });
			typeDefinitionsStore.setSelection(null);
			expect(typeDefinitionsStore.selectedTypeOrNav).toBeNull();
		});
	});

	describe('reset', () => {
		it('clears all state to defaults', () => {
			typeDefinitionsStore.setTypeMetadataMap(
				new Map([['X', makeMeta({ name: 'X', order: 1 })]])
			);
			typeDefinitionsStore.setEntries([
				{ path: '/vault/X.md', title: 'X', isA: 'Type' } as any,
			]);
			typeDefinitionsStore.setSelection({ kind: 'type', name: 'X' });

			typeDefinitionsStore.reset();

			expect(typeDefinitionsStore.typeMetadataMap.size).toBe(0);
			expect(typeDefinitionsStore.entries).toEqual([]);
			expect(typeDefinitionsStore.entriesVersion).toBe(0);
			expect(typeDefinitionsStore.sortedTypes).toEqual([]);
			expect(typeDefinitionsStore.selectedTypeOrNav).toBeNull();
			expect(typeDefinitionsStore.getEntryByPath('/vault/X.md')).toBeUndefined();
			expect(typeDefinitionsStore.getTypeDefinitionPath('X')).toBeUndefined();
		});
	});
});
