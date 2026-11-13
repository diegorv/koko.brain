/** Exactly `YYYY-MM-DD`, nothing before or after. */
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Reads a `YYYY-MM-DD` string as local midnight of that day.
 *
 * Built with `new Date(y, m - 1, d)` on purpose: `new Date('YYYY-MM-DD')` is UTC
 * midnight, which west of UTC falls on the previous local day.
 * @param value - candidate day string
 * @returns local midnight, or `null` when `value` is not exactly `YYYY-MM-DD`
 *   or names a day that does not exist (month 13, Feb 30)
 */
export function parseLocalDateOnly(value: string): Date | null {
	const match = DATE_ONLY.exec(value);
	if (!match) return null;
	const year = Number(match[1]);
	const month = Number(match[2]) - 1;
	const day = Number(match[3]);
	const date = new Date(year, month, day);
	// The constructor rolls out-of-range parts over (Feb 30 -> Mar 2), so a
	// date that does not read back the same parts was not a real day.
	if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null;
	return date;
}
