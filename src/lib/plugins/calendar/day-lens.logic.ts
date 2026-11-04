import { buildCaptureFolder } from '#lib/utils/capture-path.js';
import { parseDateKey } from '#lib/utils/note-date.js';
import { entryNoteDate, listEntries } from '#lib/features/rail-shell/lens.logic.js';
import { excludeSystemFolder, isListableNote } from '#lib/features/type-definitions/type-sidebar.logic.js';
import type { Lens, LensContext, NewNoteContext, NewNoteRule, ResolvedLens } from '#lib/features/rail-shell/rail-shell.types.js';
import { formatDateLabel } from './calendar.logic';

/** The lens kind of a Calendar navigator day; its target is the day's `YYYY-MM-DD` key. */
export const DAY_LENS_KIND = 'day';

/** The rail item (and navigator id) of the Calendar navigator. */
export const CALENDAR_RAIL_ITEM = 'calendar';

/**
 * A day saved in `layout.railDay`, or null. The value comes from
 * settings.json, so only a bare `YYYY-MM-DD` key of a real day counts.
 */
export function parseRailDay(saved: unknown): string | null {
	if (typeof saved !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(saved)) return null;
	return parseDateKey(saved) === saved ? saved : null;
}

/** The Calendar navigator's lens: the saved day, else today (`todayKey`). */
export function pickedDayLens(saved: unknown, todayKey: string): Lens {
	return { kind: DAY_LENS_KIND, target: parseRailDay(saved) ?? todayKey };
}

/**
 * Lists a day lens: the notes whose note date is the day (the PRD's rule,
 * `noteDateKey`), system folder, type definitions and `.view` files excluded
 * (`isListableNote`), newest change first. Archived notes
 * stay: the Day rule is only the note date. A target that is not a day lists
 * nothing.
 */
export function resolveDayLens(lens: Lens, ctx: LensContext): ResolvedLens {
	const day = parseRailDay(lens.target);
	if (!day) return { label: '', rule: '', notes: [] };
	return {
		label: formatDateLabel(day),
		rule: `note date is ${day}`,
		notes: listEntries(ctx, (e) => isListableNote(e) && entryNoteDate(e) === day),
	};
}

/** Notes per note date, counted over the same entries and rule the day lens lists: the mini month's dots. */
export function noteDateCounts(ctx: Pick<LensContext, 'entries' | 'vaultPath' | 'systemFolder'>): Map<string, number> {
	const counts = new Map<string, number>();
	for (const entry of excludeSystemFolder(ctx.entries, ctx.vaultPath, ctx.systemFolder)) {
		if (!isListableNote(entry)) continue;
		const day = entryNoteDate(entry);
		if (day) counts.set(day, (counts.get(day) ?? 0) + 1);
	}
	return counts;
}

/** "+ New here" on a day: a plain note where Cmd+N puts one, with `date: <day>`. Null without a vault or a day. */
export function dayNewNoteRule(lens: Lens, ctx: NewNoteContext): NewNoteRule | null {
	const day = parseRailDay(lens.target);
	if (!ctx.vaultPath || !day) return null;
	return {
		folder: buildCaptureFolder(ctx.vaultPath, ctx.captureBaseFolder, ctx.captureFolderFormat, ctx.now),
		frontmatter: { date: day },
	};
}
