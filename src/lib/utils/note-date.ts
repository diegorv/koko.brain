import dayjs from 'dayjs';

/**
 * The sources a note's day can come from. Frontmatter values are raw YAML
 * values (`unknown`), the disk time is the file's creation time in ms.
 */
export interface NoteDateSources {
	/** Frontmatter `date` value */
	date?: unknown;
	/** Frontmatter `created` value */
	created?: unknown;
	/** File creation time on disk, Unix ms; falsy means unknown */
	diskCreatedAt?: number | null;
}

/**
 * `YYYY-MM-DD`, optionally followed by a `T` or space and an `HH:mm[:ss[.SSS]]`
 * time with an optional `Z` / `±HH:mm` offset. Anything else is not a date:
 * dayjs alone would fall back to V8's lenient `Date` parser and give a day to
 * text like `Meeting 12` or roll `2026-02-30` forward to March.
 */
const DATE_STRING_PATTERN =
	/^(\d{4})-(\d{2})-(\d{2})(?:[T ](?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

/**
 * Parses a frontmatter date value into a 'YYYY-MM-DD' key in local time.
 * Accepts a string matching `DATE_STRING_PATTERN` whose day exists, and a
 * valid Date object; anything else returns null, numbers included (a YAML
 * number such as `2026` is not a date). Never throws.
 */
export function parseDateKey(value: unknown): string | null {
	if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : dayjs(value).format('YYYY-MM-DD');
	if (typeof value !== 'string') return null;
	const match = DATE_STRING_PATTERN.exec(value);
	if (!match) return null;
	const [, y, m, d, offset] = match;
	const day = new Date(Number(y), Number(m) - 1, Number(d));
	if (day.getFullYear() !== Number(y) || day.getMonth() !== Number(m) - 1 || day.getDate() !== Number(d)) return null;
	// Without an offset the written day is the local day; with one, the instant decides it.
	// The pattern does not range-check the offset, so `+99:99` reaches here as an invalid instant.
	if (!offset) return `${y}-${m}-${d}`;
	const instant = dayjs(value);
	return instant.isValid() ? instant.format('YYYY-MM-DD') : null;
}

/**
 * The day a note belongs to (the PRD's "note date"): frontmatter `date`, else
 * frontmatter `created`, else the disk creation time. A source that does not
 * parse falls through to the next one. Returns null when no source yields a day.
 */
export function noteDateKey({ date, created, diskCreatedAt }: NoteDateSources): string | null {
	return (
		parseDateKey(date) ??
		parseDateKey(created) ??
		(diskCreatedAt && Number.isFinite(diskCreatedAt) ? dayjs(diskCreatedAt).format('YYYY-MM-DD') : null)
	);
}
