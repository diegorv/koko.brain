import dayjs from 'dayjs';
import { today, formatToCapturingRegex } from '$lib/utils/date';
import type { PeriodType, PeriodicNotesSettings } from '$lib/core/settings/settings.types';

// Re-export template engine from utils for backward compatibility
export { processTemplate, evaluateExpression } from '$lib/utils/template';

/**
 * Maps a dayjs manipulation unit to each period type.
 * Used by buildAdjacentPeriodPath for offset calculations.
 * Note: 'quarter' requires the quarterOfYear plugin (loaded in utils/date).
 */
const PERIOD_UNIT: Record<PeriodType, dayjs.ManipulateType> = {
	daily: 'day',
	weekly: 'week',
	monthly: 'month',
	quarterly: 'month',
	yearly: 'year',
};

/** Number of base units per period type (quarterly = 3 months) */
const PERIOD_MULTIPLIER: Record<PeriodType, number> = {
	daily: 1,
	weekly: 1,
	monthly: 1,
	quarterly: 3,
	yearly: 1,
};

/**
 * Builds the full absolute path for a periodic note given a specific date.
 * The format may include path separators for subfolder structures
 * (e.g. "YYYY/MM-MMM/_journal-day-DD-MM-YYYY" → "2026/02-Feb/_journal-day-11-02-2026.md").
 */
export function buildPeriodicNotePath(
	vaultPath: string,
	folder: string,
	format: string,
	date: dayjs.Dayjs,
): string {
	const formatted = date.format(format);
	const fileName = `${formatted}.md`;
	if (folder) {
		return `${vaultPath}/${folder}/${fileName}`;
	}
	return `${vaultPath}/${fileName}`;
}

/**
 * Builds the full absolute path for today's periodic note of a given type.
 */
export function buildPeriodicNotePathForToday(
	vaultPath: string,
	folder: string,
	format: string,
): string {
	return buildPeriodicNotePath(vaultPath, folder, format, dayjs());
}

/**
 * Builds the path for an adjacent period (previous/next) from a reference date.
 * @param offset - Number of periods to offset (e.g. -1 for previous, +1 for next)
 * @param periodType - Which period unit to offset by
 */
export function buildAdjacentPeriodPath(
	vaultPath: string,
	folder: string,
	format: string,
	date: dayjs.Dayjs,
	offset: number,
	periodType: PeriodType,
): string {
	const unit = PERIOD_UNIT[periodType];
	const multiplier = PERIOD_MULTIPLIER[periodType];
	const offsetDate = date.add(offset * multiplier, unit);
	return buildPeriodicNotePath(vaultPath, folder, format, offsetDate);
}

/**
 * Extracts the file title (the formatted date portion) from a periodic note's format.
 */
export function getPeriodicNoteTitle(format: string, date: dayjs.Dayjs): string {
	return date.format(format);
}

/**
 * Returns the file title for today's periodic note.
 */
export function getTodayPeriodicNoteTitle(format: string): string {
	return today(format);
}

/**
 * Returns the format string for a given period type from settings.
 */
export function getFormatForPeriod(settings: PeriodicNotesSettings, periodType: PeriodType): string {
	return settings[periodType].format;
}

/**
 * Returns the template path for a given period type from settings.
 */
export function getTemplatePathForPeriod(settings: PeriodicNotesSettings, periodType: PeriodType): string | undefined {
	return settings[periodType].templatePath;
}

/**
 * Returns the inline template for daily notes (only daily has an inline template fallback).
 */
export function getDailyInlineTemplate(settings: PeriodicNotesSettings): string {
	return settings.daily.template;
}

/**
 * Builds path for a periodic note from a dateKey string ("YYYY-MM-DD").
 * Used by the calendar service for arbitrary dates.
 */
export function buildPeriodicNotePathForDate(
	vaultPath: string,
	folder: string,
	format: string,
	dateKey: string,
): string {
	const date = dayjs(dateKey, 'YYYY-MM-DD');
	return buildPeriodicNotePath(vaultPath, folder, format, date);
}

/**
 * Builds a wikilink-compatible relative path (no vault prefix, no `.md` extension).
 * This is the path that goes inside `[[...]]` wikilinks.
 */
export function buildWikilinkPath(folder: string, format: string, date: dayjs.Dayjs): string {
	const formatted = date.format(format);
	return folder ? `${folder}/${formatted}` : formatted;
}

/**
 * Builds all custom template variables for a periodic note type.
 * Returns a `Record<string, string>` to be passed as `customVariables` to `openOrCreateNote()`.
 *
 * Common variables (all types): `year`, `month`, `monthName`, `week`, `quarter`, `yearPath`.
 * Navigation variables vary by type (e.g. `yesterdayPath`/`tomorrowPath` for daily).
 * Table variables: `dailyLinksTable` (weekly), `weeklyLinksTable` (monthly), `monthlyLinksTable` (quarterly), `quarterlyLinksTable` (yearly).
 */
export function buildPeriodicVariables(
	type: PeriodType,
	date: dayjs.Dayjs,
	settings: PeriodicNotesSettings,
): Record<string, string> {
	const vars: Record<string, string> = {};
	const { folder } = settings;

	// Common variables for all types
	vars.year = date.format('YYYY');
	vars.month = date.format('MM');
	vars.monthName = date.format('MMMM');
	vars.week = date.format('WW');
	vars.quarter = String(date.quarter());
	vars.yearPath = buildWikilinkPath(folder, settings.yearly.format, date);

	switch (type) {
		case 'daily':
			vars.yesterdayPath = buildWikilinkPath(folder, settings.daily.format, date.subtract(1, 'day'));
			vars.tomorrowPath = buildWikilinkPath(folder, settings.daily.format, date.add(1, 'day'));
			vars.weekPath = buildWikilinkPath(folder, settings.weekly.format, date);
			vars.monthPath = buildWikilinkPath(folder, settings.monthly.format, date);
			vars.quarterPath = buildWikilinkPath(folder, settings.quarterly.format, date);
			break;

		case 'weekly':
			vars.prevWeekPath = buildWikilinkPath(folder, settings.weekly.format, date.subtract(1, 'week'));
			vars.nextWeekPath = buildWikilinkPath(folder, settings.weekly.format, date.add(1, 'week'));
			vars.monthPath = buildWikilinkPath(folder, settings.monthly.format, date);
			vars.quarterPath = buildWikilinkPath(folder, settings.quarterly.format, date);
			vars.dailyLinksTable = buildDailyLinksTable(folder, settings.daily.format, date);
			break;

		case 'monthly':
			vars.prevMonthPath = buildWikilinkPath(folder, settings.monthly.format, date.subtract(1, 'month'));
			vars.nextMonthPath = buildWikilinkPath(folder, settings.monthly.format, date.add(1, 'month'));
			vars.quarterPath = buildWikilinkPath(folder, settings.quarterly.format, date);
			vars.weeklyLinksTable = buildWeeklyLinksTable(folder, settings.weekly.format, date);
			break;

		case 'quarterly':
			vars.prevQuarterPath = buildWikilinkPath(folder, settings.quarterly.format, date.subtract(3, 'month'));
			vars.nextQuarterPath = buildWikilinkPath(folder, settings.quarterly.format, date.add(3, 'month'));
			vars.monthlyLinksTable = buildMonthlyLinksTable(folder, settings.monthly.format, date);
			break;

		case 'yearly':
			vars.prevYearPath = buildWikilinkPath(folder, settings.yearly.format, date.subtract(1, 'year'));
			vars.nextYearPath = buildWikilinkPath(folder, settings.yearly.format, date.add(1, 'year'));
			vars.quarterlyLinksTable = buildQuarterlyLinksTable(folder, settings.quarterly.format, date);
			break;
	}

	return vars;
}

/**
 * Builds a markdown table with wikilinks to each day (Mon–Sun) of the week containing the given date.
 * Used as the `<% dailyLinksTable %>` variable in weekly note templates.
 */
export function buildDailyLinksTable(folder: string, dailyFormat: string, date: dayjs.Dayjs): string {
	const startOfWeek = date.startOf('isoWeek');
	const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

	const rows = dayNames.map((dayName, i) => {
		const d = startOfWeek.add(i, 'day');
		const path = buildWikilinkPath(folder, dailyFormat, d);
		return `| ${dayName} | [[${path}|${d.format('ddd DD')}]] |`;
	});

	return `| Day | Link |\n|-----|------|\n${rows.join('\n')}`;
}

/**
 * Builds a markdown table with wikilinks to each ISO week that overlaps the given month.
 * Used as the `<% weeklyLinksTable %>` variable in monthly note templates.
 */
export function buildWeeklyLinksTable(folder: string, weeklyFormat: string, date: dayjs.Dayjs): string {
	const firstWeek = date.startOf('month').startOf('isoWeek');
	const lastWeek = date.endOf('month').startOf('isoWeek');

	const rows: string[] = [];
	let current = firstWeek;
	while (current.isBefore(lastWeek) || current.isSame(lastWeek, 'day')) {
		const path = buildWikilinkPath(folder, weeklyFormat, current);
		const weekNum = current.format('WW');
		rows.push(`| Week ${weekNum} | [[${path}|W${weekNum}]] |`);
		current = current.add(1, 'week');
	}

	return `| Week | Link |\n|------|------|\n${rows.join('\n')}`;
}

/**
 * Builds a markdown table with wikilinks to the 3 months of the quarter containing the given date.
 * Used as the `<% monthlyLinksTable %>` variable in quarterly note templates.
 */
export function buildMonthlyLinksTable(folder: string, monthlyFormat: string, date: dayjs.Dayjs): string {
	const quarter = date.quarter();
	const firstMonth = (quarter - 1) * 3; // 0-indexed: Q1→0, Q2→3, Q3→6, Q4→9

	const rows: string[] = [];
	for (let i = 0; i < 3; i++) {
		const d = date.month(firstMonth + i).startOf('month');
		const path = buildWikilinkPath(folder, monthlyFormat, d);
		rows.push(`| ${d.format('MMMM')} | [[${path}|${d.format('MMMM')}]] |`);
	}

	return `| Month | Link |\n|-------|------|\n${rows.join('\n')}`;
}

/**
 * Builds a markdown table with wikilinks to the 4 quarters of the year containing the given date.
 * Used as the `<% quarterlyLinksTable %>` variable in yearly note templates.
 */
export function buildQuarterlyLinksTable(folder: string, quarterlyFormat: string, date: dayjs.Dayjs): string {
	const rows: string[] = [];
	for (let q = 1; q <= 4; q++) {
		const d = date.quarter(q).startOf('quarter');
		const path = buildWikilinkPath(folder, quarterlyFormat, d);
		rows.push(`| Q${q} | [[${path}|Q${q} ${d.year()}]] |`);
	}

	return `| Quarter | Link |\n|---------|------|\n${rows.join('\n')}`;
}

/** Month name (abbreviated or full) → 0-indexed month number.
 *  "May" is intentionally only in the abbreviation row — it's the same as the full name. */
const MONTH_ABBR: Record<string, number> = {
	Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
	Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
	January: 0, February: 1, March: 2, April: 3, June: 5,
	July: 6, August: 7, September: 8, October: 9, November: 10, December: 11,
};

/** Period types checked in order (most specific first) */
const PERIOD_TYPES: PeriodType[] = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];

/**
 * Detects whether a wikilink target matches a periodic note pattern.
 * Returns the matched period type and reconstructed date, or `null` if no match.
 *
 * @param target - Wikilink target without `.md` (e.g. `"_notes/2026/02-Feb/_journal-day-14-02-2026"`)
 * @param settings - Current periodic notes settings (folder + format per type)
 */
export function detectPeriodicNoteType(
	target: string,
	settings: PeriodicNotesSettings,
): { periodType: PeriodType; date: dayjs.Dayjs } | null {
	const { folder } = settings;
	const prefix = folder ? `${folder}/` : '';

	if (folder && !target.startsWith(prefix)) return null;

	const relativePath = folder ? target.slice(prefix.length) : target;

	for (const periodType of PERIOD_TYPES) {
		const format = getFormatForPeriod(settings, periodType);
		const regex = formatToCapturingRegex(format);
		const match = relativePath.match(regex);
		if (!match?.groups) continue;

		const date = buildDateFromGroups(match.groups, periodType);
		if (date && date.isValid()) {
			return { periodType, date };
		}
	}

	return null;
}

/**
 * Reconstructs a dayjs date from named regex capture groups.
 * The strategy varies by period type to avoid ambiguity:
 * - daily: year + month + day
 * - weekly: year + ISO week (→ start of that week)
 * - monthly: year + month (→ start of that month)
 * - quarterly: year + quarter (→ start of that quarter)
 * - yearly: year only (→ start of that year)
 */
function buildDateFromGroups(
	groups: Record<string, string>,
	periodType: PeriodType,
): dayjs.Dayjs | null {
	const year = groups.year ? Number(groups.year) : null;
	if (year === null) return null;

	const month = groups.month
		? Number(groups.month) - 1
		: groups.monthName
			? (MONTH_ABBR[groups.monthName] ?? null)
			: null;

	// Build from a safe base date (Jan 1) to avoid month-overflow when chaining
	// on dayjs(). E.g. if today is Mar 31, `.month(1)` would overflow Feb → Mar.
	const base = dayjs(new Date(year, 0, 1));

	switch (periodType) {
		case 'daily': {
			const day = groups.day ? Number(groups.day) : null;
			if (month === null || day === null) return null;
			return base.month(month).date(day).startOf('day');
		}
		case 'weekly': {
			const week = groups.week ? Number(groups.week) : null;
			if (week === null) return null;
			return base.isoWeek(week).startOf('isoWeek');
		}
		case 'monthly': {
			if (month === null) return null;
			return base.month(month).startOf('month');
		}
		case 'quarterly': {
			const quarter = groups.quarter ? Number(groups.quarter) : null;
			if (quarter === null) return null;
			return base.quarter(quarter).startOf('quarter');
		}
		case 'yearly':
			return base.startOf('year');
	}
}
