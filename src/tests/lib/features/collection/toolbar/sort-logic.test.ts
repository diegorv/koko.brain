import { describe, it, expect } from 'vitest';
import {
	removeSort,
	toggleSortDirection,
	reorderSorts,
	getSortDirectionLabel,
} from '$lib/features/collection/toolbar/sort.logic';
import type { SortDef } from '$lib/features/collection/collection.types';

describe('removeSort', () => {
	it('removes a sort by column name', () => {
		const sorts: SortDef[] = [
			{ column: 'priority', direction: 'ASC' },
			{ column: 'status', direction: 'DESC' },
		];
		const result = removeSort(sorts, 'priority');
		expect(result).toEqual([{ column: 'status', direction: 'DESC' }]);
	});

	it('returns empty array when removing the only sort', () => {
		const sorts: SortDef[] = [{ column: 'status', direction: 'ASC' }];
		const result = removeSort(sorts, 'status');
		expect(result).toEqual([]);
	});

	it('returns unchanged array when column not found', () => {
		const sorts: SortDef[] = [{ column: 'status', direction: 'ASC' }];
		const result = removeSort(sorts, 'nonexistent');
		expect(result).toEqual(sorts);
	});
});

describe('toggleSortDirection', () => {
	it('toggles ASC to DESC', () => {
		const sorts: SortDef[] = [{ column: 'status', direction: 'ASC' }];
		const result = toggleSortDirection(sorts, 'status');
		expect(result[0].direction).toBe('DESC');
	});

	it('toggles DESC to ASC', () => {
		const sorts: SortDef[] = [{ column: 'status', direction: 'DESC' }];
		const result = toggleSortDirection(sorts, 'status');
		expect(result[0].direction).toBe('ASC');
	});

	it('only toggles the matching column', () => {
		const sorts: SortDef[] = [
			{ column: 'priority', direction: 'ASC' },
			{ column: 'status', direction: 'ASC' },
		];
		const result = toggleSortDirection(sorts, 'status');
		expect(result[0].direction).toBe('ASC');
		expect(result[1].direction).toBe('DESC');
	});

	it('returns unchanged when column not found', () => {
		const sorts: SortDef[] = [{ column: 'status', direction: 'ASC' }];
		const result = toggleSortDirection(sorts, 'nonexistent');
		expect(result).toEqual(sorts);
	});
});

describe('reorderSorts', () => {
	it('moves a sort from one position to another', () => {
		const sorts: SortDef[] = [
			{ column: 'a', direction: 'ASC' },
			{ column: 'b', direction: 'ASC' },
			{ column: 'c', direction: 'ASC' },
		];
		const result = reorderSorts(sorts, 0, 2);
		expect(result.map((s) => s.column)).toEqual(['b', 'c', 'a']);
	});

	it('moves from end to start', () => {
		const sorts: SortDef[] = [
			{ column: 'a', direction: 'ASC' },
			{ column: 'b', direction: 'ASC' },
			{ column: 'c', direction: 'ASC' },
		];
		const result = reorderSorts(sorts, 2, 0);
		expect(result.map((s) => s.column)).toEqual(['c', 'a', 'b']);
	});

	it('returns unchanged for same index', () => {
		const sorts: SortDef[] = [{ column: 'a', direction: 'ASC' }];
		const result = reorderSorts(sorts, 0, 0);
		expect(result).toEqual(sorts);
	});

	it('returns unchanged for out-of-bounds fromIndex', () => {
		const sorts: SortDef[] = [{ column: 'a', direction: 'ASC' }];
		const result = reorderSorts(sorts, -1, 0);
		expect(result).toEqual(sorts);
	});

	it('returns unchanged for out-of-bounds toIndex', () => {
		const sorts: SortDef[] = [{ column: 'a', direction: 'ASC' }];
		const result = reorderSorts(sorts, 0, 5);
		expect(result).toEqual(sorts);
	});
});

describe('getSortDirectionLabel', () => {
	it('returns A → Z for text ASC', () => {
		expect(getSortDirectionLabel('ASC', 'text')).toBe('A → Z');
	});

	it('returns Z → A for text DESC', () => {
		expect(getSortDirectionLabel('DESC', 'text')).toBe('Z → A');
	});

	it('returns Smallest → Largest for number ASC', () => {
		expect(getSortDirectionLabel('ASC', 'number')).toBe('Smallest → Largest');
	});

	it('returns Largest → Smallest for number DESC', () => {
		expect(getSortDirectionLabel('DESC', 'number')).toBe('Largest → Smallest');
	});

	it('returns Old → New for date ASC', () => {
		expect(getSortDirectionLabel('ASC', 'date')).toBe('Old → New');
	});

	it('returns New → Old for date DESC', () => {
		expect(getSortDirectionLabel('DESC', 'date')).toBe('New → Old');
	});

	it('returns False → True for boolean ASC', () => {
		expect(getSortDirectionLabel('ASC', 'boolean')).toBe('False → True');
	});

	it('returns A → Z for list ASC', () => {
		expect(getSortDirectionLabel('ASC', 'list')).toBe('A → Z');
	});
});
