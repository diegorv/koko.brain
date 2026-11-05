import { describe, it, expect } from 'vitest';
import {
	availableListProperties,
	filterPropertyItems,
	moveListProperty,
	orderedPropertyItems,
	propertyDisplayLabel,
	toggleListProperty,
} from '#lib/features/rail-shell/list-properties.logic.js';
import type { LensNote } from '#lib/features/rail-shell/rail-shell.types.js';

function note(frontmatter: Record<string, LensNote['frontmatter'][string]> = {}): LensNote {
	return {
		path: '/vault/note.md',
		title: 'note',
		favorite: false,
		modifiedAt: 0,
		createdAt: 0,
		frontmatter,
		isA: null,
		subtitle: '',
		italic: false,
		kind: 'markdown',
	};
}

describe('availableListProperties', () => {
	it('returns the union of visible keys across notes, sorted naturally', () => {
		const notes = [
			note({ status: 'open', budget: 3 }),
			note({ item10: 'a', item2: 'b', budget: 5 }),
		];
		expect(availableListProperties(notes, [])).toEqual(['budget', 'item2', 'item10', 'status']);
	});

	it('hides underscore keys except the relation keys present in the notes', () => {
		const notes = [
			note({ _type: 'project', _organized: true, _belongs_to: ['[[hub]]'], _related_to: ['[[x]]'] }),
			note({ _has_many: ['[[y]]'] }),
		];
		expect(availableListProperties(notes, [])).toEqual(['_belongs_to', '_has_many', '_related_to']);
	});

	it('omits a relation key that no note carries', () => {
		expect(availableListProperties([note({ status: 'open' })], [])).toEqual(['status']);
	});

	it('adds selected keys even when no note carries them', () => {
		expect(availableListProperties([note({ status: 'open' })], ['_custom', 'missing'])).toEqual([
			'_custom',
			'missing',
			'status',
		]);
	});

	it('returns an empty list for no notes and no selection', () => {
		expect(availableListProperties([], [])).toEqual([]);
	});
});

describe('propertyDisplayLabel', () => {
	it('strips leading underscores', () => {
		expect(propertyDisplayLabel('_belongs_to')).toBe('belongs_to');
		expect(propertyDisplayLabel('__x')).toBe('x');
	});

	it('leaves a key without underscores unchanged', () => {
		expect(propertyDisplayLabel('budget')).toBe('budget');
	});

	it('keeps underscores that are not leading', () => {
		expect(propertyDisplayLabel('_due_date')).toBe('due_date');
	});
});

describe('orderedPropertyItems', () => {
	it('puts selected keys first in their selected order, then the rest', () => {
		const items = orderedPropertyItems(['status', 'budget'], ['budget', 'owner', 'status']);
		expect(items).toEqual([
			{ key: 'status', label: 'status', selected: true },
			{ key: 'budget', label: 'budget', selected: true },
			{ key: 'owner', label: 'owner', selected: false },
		]);
	});

	it('drops a selected key that is not available', () => {
		const items = orderedPropertyItems(['gone', 'budget'], ['budget']);
		expect(items).toEqual([{ key: 'budget', label: 'budget', selected: true }]);
	});

	it('returns an empty list when nothing is available', () => {
		expect(orderedPropertyItems([], [])).toEqual([]);
	});

	it('lists every available key as unselected when nothing is selected', () => {
		const items = orderedPropertyItems([], ['a', 'b']);
		expect(items.map((i) => i.selected)).toEqual([false, false]);
		expect(items.map((i) => i.key)).toEqual(['a', 'b']);
	});

	it('labels relation keys without their underscores', () => {
		const items = orderedPropertyItems(['_belongs_to'], ['_belongs_to']);
		expect(items[0]).toEqual({ key: '_belongs_to', label: 'belongs_to', selected: true });
	});
});

describe('filterPropertyItems', () => {
	const items = orderedPropertyItems(['status'], ['Budget', 'owner', 'status', '_belongs_to']);

	it('keeps every item for a blank query', () => {
		expect(filterPropertyItems(items, '')).toEqual(items);
		expect(filterPropertyItems(items, '   ')).toEqual(items);
	});

	it('matches the display label case-insensitively as a substring', () => {
		expect(filterPropertyItems(items, 'BUD').map((i) => i.key)).toEqual(['Budget']);
	});

	it('matches the label without the leading underscores', () => {
		expect(filterPropertyItems(items, 'belongs').map((i) => i.key)).toEqual(['_belongs_to']);
		expect(filterPropertyItems(items, '_bel')).toEqual([]);
	});

	it('returns an empty list when nothing matches', () => {
		expect(filterPropertyItems(items, 'zzz')).toEqual([]);
	});

	it('returns an empty list for empty items', () => {
		expect(filterPropertyItems([], 'a')).toEqual([]);
	});
});

describe('toggleListProperty', () => {
	it('appends a key that is not in the list', () => {
		expect(toggleListProperty(['a'], 'b')).toEqual(['a', 'b']);
	});

	it('removes a key that is in the list', () => {
		expect(toggleListProperty(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
	});

	it('returns a new array and leaves the input unchanged', () => {
		const current = ['a'];
		const next = toggleListProperty(current, 'b');
		expect(next).not.toBe(current);
		expect(current).toEqual(['a']);
	});

	it('handles an empty list', () => {
		expect(toggleListProperty([], 'a')).toEqual(['a']);
	});
});

describe('moveListProperty', () => {
	it('moves a key forward to the index of the target key', () => {
		expect(moveListProperty(['a', 'b', 'c'], 'a', 'c')).toEqual(['b', 'c', 'a']);
	});

	it('moves a key backward to the index of the target key', () => {
		expect(moveListProperty(['a', 'b', 'c'], 'c', 'a')).toEqual(['c', 'a', 'b']);
	});

	it('returns the same reference when the keys are equal', () => {
		const current = ['a', 'b'];
		expect(moveListProperty(current, 'a', 'a')).toBe(current);
	});

	it('returns the same reference when either key is missing', () => {
		const current = ['a', 'b'];
		expect(moveListProperty(current, 'x', 'a')).toBe(current);
		expect(moveListProperty(current, 'a', 'x')).toBe(current);
	});

	it('returns a new array on a real move and leaves the input unchanged', () => {
		const current = ['a', 'b'];
		const next = moveListProperty(current, 'a', 'b');
		expect(next).toEqual(['b', 'a']);
		expect(current).toEqual(['a', 'b']);
	});

	it('handles an empty list', () => {
		const current: string[] = [];
		expect(moveListProperty(current, 'a', 'b')).toBe(current);
	});
});
