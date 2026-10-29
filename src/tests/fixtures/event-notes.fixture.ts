import type { FrontmatterValue, NoteEntryV2 } from '#lib/types/vault-v2.types.js';
import type { EventColor } from '#lib/features/event-calendar/event-calendar.types.js';
import { canonicalizeKey } from '#lib/utils/frontmatter-aliases.js';
import { entryV2 } from './vault-entries.fixture';

/**
 * Parses one scalar the way Rust's `parse_scalar` does
 * (`src-tauri/src/vault/parsing.rs:681-712`): one outer quote pair is
 * stripped, `null` / `~` become null, `true` / `false` become booleans,
 * numbers become numbers, and everything else (dates, times, trailing
 * comments included) stays a string.
 */
function rustScalar(raw: string): FrontmatterValue {
	const s = raw.trim();
	if (s === '') return '';
	if (s.length >= 2 && ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")))) {
		return s.slice(1, -1);
	}
	if (['null', 'Null', 'NULL', '~'].includes(s)) return null;
	if (['true', 'True', 'TRUE'].includes(s)) return true;
	if (['false', 'False', 'FALSE'].includes(s)) return false;
	if (/^[+-]?\d+$/.test(s)) return Number(s);
	if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s)) return Number(s);
	return s;
}

/**
 * Models the Rust `parse_frontmatter` for the flat top-level scalars an
 * event note carries, as pinned in `src-tauri/tests/vault_event_frontmatter_test.rs`:
 * keys are canonicalized, a bare `key:` is null, `key: ""` is `''`, quotes
 * are stripped and a trailing ` # comment` stays in the value.
 * @param content - full note content with `---` delimiters
 * @returns the frontmatter map Rust would put on the entry
 */
export function rustFrontmatter(content: string): Record<string, FrontmatterValue> {
	const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!match) return {};
	const result: Record<string, FrontmatterValue> = {};
	for (const line of match[1].split('\n')) {
		if (line.trim() === '' || /^[ \t]/.test(line)) continue;
		const colon = line.indexOf(':');
		if (colon <= 0) continue;
		const key = canonicalizeKey(line.slice(0, colon).trim());
		const value = line.slice(colon + 1).trim();
		result[key] = value === '' ? null : rustScalar(value);
	}
	return result;
}

/** Rust's `normalize_type_casing`: only the first character is uppercased. */
function rustTypeCasing(type: string): string {
	return type.charAt(0).toUpperCase() + type.slice(1);
}

/**
 * Builds an event-typed `NoteEntryV2` the way the Rust index would.
 * String values are read as raw YAML scalars through Rust's `parse_scalar`
 * (one outer quote pair stripped, `'570'` becomes 570, `'true'` becomes true,
 * `''` stays `''`); pass `null` for a bare `key:`. `_type` defaults to
 * `Event`, and `isA` follows `_type` with Rust's casing.
 * @param path - absolute path of the note
 * @param frontmatter - frontmatter as written (canonical keys)
 * @param overrides - any other entry fields (`archived`, `isA`, `snippet`, ...)
 */
export function eventEntry(
	path: string,
	frontmatter: Record<string, FrontmatterValue> = {},
	overrides: Partial<NoteEntryV2> = {},
): NoteEntryV2 {
	const fm: Record<string, FrontmatterValue> = { _type: 'Event' };
	for (const [key, value] of Object.entries(frontmatter)) {
		fm[key] = typeof value === 'string' ? rustScalar(value) : value;
	}
	const isA = typeof fm._type === 'string' ? rustTypeCasing(fm._type) : null;
	return entryV2(path, { frontmatter: fm, isA, ...overrides });
}

/**
 * Builds an event entry from full note content, through {@link rustFrontmatter}.
 * @param path - absolute path of the note
 * @param content - note content with frontmatter
 * @param overrides - any other entry fields
 */
export function eventEntryFromContent(path: string, content: string, overrides: Partial<NoteEntryV2> = {}): NoteEntryV2 {
	const fm = rustFrontmatter(content);
	const isA = typeof fm._type === 'string' ? rustTypeCasing(fm._type) : null;
	return entryV2(path, { frontmatter: fm, isA, ...overrides });
}

/**
 * Builds note content: one `key: value` line per field, written verbatim,
 * then the body.
 * @param fields - frontmatter lines as raw YAML values
 * @param body - text after the frontmatter
 */
export function eventNote(fields: Record<string, string>, body = ''): string {
	const lines = Object.entries(fields).map(([k, v]) => (v === '' ? `${k}:` : `${k}: ${v}`));
	return `---\n${lines.join('\n')}\n---\n${body}`;
}

/** One prototype seed event. */
export interface SeedEvent {
	/** Prototype id (`ev-N`). */
	id: string;
	/** Display title. */
	title: string;
	/** Day key. */
	date: string;
	/** Start in minutes from midnight. */
	start: number;
	/** End in minutes from midnight. */
	end: number;
	/** Whether it is all-day. */
	allDay: boolean;
	/** Event color. */
	color: EventColor;
	/** Optional note text (the prototype's `note`). */
	note?: string;
}

const h = (hours: number, minutes = 0) => hours * 60 + minutes;

/**
 * The prototype seed events (`calender-app-design/src/lib/seed.ts:22-67`),
 * without `requestId` and without the inconsistent ev-14.
 */
export const SEED_EVENTS: readonly SeedEvent[] = [
	{ id: 'ev-1', title: 'Time off', date: '2026-11-09', start: 0, end: 1440, allDay: true, color: 'green' },
	{ id: 'ev-2', title: 'Personal matters', date: '2026-11-08', start: h(11), end: h(12), allDay: false, color: 'cyan' },
	{ id: 'ev-3', title: 'Personal appointment', date: '2026-11-10', start: h(7), end: h(9), allDay: false, color: 'orange', note: 'Pending' },
	{ id: 'ev-4', title: 'Extra leave', date: '2026-11-10', start: h(11), end: h(13), allDay: false, color: 'pink', note: 'From carryover days' },
	{ id: 'ev-5', title: 'Submit medical certificate', date: '2026-11-11', start: h(10), end: h(11), allDay: false, color: 'blue' },
	{ id: 'ev-6', title: 'Update time tracking', date: '2026-11-12', start: h(7, 30), end: h(8), allDay: false, color: 'cyan' },
	{ id: 'ev-7', title: 'Benefits review', date: '2026-11-12', start: h(12), end: h(13), allDay: false, color: 'blue' },
	{ id: 'ev-8', title: 'Half-day leave', date: '2026-11-13', start: h(8), end: h(12), allDay: false, color: 'green', note: 'Approved' },
	{ id: 'ev-9', title: 'Team sync', date: '2026-10-26', start: h(9, 30), end: h(10), allDay: false, color: 'blue' },
	{ id: 'ev-10', title: 'Design review', date: '2026-10-27', start: h(14), end: h(15, 30), allDay: false, color: 'purple' },
	{ id: 'ev-11', title: 'Payroll cut-off', date: '2026-10-30', start: 0, end: 1440, allDay: true, color: 'orange' },
	{ id: 'ev-12', title: '1:1 with manager', date: '2026-11-04', start: h(11), end: h(11, 30), allDay: false, color: 'cyan' },
	{ id: 'ev-13', title: 'Time off', date: '2026-12-23', start: 0, end: 1440, allDay: true, color: 'green' },
	{ id: 'ev-15', title: 'Time off', date: '2026-12-28', start: h(9), end: h(15), allDay: false, color: 'green', note: 'Pending' },
];
