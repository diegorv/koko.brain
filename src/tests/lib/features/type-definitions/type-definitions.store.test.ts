import { describe, it, expect, beforeEach } from 'vitest';
import { typeDefinitionsStore } from '$lib/features/type-definitions/type-definitions.store.svelte';
import type { TypeMetadata } from '$lib/features/type-definitions/type-definitions.logic';

function makeMeta(overrides: Partial<TypeMetadata> & { name: string; order: number }): TypeMetadata {
	return {
		icon: 'file',
		color: 'blue',
		sidebarLabel: overrides.name + 's',
		template: null,
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
			typeDefinitionsStore.setEntries([{} as any]);
			typeDefinitionsStore.setSelection({ kind: 'type', name: 'X' });

			typeDefinitionsStore.reset();

			expect(typeDefinitionsStore.typeMetadataMap.size).toBe(0);
			expect(typeDefinitionsStore.entries).toEqual([]);
			expect(typeDefinitionsStore.entriesVersion).toBe(0);
			expect(typeDefinitionsStore.sortedTypes).toEqual([]);
			expect(typeDefinitionsStore.selectedTypeOrNav).toBeNull();
		});
	});
});
