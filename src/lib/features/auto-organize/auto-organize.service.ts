import { readTextFile, writeTextFile, mkdir, exists } from '@tauri-apps/plugin-fs';
import { addAfterSaveObserver } from '#lib/core/editor/editor.hooks.js';
import { isViewFile } from '#lib/core/filesystem/fs.logic.js';
import { createFile, moveItem, renameItem } from '#lib/core/filesystem/fs.service.js';
import { isTabDirty } from '#lib/core/editor/editor.logic.js';
import { loadNoteTemplate } from '#lib/core/note-creator/note-creator.service.js';
import { setIconForPath } from '#lib/features/file-icons/file-icons.service.js';
import { buildNoteRecord } from '#lib/features/collection/collection.logic.js';
import { detectLossyFrontmatter, extractBody, parseFrontmatterProperties, rebuildContent } from '#lib/core/frontmatter/properties.logic.js';
import { updateNoteFrontmatter } from '#lib/core/frontmatter/frontmatter-write.service.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { autoOrganizeStore } from './auto-organize.store.svelte';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import {
	applyPropertyWrites,
	createTargetProblem,
	findMatchingRules,
	findMoveRule,
	isAlreadyNamed,
	isInExcludedFolder,
	isAlreadyInDestination,
	isRefusedKey,
	numberedName,
	ownedProperties,
	propertiesToWrite,
	propertyWriteSkipReason,
	renameProblem,
	renameTarget,
	resolveComputedProperties,
	resolveDestination,
	ruleRecordStats,
	sanitizeCreateNote,
	sanitizeRename,
	sanitizeRuleProperties,
	type OwnedProperty,
} from './auto-organize.logic';
import type { AutoOrganizeConfig, AutoOrganizeRule } from './auto-organize.types';
import { generateLifecycleRules } from './type-lifecycle-rules';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import type { PropertyIndexRecord } from '#lib/features/collection/collection.types.js';
import { debug, error } from '#lib/utils/debug.js';

/** Internal directory inside the vault for metadata */
const SETTINGS_DIR = '.kokobrain';
const CONFIG_FILE = 'auto-organize-rules.json';

/** Per-file debounce timers for auto-organize evaluation */
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

/** Current unsubscribe function for the after-save hook (null if not registered) */
let currentUnsubscribe: (() => void) | null = null;

/**
 * Target paths of runs in their write phase. The after-saves fired by a run's
 * own writes (legacy icon and properties) must not schedule a new evaluation:
 * that is the whole chaining and loop protection.
 */
const writingPaths = new Set<string>();

/** Rule ids whose property write failure was already logged this session. */
const reportedWriteFailures = new Set<string>();

/** Rule ids whose `add` refused by a note's value was already logged this session. */
const reportedAddSkips = new Set<string>();

/** Rule ids whose computed value failed and was already logged this session. */
const reportedComputeFailures = new Set<string>();

/** Rule ids whose computed name failed and was already logged this session. */
const reportedRenameFailures = new Set<string>();

/** `<problem>:<rule id>` pairs of create-note problems already logged this session. */
const reportedCreateProblems = new Set<string>();

/**
 * Notes a run is creating, until `createFile` settles. `createFile` renames a
 * clash instead of refusing it, so two sources saved together would otherwise
 * both create their shared target, the second as `X 1.md`.
 */
const creatingPaths = new Set<string>();

/** The most notes one run creates; the cap guards against a broad rule. */
const MAX_CREATES_PER_RUN = 5;

/** Default empty config */
const DEFAULT_CONFIG: AutoOrganizeConfig = {
	rules: [],
	excludedFolders: [],
};

/** Resolves the full path to the auto-organize config file */
function getConfigPath(vaultPath: string): string {
	return `${vaultPath}/${SETTINGS_DIR}/${CONFIG_FILE}`;
}

/**
 * Loads auto-organize config from .kokobrain/auto-organize-rules.json.
 * If the file doesn't exist, initializes with empty defaults.
 */
export async function loadAutoOrganizeConfig(vaultPath: string): Promise<void> {
	const filePath = getConfigPath(vaultPath);
	try {
		const fileExists = await exists(filePath);
		if (!fileExists) {
			autoOrganizeStore.setConfig({ ...DEFAULT_CONFIG });
			return;
		}
		const content = await readTextFile(filePath);
		if (!content.trim()) {
			autoOrganizeStore.setConfig({ ...DEFAULT_CONFIG });
			return;
		}
		const parsed = JSON.parse(content) as Partial<AutoOrganizeConfig>;
		autoOrganizeStore.setConfig({
			rules: Array.isArray(parsed.rules) ? parsed.rules.map(withValidProperties) : [],
			excludedFolders: Array.isArray(parsed.excludedFolders) ? parsed.excludedFolders : [],
		});
		debug('AUTO-ORGANIZE', `Loaded config: ${autoOrganizeStore.rules.length} rules, ${autoOrganizeStore.excludedFolders.length} excluded folders`);
	} catch (err) {
		error('AUTO-ORGANIZE', 'Failed to load config:', err);
		autoOrganizeStore.setConfig({ ...DEFAULT_CONFIG });
	}
}

/**
 * A loaded rule with its invalid property entries dropped; a non-array
 * `properties` is removed. A computed value refused for its mode is logged.
 * A `createNote` or `rename` that a run refuses is kept as stored (a
 * `createNote` only with a text `path` and template), so Settings shows why
 * and the next Settings save does not erase it. Runs and the Settings row
 * sanitize both again before use. A refused `rename` is logged with the reason.
 */
function withValidProperties(rule: AutoOrganizeRule): AutoOrganizeRule {
	if (rule === null || typeof rule !== 'object') return rule;
	const { properties, createNote, rename, ...rest } = rule;
	const loaded: AutoOrganizeRule = rest;
	if (Array.isArray(properties)) {
		loaded.properties = sanitizeRuleProperties(properties, (key, reason) =>
			error('AUTO-ORGANIZE', `Rule "${rule.name}" ignores ${key}: ${reason}`),
		);
	}
	if ('createNote' in rule) {
		const valid = sanitizeCreateNote(createNote);
		if (valid) loaded.createNote = valid;
		else if (createNote !== null && typeof createNote === 'object') {
			const { path, template, properties: noteProperties, open } = createNote as unknown as Record<string, unknown>;
			if (typeof path === 'string' && (template === undefined || typeof template === 'string')) {
				loaded.createNote = { path };
				if (template !== undefined) loaded.createNote.template = template;
				if (Array.isArray(noteProperties)) loaded.createNote.properties = sanitizeRuleProperties(noteProperties).filter((p) => p.mode !== 'remove');
				if (open === true) loaded.createNote.open = true;
			}
		}
	}
	if ('rename' in rule) {
		const problem = renameProblem(rename);
		if (problem === null) loaded.rename = sanitizeRename(rename);
		else {
			loaded.rename = rename;
			error('AUTO-ORGANIZE', `Rule "${rule.name}" ignores its rename: ${problem}`);
		}
	}
	return loaded;
}

/**
 * Saves current auto-organize config to disk.
 */
export async function saveAutoOrganizeConfig(vaultPath: string): Promise<void> {
	const dirPath = `${vaultPath}/${SETTINGS_DIR}`;
	const filePath = getConfigPath(vaultPath);
	try {
		const dirExists = await exists(dirPath);
		if (!dirExists) {
			await mkdir(dirPath);
		}
		const config: AutoOrganizeConfig = {
			rules: autoOrganizeStore.rules,
			excludedFolders: autoOrganizeStore.excludedFolders,
		};
		await writeTextFile(filePath, JSON.stringify(config, null, 2));
		debug('AUTO-ORGANIZE', 'Config saved');
	} catch (err) {
		error('AUTO-ORGANIZE', 'Failed to save config:', err);
		throw err;
	}
}

/**
 * Registers the after-save observer that triggers debounced rule evaluation.
 * Returns an unsubscribe function.
 */
export function registerAutoOrganizeHook(): () => void {
	debug('AUTO-ORGANIZE', 'Registering after-save hook');
	return addAfterSaveObserver((filePath) => {
		if (writingPaths.has(filePath)) return;
		if (isViewFile(filePath)) return;
		if (!settingsStore.autoOrganize.enabled) return;

		const hasUserRules = autoOrganizeStore.enabledRules.length > 0;
		const hasLifecycleRules = typeDefinitionsStore.typeMetadataMap.size > 0;
		if (!hasUserRules && !hasLifecycleRules) return;

		const vaultPath = vaultStore.path;
		if (!vaultPath) return;

		if (isInExcludedFolder(filePath, vaultPath, autoOrganizeStore.excludedFolders)) {
			debug('AUTO-ORGANIZE', 'Skipping excluded folder:', filePath);
			return;
		}

		// Clear existing timer for this file
		const existing = debounceTimers.get(filePath);
		if (existing) clearTimeout(existing);

		const timer = setTimeout(async () => {
			debounceTimers.delete(filePath);
			if (!settingsStore.autoOrganize.enabled) return;
			try {
				const content = await readCurrentContent(filePath);
				if (content === null) return;
				await evaluateAndMove(filePath, content, vaultPath);
			} catch (err) {
				error('AUTO-ORGANIZE', 'Failed to evaluate/move:', err);
			}
		}, settingsStore.autoOrganize.debounceMs);

		debounceTimers.set(filePath, timer);
	});
}

/**
 * Dynamically enables or disables the auto-organize after-save hook.
 * Called from the Settings UI when the user toggles auto-organize on/off.
 * Returns the current unsubscribe function (or null if disabled).
 */
export function toggleAutoOrganizeHook(enabled: boolean): (() => void) | null {
	if (enabled && !currentUnsubscribe) {
		debug('AUTO-ORGANIZE', 'Dynamically registering after-save hook');
		currentUnsubscribe = registerAutoOrganizeHook();
		return currentUnsubscribe;
	}
	if (!enabled && currentUnsubscribe) {
		debug('AUTO-ORGANIZE', 'Dynamically unregistering after-save hook');
		currentUnsubscribe();
		currentUnsubscribe = null;
	}
	return currentUnsubscribe;
}

/**
 * The note as it is now: the open tab's content, else the file on disk.
 * Null when the note vanished since the save.
 */
async function readCurrentContent(filePath: string): Promise<string | null> {
	const tab = editorStore.tabs.find((t) => t.path === filePath);
	if (tab) return tab.content;
	try {
		return await readTextFile(filePath);
	} catch (err) {
		if (!(await exists(filePath).catch(() => true))) {
			debug('AUTO-ORGANIZE', 'Note vanished before evaluation:', filePath);
			return null;
		}
		throw err;
	}
}

/**
 * Evaluates rules against a note's current content: the first matching rule
 * with a `rename` renames it, the first matching rule with a destination
 * moves it, then, at the final path, the moving rule's legacy icon and every
 * matching rule's properties are written, and every matching rule's
 * `createNote` is created. A failed rename or move stops the run.
 */
async function evaluateAndMove(savedPath: string, content: string, vaultPath: string): Promise<void> {
	const stats = ruleRecordStats(collectionStore.propertyIndex.get(savedPath), content, Date.now());
	let record = buildNoteRecord(savedPath, content, ...stats);

	const lifecycleRules = generateLifecycleRules(typeDefinitionsStore.typeMetadataMap);
	const allRules = [...autoOrganizeStore.enabledRules, ...lifecycleRules];

	const matched = findMatchingRules(allRules, record, vaultPath, (failed, err) =>
		error('AUTO-ORGANIZE', `Rule "${failed.name}" failed to evaluate on ${savedPath}:`, err),
	);
	if (matched.length === 0) {
		debug('AUTO-ORGANIZE', 'No matching rule for:', savedPath);
		return;
	}

	const rule = findMoveRule(matched);

	// The rename goes first; every later step reads the note at its new name.
	let filePath = savedPath;
	const renamer = matched.find((r) => sanitizeRename(r.rename) !== undefined);
	if (renamer) {
		const renamed = await applyRename(renamer, savedPath, content, record, stats, rule, vaultPath);
		if (renamed === null) return;
		if (renamed !== savedPath) {
			filePath = renamed;
			record = buildNoteRecord(filePath, content, ...stats);
		}
	}

	let targetPath = filePath;

	if (rule) {
		const resolvedDest = resolveDestination(rule.destination, record, vaultPath);
		if (isAlreadyInDestination(filePath, vaultPath, resolvedDest)) {
			debug('AUTO-ORGANIZE', 'Already in destination, skipping move:', filePath);
		} else {
			// Ensure destination folder exists
			const destPath = `${vaultPath}/${resolvedDest}`;
			try {
				const destExists = await exists(destPath);
				if (!destExists) {
					await mkdir(destPath, { recursive: true });
					debug('AUTO-ORGANIZE', 'Created destination folder:', destPath);
				}
			} catch (err) {
				error('AUTO-ORGANIZE', 'Failed to create destination folder:', err);
				return;
			}

			debug('AUTO-ORGANIZE', `Moving "${filePath}" to "${destPath}" (rule: ${rule.name})`);
			let newPath: string | null;
			try {
				newPath = await moveItem(filePath, destPath);
			} catch {
				// `moveItem` already logged the cause.
				return;
			}
			if (!newPath) return;
			targetPath = newPath;
		}
	}

	const owned = ownedProperties(matched);
	const creators = matched.filter((r) => sanitizeCreateNote(r.createNote) !== undefined);
	if (!rule?.icon && owned.length === 0 && creators.length === 0) return;

	writingPaths.add(targetPath);
	try {
		// The legacy icon goes first, so an explicit `_color` property beats
		// its color removal (`frontmatter-icon.service.ts::withIconColors`).
		const iconWritten = rule?.icon ? await applyLegacyIcon(rule, content, vaultPath, targetPath) : false;
		if (owned.length > 0) {
			await writeRuleProperties(targetPath, iconWritten ? null : content, vaultPath, owned, record);
		}
		if (creators.length > 0) {
			// The variables and `file.*` read the source where it is now.
			const source = targetPath === filePath ? record : buildNoteRecord(targetPath, content, ...stats);
			await createRuleNotes(creators, targetPath, content, source, vaultPath);
		}
	} finally {
		writingPaths.delete(targetPath);
	}
}

/**
 * Renames the note at `filePath` to the name `rule.rename` gives it, through
 * `renameItem`, so links to it are rewritten and its tab follows. Returns the
 * note's path after it (`filePath` when nothing is renamed), or null when the
 * rename failed (`renameItem` logged it).
 *
 * Nothing is renamed for a note the property gates skip, a Todoist project
 * note (Todoist sync pushes the name), an open note with unsaved edits (it is
 * renamed at a later save), or a name that is empty or fails to compute.
 * A note that already carries the name, or `<name> N`, keeps it unless that
 * name is taken in the folder `moveRule` sends it to. Otherwise the note
 * takes the first free name among `<name>`, `<name> 2`, `<name> 3`..., free
 * in the folder it ends in and, when the run moves it, in its current folder.
 * @param moveRule - the rule that moves the note in this run, or null
 */
async function applyRename(
	rule: AutoOrganizeRule,
	filePath: string,
	content: string,
	record: PropertyIndexRecord,
	stats: [number, number, number],
	moveRule: AutoOrganizeRule | null,
	vaultPath: string,
): Promise<string | null> {
	const protectedFolders = [settingsStore.templates.systemFolder, settingsStore.templates.folder];
	const skip =
		propertyWriteSkipReason(filePath, content, vaultPath, protectedFolders) ??
		([...record.properties.keys()].some(isRefusedKey) ? 'a Todoist project note' : null);
	if (skip !== null) {
		debug('AUTO-ORGANIZE', `Skipped renaming ${filePath}: ${skip}`);
		return filePath;
	}
	const tab = editorStore.tabs.find((t) => t.path === filePath);
	if (tab && isTabDirty(tab)) {
		debug('AUTO-ORGANIZE', `Skipped renaming ${filePath}: it has unsaved edits`);
		return filePath;
	}
	const target = renameTarget(sanitizeRename(rule.rename)!, record, vaultPath);
	if (target === null) return filePath;
	if ('failure' in target) {
		if (!reportedRenameFailures.has(rule.id)) {
			reportedRenameFailures.add(rule.id);
			error('AUTO-ORGANIZE', `Rule "${rule.name}" could not compute a name for ${filePath}: ${target.failure}`);
		}
		return filePath;
	}

	const folder = filePath.slice(0, filePath.lastIndexOf('/'));
	const { basename, ext } = record;
	/** The folder the note at `path` ends this run in. */
	const finalFolder = (path: string): string => {
		if (!moveRule) return folder;
		const dest = resolveDestination(moveRule.destination, buildNoteRecord(path, content, ...stats), vaultPath);
		if (isAlreadyInDestination(path, vaultPath, dest)) return folder;
		return dest ? `${vaultPath}/${dest}` : vaultPath;
	};

	if (isAlreadyNamed(basename, target.name)) {
		const final = finalFolder(filePath);
		if (final === folder || !(await exists(`${final}/${basename}${ext}`))) return filePath;
	}
	for (let n = 1; ; n++) {
		const fileName = `${numberedName(target.name, n)}${ext}`;
		const final = finalFolder(`${folder}/${fileName}`);
		if (await exists(`${final}/${fileName}`)) continue;
		if (final !== folder && (await exists(`${folder}/${fileName}`))) continue;
		debug('AUTO-ORGANIZE', `Renaming "${filePath}" to "${fileName}" (rule: ${rule.name})`);
		try {
			return await renameItem(filePath, fileName);
		} catch {
			return null;
		}
	}
}

/**
 * Creates each rule's `createNote` that does not exist yet, in rule order, at
 * most `MAX_CREATES_PER_RUN` per run. Nothing is created for a source the
 * property gates skip. The new notes are not evaluated by the rules here:
 * `createFile` fires no after-save, so they are evaluated at their first save.
 * @param source - the source note's record, which the path and `expr` read
 */
async function createRuleNotes(
	creators: AutoOrganizeRule[],
	sourcePath: string,
	content: string,
	source: PropertyIndexRecord,
	vaultPath: string,
): Promise<void> {
	const protectedFolders = [settingsStore.templates.systemFolder, settingsStore.templates.folder];
	const skip = propertyWriteSkipReason(sourcePath, content, vaultPath, protectedFolders);
	if (skip !== null) {
		debug('AUTO-ORGANIZE', `Skipped creating notes for ${sourcePath}: ${skip}`);
		return;
	}
	let created = 0;
	for (const rule of creators) {
		if (created >= MAX_CREATES_PER_RUN) {
			reportCreateProblem('cap', rule, `did not create a note for ${sourcePath}: a run creates at most ${MAX_CREATES_PER_RUN} notes`);
			continue;
		}
		const createNote = sanitizeCreateNote(rule.createNote)!;
		const target = resolveDestination(createNote.path, source, vaultPath);
		const problem = createTargetProblem(target, vaultPath, protectedFolders, autoOrganizeStore.excludedFolders);
		if (problem !== null) {
			debug('AUTO-ORGANIZE', `Rule "${rule.name}" did not create ${target}: ${problem}`);
			continue;
		}
		const targetPath = `${vaultPath}/${target}`;
		if (creatingPaths.has(targetPath)) continue;
		creatingPaths.add(targetPath);
		try {
			if (await createRuleNote(rule, createNote, targetPath, source, vaultPath)) created++;
		} catch (err) {
			reportCreateProblem('failed', rule, `failed to create ${targetPath}:`, err);
		} finally {
			creatingPaths.delete(targetPath);
		}
	}
}

/**
 * Creates one rule's note at `targetPath` unless it exists: the template,
 * then the rule's properties over its frontmatter. Returns true when it created.
 */
async function createRuleNote(
	rule: AutoOrganizeRule,
	createNote: NonNullable<AutoOrganizeRule['createNote']>,
	targetPath: string,
	source: PropertyIndexRecord,
	vaultPath: string,
): Promise<boolean> {
	if (await exists(targetPath)) {
		debug('AUTO-ORGANIZE', `Rule "${rule.name}" did not create ${targetPath}: it exists`);
		return false;
	}
	const slash = targetPath.lastIndexOf('/');
	const parent = targetPath.slice(0, slash);
	const fileName = targetPath.slice(slash + 1);
	const title = fileName.replace(/\.[^.]+$/, '');

	let initial = '';
	if (createNote.template) {
		const templatePath = `${vaultPath}/${createNote.template}`;
		if (!(await exists(templatePath))) {
			reportCreateProblem('template', rule, `did not create ${targetPath}: template ${createNote.template} not found`);
			return false;
		}
		initial = await loadNoteTemplate({ templatePath, title });
	}

	const content = withRuleProperties(rule, createNote, initial, targetPath, source, vaultPath);
	if (content === null) return false;

	// A note that would match its own rule would create its own follow-up at every save.
	const stats = ruleRecordStats(undefined, content, Date.now());
	if (findMatchingRules([rule], buildNoteRecord(targetPath, content, ...stats), vaultPath).length > 0) {
		reportCreateProblem('self-match', rule, `did not create ${targetPath}: the new note would match the rule itself`);
		return false;
	}

	if (!(await exists(parent))) await mkdir(parent, { recursive: true });
	const createdPath = await createFile(parent, fileName, content);
	debug('AUTO-ORGANIZE', `Rule "${rule.name}" created ${createdPath}`);
	if (createNote.open) openInBackground(createdPath, content);
	return true;
}

/**
 * `initial` with the rule's `createNote.properties` written over its
 * frontmatter, or null when they cannot be: the template's frontmatter would
 * lose something in the rewrite.
 */
function withRuleProperties(
	rule: AutoOrganizeRule,
	createNote: NonNullable<AutoOrganizeRule['createNote']>,
	initial: string,
	targetPath: string,
	source: PropertyIndexRecord,
	vaultPath: string,
): string | null {
	const owned = ownedProperties([{ ...rule, properties: createNote.properties }]);
	if (owned.length === 0) return initial;
	const current = parseFrontmatterProperties(initial);
	const resolved = resolveComputedProperties(current, owned, { record: source, formulas: {}, vaultPath }, (failed, reason) =>
		reportComputeFailure(targetPath, failed, reason),
	);
	const writes = propertiesToWrite(current, resolved);
	if (writes.length === 0) return initial;
	const lossy = detectLossyFrontmatter(initial);
	if (lossy !== null) {
		reportCreateProblem('lossy', rule, `did not create ${targetPath}: the template's frontmatter is ${lossy}`);
		return null;
	}
	return rebuildContent(applyPropertyWrites(current, writes), extractBody(initial), initial);
}

/** Opens a created note in a tab without leaving the active one. */
function openInBackground(path: string, content: string): void {
	if (editorStore.tabs.some((t) => t.path === path)) return;
	const active = editorStore.activeIndex;
	editorStore.addTab({ path, name: path.slice(path.lastIndexOf('/') + 1), content, savedContent: content });
	// With no tab open there is nothing to stay on, and the new tab stays active.
	if (active >= 0) editorStore.setActiveIndex(active);
}

/** Logs a create-note problem of kind `problem` once per rule per session. */
function reportCreateProblem(problem: string, rule: AutoOrganizeRule, message: string, err?: unknown): void {
	const id = `${problem}:${rule.id}`;
	if (reportedCreateProblems.has(id)) return;
	reportedCreateProblems.add(id);
	if (err === undefined) error('AUTO-ORGANIZE', `Rule "${rule.name}" ${message}`);
	else error('AUTO-ORGANIZE', `Rule "${rule.name}" ${message}`, err);
}

/**
 * Applies the moving rule's legacy `icon` field. Returns true when it wrote,
 * so the property write re-reads the note.
 */
async function applyLegacyIcon(rule: AutoOrganizeRule, content: string, vaultPath: string, targetPath: string): Promise<boolean> {
	const icon = rule.icon!;
	// The icon write would refuse this frontmatter and toast on every autosave;
	// skip it quietly instead.
	const lossy = detectLossyFrontmatter(content);
	if (lossy !== null) {
		debug('AUTO-ORGANIZE', `Skipped icon for ${targetPath}: frontmatter is ${lossy}`);
		return false;
	}
	try {
		await setIconForPath(vaultPath, targetPath, icon.iconPack, icon.iconName, icon.color, icon.textColor);
		debug('AUTO-ORGANIZE', `Applied icon "${icon.iconPack}:${icon.iconName}" to ${targetPath}`);
	} catch (err) {
		error('AUTO-ORGANIZE', 'Failed to apply icon:', err);
	}
	return true;
}

/**
 * Writes the owned properties that change the note, in one frontmatter write.
 * A note the rules leave unchanged is never rewritten.
 * @param content - the note's current content, or null to read it again
 * @param record - the record the filters ran on, which computed values read
 */
async function writeRuleProperties(
	targetPath: string,
	content: string | null,
	vaultPath: string,
	owned: OwnedProperty[],
	record: PropertyIndexRecord,
): Promise<void> {
	let involved = owned;
	try {
		const current = content ?? (await readCurrentContent(targetPath));
		if (current === null) return;
		const skip = propertyWriteSkipReason(targetPath, current, vaultPath, [
			settingsStore.templates.systemFolder,
			settingsStore.templates.folder,
		]);
		if (skip !== null) {
			debug('AUTO-ORGANIZE', `Skipped properties for ${targetPath}: ${skip}`);
			return;
		}
		const currentProps = parseFrontmatterProperties(current);
		// Computed once here: `mutate` below may run twice, and `now()` must not differ between its runs.
		const resolved = resolveComputedProperties(currentProps, owned, { record, formulas: {}, vaultPath }, (failed, reason) =>
			reportComputeFailure(targetPath, failed, reason),
		);
		// Skips are reported on this pass only: `mutate` below may run twice.
		const writes = propertiesToWrite(currentProps, resolved, (skipped) => reportAddSkip(targetPath, skipped));
		if (writes.length === 0) return;
		involved = writes;
		await updateNoteFrontmatter(targetPath, (props) => applyPropertyWrites(props, propertiesToWrite(props, resolved)));
		debug('AUTO-ORGANIZE', `Set properties on ${targetPath}`);
	} catch (err) {
		reportWriteFailure(targetPath, involved, err);
	}
}

/** Logs a failed property write once per rule per session, naming the rules not yet reported. */
function reportWriteFailure(targetPath: string, involved: OwnedProperty[], err: unknown): void {
	const fresh = [...new Set(involved.map((p) => p.rule))].filter((r) => !reportedWriteFailures.has(r.id));
	if (fresh.length === 0) {
		debug('AUTO-ORGANIZE', `Property write failed again on ${targetPath}:`, err);
		return;
	}
	for (const r of fresh) reportedWriteFailures.add(r.id);
	const names = fresh.map((r) => `"${r.name}"`).join(', ');
	error('AUTO-ORGANIZE', `Rule ${names} failed to set properties on ${targetPath}:`, err);
}

/** Logs an `add` the note's value refuses (a number or a boolean) once per rule per session. */
function reportAddSkip(targetPath: string, skipped: OwnedProperty): void {
	if (reportedAddSkips.has(skipped.rule.id)) return;
	reportedAddSkips.add(skipped.rule.id);
	error('AUTO-ORGANIZE', `Rule "${skipped.rule.name}" cannot add to ${skipped.key} on ${targetPath}: the value is not a list or text`);
}

/** Logs a computed value that writes nothing (a throw, no value, a wrong type) once per rule per session. */
function reportComputeFailure(targetPath: string, failed: OwnedProperty, reason: string): void {
	if (reportedComputeFailures.has(failed.rule.id)) return;
	reportedComputeFailures.add(failed.rule.id);
	error('AUTO-ORGANIZE', `Rule "${failed.rule.name}" could not compute ${failed.key} on ${targetPath}: ${reason}`);
}

/** Resets all auto-organize state (called during vault teardown) */
export function resetAutoOrganize(): void {
	// Unsubscribe hook if active
	if (currentUnsubscribe) {
		currentUnsubscribe();
		currentUnsubscribe = null;
	}
	// Clear all pending timers
	for (const timer of debounceTimers.values()) {
		clearTimeout(timer);
	}
	debounceTimers.clear();
	writingPaths.clear();
	reportedWriteFailures.clear();
	reportedAddSkips.clear();
	reportedComputeFailures.clear();
	reportedCreateProblems.clear();
	reportedRenameFailures.clear();
	creatingPaths.clear();
	autoOrganizeStore.reset();
	debug('AUTO-ORGANIZE', 'Reset complete');
}
