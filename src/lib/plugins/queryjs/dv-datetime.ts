/**
 * Lightweight Luxon-compatible date wrapper.
 * Wraps native Date, providing .year, .month, .day, .ts, .plus(), .startOf(), etc.
 */
export class DVDateTime {
	private readonly _date: Date;

	constructor(input?: string | number | Date | DVDateTime) {
		if (input instanceof DVDateTime) {
			this._date = new Date(input._date.getTime());
		} else if (input instanceof Date) {
			this._date = new Date(input.getTime());
		} else if (typeof input === 'number') {
			this._date = new Date(input);
		} else if (typeof input === 'string') {
			// Date-only strings (YYYY-MM-DD) are parsed as UTC by spec.
			// Append T00:00:00 to parse as local time instead.
			if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
				this._date = new Date(input + 'T00:00:00');
			} else {
				this._date = new Date(input);
			}
		} else {
			this._date = new Date();
		}
	}

	/**
	 * Safely normalizes any date-like value to DVDateTime.
	 * Returns null for values that cannot be parsed as dates.
	 *
	 * Handles: null/undefined → null, DVDateTime → copy, Date → wrap,
	 * number → timestamp, string → parse, {year, month, day} → construct,
	 * {ts} → timestamp, anything else → null.
	 */
	static tryParse(value: unknown): DVDateTime | null {
		if (value == null) return null;

		if (value instanceof DVDateTime) {
			return new DVDateTime(value);
		}

		if (value instanceof Date) {
			return isNaN(value.getTime()) ? null : new DVDateTime(value);
		}

		if (typeof value === 'number') {
			return isNaN(value) ? null : new DVDateTime(value);
		}

		if (typeof value === 'string') {
			if (value.trim() === '') return null;
			const d = /^\d{4}-\d{2}-\d{2}$/.test(value)
				? new Date(value + 'T00:00:00')
				: new Date(value);
			return isNaN(d.getTime()) ? null : new DVDateTime(d);
		}

		if (typeof value === 'object') {
			const obj = value as Record<string, unknown>;

			// Object with { year, month, day } number components (Luxon 1-based month)
			if (
				typeof obj.year === 'number' &&
				typeof obj.month === 'number' &&
				typeof obj.day === 'number'
			) {
				const d = new Date(obj.year, obj.month - 1, obj.day);
				return isNaN(d.getTime()) ? null : new DVDateTime(d);
			}

			// Object with { ts } timestamp
			if (typeof obj.ts === 'number') {
				return isNaN(obj.ts) ? null : new DVDateTime(obj.ts);
			}
		}

		return null;
	}

	/** Year (e.g. 2024) */
	get year(): number {
		return this._date.getFullYear();
	}

	/** Month (1-12, Luxon convention) */
	get month(): number {
		return this._date.getMonth() + 1;
	}

	/** Day of month (1-31) */
	get day(): number {
		return this._date.getDate();
	}

	/** Hour (0-23) */
	get hour(): number {
		return this._date.getHours();
	}

	/** Minute (0-59) */
	get minute(): number {
		return this._date.getMinutes();
	}

	/** Timestamp in milliseconds */
	get ts(): number {
		return this._date.getTime();
	}

	/** Returns a new DVDateTime advanced by the given duration */
	plus(duration: {
		years?: number;
		months?: number;
		days?: number;
		hours?: number;
		minutes?: number;
	}): DVDateTime {
		const d = new Date(this._date.getTime());
		if (duration.years) d.setFullYear(d.getFullYear() + duration.years);
		if (duration.months) d.setMonth(d.getMonth() + duration.months);
		if (duration.days) d.setDate(d.getDate() + duration.days);
		if (duration.hours) d.setHours(d.getHours() + duration.hours);
		if (duration.minutes) d.setMinutes(d.getMinutes() + duration.minutes);
		return new DVDateTime(d);
	}

	/** Returns a new DVDateTime set back by the given duration */
	minus(duration: {
		years?: number;
		months?: number;
		days?: number;
		hours?: number;
		minutes?: number;
	}): DVDateTime {
		const neg: Record<string, number> = {};
		for (const [k, v] of Object.entries(duration)) {
			if (v) neg[k] = -v;
		}
		return this.plus(neg);
	}

	/** Returns ISO date string (YYYY-MM-DD) */
	toISODate(): string {
		const y = String(this.year).padStart(4, '0');
		const m = String(this.month).padStart(2, '0');
		const d = String(this.day).padStart(2, '0');
		return `${y}-${m}-${d}`;
	}

	/** Simple format: supports yyyy, MM, dd, HH, mm tokens (all occurrences) */
	toFormat(fmt: string): string {
		return fmt
			.replaceAll('yyyy', String(this.year).padStart(4, '0'))
			.replaceAll('MM', String(this.month).padStart(2, '0'))
			.replaceAll('dd', String(this.day).padStart(2, '0'))
			.replaceAll('HH', String(this.hour).padStart(2, '0'))
			.replaceAll('mm', String(this.minute).padStart(2, '0'));
	}

	/** Comparison: is this date the same as another on a given unit? */
	hasSame(other: DVDateTime, unit: 'day' | 'month' | 'year'): boolean {
		if (unit === 'year') return this.year === other.year;
		if (unit === 'month') return this.year === other.year && this.month === other.month;
		return this.year === other.year && this.month === other.month && this.day === other.day;
	}

	/** Returns a new DVDateTime at the start of the given unit */
	startOf(unit: 'day' | 'week' | 'month' | 'year'): DVDateTime {
		const d = new Date(this._date.getTime());
		d.setHours(0, 0, 0, 0);
		if (unit === 'day') return new DVDateTime(d);
		if (unit === 'week') {
			const dayOfWeek = d.getDay(); // 0=Sun
			const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday-based
			d.setDate(d.getDate() - diff);
			return new DVDateTime(d);
		}
		if (unit === 'month') {
			d.setDate(1);
			return new DVDateTime(d);
		}
		// year
		d.setMonth(0, 1);
		return new DVDateTime(d);
	}

	/** Returns timestamp for relational comparison operators (< > <= >=). Note: === compares object references, not valueOf() */
	valueOf(): number {
		return this._date.getTime();
	}

	/** Returns ISO string representation */
	toString(): string {
		return this._date.toISOString();
	}

	/** Returns a copy of the underlying native Date */
	toJSDate(): Date {
		return new Date(this._date.getTime());
	}
}
