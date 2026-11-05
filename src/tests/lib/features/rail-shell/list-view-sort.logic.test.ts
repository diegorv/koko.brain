import { describe, it, expect } from 'vitest';
import type { SortDef } from '#lib/features/collection/collection.types.js';
import type { ListSortConfig } from '#lib/features/rail-shell/list-toolbar.types.js';
import {
	listSortToSortDef,
	sortDefToListSort,
	viewListSort,
} from '#lib/features/rail-shell/list-view-sort.logic.js';

describe('sortDefToListSort', () => {
	it('maps file.mtime to modified and file.ctime to created', () => {
		expect(sortDefToListSort({ column: 'file.mtime', direction: 'DESC' })).toEqual({ option: 'modified', direction: 'desc' });
		expect(sortDefToListSort({ column: 'file.ctime', direction: 'ASC' })).toEqual({ option: 'created', direction: 'asc' });
	});

	it('maps file.name and file.basename to title', () => {
		expect(sortDefToListSort({ column: 'file.name', direction: 'ASC' })).toEqual({ option: 'title', direction: 'asc' });
		expect(sortDefToListSort({ column: 'file.basename', direction: 'DESC' })).toEqual({ option: 'title', direction: 'desc' });
	});

	it('maps the status column to status', () => {
		expect(sortDefToListSort({ column: 'status', direction: 'ASC' })).toEqual({ option: 'status', direction: 'asc' });
	});

	it('maps any other column to a property option keyed by the column', () => {
		expect(sortDefToListSort({ column: 'budget', direction: 'DESC' })).toEqual({ option: 'property:budget', direction: 'desc' });
	});

	it('keeps colons in a property key', () => {
		expect(sortDefToListSort({ column: 'a:b', direction: 'ASC' })).toEqual({ option: 'property:a:b', direction: 'asc' });
	});

	it('maps a formula column to a property option rather than dropping it', () => {
		expect(sortDefToListSort({ column: 'formula.score', direction: 'ASC' })).toEqual({
			option: 'property:formula.score',
			direction: 'asc',
		});
	});
});

describe('listSortToSortDef', () => {
	it('maps each built-in option to its column', () => {
		expect(listSortToSortDef({ option: 'modified', direction: 'desc' })).toEqual({ column: 'file.mtime', direction: 'DESC' });
		expect(listSortToSortDef({ option: 'created', direction: 'asc' })).toEqual({ column: 'file.ctime', direction: 'ASC' });
		expect(listSortToSortDef({ option: 'title', direction: 'asc' })).toEqual({ column: 'file.name', direction: 'ASC' });
		expect(listSortToSortDef({ option: 'status', direction: 'desc' })).toEqual({ column: 'status', direction: 'DESC' });
	});

	it('maps a property option to its key', () => {
		expect(listSortToSortDef({ option: 'property:budget', direction: 'asc' })).toEqual({ column: 'budget', direction: 'ASC' });
	});

	it('round trips through sortDefToListSort for every option', () => {
		const configs: ListSortConfig[] = [
			{ option: 'modified', direction: 'desc' },
			{ option: 'created', direction: 'asc' },
			{ option: 'title', direction: 'asc' },
			{ option: 'status', direction: 'desc' },
			{ option: 'property:a:b', direction: 'asc' },
		];
		for (const config of configs) {
			expect(sortDefToListSort(listSortToSortDef(config))).toEqual(config);
		}
	});
});

describe('viewListSort', () => {
	it('uses the first sort def when the view has sorts', () => {
		const sorts: SortDef[] = [
			{ column: 'budget', direction: 'DESC' },
			{ column: 'file.name', direction: 'ASC' },
		];
		expect(viewListSort(sorts, 'title')).toEqual({ option: 'property:budget', direction: 'desc' });
	});

	it('ignores _sort when the view has a sort def', () => {
		expect(viewListSort([{ column: 'file.ctime', direction: 'ASC' }], 'modified')).toEqual({
			option: 'created',
			direction: 'asc',
		});
	});

	it('falls back to _sort when there are no sort defs', () => {
		expect(viewListSort([], 'modified')).toEqual({ option: 'modified', direction: 'desc' });
		expect(viewListSort([], 'created')).toEqual({ option: 'created', direction: 'desc' });
		expect(viewListSort([], 'modified-asc')).toEqual({ option: 'modified', direction: 'asc' });
		expect(viewListSort([], 'created-asc')).toEqual({ option: 'created', direction: 'asc' });
		expect(viewListSort([], 'title')).toEqual({ option: 'title', direction: 'asc' });
	});

	it('defaults to modified newest first for an unknown or empty _sort', () => {
		expect(viewListSort([], '')).toEqual({ option: 'modified', direction: 'desc' });
		expect(viewListSort([], 'bogus')).toEqual({ option: 'modified', direction: 'desc' });
	});
});
