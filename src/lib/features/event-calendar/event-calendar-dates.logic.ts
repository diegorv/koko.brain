/**
 * Native, dependency-free date helpers for the event calendar.
 *
 * Days are floating wall-clock keys (`YYYY-MM-DD`) and times are minutes
 * from midnight (0..1440). Day arithmetic goes through local `Date`
 * components (`setDate`), never through elapsed milliseconds, so a 23 h or
 * 25 h DST day never shifts a key (decision D13). Names are fixed English
 * strings, so the output does not depend on the host locale.
 */

/** Time display format, matching `EventCalendarSettings.timeFormat`. */
export type TimeFormat = '24h' | '12h';

/** First day of the week: 0 = Sunday, 1 = Monday. */
export type WeekStart = 0 | 1;

/** Full English month names, January first. */
export const MONTHS: readonly string[] = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
];

/** Three-letter month names (`Jan`..`Dec`), January first. */
export const MONTHS_SHORT: readonly string[] = MONTHS.map((m) => m.slice(0, 3));

/** Full English weekday names, Sunday first (index = `dayOfWeek`). */
export const WEEKDAYS: readonly string[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Upper-case grid column headings (`SUN`..`SAT`), Sunday first. */
export const WEEKDAYS_SHORT: readonly string[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(\d{1,2}):(\d{2})$/;
const MS_PER_DAY = 86_400_000;
const MINUTES_PER_DAY = 1440;

/** Two-digit zero padding. */
function pad2(n: number): string {
	return String(n).padStart(2, '0');
}

/**
 * Converts a `Date` to its local day key.
 * @param date - any instant; only its local year, month and day are used
 * @returns `YYYY-MM-DD`, the year zero-padded to four digits like dayjs
 */
export function toKey(date: Date): string {
	return `${String(date.getFullYear()).padStart(4, '0')}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/**
 * Converts a day key to local midnight of that day.
 * @param key - `YYYY-MM-DD`
 * @returns a `Date` at 00:00 local time
 */
export function fromKey(key: string): Date {
	const [y, m, d] = key.split('-').map(Number);
	return new Date(y, m - 1, d);
}

/**
 * Checks that a value is a well-formed key of a real calendar day.
 * @param value - anything read from frontmatter or input
 * @returns true when `value` matches `YYYY-MM-DD` and round-trips through
 *   `fromKey` / `toKey` (so `2026-02-30` is rejected)
 */
export function isValidDayKey(value: unknown): value is string {
	return typeof value === 'string' && DAY_KEY_PATTERN.test(value) && toKey(fromKey(value)) === value;
}

/**
 * Adds whole days to a key.
 * @param key - start day
 * @param n - days to add (negative goes back)
 * @returns the resulting day key
 */
export function addDays(key: string, n: number): string {
	const d = fromKey(key);
	d.setDate(d.getDate() + n);
	return toKey(d);
}

/**
 * Adds whole months to a key, clamping the day to the target month's last
 * day (`2026-01-31` + 1 month is `2026-02-28`).
 * @param key - start day
 * @param n - months to add (negative goes back)
 * @returns the resulting day key
 */
export function addMonths(key: string, n: number): string {
	const d = fromKey(key);
	const day = d.getDate();
	d.setDate(1);
	d.setMonth(d.getMonth() + n);
	const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
	d.setDate(Math.min(day, last));
	return toKey(d);
}

/**
 * Weekday of a key.
 * @param key - day key
 * @returns 0 (Sunday) through 6 (Saturday)
 */
export function dayOfWeek(key: string): number {
	return fromKey(key).getDay();
}

/**
 * First day of the week that contains `key`.
 * @param key - any day of the week
 * @param weekStartsOn - 0 for Sunday-first, 1 for Monday-first
 * @returns the key of that week's first day
 */
export function startOfWeek(key: string, weekStartsOn: WeekStart): string {
	const offset = (dayOfWeek(key) - weekStartsOn + 7) % 7;
	return addDays(key, -offset);
}

/**
 * The seven days of the week that contains `key`.
 * @param key - any day of the week
 * @param weekStartsOn - 0 for Sunday-first, 1 for Monday-first
 * @returns seven consecutive keys, starting at `startOfWeek`
 */
export function weekDays(key: string, weekStartsOn: WeekStart): string[] {
	const first = startOfWeek(key, weekStartsOn);
	return Array.from({ length: 7 }, (_, i) => addDays(first, i));
}

/**
 * First day of the month that contains `key`.
 * @param key - any day of the month
 * @returns `YYYY-MM-01`
 */
export function startOfMonth(key: string): string {
	return `${key.slice(0, 7)}-01`;
}

/**
 * Number of days in the month that contains `key`.
 * @param key - any day of the month
 * @returns 28 through 31
 */
export function daysInMonth(key: string): number {
	const d = fromKey(key);
	return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/**
 * Six full weeks (42 keys) covering the month that contains `key`, starting
 * at the first day of the week that holds the 1st.
 * @param key - any day of the month
 * @param weekStartsOn - 0 for Sunday-first, 1 for Monday-first
 * @returns 42 consecutive keys
 */
export function monthGrid(key: string, weekStartsOn: WeekStart): string[] {
	const first = startOfWeek(startOfMonth(key), weekStartsOn);
	return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

/**
 * ISO 8601 week number (weeks start on Monday; week 1 holds the year's
 * first Thursday). Computed in UTC from the key's fields, so DST is
 * irrelevant.
 * @param key - day key
 * @returns 1 through 53
 */
export function isoWeek(key: string): number {
	const [y, m, d] = key.split('-').map(Number);
	const date = new Date(Date.UTC(y, m - 1, d));
	const isoDay = (date.getUTCDay() + 6) % 7;
	date.setUTCDate(date.getUTCDate() - isoDay + 3);
	const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
	return Math.floor((date.getTime() - yearStart) / MS_PER_DAY / 7) + 1;
}

/**
 * Whole days from `a` to `b` (`b` minus `a`). The millisecond difference is
 * rounded, so a 23 h or 25 h day still counts as one.
 * @param a - earlier day for a positive result
 * @param b - later day for a positive result
 * @returns the signed day count (`diffDays('2026-11-08', '2026-11-14')` is 6)
 */
export function diffDays(a: string, b: string): number {
	return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / MS_PER_DAY);
}

/**
 * Every key from `from` through `to`, inclusive and ascending.
 * @param from - first day
 * @param to - last day
 * @returns the keys, or `[]` when `to` is before `from`
 */
export function rangeKeys(from: string, to: string): string[] {
	const count = diffDays(from, to);
	if (count < 0) return [];
	return Array.from({ length: count + 1 }, (_, i) => addDays(from, i));
}

/**
 * Whether a key falls on Saturday or Sunday.
 * @param key - day key
 * @returns true on a weekend day
 */
export function isWeekend(key: string): boolean {
	const dow = dayOfWeek(key);
	return dow === 0 || dow === 6;
}

/**
 * Full English month name of a key.
 * @param key - day key
 * @returns e.g. `November`
 */
export function monthName(key: string): string {
	return MONTHS[fromKey(key).getMonth()];
}

/**
 * Long date label without the weekday (callers prepend `formatWeekday`).
 * @param key - day key
 * @returns e.g. `November 10, 2026`
 */
export function formatLong(key: string): string {
	const d = fromKey(key);
	return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/**
 * Short date label without the year.
 * @param key - day key
 * @returns e.g. `Nov 10`
 */
export function formatShort(key: string): string {
	const d = fromKey(key);
	return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

/**
 * Full weekday name.
 * @param key - day key
 * @returns e.g. `Tuesday`
 */
export function formatWeekday(key: string): string {
	return WEEKDAYS[dayOfWeek(key)];
}

/**
 * Label for a span of days, without the year (the header title carries it).
 * Same month and year share the month name; anything else joins two
 * `formatShort` labels.
 * @param from - first day
 * @param to - last day
 * @returns `Nov 8 – 14`, `Nov 29 – Dec 5`, `Dec 28 – Jan 3`, or
 *   `Nov 10 – 10` for a single day
 */
export function formatRange(from: string, to: string): string {
	const a = fromKey(from);
	const b = fromKey(to);
	if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
		return `${MONTHS_SHORT[a.getMonth()]} ${a.getDate()} – ${b.getDate()}`;
	}
	return `${formatShort(from)} – ${formatShort(to)}`;
}

/**
 * Formats minutes from midnight as a clock time.
 * @param minutes - integer minutes, 0..1440; 1440 is the end of the day.
 *   Callers round and clamp first (see `timeInputValue`); other input gives
 *   meaningless output.
 * @param format - `'24h'` (default) or `'12h'`
 * @returns `09:30` / `24:00` in 24h, `9:30 AM` / `12:00 AM` in 12h
 */
export function formatTime(minutes: number, format: TimeFormat = '24h'): string {
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	if (format === '24h') return `${pad2(h)}:${pad2(m)}`;
	const h24 = h % 24;
	const suffix = h24 < 12 ? 'AM' : 'PM';
	const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
	return `${h12}:${pad2(m)} ${suffix}`;
}

/**
 * Formats a start and end time.
 * @param start - minutes from midnight
 * @param end - minutes from midnight
 * @param format - `'24h'` (default) or `'12h'`
 * @returns e.g. `09:30 – 10:30`
 */
export function formatTimeRange(start: number, end: number, format: TimeFormat = '24h'): string {
	return `${formatTime(start, format)} – ${formatTime(end, format)}`;
}

/**
 * Formats a length of time.
 * @param minutes - non-negative minutes
 * @returns `45m`, `1h` or `1h 30m`
 */
export function formatDuration(minutes: number): string {
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	if (h === 0) return `${m}m`;
	return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/**
 * Parses a clock time strictly. Unlike the prototype's `parseTime`, input
 * it cannot read yields `null` instead of 0.
 * @param value - `H:mm` or `HH:mm` from `0:00` to `23:59`, or `24:00`;
 *   surrounding whitespace is ignored
 * @returns minutes from midnight, or `null` for anything else (`1:30 PM`,
 *   `25:00`, `''`)
 */
export function parseTimeStrict(value: string): number | null {
	const match = TIME_PATTERN.exec(value.trim());
	if (!match) return null;
	const h = Number(match[1]);
	const m = Number(match[2]);
	if (h === 24 && m === 0) return MINUTES_PER_DAY;
	if (h > 23 || m > 59) return null;
	return h * 60 + m;
}

/**
 * Value for an `<input type="time">`, which cannot show `24:00`.
 * @param minutes - minutes from midnight; rounded, then clamped to 0..1439
 *   (a non-finite value counts as 0)
 * @returns `HH:mm`
 */
export function timeInputValue(minutes: number): string {
	const finite = Number.isFinite(minutes) ? minutes : 0;
	const clamped = Math.min(MINUTES_PER_DAY - 1, Math.max(0, Math.round(finite)));
	return formatTime(clamped, '24h');
}
