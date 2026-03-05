import type { AggregateStats } from './queryjs.types';
import { DVDateTime } from './dv-datetime';

/**
 * Chainable array wrapper with Proxy-based deep property access.
 * `dv.pages().file.link` maps `.file.link` across all items, returning a new DataArray.
 */
export class DataArray<T> {
	/** @internal */
	readonly _values: T[];

	/** Known own properties that the Proxy should NOT intercept */
	private static readonly KNOWN_PROPS = new Set([
		'_values',
		'where',
		'filter',
		'whereTag',
		'whereDate',
		'byDate',
		'map',
		'flatMap',
		'sort',
		'sortBy',
		'groupBy',
		'distinct',
		'limit',
		'slice',
		'concat',
		'mutate',
		'find',
		'findIndex',
		'indexOf',
		'includes',
		'some',
		'every',
		'none',
		'first',
		'last',
		'to',
		'into',
		'array',
		'values',
		'length',
		'forEach',
		'join',
		'toString',
		'constructor',
		'then', // Prevent Promise-like detection
		'sum',
		'avg',
		'min',
		'max',
		'stats',
		'countBy',
		'reduce',
	]);

	constructor(values: T[]) {
		this._values = values;
		return new Proxy(this, {
			get(target, prop, receiver) {
				// Symbols (Symbol.iterator, Symbol.toPrimitive, etc.) → delegate
				if (typeof prop === 'symbol') {
					return Reflect.get(target, prop, receiver);
				}
				// Known DataArray methods/properties → delegate
				if (DataArray.KNOWN_PROPS.has(prop)) {
					return Reflect.get(target, prop, receiver);
				}
				// Numeric index access
				const idx = Number(prop);
				if (!isNaN(idx) && Number.isInteger(idx)) {
					return target._values[idx];
				}
				// Map property across all items via to() (matches Obsidian behavior: flatten arrays)
				return target.to(prop as string);
			},
		});
	}

	/** Filter items by predicate */
	where(predicate: (item: T) => boolean): DataArray<T> {
		return new DataArray(this._values.filter(predicate));
	}

	/** Alias for where */
	filter(predicate: (item: T) => boolean): DataArray<T> {
		return this.where(predicate);
	}

	/**
	 * Filters items that have at least one tag matching any of the given prefixes.
	 * Uses safe runtime access to `item.file.tags` — works on any DataArray
	 * but is most useful on DataArray<DVPage>.
	 *
	 * @example
	 * dv.pages().whereTag('tracking/')                       // single prefix
	 * dv.pages().whereTag('type/meeting', 'type/capture')    // multiple prefixes (OR)
	 */
	whereTag(...prefixes: string[]): DataArray<T> {
		const matchers = prefixes.map((p) => {
			const lower = p.toLowerCase();
			const withSlash = lower.endsWith('/') ? lower : lower + '/';
			return (t: string) => {
				const tl = t.toLowerCase();
				return tl === lower || tl.startsWith(withSlash);
			};
		});
		return new DataArray(
			this._values.filter((item) => {
				const tags = (item as Record<string, any>)?.file?.tags;
				if (!Array.isArray(tags)) return false;
				return tags.some((t: string) => matchers.some((m) => m(t)));
			}),
		);
	}

	/**
	 * Filters items where item[field] (parsed via DVDateTime.tryParse) falls within
	 * [start, end] date range (inclusive, compared by day).
	 * Items whose field value cannot be parsed as a date are excluded.
	 */
	whereDate(field: string, start: DVDateTime, end: DVDateTime): DataArray<T> {
		const startDay = start.startOf('day');
		const endDay = end.startOf('day');
		return new DataArray(
			this._values.filter((item) => {
				const raw = (item as Record<string, unknown>)?.[field];
				const dt = DVDateTime.tryParse(raw);
				if (!dt) return false;
				const day = dt.startOf('day');
				return day >= startDay && day <= endDay;
			}),
		);
	}

	/**
	 * Maps an array of DVDateTime days to matching items from this DataArray.
	 * For each day, finds the first item whose item[field] matches that day.
	 * Returns a plain array of (T | null), positionally aligned with the input days.
	 */
	byDate(field: string, days: DVDateTime[]): (T | null)[] {
		return days.map((day) =>
			this._values.find((item) => {
				const raw = (item as Record<string, unknown>)?.[field];
				const dt = DVDateTime.tryParse(raw);
				return dt !== null && dt.hasSame(day, 'day');
			}) ?? null,
		);
	}

	/** Map items to a new type */
	map<U>(fn: (item: T, index: number) => U): DataArray<U> {
		return new DataArray(this._values.map(fn));
	}

	/** Map items and flatten results */
	flatMap<U>(fn: (item: T) => U[]): DataArray<U> {
		return new DataArray(this._values.flatMap(fn));
	}

	/** Sort by an optional key function with optional direction */
	sort<U>(key?: (item: T) => U, direction: 'asc' | 'desc' = 'asc'): DataArray<T> {
		const realKey = key ?? ((x: T) => x as unknown as U);
		const sorted = [...this._values].sort((a, b) => {
			const va = realKey(a);
			const vb = realKey(b);
			const cmp = va < vb ? -1 : va > vb ? 1 : 0;
			return direction === 'asc' ? cmp : -cmp;
		});
		return new DataArray(sorted);
	}

	/** Sort by a key function (alias with different name for compatibility) */
	sortBy<U>(key: (item: T) => U, direction: 'asc' | 'desc' = 'asc'): DataArray<T> {
		return this.sort(key, direction);
	}

	/** Group items by a key function */
	groupBy<K>(key: (item: T) => K): DataArray<{ key: K; rows: DataArray<T> }> {
		const groups = new Map<K, T[]>();
		for (const item of this._values) {
			const k = key(item);
			const group = groups.get(k);
			if (group) {
				group.push(item);
			} else {
				groups.set(k, [item]);
			}
		}
		const result: { key: K; rows: DataArray<T> }[] = [];
		for (const [k, items] of groups) {
			result.push({ key: k, rows: new DataArray(items) });
		}
		return new DataArray(result);
	}

	/** Remove duplicate items by an optional key function */
	distinct<U>(key?: (item: T) => U): DataArray<T> {
		if (!key) {
			return new DataArray([...new Set(this._values)]);
		}
		const seen = new Set<U>();
		const result: T[] = [];
		for (const item of this._values) {
			const k = key(item);
			if (!seen.has(k)) {
				seen.add(k);
				result.push(item);
			}
		}
		return new DataArray(result);
	}

	/** Take the first N items */
	limit(n: number): DataArray<T> {
		return new DataArray(this._values.slice(0, n));
	}

	/** Slice the array */
	slice(start?: number, end?: number): DataArray<T> {
		return new DataArray(this._values.slice(start, end));
	}

	/** Concatenate with another iterable */
	concat(other: Iterable<T>): DataArray<T> {
		return new DataArray([...this._values, ...other]);
	}

	/** Mutate items in place, returning the same DataArray for chaining */
	mutate(fn: (item: T) => void): DataArray<T> {
		for (const item of this._values) {
			fn(item);
		}
		return this;
	}

	/** Find the first item matching a predicate */
	find(predicate: (item: T) => boolean): T | undefined {
		return this._values.find(predicate);
	}

	/** Find the index of the first item matching a predicate */
	findIndex(predicate: (item: T) => boolean): number {
		return this._values.findIndex(predicate);
	}

	/** Find the index of an item */
	indexOf(item: T): number {
		return this._values.indexOf(item);
	}

	/** Check if an item is in the array */
	includes(item: T): boolean {
		return this._values.includes(item);
	}

	/** True if predicate holds for at least one item */
	some(predicate: (item: T) => boolean): boolean {
		return this._values.some(predicate);
	}

	/** True if predicate holds for all items */
	every(predicate: (item: T) => boolean): boolean {
		return this._values.every(predicate);
	}

	/** True if predicate is false for all items */
	none(predicate: (item: T) => boolean): boolean {
		return !this._values.some(predicate);
	}

	/** Return the first item (undefined if empty) */
	first(): T | undefined {
		return this._values[0];
	}

	/** Return the last item (undefined if empty) */
	last(): T | undefined {
		return this._values[this._values.length - 1];
	}

	/**
	 * Map every element to the given key, flattening arrays.
	 * This is what the Proxy calls for unknown property access (e.g., `pages.file.link`).
	 */
	to(key: string): DataArray<unknown> {
		const result: unknown[] = [];
		for (const child of this._values) {
			if (child == null || typeof child !== 'object') continue;
			const value = (child as Record<string, unknown>)[key];
			if (value === undefined || value === null) continue;
			if (Array.isArray(value) || value instanceof DataArray) {
				for (const v of value as Iterable<unknown>) result.push(v);
			} else {
				result.push(value);
			}
		}
		return new DataArray(result);
	}

	/** Map every element to the given key, without flattening */
	into(key: string): DataArray<unknown> {
		const result: unknown[] = [];
		for (const child of this._values) {
			if (child == null || typeof child !== 'object') continue;
			const value = (child as Record<string, unknown>)[key];
			if (value === undefined || value === null) continue;
			result.push(value);
		}
		return new DataArray(result);
	}

	/** Alias for _values (Obsidian compatibility) */
	get values(): T[] {
		return this._values;
	}

	/** Unwrap to a plain JavaScript array */
	array(): T[] {
		return [...this._values];
	}

	/** Number of items */
	get length(): number {
		return this._values.length;
	}

	/** Iterate over items */
	forEach(fn: (item: T, index: number) => void): void {
		this._values.forEach(fn);
	}

	// ── Aggregate methods ──

	/** Sums all values, or the result of applying a key function to each item */
	sum(key?: (item: T) => number): number {
		const values = key ? this._values.map(key) : this._values;
		return values.reduce((acc: number, v) => acc + (Number(v) || 0), 0);
	}

	/** Returns the arithmetic mean. Returns 0 for empty arrays */
	avg(key?: (item: T) => number): number {
		if (this._values.length === 0) return 0;
		return this.sum(key) / this._values.length;
	}

	/** Returns the minimum value. Returns Infinity for empty arrays */
	min(key?: (item: T) => number): number {
		const values = key ? this._values.map(key) : this._values.map(Number);
		if (values.length === 0) return Infinity;
		return values.reduce((a, b) => (b < a ? b : a), Infinity);
	}

	/** Returns the maximum value. Returns -Infinity for empty arrays */
	max(key?: (item: T) => number): number {
		const values = key ? this._values.map(key) : this._values.map(Number);
		if (values.length === 0) return -Infinity;
		return values.reduce((a, b) => (b > a ? b : a), -Infinity);
	}

	/** Returns a bundle of aggregate statistics: sum, avg, min, max, count */
	stats(key?: (item: T) => number): AggregateStats {
		return {
			sum: this.sum(key),
			avg: this.avg(key),
			min: this.min(key),
			max: this.max(key),
			count: this._values.length,
		};
	}

	/** Counts occurrences of each value, or of key(item) for each item */
	countBy(key?: (item: T) => string): Record<string, number> {
		const counts: Record<string, number> = {};
		for (const item of this._values) {
			const k = key ? key(item) : String(item);
			counts[k] = (counts[k] || 0) + 1;
		}
		return counts;
	}

	/** Standard reduce operation */
	reduce<U>(fn: (acc: U, item: T, index: number) => U, initial: U): U {
		return this._values.reduce(fn, initial);
	}

	/** Join items as strings with a separator */
	join(separator: string = ', '): string {
		return this._values.map((v) => String(v)).join(separator);
	}

	/** String representation */
	toString(): string {
		return this._values.map((v) => String(v)).join(', ');
	}

	/** Support for-of iteration */
	[Symbol.iterator](): Iterator<T> {
		return this._values[Symbol.iterator]();
	}
}
