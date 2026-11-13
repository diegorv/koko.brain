import dayjs from 'dayjs';
import type { PeriodicNotesSettings } from '#lib/core/settings/settings.types.js';
import { isViewFile } from '#lib/core/filesystem/fs.logic.js';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';
import { entryNoteDate } from '#lib/features/rail-shell/lens.logic.js';
import { buildWikilinkPath } from '#lib/plugins/periodic-notes/periodic-notes.logic.js';
import { parseDateKey } from '#lib/utils/note-date.js';

/** A person entry loaded from the people folder */
export interface PersonEntry {
	/** Person name (filename without extension) */
	name: string;
	/** Absolute path to the person's .md file */
	path: string;
	/** Whether this person belongs to the work or personal context */
	context: 'work' | 'personal';
}

/**
 * Builds the full absolute path for a 1:1 note.
 * Combines: vaultPath / baseFolder / folderFormat(date) / filenameFormat(date, person).md
 *
 * The filenameFormat supports a `{person}` placeholder that is replaced
 * with the person's name before dayjs formatting is applied.
 */
export function buildOneOnOnePath(
	vaultPath: string,
	baseFolder: string,
	folderFormat: string,
	filenameFormat: string,
	personName: string,
	date: dayjs.Dayjs,
): string {
	// Wrap personName in [] so dayjs treats it as literal text
	const resolvedFormat = filenameFormat.replace('{person}', `[${personName}]`);
	const filename = date.format(resolvedFormat);
	const parts = [vaultPath];
	if (baseFolder) parts.push(baseFolder);
	if (folderFormat) parts.push(date.format(folderFormat));
	parts.push(`${filename}.md`);
	return parts.join('/');
}

/**
 * Builds custom template variables for a 1:1 note.
 * These are passed as customVariables to openOrCreateNote() and
 * used in the template as <% variableName %>.
 */
export function buildOneOnOneVariables(
	date: dayjs.Dayjs,
	personName: string,
	periodicNotesSettings: PeriodicNotesSettings,
): Record<string, string> {
	const vars: Record<string, string> = {};

	vars.created = date.format('YYYY-MM-DDTHH:mm:ss');
	vars.year = date.format('YYYY');
	vars.month = date.format('MM');
	vars.monthName = date.format('MMMM');
	vars.person = personName;

	vars.dailyNotePath = buildWikilinkPath(
		periodicNotesSettings.folder,
		periodicNotesSettings.daily.format,
		date,
	);

	vars.dailyNoteDisplay = date.format('DD-MM-YYYY');

	return vars;
}

/**
 * Processes readDir entries into a sorted list of PersonEntry objects.
 * Filters to only .md files and extracts names without extension.
 */
export function loadPeopleFromEntries(
	entries: { name: string; isDirectory: boolean }[],
	folderPath: string,
	context: 'work' | 'personal',
): PersonEntry[] {
	return entries
		.filter((e) => !e.isDirectory && e.name.endsWith('.md'))
		.map((e) => {
			const dotIndex = e.name.lastIndexOf('.');
			const name = dotIndex > 0 ? e.name.substring(0, dotIndex) : e.name;
			return { name, path: `${folderPath}/${e.name}`, context };
		})
		.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Merges work and personal people lists into a single ordered list.
 * Work people appear first (alphabetically), followed by personal people (alphabetically).
 */
export function mergePeopleLists(
	workPeople: PersonEntry[],
	personalPeople: PersonEntry[],
): PersonEntry[] {
	return [...workPeople, ...personalPeople];
}

/**
 * Filters people by a case-insensitive substring match on the name.
 * Returns all people if query is empty.
 */
export function filterPeople(query: string, people: PersonEntry[]): PersonEntry[] {
	if (!query.trim()) return people;
	const lower = query.toLowerCase();
	return people.filter((p) => p.name.toLowerCase().includes(lower));
}

/** A row of Today's My people. */
export interface MyPersonRow {
	/** Person name (the note's file name without `.md`) */
	name: string;
	/** Absolute path of the person note */
	path: string;
	/** Note date (`YYYY-MM-DD`) of the latest 1:1 up to today, or null when there is none */
	lastDate: string | null;
	/** Days from `lastDate` to today, or null when there is no 1:1 */
	days: number | null;
	/** No 1:1, or the last one is more than the person's cadence (`oneOnOneCadence`) days ago */
	overdue: boolean;
}

/** What `buildMyPeople` reads besides the entries. */
export interface MyPeopleOptions {
	/** Absolute vault path, or null when no vault is open */
	vaultPath: string | null;
	/** Vault-relative folder of the work people (`oneOnOne.workPeopleFolder`) */
	workPeopleFolder: string;
	/** Today as `YYYY-MM-DD` */
	todayKey: string;
	/** The cadence of a person marked `_one_on_one_every: true` (`oneOnOne.dueAfterDays`) */
	dueAfterDays: number;
}

/** The person note property that adds the person to My people and sets their 1:1 cadence. */
export const ONE_ON_ONE_EVERY_PROPERTY = '_one_on_one_every';

/**
 * A person's 1:1 cadence in days from their `_one_on_one_every` value: a
 * positive whole number is the cadence, `true` takes `dueAfterDays`, and
 * anything else (absent included) is null, leaving the person out. Text
 * forms (`"7"`, `"true"`) count too: the Properties panel adds every new
 * property as text.
 */
function oneOnOneCadence(value: unknown, dueAfterDays: number): number | null {
	const v = typeof value === 'string' ? value.trim().toLowerCase() : value;
	if (v === true || v === 'true') return dueAfterDays;
	const n = typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v;
	return typeof n === 'number' && Number.isInteger(n) && n > 0 ? n : null;
}

/** The lowercase note name a link target points to: folder prefix, `|alias`, `#heading` and `.md` dropped. */
function linkStem(target: string): string {
	return target.split(/[|#]/)[0].trim().replace(/\.md$/i, '').split('/').pop()!.toLowerCase();
}

/**
 * Today's My people: the notes directly in the work people folder that set
 * `_one_on_one_every` (`oneOnOneCadence`), each with its last 1:1. A 1:1 for a person is any note whose `_related_to` links them,
 * wherever it lives (body links and folders do not count, PRD Q4); its day is
 * its note date, and a 1:1 dated after today is not held yet. Ordered most
 * overdue first: never, then the most days past the person's own cadence,
 * ties by name.
 */
export function buildMyPeople(entries: NoteEntryV2[], options: MyPeopleOptions): MyPersonRow[] {
	const { vaultPath, todayKey, dueAfterDays } = options;
	const folder = options.workPeopleFolder.replace(/^\/+|\/+$/g, '');
	if (!vaultPath || !folder) return [];
	const prefix = `${vaultPath.replace(/\/+$/, '')}/${folder}/`;
	const people = entries.flatMap((entry) => {
		if (!entry.path.startsWith(prefix) || entry.path.slice(prefix.length).includes('/') || isViewFile(entry.path)) return [];
		const cadence = oneOnOneCadence(entry.frontmatter[ONE_ON_ONE_EVERY_PROPERTY], dueAfterDays);
		return cadence === null ? [] : [{ entry, cadence }];
	});
	if (people.length === 0) return [];

	const today = parseDateKey(todayKey);
	const lastByName = new Map<string, string>();
	if (today) {
		for (const entry of entries) {
			if (entry.relatedTo.length === 0) continue;
			const date = entryNoteDate(entry);
			if (!date || date > today) continue;
			for (const target of entry.relatedTo) {
				const key = linkStem(target);
				const prev = lastByName.get(key);
				if (!prev || date > prev) lastByName.set(key, date);
			}
		}
	}

	const rows = people.map(({ entry, cadence }) => {
		const lastDate = lastByName.get(entry.title.toLowerCase()) ?? null;
		const days = lastDate ? dayjs(today).diff(dayjs(lastDate), 'day') : null;
		const row: MyPersonRow = { name: entry.title, path: entry.path, lastDate, days, overdue: days === null || days > cadence };
		return { row, pastCadence: days === null ? Infinity : days - cadence };
	});
	return rows
		.sort((a, b) => (b.pastCadence === a.pastCadence ? 0 : b.pastCadence - a.pastCadence) || a.row.name.localeCompare(b.row.name))
		.map(({ row }) => row);
}

/** A My people row's days label: `Nd`, or `never` without a 1:1. */
export function myPeopleDaysLabel(days: number | null): string {
	return days === null ? 'never' : `${days}d`;
}
