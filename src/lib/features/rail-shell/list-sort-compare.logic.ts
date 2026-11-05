import { naturalCompare } from '#lib/core/filesystem/fs.logic.js';
import type { ListSortConfig, ListSortOption } from '#lib/features/rail-shell/list-toolbar.types.js';
import type { LensGroup, LensNote, ResolvedLens } from '#lib/features/rail-shell/rail-shell.types.js';

const PROPERTY_PREFIX = 'property:';

/** The note's field for an option, before arrays are joined. */
function rawValue(note: LensNote, option: ListSortOption): unknown {
	switch (option) {
		case 'modified':
			return note.modifiedAt;
		case 'created':
			return note.createdAt;
		case 'title':
			return note.title;
		case 'status':
			return note.frontmatter.status;
		default:
			return note.frontmatter[option.slice(PROPERTY_PREFIX.length)];
	}
}

/** The comparable value: arrays are joined to text, so the comparison only sees scalars. */
function sortValue(note: LensNote, option: ListSortOption): unknown {
	const raw = rawValue(note, option);
	return Array.isArray(raw) ? raw.map((item) => String(item)).join(', ') : raw;
}

/**
 * A missing value sorts last whichever way the list runs. Zero counts as
 * missing only for the two times, where 0 means "unknown"; a property set to 0
 * is a real number.
 */
function isMissing(note: LensNote, option: ListSortOption): boolean {
	const raw = rawValue(note, option);
	if (option === 'modified' || option === 'created') return raw === 0;
	return raw === undefined || raw === null || raw === '' || (Array.isArray(raw) && raw.length === 0);
}

/** Unix milliseconds of a string that starts with a calendar date, or null. */
function dateTime(value: string): number | null {
	if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return null;
	// `Date.parse` reads a bare date as UTC but a date-time as local, which would misorder the two west of UTC.
	const local = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value.replace(' ', 'T');
	const time = Date.parse(local);
	return Number.isNaN(time) ? null : time;
}

/** Numeric so "item 2" comes before "item 10"; base sensitivity so "Água" sits with "a", not after "z". */
const textCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/** A value's kind rank and what orders it within that kind. */
function comparable(value: unknown): { rank: number; number: number; text: string } {
	if (typeof value === 'number') return { rank: 0, number: value, text: '' };
	if (typeof value === 'boolean') return { rank: 1, number: Number(value), text: '' };
	const text = String(value);
	const time = dateTime(text);
	return time !== null ? { rank: 2, number: time, text: '' } : { rank: 3, number: 0, text };
}

/**
 * Ascending order of two present values. Kinds order first (numbers, booleans,
 * dates, text): comparing across kinds as text is not a consistent order
 * (1.25 < 1.5 by value, 1.5 < "1.7 days" < 1.25 by text), and the list would
 * then depend on its input order.
 */
function compareValues(a: unknown, b: unknown): number {
	const left = comparable(a);
	const right = comparable(b);
	if (left.rank !== right.rank) return left.rank - right.rank;
	return left.rank === 3 ? textCollator.compare(left.text, right.text) : left.number - right.number;
}

/**
 * Ties break by title, then path, both ascending whichever way the value runs.
 * Two notes with the same title would otherwise keep an order that depends on
 * the input, so the list would reshuffle between refreshes.
 */
function compareNotes(a: LensNote, b: LensNote, config: ListSortConfig): number {
	const missingA = isMissing(a, config.option);
	const missingB = isMissing(b, config.option);
	if (missingA !== missingB) return missingA ? 1 : -1;
	if (!missingA) {
		const order = compareValues(sortValue(a, config.option), sortValue(b, config.option));
		if (order !== 0) return config.direction === 'asc' ? order : -order;
	}
	return naturalCompare(a.title, b.title) || naturalCompare(a.path, b.path);
}

/** Returns a new array of `notes` in the given order; the input is not changed. */
export function sortLensNotes(notes: readonly LensNote[], config: ListSortConfig): LensNote[] {
	return [...notes].sort((a, b) => compareNotes(a, b, config));
}

/**
 * Applies a sort to a resolved lens. With groups, each group is sorted and
 * `notes` lists each grouped note once, in group order, which is the
 * `ResolvedLens.notes` contract; `resolved.notes` is then not read.
 */
export function applyListSort(resolved: ResolvedLens, config: ListSortConfig): ResolvedLens {
	if (!resolved.groups) {
		return { ...resolved, notes: sortLensNotes(resolved.notes, config) };
	}
	const groups: LensGroup[] = resolved.groups.map((group) => ({
		...group,
		notes: sortLensNotes(group.notes, config),
	}));
	const seen = new Set<string>();
	const notes = groups
		.flatMap((group) => group.notes)
		.filter((note) => {
			if (seen.has(note.path)) return false;
			seen.add(note.path);
			return true;
		});
	return { ...resolved, notes, groups };
}
