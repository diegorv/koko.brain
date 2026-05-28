import dayjs from 'dayjs';
import type { PeriodicNotesSettings } from '$lib/core/settings/settings.types';
import { buildWikilinkPath } from '$lib/plugins/periodic-notes/periodic-notes.logic';

/**
 * Builds the full absolute path for a quick note.
 * Combines: vaultPath / baseFolder / folderFormat(date) / filenameFormat(date).md
 */
export function buildCapturePath(
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
export function getCaptureTitle(filenameFormat: string, date: dayjs.Dayjs): string {
	return date.format(filenameFormat);
}

/**
 * Builds custom template variables for a quick note.
 * These are passed as customVariables to openOrCreateNote() and
 * used in the template as <% variableName %>.
 *
 * The capture-provenance variables (`title`, `kind`, `sourceApp`,
 * `sourceTitle`, `sourceUrl`, `capturedAt`, `url`, `content`) are seeded here
 * so the manual note-composer path (Cmd+N / "Create Quick Capture Note"
 * command) resolves the same `<% ... %>` placeholders as the clipboard /
 * deep-link `executeCaptureAction` path. Without them, a template that
 * references `<% sourceUrl %>` etc. renders the literal placeholder name (see
 * `template.ts` unknown-expression fallthrough). `executeCaptureAction`
 * overrides every one of these with the real per-kind values after calling
 * this function, so the defaults only take effect for the manual `note` kind.
 *
 * @param date - Capture timestamp.
 * @param periodicNotesSettings - Used to build the daily-note wikilink.
 * @param title - Note title (resolves `<% title %>`). Defaults to empty.
 * @param kind - Capture kind (resolves `<% kind %>`). Defaults to `'note'`.
 */
export function buildCaptureVariables(
	date: dayjs.Dayjs,
	periodicNotesSettings: PeriodicNotesSettings,
	title = '',
	kind = 'note',
): Record<string, string> {
	const vars: Record<string, string> = {};

	vars.created = date.format('YYYY-MM-DDTHH:mm:ss');
	vars.year = date.format('YYYY');
	vars.month = date.format('MM');
	vars.monthName = date.format('MMMM');

	// Capture-provenance defaults (overridden by executeCaptureAction for
	// non-`note` kinds). A manually composed note has no external source, so
	// the source fields stay empty and capturedAt mirrors `created`.
	vars.title = title;
	vars.kind = kind;
	vars.sourceApp = '';
	vars.sourceTitle = '';
	vars.sourceUrl = '';
	vars.capturedAt = vars.created;
	vars.url = '';
	vars.content = '';

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
