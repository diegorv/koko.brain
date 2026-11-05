import { describe, it, expect } from 'vitest';
import {
	BUILT_IN_SORT_OPTIONS,
	defaultSortDirection,
	sortOptionLabel,
	formatListSort,
	parseListSort,
	propertySortOption,
} from '#lib/features/rail-shell/list-sort.logic.js';

describe('BUILT_IN_SORT_OPTIONS', () => {
	it('lists Modified, Created, Title, Status in that order', () => {
		expect(BUILT_IN_SORT_OPTIONS.map((o) => o.value)).toEqual([
			'modified',
			'created',
			'title',
			'status',
		]);
		expect(BUILT_IN_SORT_OPTIONS.map((o) => o.label)).toEqual([
			'Modified',
			'Created',
			'Title',
			'Status',
		]);
	});
});

describe('defaultSortDirection', () => {
	it('sorts times newest first and everything else ascending', () => {
		expect(defaultSortDirection('modified')).toBe('desc');
		expect(defaultSortDirection('created')).toBe('desc');
		expect(defaultSortDirection('title')).toBe('asc');
		expect(defaultSortDirection('status')).toBe('asc');
		expect(defaultSortDirection('property:budget')).toBe('asc');
	});
});

describe('sortOptionLabel', () => {
	it('returns the built-in label', () => {
		expect(sortOptionLabel('modified')).toBe('Modified');
		expect(sortOptionLabel('status')).toBe('Status');
	});

	it('returns the property key without its leading underscores', () => {
		expect(sortOptionLabel('property:budget')).toBe('budget');
		expect(sortOptionLabel('property:__due')).toBe('due');
		expect(sortOptionLabel('property:a:b')).toBe('a:b');
	});
});

describe('propertySortOption', () => {
	it('prefixes the key with property:', () => {
		expect(propertySortOption('budget')).toBe('property:budget');
		expect(propertySortOption('_due')).toBe('property:_due');
	});
});

describe('formatListSort', () => {
	it('joins option and direction with a colon', () => {
		expect(formatListSort({ option: 'modified', direction: 'desc' })).toBe('modified:desc');
		expect(formatListSort({ option: 'property:budget', direction: 'asc' })).toBe(
			'property:budget:asc',
		);
	});
});

describe('parseListSort', () => {
	it('round-trips every built-in option and direction', () => {
		for (const { value } of BUILT_IN_SORT_OPTIONS) {
			for (const direction of ['asc', 'desc'] as const) {
				const config = { option: value, direction };
				expect(parseListSort(formatListSort(config))).toEqual(config);
			}
		}
	});

	it('round-trips a property key that contains colons', () => {
		const config = { option: 'property:a:b' as const, direction: 'desc' as const };
		expect(parseListSort(formatListSort(config))).toEqual(config);
	});

	it('parses a property sort', () => {
		expect(parseListSort('property:budget:asc')).toEqual({
			option: 'property:budget',
			direction: 'asc',
		});
	});

	it('returns null for a non-string', () => {
		expect(parseListSort(undefined)).toBeNull();
		expect(parseListSort(null)).toBeNull();
		expect(parseListSort(42)).toBeNull();
		expect(parseListSort({ option: 'modified', direction: 'desc' })).toBeNull();
	});

	it('returns null for an unknown built-in option', () => {
		expect(parseListSort('size:desc')).toBeNull();
	});

	it('returns null for an empty property key', () => {
		expect(parseListSort('property::asc')).toBeNull();
	});

	it('returns null for an unknown direction', () => {
		expect(parseListSort('modified:up')).toBeNull();
		expect(parseListSort('property:budget:DESC')).toBeNull();
	});

	it('returns null for a string without a direction or an empty string', () => {
		expect(parseListSort('modified')).toBeNull();
		expect(parseListSort('')).toBeNull();
		expect(parseListSort('property:budget')).toBeNull();
	});
});
