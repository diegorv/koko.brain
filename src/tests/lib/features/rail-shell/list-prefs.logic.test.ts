import { describe, it, expect } from 'vitest';
import type { Lens } from '#lib/features/rail-shell/rail-shell.types.js';
import {
	defaultLensSort,
	listPrefsKey,
	parseRailListPrefs,
	withListPrefs,
} from '#lib/features/rail-shell/list-prefs.logic.js';

/** A deep copy through JSON, so a test can prove the input was left alone. */
function snapshot<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

describe('parseRailListPrefs', () => {
	it('returns an empty record for garbage that is not a plain object', () => {
		expect(parseRailListPrefs(null)).toEqual({});
		expect(parseRailListPrefs(undefined)).toEqual({});
		expect(parseRailListPrefs([{ sort: 'title:asc' }])).toEqual({});
		expect(parseRailListPrefs(42)).toEqual({});
		expect(parseRailListPrefs('folder')).toEqual({});
		expect(parseRailListPrefs(true)).toEqual({});
	});

	it('parses a valid stored entry into a sort config and properties', () => {
		const raw = {
			folder: { sort: 'modified:desc', properties: ['_due', 'status'] },
		};

		expect(parseRailListPrefs(raw)).toEqual({
			folder: {
				sort: { option: 'modified', direction: 'desc' },
				properties: ['_due', 'status'],
			},
		});
	});

	it('keeps a property sort whose key contains colons', () => {
		const raw = { 'type:Task': { sort: 'property:a:b:asc' } };

		expect(parseRailListPrefs(raw)).toEqual({
			'type:Task': { sort: { option: 'property:a:b', direction: 'asc' } },
		});
	});

	it('drops entries that are not plain objects', () => {
		const raw = {
			folder: 'modified:desc',
			type: null,
			'type:Task': [],
			'view:/v/a.view': 3,
			inbox: { sort: 'title:asc' },
		};

		expect(parseRailListPrefs(raw)).toEqual({ inbox: { sort: { option: 'title', direction: 'asc' } } });
	});

	it('drops a sort that does not parse and keeps the rest of the entry', () => {
		const raw = {
			folder: { sort: 'title:sideways', properties: ['a'] },
			inbox: { sort: 'nope:asc' },
			today: { sort: 42 },
			archive: { sort: { option: 'title', direction: 'asc' } },
		};

		expect(parseRailListPrefs(raw)).toEqual({ folder: { properties: ['a'] } });
	});

	it('drops non-string property items and keeps the strings', () => {
		const raw = {
			folder: { properties: ['a', 3, null, {}, 'b', ['c']] },
		};

		expect(parseRailListPrefs(raw)).toEqual({ folder: { properties: ['a', 'b'] } });
	});

	it('drops a properties value that is not an array', () => {
		const raw = {
			folder: { properties: 'a', sort: 'title:asc' },
		};

		expect(parseRailListPrefs(raw)).toEqual({ folder: { sort: { option: 'title', direction: 'asc' } } });
	});

	it('removes an entry left empty after its fields are dropped', () => {
		const raw = {
			folder: { sort: 'bogus', properties: [1, null] },
			type: {},
		};

		expect(parseRailListPrefs(raw)).toEqual({});
	});

	it('does not mutate its input', () => {
		const raw = {
			folder: { sort: 'title:asc', properties: ['a', 3] },
			bad: 'x',
		};
		const before = snapshot(raw);
		const properties = raw.folder.properties;

		parseRailListPrefs(raw);

		expect(raw).toEqual(before);
		expect(raw.folder.properties).toBe(properties);
	});
});

describe('withListPrefs', () => {
	it('stores a sort on an empty record, formatted as a string', () => {
		const next = withListPrefs(undefined, 'folder', {
			sort: { option: 'title', direction: 'asc' },
		});

		expect(next).toEqual({ folder: { sort: 'title:asc' } });
	});

	it('stores properties as a copy of the patch array', () => {
		const patch = ['status', '_due'];

		const next = withListPrefs({}, 'folder', { properties: patch });

		expect(next).toEqual({ folder: { properties: ['status', '_due'] } });
		expect(next.folder.properties).not.toBe(patch);
	});

	it('keeps the sort when the patch has no sort field', () => {
		const raw = { folder: { sort: 'title:asc', properties: ['a'] } };

		const next = withListPrefs(raw, 'folder', { properties: ['b'] });

		expect(next).toEqual({ folder: { sort: 'title:asc', properties: ['b'] } });
	});

	it('keeps the properties when the patch has no properties field', () => {
		const raw = { folder: { sort: 'title:asc', properties: ['a'] } };

		const next = withListPrefs(raw, 'folder', { sort: { option: 'created', direction: 'desc' } });

		expect(next).toEqual({ folder: { sort: 'created:desc', properties: ['a'] } });
	});

	it('removes the sort on a null sort patch and keeps the properties', () => {
		const raw = { folder: { sort: 'title:asc', properties: ['a'] } };

		expect(withListPrefs(raw, 'folder', { sort: null })).toEqual({ folder: { properties: ['a'] } });
	});

	it('removes the properties on a null or empty properties patch', () => {
		const raw = { folder: { sort: 'title:asc', properties: ['a'] } };

		expect(withListPrefs(raw, 'folder', { properties: null })).toEqual({ folder: { sort: 'title:asc' } });
		expect(withListPrefs(raw, 'folder', { properties: [] })).toEqual({ folder: { sort: 'title:asc' } });
	});

	it('deletes the key once it has no fields left', () => {
		const raw = { folder: { sort: 'title:asc' }, inbox: { sort: 'modified:desc' } };

		expect(withListPrefs(raw, 'folder', { sort: null })).toEqual({ inbox: { sort: 'modified:desc' } });
	});

	it('deletes a key emptied by clearing both fields', () => {
		const raw = { folder: { sort: 'title:asc', properties: ['a'] } };

		const next = withListPrefs(raw, 'folder', { sort: null, properties: [] });

		expect(next).toEqual({});
		expect(next).not.toHaveProperty('folder');
	});

	it('leaves other keys in the record as they were', () => {
		const raw = {
			folder: { sort: 'title:asc' },
			'type:Task': { properties: ['status'] },
		};

		const next = withListPrefs(raw, 'folder', { sort: { option: 'modified', direction: 'desc' } });

		expect(next).toEqual({
			folder: { sort: 'modified:desc' },
			'type:Task': { properties: ['status'] },
		});
	});

	it('treats a garbage record as empty', () => {
		expect(withListPrefs(null, 'folder', { sort: { option: 'title', direction: 'asc' } })).toEqual({
			folder: { sort: 'title:asc' },
		});
		expect(withListPrefs([1, 2], 'folder', { properties: ['a'] })).toEqual({
			folder: { properties: ['a'] },
		});
	});

	it('drops a garbage entry of another key while it saves', () => {
		const raw = { inbox: 'garbage', folder: { sort: 'title:asc' } };

		const next = withListPrefs(raw, 'folder', { properties: ['a'] });

		expect(next).toEqual({ folder: { sort: 'title:asc', properties: ['a'] } });
	});

	it('does not mutate its input', () => {
		const raw = {
			folder: { sort: 'title:asc', properties: ['a', 'b'] },
			'type:Task': { properties: ['status'] },
		};
		const before = snapshot(raw);
		const properties = raw.folder.properties;

		withListPrefs(raw, 'folder', { sort: null, properties: ['c'] });
		withListPrefs(raw, 'folder', { properties: null });

		expect(raw).toEqual(before);
		expect(raw.folder.properties).toBe(properties);
	});
});

describe('defaultLensSort', () => {
	it('defaults the lenses that list by modified time, newest first', () => {
		for (const kind of ['inbox', 'today', 'favorites', 'archive', 'type', 'untyped']) {
			expect(defaultLensSort(kind)).toEqual({ option: 'modified', direction: 'desc' });
		}
	});

	it('has no default for folders, views, search, neighbourhoods or unknown kinds', () => {
		for (const kind of ['folder', 'view', 'search', 'neighbourhood', 'day', '']) {
			expect(defaultLensSort(kind)).toBeNull();
		}
	});

	it('returns a fresh object each call, so callers cannot change the default', () => {
		const first = defaultLensSort('inbox');
		if (first) first.direction = 'asc';

		expect(defaultLensSort('inbox')).toEqual({ option: 'modified', direction: 'desc' });
	});
});

describe('listPrefsKey', () => {
	it('keys every folder lens with one shared preference', () => {
		expect(listPrefsKey({ kind: 'folder' })).toBe('folder');
		expect(listPrefsKey({ kind: 'folder', target: '/vault/projects' })).toBe('folder');
	});

	it('keys a type lens by its type name', () => {
		expect(listPrefsKey({ kind: 'type', target: 'Task' })).toBe('type:Task');
	});

	it('keys a type lens without a target by its kind', () => {
		expect(listPrefsKey({ kind: 'type' })).toBe('type');
	});

	it('keys the other lenses by their kind', () => {
		const lenses: Lens[] = [
			{ kind: 'inbox' },
			{ kind: 'today', target: '2026-11-05' },
			{ kind: 'untyped' },
			{ kind: 'favorites' },
			{ kind: 'archive' },
			{ kind: 'view', target: '/vault/tasks.view' },
		];

		expect(lenses.map(listPrefsKey)).toEqual(['inbox', 'today', 'untyped', 'favorites', 'archive', 'view']);
	});
});
