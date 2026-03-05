import dayjs from 'dayjs';
import type { PeriodicNotesSettings } from '$lib/core/settings/settings.types';
import { buildWikilinkPath } from '$lib/plugins/periodic-notes/periodic-notes.logic';

/**
 * Builds the full absolute path for a quick note.
 * Combines: vaultPath / baseFolder / folderFormat(date) / filenameFormat(date).md
 */
export function buildQuickNotePath(
	vaultPath: string,
	baseFolder: string,
	folderFormat: string,
	filenameFormat: string,
	date: dayjs.Dayjs,
): string {
	const filename = date.format(filenameFormat);
	const parts = [vaultPath];
	if (baseFolder) parts.push(baseFolder);
	if (folderFormat) parts.push(date.format(folderFormat));
	parts.push(`${filename}.md`);
	return parts.join('/');
}

/**
 * Extracts the title for template processing (tp.file.title).
 */
export function getQuickNoteTitle(filenameFormat: string, date: dayjs.Dayjs): string {
	return date.format(filenameFormat);
}

/**
 * Builds custom template variables for a quick note.
 * These are passed as customVariables to openOrCreateNote() and
 * used in the template as <% variableName %>.
 */
export function buildQuickNoteVariables(
	date: dayjs.Dayjs,
	periodicNotesSettings: PeriodicNotesSettings,
): Record<string, string> {
	const vars: Record<string, string> = {};

	vars.created = date.format('YYYY-MM-DDTHH:mm:ss');
	vars.year = date.format('YYYY');
	vars.month = date.format('MM');
	vars.monthName = date.format('MMMM');

	// Wikilink path to today's daily note (for [[<% dailyNotePath %>]] in templates)
	vars.dailyNotePath = buildWikilinkPath(
		periodicNotesSettings.folder,
		periodicNotesSettings.daily.format,
		date,
	);

	// Display text for the wikilink (for [[path|<% dailyNoteDisplay %>]])
	vars.dailyNoteDisplay = date.format('DD-MM-YYYY');

	return vars;
}
