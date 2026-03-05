/** Represents a parsed duration */
export interface Duration {
	/** Total duration in milliseconds */
	milliseconds: number;
	/** Original input string */
	source: string;
}

/** Mapping of unit identifiers to their millisecond value */
const UNIT_MAP: Record<string, number> = {
	ms: 1,
	millisecond: 1,
	milliseconds: 1,
	s: 1000,
	sec: 1000,
	second: 1000,
	seconds: 1000,
	m: 60_000,
	min: 60_000,
	minute: 60_000,
	minutes: 60_000,
	h: 3_600_000,
	hr: 3_600_000,
	hour: 3_600_000,
	hours: 3_600_000,
	d: 86_400_000,
	day: 86_400_000,
	days: 86_400_000,
	w: 604_800_000,
	wk: 604_800_000,
	week: 604_800_000,
	weeks: 604_800_000,
	M: 2_592_000_000,
	mo: 2_592_000_000,
	month: 2_592_000_000,
	months: 2_592_000_000,
	y: 31_536_000_000,
	yr: 31_536_000_000,
	year: 31_536_000_000,
	years: 31_536_000_000,
};

/** Pattern matching a number followed by a unit: "1d", "2 weeks", "3.5h" */
const DURATION_PART = /(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/g;

/**
 * Parses a duration string into milliseconds.
 * Supports compound durations like "1h 30m" and various unit formats.
 * Returns null if the string doesn't contain any valid duration parts.
 */
export function parseDuration(input: string): Duration | null {
	const trimmed = input.trim();
	if (!trimmed) return null;

	let total = 0;
	let matched = false;

	let match: RegExpExecArray | null;
	DURATION_PART.lastIndex = 0;
	while ((match = DURATION_PART.exec(trimmed)) !== null) {
		const amount = parseFloat(match[1]);
		const unit = match[2];
		const ms = UNIT_MAP[unit];
		if (ms === undefined) return null;
		total += amount * ms;
		matched = true;
	}

	if (!matched) return null;
	return { milliseconds: total, source: trimmed };
}

/**
 * Checks if a value looks like a duration string.
 * A quick heuristic: starts with a digit and contains a unit-like suffix.
 */
export function isDurationString(value: unknown): boolean {
	if (typeof value !== 'string') return false;
	return parseDuration(value) !== null;
}
