import { describe, it, expect } from 'vitest';
import { DataArray } from '$lib/plugins/queryjs/data-array';
import { KBDateTime } from '$lib/plugins/queryjs/kb-datetime';

describe('DataArray', () => {
	describe('where / filter', () => {
		it('filters items by predicate', () => {
			const arr = new DataArray([1, 2, 3, 4, 5]);
			const result = arr.where((x) => x > 3);
			expect(result.array()).toEqual([4, 5]);
		});

		it('filter is an alias for where', () => {
			const arr = new DataArray([1, 2, 3]);
			expect(arr.filter((x) => x > 1).array()).toEqual([2, 3]);
		});

		it('returns empty DataArray when nothing matches', () => {
			const arr = new DataArray([1, 2, 3]);
			expect(arr.where((x) => x > 10).array()).toEqual([]);
		});
	});

	describe('whereTag', () => {
		const pages = [
			{ file: { tags: ['type/journal/daily', 'tracking/sleep'] }, name: 'daily1' },
			{ file: { tags: ['type/meeting', 'team/engineering'] }, name: 'meeting1' },
			{ file: { tags: ['type/project'] }, name: 'project1' },
			{ file: { tags: [] }, name: 'empty' },
			{ file: { name: 'no-tags' } } as any,
			{ name: 'no-file' } as any,
		];

		it('filters by exact tag', () => {
			const arr = new DataArray(pages);
			const result = arr.whereTag('type/project');
			expect(result.length).toBe(1);
			expect((result.first() as any).name).toBe('project1');
		});

		it('filters by tag prefix (subtags)', () => {
			const arr = new DataArray(pages);
			const result = arr.whereTag('type');
			expect(result.length).toBe(3); // journal/daily, meeting, project
		});

		it('filters with trailing slash prefix', () => {
			const arr = new DataArray(pages);
			const result = arr.whereTag('tracking/');
			expect(result.length).toBe(1);
			expect((result.first() as any).name).toBe('daily1');
		});

		it('is case-insensitive', () => {
			const arr = new DataArray(pages);
			const result = arr.whereTag('TYPE/MEETING');
			expect(result.length).toBe(1);
		});

		it('returns empty when no matches', () => {
			const arr = new DataArray(pages);
			expect(arr.whereTag('nonexistent').length).toBe(0);
		});

		it('safely handles items without file.tags', () => {
			const arr = new DataArray(pages);
			const result = arr.whereTag('type');
			expect(result.length).toBe(3);
		});

		it('filters by multiple prefixes (OR)', () => {
			const arr = new DataArray(pages);
			const result = arr.whereTag('type/meeting', 'type/project');
			expect(result.length).toBe(2);
			const names = result.map((x: any) => x.name).array();
			expect(names).toContain('meeting1');
			expect(names).toContain('project1');
		});

		it('filters by multiple prefixes with subtag matching', () => {
			const arr = new DataArray(pages);
			const result = arr.whereTag('type/journal', 'tracking/sleep');
			expect(result.length).toBe(1);
			expect((result.first() as any).name).toBe('daily1');
		});

		it('returns empty for empty DataArray', () => {
			expect(new DataArray([]).whereTag('anything').length).toBe(0);
		});

		it('is not intercepted by Proxy (in KNOWN_PROPS)', () => {
			const arr = new DataArray([{ whereTag: 'some value' }]);
			expect(typeof arr.whereTag).toBe('function');
		});
	});

	describe('whereDate', () => {
		const items = [
			{ name: 'a', created: '2024-06-10' },
			{ name: 'b', created: '2024-06-12' },
			{ name: 'c', created: '2024-06-15' },
			{ name: 'd', created: '2024-06-20' },
			{ name: 'e', created: 'not-a-date' },
			{ name: 'f', created: null },
		];

		it('filters items within date range (inclusive)', () => {
			const arr = new DataArray(items);
			const start = new KBDateTime('2024-06-10');
			const end = new KBDateTime('2024-06-15');
			const result = arr.whereDate('created', start, end);
			expect(result.length).toBe(3);
			expect(result.map((x: any) => x.name).array()).toEqual(['a', 'b', 'c']);
		});

		it('excludes items outside range', () => {
			const arr = new DataArray(items);
			const start = new KBDateTime('2024-06-13');
			const end = new KBDateTime('2024-06-18');
			const result = arr.whereDate('created', start, end);
			expect(result.length).toBe(1);
			expect((result.first() as any).name).toBe('c');
		});

		it('excludes items with unparseable dates', () => {
			const arr = new DataArray(items);
			const start = new KBDateTime('2024-06-01');
			const end = new KBDateTime('2024-06-30');
			const result = arr.whereDate('created', start, end);
			expect(result.length).toBe(4);
		});

		it('returns empty for empty DataArray', () => {
			const arr = new DataArray([]);
			const start = new KBDateTime('2024-06-01');
			const end = new KBDateTime('2024-06-30');
			expect(arr.whereDate('created', start, end).length).toBe(0);
		});

		it('returns single-day match when start equals end', () => {
			const arr = new DataArray(items);
			const day = new KBDateTime('2024-06-12');
			const result = arr.whereDate('created', day, day);
			expect(result.length).toBe(1);
			expect((result.first() as any).name).toBe('b');
		});

		it('is not intercepted by Proxy (in KNOWN_PROPS)', () => {
			const arr = new DataArray([{ whereDate: 'trap' }]);
			expect(typeof arr.whereDate).toBe('function');
		});
	});

	describe('byDate', () => {
		const items = [
			{ name: 'monday', created: '2024-06-10' },
			{ name: 'wednesday', created: '2024-06-12' },
			{ name: 'friday', created: '2024-06-14' },
		];

		it('maps days to matching items', () => {
			const arr = new DataArray(items);
			const days = [
				new KBDateTime('2024-06-10'),
				new KBDateTime('2024-06-11'),
				new KBDateTime('2024-06-12'),
			];
			const result = arr.byDate('created', days);
			expect(result.length).toBe(3);
			expect(result[0]!.name).toBe('monday');
			expect(result[1]).toBeNull();
			expect(result[2]!.name).toBe('wednesday');
		});

		it('returns all nulls when no items match', () => {
			const arr = new DataArray(items);
			const days = [
				new KBDateTime('2025-01-01'),
				new KBDateTime('2025-01-02'),
			];
			expect(arr.byDate('created', days)).toEqual([null, null]);
		});

		it('returns empty array for empty days', () => {
			const arr = new DataArray(items);
			expect(arr.byDate('created', [])).toEqual([]);
		});

		it('returns all nulls for empty DataArray', () => {
			const arr = new DataArray([]);
			const days = [new KBDateTime('2024-06-10')];
			expect(arr.byDate('created', days)).toEqual([null]);
		});

		it('handles items with unparseable date fields', () => {
			const arr = new DataArray([
				{ name: 'valid', created: '2024-06-10' },
				{ name: 'invalid', created: 'nope' },
			]);
			const days = [new KBDateTime('2024-06-10')];
			const result = arr.byDate('created', days);
			expect(result[0]!.name).toBe('valid');
		});

		it('is not intercepted by Proxy (in KNOWN_PROPS)', () => {
			const arr = new DataArray([{ byDate: 'trap' }]);
			expect(typeof arr.byDate).toBe('function');
		});
	});

	describe('map', () => {
		it('transforms items', () => {
			const arr = new DataArray([1, 2, 3]);
			expect(arr.map((x) => x * 2).array()).toEqual([2, 4, 6]);
		});

		it('provides index', () => {
			const arr = new DataArray(['a', 'b', 'c']);
			expect(arr.map((_, i) => i).array()).toEqual([0, 1, 2]);
		});
	});

	describe('flatMap', () => {
		it('maps and flattens', () => {
			const arr = new DataArray([1, 2, 3]);
			expect(arr.flatMap((x) => [x, x * 10]).array()).toEqual([1, 10, 2, 20, 3, 30]);
		});
	});

	describe('sort', () => {
		it('sorts by key ascending by default', () => {
			const arr = new DataArray([3, 1, 2]);
			expect(arr.sort((x) => x).array()).toEqual([1, 2, 3]);
		});

		it('sorts descending', () => {
			const arr = new DataArray([3, 1, 2]);
			expect(arr.sort((x) => x, 'desc').array()).toEqual([3, 2, 1]);
		});

		it('sorts without key (identity)', () => {
			const arr = new DataArray([3, 1, 2]);
			expect(arr.sort().array()).toEqual([1, 2, 3]);
		});

		it('sorts by object property', () => {
			const arr = new DataArray([{ n: 'b' }, { n: 'a' }, { n: 'c' }]);
			expect(arr.sort((x) => x.n).array()).toEqual([{ n: 'a' }, { n: 'b' }, { n: 'c' }]);
		});

		it('does not mutate original', () => {
			const arr = new DataArray([3, 1, 2]);
			arr.sort((x) => x);
			expect(arr.array()).toEqual([3, 1, 2]);
		});
	});

	describe('groupBy', () => {
		it('groups items by key', () => {
			const arr = new DataArray([
				{ type: 'a', v: 1 },
				{ type: 'b', v: 2 },
				{ type: 'a', v: 3 },
			]);
			const grouped = arr.groupBy((x) => x.type);
			expect(grouped.length).toBe(2);
			const aGroup = grouped.find((g) => g.key === 'a')!;
			expect(aGroup.rows.array()).toEqual([
				{ type: 'a', v: 1 },
				{ type: 'a', v: 3 },
			]);
		});
	});

	describe('distinct', () => {
		it('removes duplicates', () => {
			const arr = new DataArray([1, 2, 2, 3, 3, 3]);
			expect(arr.distinct().array()).toEqual([1, 2, 3]);
		});

		it('removes duplicates by key', () => {
			const arr = new DataArray([{ id: 1 }, { id: 2 }, { id: 1 }]);
			expect(arr.distinct((x) => x.id).length).toBe(2);
		});
	});

	describe('limit / slice', () => {
		it('limits to first N items', () => {
			const arr = new DataArray([1, 2, 3, 4, 5]);
			expect(arr.limit(3).array()).toEqual([1, 2, 3]);
		});

		it('slices with start and end', () => {
			const arr = new DataArray([1, 2, 3, 4, 5]);
			expect(arr.slice(1, 3).array()).toEqual([2, 3]);
		});
	});

	describe('concat', () => {
		it('concatenates with another array', () => {
			const arr = new DataArray([1, 2]);
			expect(arr.concat([3, 4]).array()).toEqual([1, 2, 3, 4]);
		});
	});

	describe('mutate', () => {
		it('mutates items in place and returns same instance for chaining', () => {
			const items = [{ v: 1 }, { v: 2 }];
			const arr = new DataArray(items);
			const result = arr.mutate((x) => (x.v *= 10));
			expect(result.array()).toEqual([{ v: 10 }, { v: 20 }]);
		});
	});

	describe('find / findIndex / indexOf / includes', () => {
		it('finds first matching item', () => {
			const arr = new DataArray([1, 2, 3]);
			expect(arr.find((x) => x > 1)).toBe(2);
		});

		it('find returns undefined when not found', () => {
			const arr = new DataArray([1, 2, 3]);
			expect(arr.find((x) => x > 10)).toBeUndefined();
		});

		it('findIndex returns index of first match', () => {
			const arr = new DataArray([10, 20, 30]);
			expect(arr.findIndex((x) => x === 20)).toBe(1);
		});

		it('findIndex returns -1 when not found', () => {
			const arr = new DataArray([1, 2, 3]);
			expect(arr.findIndex((x) => x > 10)).toBe(-1);
		});

		it('indexOf finds item', () => {
			const arr = new DataArray([10, 20, 30]);
			expect(arr.indexOf(20)).toBe(1);
		});

		it('includes checks membership', () => {
			const arr = new DataArray([1, 2, 3]);
			expect(arr.includes(2)).toBe(true);
			expect(arr.includes(4)).toBe(false);
		});
	});

	describe('some / every / none', () => {
		it('some returns true when at least one matches', () => {
			expect(new DataArray([1, 2, 3]).some((x) => x > 2)).toBe(true);
		});

		it('some returns false when none match', () => {
			expect(new DataArray([1, 2, 3]).some((x) => x > 5)).toBe(false);
		});

		it('every returns true when all match', () => {
			expect(new DataArray([2, 4, 6]).every((x) => x % 2 === 0)).toBe(true);
		});

		it('every returns false when one fails', () => {
			expect(new DataArray([2, 3, 6]).every((x) => x % 2 === 0)).toBe(false);
		});

		it('none returns true when no items match', () => {
			expect(new DataArray([1, 2, 3]).none((x) => x > 5)).toBe(true);
		});

		it('none returns false when one matches', () => {
			expect(new DataArray([1, 2, 3]).none((x) => x > 2)).toBe(false);
		});
	});

	describe('first / last', () => {
		it('first returns first item', () => {
			expect(new DataArray([10, 20, 30]).first()).toBe(10);
		});

		it('last returns last item', () => {
			expect(new DataArray([10, 20, 30]).last()).toBe(30);
		});

		it('first returns undefined on empty', () => {
			expect(new DataArray([]).first()).toBeUndefined();
		});

		it('last returns undefined on empty', () => {
			expect(new DataArray([]).last()).toBeUndefined();
		});
	});

	describe('to / into', () => {
		it('to maps and flattens arrays', () => {
			const arr = new DataArray([{ tags: ['a', 'b'] }, { tags: ['c'] }]);
			expect(arr.to('tags').array()).toEqual(['a', 'b', 'c']);
		});

		it('to maps simple values without flattening', () => {
			const arr = new DataArray([{ name: 'x' }, { name: 'y' }]);
			expect(arr.to('name').array()).toEqual(['x', 'y']);
		});

		it('to skips null/undefined values', () => {
			const arr = new DataArray([{ v: 1 }, { v: null }, { v: 3 }]);
			expect(arr.to('v').array()).toEqual([1, 3]);
		});

		it('into maps without flattening', () => {
			const arr = new DataArray([{ tags: ['a', 'b'] }, { tags: ['c'] }]);
			expect(arr.into('tags').array()).toEqual([['a', 'b'], ['c']]);
		});
	});

	describe('array() method', () => {
		it('returns a plain array copy', () => {
			const arr = new DataArray([1, 2, 3]);
			const plain = arr.array();
			expect(Array.isArray(plain)).toBe(true);
			expect(plain).toEqual([1, 2, 3]);
		});
	});

	describe('length', () => {
		it('returns item count', () => {
			expect(new DataArray([1, 2, 3]).length).toBe(3);
			expect(new DataArray([]).length).toBe(0);
		});
	});

	describe('forEach', () => {
		it('iterates over items', () => {
			const items: number[] = [];
			new DataArray([1, 2, 3]).forEach((x) => items.push(x));
			expect(items).toEqual([1, 2, 3]);
		});
	});

	describe('join', () => {
		it('joins with default separator', () => {
			expect(new DataArray([1, 2, 3]).join()).toBe('1, 2, 3');
		});

		it('joins with custom separator', () => {
			expect(new DataArray(['a', 'b', 'c']).join(' | ')).toBe('a | b | c');
		});
	});

	describe('chaining', () => {
		it('where().sort().limit() chains correctly', () => {
			const arr = new DataArray([5, 3, 1, 4, 2]);
			const result = arr
				.where((x) => x > 1)
				.sort((x) => x)
				.limit(3);
			expect(result.array()).toEqual([2, 3, 4]);
		});
	});

	describe('Proxy deep property access', () => {
		it('maps nested property access across items', () => {
			const arr = new DataArray([
				{ a: { b: 1 } },
				{ a: { b: 2 } },
				{ a: { b: 3 } },
			]) as DataArray<{ a: { b: number } }> & { a: DataArray<{ b: number }> };
			// kb.pages().a.b → DataArray
			const result = (arr as any).a.b;
			expect(result.array()).toEqual([1, 2, 3]);
		});

		it('flattens arrays in deep access (like Obsidian to())', () => {
			const arr = new DataArray([
				{ file: { tags: ['a', 'b'] } },
				{ file: { tags: ['c'] } },
			]);
			// pages.file.tags should flatten
			const tags = (arr as any).file.tags;
			expect(tags.array()).toEqual(['a', 'b', 'c']);
		});

		it('supports numeric index access', () => {
			const arr = new DataArray([10, 20, 30]);
			expect((arr as any)[0]).toBe(10);
			expect((arr as any)[2]).toBe(30);
		});

		it('chaining proxy access with methods', () => {
			const arr = new DataArray([
				{ file: { name: 'alpha', link: { path: '/a', display: 'alpha' } } },
				{ file: { name: 'beta', link: { path: '/b', display: 'beta' } } },
			]);
			const links = (arr as any).file.link;
			expect(links.length).toBe(2);
			expect(links.first()).toEqual({ path: '/a', display: 'alpha' });
		});
	});

	describe('for-of iteration', () => {
		it('supports for-of loop', () => {
			const arr = new DataArray([1, 2, 3]);
			const items: number[] = [];
			for (const item of arr) {
				items.push(item);
			}
			expect(items).toEqual([1, 2, 3]);
		});
	});

	describe('empty array edge cases', () => {
		it('where on empty returns empty', () => {
			expect(new DataArray([]).where(() => true).length).toBe(0);
		});

		it('map on empty returns empty', () => {
			expect(new DataArray([]).map((x) => x).length).toBe(0);
		});

		it('sort on empty returns empty', () => {
			expect(new DataArray([]).sort().length).toBe(0);
		});

		it('groupBy on empty returns empty', () => {
			expect(new DataArray([]).groupBy((x) => x).length).toBe(0);
		});
	});

	describe('sum', () => {
		it('sums numeric values', () => {
			expect(new DataArray([1, 2, 3, 4]).sum()).toBe(10);
		});

		it('sums with key function', () => {
			const arr = new DataArray([{ v: 10 }, { v: 20 }, { v: 30 }]);
			expect(arr.sum((x) => x.v)).toBe(60);
		});

		it('returns 0 for empty array', () => {
			expect(new DataArray([]).sum()).toBe(0);
		});

		it('treats non-numeric values as 0', () => {
			expect(new DataArray([1, 'abc', 3] as any[]).sum()).toBe(4);
		});
	});

	describe('avg', () => {
		it('returns arithmetic mean', () => {
			expect(new DataArray([2, 4, 6]).avg()).toBe(4);
		});

		it('returns 0 for empty array', () => {
			expect(new DataArray([]).avg()).toBe(0);
		});

		it('works with key function', () => {
			const arr = new DataArray([{ v: 10 }, { v: 20 }]);
			expect(arr.avg((x) => x.v)).toBe(15);
		});
	});

	describe('min', () => {
		it('returns minimum value', () => {
			expect(new DataArray([5, 1, 3]).min()).toBe(1);
		});

		it('returns Infinity for empty array', () => {
			expect(new DataArray([]).min()).toBe(Infinity);
		});

		it('works with key function', () => {
			const arr = new DataArray([{ v: 10 }, { v: 3 }, { v: 7 }]);
			expect(arr.min((x) => x.v)).toBe(3);
		});

		it('handles large arrays without stack overflow', () => {
			const large = Array.from({ length: 200_000 }, (_, i) => i);
			expect(new DataArray(large).min()).toBe(0);
		});
	});

	describe('max', () => {
		it('returns maximum value', () => {
			expect(new DataArray([5, 1, 3]).max()).toBe(5);
		});

		it('returns -Infinity for empty array', () => {
			expect(new DataArray([]).max()).toBe(-Infinity);
		});

		it('works with key function', () => {
			const arr = new DataArray([{ v: 10 }, { v: 3 }, { v: 7 }]);
			expect(arr.max((x) => x.v)).toBe(10);
		});

		it('handles large arrays without stack overflow', () => {
			const large = Array.from({ length: 200_000 }, (_, i) => i);
			expect(new DataArray(large).max()).toBe(199_999);
		});
	});

	describe('stats', () => {
		it('returns complete statistics bundle', () => {
			const result = new DataArray([1, 2, 3, 4, 5]).stats();
			expect(result).toEqual({
				sum: 15,
				avg: 3,
				min: 1,
				max: 5,
				count: 5,
			});
		});

		it('works with key function', () => {
			const arr = new DataArray([{ v: 10 }, { v: 20 }, { v: 30 }]);
			const result = arr.stats((x) => x.v);
			expect(result.sum).toBe(60);
			expect(result.avg).toBe(20);
			expect(result.min).toBe(10);
			expect(result.max).toBe(30);
			expect(result.count).toBe(3);
		});

		it('handles empty array', () => {
			const result = new DataArray([]).stats();
			expect(result.count).toBe(0);
			expect(result.sum).toBe(0);
			expect(result.avg).toBe(0);
		});
	});

	describe('countBy', () => {
		it('counts occurrences of each value', () => {
			const arr = new DataArray(['a', 'b', 'a', 'c', 'b', 'a']);
			expect(arr.countBy()).toEqual({ a: 3, b: 2, c: 1 });
		});

		it('counts by key function', () => {
			const arr = new DataArray([{ type: 'bug' }, { type: 'feature' }, { type: 'bug' }]);
			expect(arr.countBy((x) => x.type)).toEqual({ bug: 2, feature: 1 });
		});

		it('returns empty object for empty array', () => {
			expect(new DataArray([]).countBy()).toEqual({});
		});
	});

	describe('reduce', () => {
		it('reduces to a single value', () => {
			const result = new DataArray([1, 2, 3]).reduce((acc, x) => acc + x, 0);
			expect(result).toBe(6);
		});

		it('provides index parameter', () => {
			const result = new DataArray(['a', 'b', 'c']).reduce(
				(acc, item, i) => acc + `${i}:${item} `,
				'',
			);
			expect(result.trim()).toBe('0:a 1:b 2:c');
		});
	});

	describe('aggregate methods are not intercepted by Proxy', () => {
		it('sum is callable as a method, not mapped as property', () => {
			const arr = new DataArray([{ sum: 99 }, { sum: 1 }]);
			expect(typeof arr.sum).toBe('function');
		});

		it('avg is callable as a method', () => {
			const arr = new DataArray([{ avg: 99 }]);
			expect(typeof arr.avg).toBe('function');
		});

		it('stats is callable as a method', () => {
			const arr = new DataArray([{ stats: 99 }]);
			expect(typeof arr.stats).toBe('function');
		});
	});

	describe('KNOWN_PROPS completeness', () => {
		it('all prototype methods/properties are registered in KNOWN_PROPS and not intercepted by Proxy', () => {
			// Collect all own property names from the DataArray prototype
			// (excluding constructor and Symbol.iterator)
			const protoProps = Object.getOwnPropertyNames(DataArray.prototype).filter(
				(p) => p !== 'constructor',
			);

			// For each prototype method/property, create a DataArray whose items
			// have that as a key. If KNOWN_PROPS is incomplete, the Proxy would
			// intercept it and return a mapped DataArray instead of the real method.
			for (const prop of protoProps) {
				const items = [{ [prop]: 'trap-value' }];
				const arr = new DataArray(items);
				const val = (arr as any)[prop];

				// The value should be the real method/getter, not the mapped property
				const isMethod = typeof val === 'function';
				const isGetter = typeof val === 'number' || Array.isArray(val); // length, values
				expect(
					isMethod || isGetter,
					`"${prop}" is not in KNOWN_PROPS — Proxy intercepted it as a property mapping`,
				).toBe(true);
			}
		});
	});
});
