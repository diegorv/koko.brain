import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import advancedFormat from 'dayjs/plugin/advancedFormat';

dayjs.extend(customParseFormat);
dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);
dayjs.extend(quarterOfYear);
dayjs.extend(advancedFormat);

/** Returns today's date formatted with the given format (default: 'YYYY-MM-DD'). */
export function today(format: string = 'YYYY-MM-DD'): string {
	return dayjs().format(format);
}

/** Returns the current datetime formatted, with an optional day offset. */
export function formatNow(outputFormat: string, offsetDays: number = 0): string {
	return dayjs().add(offsetDays, 'day').format(outputFormat);
}

/** Formats a date value (string, Date, dayjs, etc.) into the given format string. */
export function formatDate(date: dayjs.ConfigType, format: string): string {
	return dayjs(date).format(format);
}

/** Parses a date string using the given input format and returns a dayjs instance. */
export function parseDate(dateStr: string, inputFormat: string): dayjs.Dayjs {
	return dayjs(dateStr, inputFormat);
}

/**
 * Converts a dayjs format string into a regex that matches formatted dates.
 * Handles common tokens (YYYY, MM, DD, etc.) and dayjs literal escapes (`[text]`).
 */
function formatToRegex(format: string): RegExp {
	// Step 1: Replace [...] literals with placeholders to avoid token matching inside them
	const literals: string[] = [];
	let pattern = format.replace(/\[([^\]]*)\]/g, (_, lit: string) => {
		const idx = literals.length;
		literals.push(lit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
		return `\x00LIT${idx}\x00`;
	});

	// Step 2: Replace tokens (longer tokens first to avoid partial matches)
	pattern = pattern
		.replace(/YYYY/g, '\\d{4}')
		.replace(/YY/g, '\\d{2}')
		.replace(/MMMM/g, '[A-Za-z]+')
		.replace(/MMM/g, '[A-Za-z]{3}')
		.replace(/MM/g, '\\d{2}')
		.replace(/M/g, '\\d{1,2}')
		.replace(/DD/g, '\\d{2}')
		.replace(/Do/g, '\\d{1,2}\\w+')
		.replace(/D/g, '\\d{1,2}')
		.replace(/HH/g, '\\d{2}')
		.replace(/H/g, '\\d{1,2}')
		.replace(/mm/g, '\\d{2}')
		.replace(/m/g, '\\d{1,2}')
		.replace(/ss/g, '\\d{2}')
		.replace(/s/g, '\\d{1,2}')
		.replace(/SSS/g, '\\d{3}')
		.replace(/WW/g, '\\d{2}')
		.replace(/Q/g, '\\d');

	// Step 3: Restore literal placeholders
	pattern = pattern.replace(/\x00LIT(\d+)\x00/g, (_, idx) => literals[Number(idx)]);

	return new RegExp(pattern);
}

/**
 * Converts a dayjs format string into an anchored regex (`^...$`) with named capture groups.
 * Only the first occurrence of each token becomes a named group; duplicates become plain patterns.
 *
 * Captured groups: `year`, `month`, `monthName`, `day`, `week`, `quarter`.
 */
export function formatToCapturingRegex(format: string): RegExp {
	const usedGroups = new Set<string>();

	function captureOrPlain(groupName: string, pattern: string): string {
		if (usedGroups.has(groupName)) return pattern;
		usedGroups.add(groupName);
		return `(?<${groupName}>${pattern})`;
	}

	// Step 1: Replace [...] literals with placeholders to avoid token matching inside them
	const literals: string[] = [];
	let processed = format.replace(/\[([^\]]*)\]/g, (_, lit: string) => {
		const idx = literals.length;
		literals.push(lit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
		return `\x00LIT${idx}\x00`;
	});

	// Step 2: Replace tokens (longer tokens first to avoid partial matches)
	processed = processed
		.replace(/YYYY/g, () => captureOrPlain('year', '\\d{4}'))
		.replace(/YY/g, () => captureOrPlain('year', '\\d{2}'))
		.replace(/MMMM/g, () => captureOrPlain('monthName', '[A-Za-z]+'))
		.replace(/MMM/g, () => captureOrPlain('monthName', '[A-Za-z]{3}'))
		.replace(/MM/g, () => captureOrPlain('month', '\\d{2}'))
		.replace(/M/g, () => captureOrPlain('month', '\\d{1,2}'))
		.replace(/DD/g, () => captureOrPlain('day', '\\d{2}'))
		.replace(/Do/g, () => captureOrPlain('day', '\\d{1,2}\\w+'))
		.replace(/D/g, () => captureOrPlain('day', '\\d{1,2}'))
		.replace(/WW/g, () => captureOrPlain('week', '\\d{2}'))
		.replace(/Q/g, () => captureOrPlain('quarter', '\\d'));

	// Step 3: Restore literal placeholders
	processed = processed.replace(/\x00LIT(\d+)\x00/g, (_, idx) => literals[Number(idx)]);

	return new RegExp(`^${processed}$`);
}

/**
 * Parses a reference date string using the given input format, applies a day offset,
 * and returns the result in the output format.
 *
 * When `referenceDate` contains extra text (e.g. a filename prefix like `_journal-day-12-02-2026`),
 * it extracts the date substring matching `inputFormat` before parsing.
 */
export function formatDateWithOffset(
	referenceDate: string,
	inputFormat: string,
	outputFormat: string,
	offsetDays: number,
	useCurrentTime: boolean = false,
): string {
	// Try strict parsing first
	let parsed = dayjs(referenceDate, inputFormat, true);

	if (!parsed.isValid()) {
		// Extract the date substring from the input using a regex built from the format
		const match = referenceDate.match(formatToRegex(inputFormat));
		if (match) {
			parsed = dayjs(match[0], inputFormat, true);
		}
	}

	if (!parsed.isValid()) {
		// Last resort: non-strict fallback
		parsed = dayjs(referenceDate, inputFormat);
	}

	// If all parsing attempts failed, return the original string as-is
	if (!parsed.isValid()) {
		return referenceDate;
	}

	if (useCurrentTime) {
		const now = dayjs();
		parsed = parsed.hour(now.hour()).minute(now.minute()).second(now.second());
	}

	return parsed.add(offsetDays, 'day').format(outputFormat);
}
