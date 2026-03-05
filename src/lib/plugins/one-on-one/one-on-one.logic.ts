import dayjs from 'dayjs';
import type { PeriodicNotesSettings } from '$lib/core/settings/settings.types';
import { buildWikilinkPath } from '$lib/plugins/periodic-notes/periodic-notes.logic';

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
