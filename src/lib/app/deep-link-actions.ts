import { exists, mkdir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import dayjs from 'dayjs';
import { markRecentSave, notifyAfterSave } from '#lib/core/editor/editor.hooks.js';
import { syncExternalContentToEditor } from '#lib/core/editor/editor.service.js';
import { addToTree } from '#lib/core/filesystem/fs.service.js';
import {
	FrontmatterWriteError,
	toastFrontmatterWriteError,
} from '#lib/core/frontmatter/frontmatter-write.service.js';
import { detectLossyFrontmatter } from '#lib/core/frontmatter/properties.logic.js';
import { applyExplicitOrganization } from '#lib/core/note-creator/explicit-organization.logic.js';
import { call } from '#lib/contracts/ipc.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { debug } from '#lib/utils/debug.js';
import { vaultRelativeKey } from '#lib/utils/path.js';
import { injectTagsIntoContent, injectTitleIntoContent, renderCaptureBody } from '#lib/features/deep-link/deep-link.logic.js';
import {
	registerDeepLinkAction,
	resolveContent,
	saveOpenNoteBeforeWrite,
} from '#lib/features/deep-link/deep-link.service.js';
import type { CaptureAction, DailyAction } from '#lib/features/deep-link/deep-link.types.js';
import { buildPeriodicNotePath } from '#lib/plugins/periodic-notes/periodic-notes.logic.js';
import { openOrCreateDailyNote } from '#lib/plugins/periodic-notes/periodic-notes.service.js';
import {
	buildCapturePath,
	buildCaptureVariables,
	getCaptureTitle,
	processCaptureTemplate,
} from '#lib/plugins/quick-capture/note-composer.logic.js';

/*
 * The deep-link actions that need a plugin: `daily` (periodic notes) and
 * `capture` (quick capture). They live in the app layer because each one
 * composes the deep-link feature with plugin code, and a feature must not
 * import a plugin (ADR-0003). `registerDeepLinkActions` hands them to the
 * deep-link dispatcher.
 */

/**
 * Handles the `daily` action — opens/creates today's daily note.
 * If content is provided (via clipboard or content param), appends or prepends it.
 */
async function executeDailyAction(action: DailyAction, vaultPath: string): Promise<void> {
	debug('DEEP_LINK', 'Opening daily note', {
		append: action.append, prepend: action.prepend, clipboard: action.clipboard,
	});

	// Always ensure the daily note exists and is opened
	await openOrCreateDailyNote();

	// If content is being sent, add it to the daily note
	const content = await resolveContent(action);
	if (!content) return;

	const settings = settingsStore.periodicNotes;
	const filePath = buildPeriodicNotePath(
		vaultPath,
		settings.folder,
		settings.daily.format,
		dayjs(),
	);

	const fileExists = await exists(filePath);
	if (!fileExists) return;

	if (!(await saveOpenNoteBeforeWrite(filePath))) return;
	const existing = await readTextFile(filePath);

	const newContent = action.prepend
		? content + '\n' + existing
		: existing + '\n' + content;

	markRecentSave(filePath);
	await writeTextFile(filePath, newContent);
	// `'none'`: the daily note was just written to disk above.
	syncExternalContentToEditor(filePath, newContent, true, 'none');
	notifyAfterSave(filePath, newContent);
}

/**
 * Returns a capture path that does not yet exist on disk. If `filePath` is
 * free it is returned unchanged; otherwise a numeric suffix (`-1`, `-2`, ...)
 * is inserted before the extension until a free path is found. Prevents one
 * capture from silently overwriting another that resolved the same
 * timestamp-based filename (e.g. a multi-file clipboard capture). Capture
 * dispatch is serialized in `registerQuickCaptureListener`, so this
 * exists-then-write sequence is race-free.
 */
async function resolveUniqueCapturePath(filePath: string): Promise<string> {
	if (!(await exists(filePath))) return filePath;
	const dot = filePath.lastIndexOf('.');
	const base = dot === -1 ? filePath : filePath.slice(0, dot);
	const ext = dot === -1 ? '' : filePath.slice(dot);
	let n = 1;
	let candidate = `${base}-${n}${ext}`;
	while (await exists(candidate)) {
		n += 1;
		candidate = `${base}-${n}${ext}`;
	}
	return candidate;
}

/**
 * Moves a temp-staged clipboard shot into `folder` (inside the vault) and
 * returns its `![[...]]` embed by vault-relative path, which
 * `WikilinkImageEmbedWidget` resolves through `host.resolveLink`.
 * Throws when the Rust side refuses or fails the copy.
 */
async function importStagedShot(source: string, folder: string, vaultPath: string): Promise<string> {
	const imported = await call('import_staged_shot', { source, destDir: folder, vaultPath });
	const relative = vaultRelativeKey(vaultPath, imported);
	if (relative === null) throw new Error(`Imported shot is outside the vault: ${imported}`);
	return `![[${relative}]]`;
}

/**
 * Handles the v2 `capture` action — creates a Quick Capture note from
 * a typed `CaptureAction`. Branches on `action.kind`:
 *
 * - `note` / `clip` / `link`: renders the body via `renderCaptureBody`, applies
 *   the per-kind template if configured, injects the link `title` as YAML
 *   frontmatter (link kind only), and merges `tags` into frontmatter. When
 *   `detectLossyFrontmatter` flags the rendered block, both injections are
 *   skipped and an error toast follows the write.
 * - `shot` marked `staged` (a clipboard image the app wrote to the OS temp
 *   dir): moves the file into the capture note's folder with
 *   `import_staged_shot` before writing the note, and embeds the copy as
 *   `![[<vault-relative path>]]`. A failed move throws, so no note is written.
 *   A note write that fails after a successful move leaves the image in the
 *   capture folder with no note referencing it (the temp file is gone).
 * - other `shot` / `file`: renders a `file://` CommonMark link/embed to the
 *   user's own local file (no copy into the vault) and writes through the same
 *   Quick Capture path as the text kinds. The note breaks if the user later
 *   moves or deletes the referenced file.
 */
async function executeCaptureAction(action: CaptureAction, vaultPath: string): Promise<void> {
	const quickCapture = settingsStore.quickCapture;
	const periodicNotes = settingsStore.periodicNotes;
	const date = dayjs();

	// Quick Capture (composer + clipboard shortcut + Cmd+N note composer)
	// owns the folder/filename and the per-kind template config. The
	// `note` kind covers the Cmd+N in-editor surface too — there is no
	// separate "quick note" settings any more.
	const folderFormat = quickCapture.folderFormat;
	const filenameFormat = quickCapture.filenameFormat;
	const templatePathForKind = quickCapture.templates[action.kind] ?? '';

	const filePath = buildCapturePath(
		vaultPath,
		periodicNotes.folder,
		folderFormat,
		filenameFormat,
		date,
	);

	debug('DEEP_LINK', 'Capturing note:', filePath, { kind: action.kind });

	const parentDir = filePath.substring(0, filePath.lastIndexOf('/'));
	await mkdir(parentDir, { recursive: true });

	const body = action.kind === 'shot' && action.staged
		? await importStagedShot(action.path, parentDir, vaultPath)
		: renderCaptureBody(action);
	let fileContent = body;

	if (templatePathForKind) {
		const templateFullPath = `${vaultPath}/${templatePathForKind}`;
		try {
			const template = await readTextFile(templateFullPath);
			const fileTitle = getCaptureTitle(filenameFormat, date);
			const vars = buildCaptureVariables(date, periodicNotes);
			vars.content = body;
			// Expose the deep-link `title` (link kind only) to user templates via
			// `<% title %>`. Falls back to the filename-derived title so templates
			// that reference the placeholder always resolve. The post-template
			// `injectTitleIntoContent` below remains the source of truth for the
			// YAML `title:` field on link captures.
			const linkTitle = action.kind === 'link' ? action.title : undefined;
			vars.title = linkTitle ?? fileTitle;
			// v2 provenance: expose every common + link-specific field. Default
			// missing fields to '' so `<% sourceUrl %>` etc. render as empty
			// instead of falling through to the literal-name return path in
			// template.ts:204. processCaptureTemplate writes title/source*/url
			// YAML-safe where the template uses one as a frontmatter value.
			vars.kind = action.kind;
			vars.sourceApp = action.sourceApp ?? '';
			vars.sourceTitle = action.sourceTitle ?? '';
			vars.sourceUrl = action.sourceUrl ?? '';
			vars.capturedAt = action.capturedAt ?? '';
			vars.url = action.kind === 'link' ? action.url : '';
			const processed = processCaptureTemplate(template, fileTitle, vars);
			fileContent = processed + '\n' + body;
		} catch {
			// Template not found — save raw body
		}
	}

	const injectTitle = action.kind === 'link' && !!action.title;
	const injectTags = !!action.tags && action.tags.length > 0;
	// The injection rebuilds the whole block from its parsed properties, so a
	// block that rebuild would lose (e.g. a template block that does not parse
	// on its own) is written as the template made it, without the injection.
	const lossy = injectTitle || injectTags ? detectLossyFrontmatter(fileContent) : null;
	if (lossy === null) {
		if (injectTitle) fileContent = injectTitleIntoContent(fileContent, action.title!);
		if (injectTags) fileContent = injectTagsIntoContent(fileContent, action.tags!);
	}
	fileContent = applyExplicitOrganization(fileContent, settingsStore.explicitOrganization);

	// Never overwrite an existing note: disambiguate with a numeric suffix.
	const targetPath = await resolveUniqueCapturePath(filePath);
	markRecentSave(targetPath);
	await writeTextFile(targetPath, fileContent);
	notifyAfterSave(targetPath, fileContent);
	if (lossy !== null) {
		debug('DEEP_LINK', `skipped title/tags injection: frontmatter of ${targetPath} is ${lossy}`);
		const left = injectTitle && injectTags ? 'the title and tags were' : injectTitle ? 'the title was' : 'the tags were';
		toastFrontmatterWriteError(new FrontmatterWriteError(lossy, targetPath), {
			suffix: `; ${left} not added`,
		});
	}
	// Capture writes a fresh Quick Capture path: the tree gains its node.
	addToTree(targetPath);
}

/**
 * Registers the `daily` and `capture` handlers with the deep-link dispatcher.
 * Returns a function that unregisters both.
 */
export function registerDeepLinkActions(): () => void {
	const unregister = [
		registerDeepLinkAction('daily', executeDailyAction),
		registerDeepLinkAction('capture', executeCaptureAction),
	];
	return () => {
		for (const fn of unregister) fn();
	};
}
