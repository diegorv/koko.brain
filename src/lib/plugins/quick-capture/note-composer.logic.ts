import dayjs from 'dayjs';
import { yamlScalar } from '#lib/core/frontmatter/properties.logic.js';
import type { PeriodicNotesSettings } from '#lib/core/settings/settings.types.js';
import { buildCaptureFolder } from '#lib/utils/capture-path.js';
import { processTemplate } from '#lib/utils/template.js';
import { buildWikilinkPath } from '#lib/plugins/periodic-notes/periodic-notes.logic.js';

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
	return `${buildCaptureFolder(vaultPath, baseFolder, folderFormat, date)}/${date.format(filenameFormat)}.md`;
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

/**
 * The capture variables that carry text from outside the app (a page title,
 * an app id, a URL). Any of them can hold `: `, ` #` or a leading `[`.
 */
const CAPTURE_TEXT_VARIABLES = new Set(['title', 'sourceTitle', 'sourceApp', 'sourceUrl', 'url']);

/** Same match as `FRONTMATTER_REGEX` in properties.logic.ts. */
const TEMPLATE_FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---/;
/**
 * A placeholder that is the whole value of a `key: ` line or a `- ` list item:
 * the key or dash, the placeholder, then only blanks or a YAML comment to the
 * line end. A line that starts with `#` is a comment and never matches.
 */
const WHOLE_VALUE_PLACEHOLDER =
	/^((?:(?![ \t]*#)[^\n]*?:|[ \t]*-)[ \t]+)<%\s*(\w+)\s*%>(?=[ \t]*(?:\r?\n|$)|[ \t]+#)/gm;
/**
 * Prefix of the variables that hold the YAML spelling of a capture text
 * variable. The NUL keeps them out of reach of a template's own expressions.
 */
const YAML_VARIABLE_PREFIX = '\u0000yaml:';

/**
 * `processTemplate` for a Quick Capture template, with the capture text
 * variables made YAML-safe inside the template's frontmatter block: a
 * placeholder that is the whole value of a `key: ` line or a `- ` list item
 * and names one of `CAPTURE_TEXT_VARIABLES` is written with `yamlScalar`, so
 * `source_title: <% sourceTitle %>` reads back as the page title whatever it
 * holds. Every other placeholder, and everything after the block, is written
 * raw. A placeholder the template quoted or mixed with other text is left to
 * the template's own syntax.
 *
 * Runs `processTemplate` once, over the template with those placeholders
 * pointed at the YAML spellings, so text that a value brings in (a title that
 * holds `<% ... %>`) is never evaluated.
 */
export function processCaptureTemplate(template: string, fileTitle: string, vars: Record<string, string>): string {
	const block = template.match(TEMPLATE_FRONTMATTER)?.[0];
	if (block === undefined) return processTemplate(template, fileTitle, vars);

	const allVars = { ...vars };
	const safeBlock = block.replace(WHOLE_VALUE_PLACEHOLDER, (line: string, prefix: string, name: string) => {
		if (!CAPTURE_TEXT_VARIABLES.has(name) || !(name in vars)) return line;
		allVars[YAML_VARIABLE_PREFIX + name] = yamlScalar(vars[name]);
		return `${prefix}<% ${YAML_VARIABLE_PREFIX}${name} %>`;
	});
	return processTemplate(safeBlock + template.slice(block.length), fileTitle, allVars);
}
