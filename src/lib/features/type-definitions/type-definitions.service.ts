import type { Dayjs } from 'dayjs';
import { exists, readDir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { call } from '#lib/contracts/ipc.js';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { openFileInEditor, saveFileByPath, syncExternalContentToEditor, waitForTabSave } from '#lib/core/editor/editor.service.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { isTabDirty } from '#lib/core/editor/editor.logic.js';
import { loadNoteTemplate, openOrCreateNote } from '#lib/core/note-creator/note-creator.service.js';
import { applyExplicitOrganization, withUnorganizedFlag } from '#lib/core/note-creator/explicit-organization.logic.js';
import { createFile, renameItem } from '#lib/core/filesystem/fs.service.js';
import { applyNoteChange } from '#lib/core/filesystem/note-change.service.js';
import { markRecentSave } from '#lib/core/editor/editor.hooks.js';
import { generateUniqueName } from '#lib/core/filesystem/fs.logic.js';
import { typePinKey } from '#lib/core/settings/rail-pin.logic.js';
import { toast } from 'svelte-sonner';
import { error } from '#lib/utils/debug.js';
import { buildTypeMetadataMap, sameTypeMetadata, buildTypeNoteDir, rewriteTypeInFrontmatter, typeNameTakenMessage } from './type-definitions.logic';
import { buildNewViewYaml, updateViewColorsYaml, updateViewIconYaml, updateViewListPropertiesYaml, updateViewRailYaml } from './type-sidebar.logic';
import { typeDefinitionsStore } from './type-definitions.store.svelte';
import { updateViewEditYaml, type ViewEdit } from '#lib/features/collection/yaml-parser.js';
import { applyToolbarEdit, type ToolbarKey, type ToolbarValues } from './type-note-list.logic';
import { refreshViewDefinition } from './view-parse-cache';
import type { CollectionDefinition, CollectionFilter } from '#lib/features/collection/collection.types.js';

/** Rebuilds the type metadata map. Fetches entries if not provided. */
export async function refreshTypeDefinitions(entries?: NoteEntryV2[]): Promise<void> {
	const data = entries ?? await call('get_all_vault_entries_v2');
	const map = buildTypeMetadataMap(data);
	// Most refreshes follow a regular note's save: keep the old map so its readers stay asleep.
	if (sameTypeMetadata(typeDefinitionsStore.typeMetadataMap, map)) return;
	typeDefinitionsStore.setTypeMetadataMap(map);
}

/** Where a new note of a type goes, and the template it starts from. */
export interface TypedNoteTarget {
	/** Absolute folder: vault / global base folder / the type's own `_folder`. */
	dir: string;
	/** Deduped filename inside `dir`, with the `.md` extension. */
	fileName: string;
	/** `fileName` without `.md`; used for `tp.file.title`. */
	title: string;
	/** Absolute path of the type's `_template`, when it has one. */
	templatePath: string | undefined;
	/** Fallback content when there is no template or it cannot be read. */
	inlineTemplate: string;
}

/**
 * Resolves the folder, deduped filename and template for a new note of
 * `typeName` titled `baseTitle`. Returns null when no vault is open.
 */
export async function resolveTypedNoteTarget(typeName: string, baseTitle: string): Promise<TypedNoteTarget | null> {
	if (!vaultStore.path) return null;
	const metadata = typeDefinitionsStore.typeMetadataMap.get(typeName);
	// Target dir = vault / global base folder / type's own _folder (each
	// optional; both empty = vault root, the prior default behavior).
	const dir = buildTypeNoteDir(
		vaultStore.path,
		settingsStore.typesBaseFolder,
		metadata?.folder ?? null,
	);
	// Dedup against the target folder's existing notes. The folder may not
	// exist yet — readDir throws, so there are simply no siblings to dedup
	// against; the caller creates it (recursive create_folder) on write.
	let siblingNames: string[] = [];
	try {
		const entries = await readDir(dir);
		siblingNames = entries.map((e) => e.name);
	} catch {
		siblingNames = [];
	}
	const fileName = generateUniqueName(`${baseTitle}.md`, false, siblingNames);
	const title = fileName.replace(/\.md$/, '');
	const templatePath = metadata?.template
		? `${vaultStore.path}/${metadata.template}`
		: undefined;
	const inlineTemplate = `---\n_type: ${typeName}\n---\n`;
	return { dir, fileName, title, templatePath, inlineTemplate };
}

/** Creates a new note of a given type, applying the type's template if configured. */
export async function createNoteOfType(typeName: string): Promise<void> {
	const target = await resolveTypedNoteTarget(typeName, `Untitled ${typeName}`);
	if (!target) return;
	const { dir, fileName, title, templatePath, inlineTemplate } = target;
	await openOrCreateNote({
		filePath: `${dir}/${fileName}`,
		templatePath,
		inlineTemplate,
		title,
		buildContent: settingsStore.explicitOrganization ? withUnorganizedFlag : undefined,
	});
}

/** Options for {@link createTypedNote}. */
export interface CreateTypedNoteOptions {
	/** Type name written as `_type` (also selects `_folder` and `_template`). */
	typeName: string;
	/** Desired title; deduped against the target folder. */
	title: string;
	/** Date that `tp.date.now()` in the template resolves to. */
	contextDate?: Dayjs;
	/**
	 * Merges the caller's content into the rendered template. Receives the
	 * deduped target (`path` is `fileName` in the type's folder) so the caller
	 * can see the final name before the write. Whatever it throws propagates
	 * and no file is created.
	 */
	buildContent?: (base: string, target: { fileName: string; title: string; path: string }) => string;
}

/**
 * Creates a note of a type without opening it, through the same folder,
 * dedupe and template owner as {@link createNoteOfType}. Returns the created
 * path. Throws `Error('no-vault')` without a vault, `Error('create-failed')`
 * when the target folder cannot be created or `createFile` refuses, or
 * whatever `buildContent` throws. While Explicit organization is on, the
 * final content (after `buildContent`) gets `_organized: false`; every caller
 * creates a user note, so the switch is applied here once.
 *
 * `buildContent` sees the name deduped here, and `createFile` dedupes again
 * against a fresh `readDir`. If a same-named file appears between the two
 * reads, the note lands under the next free name while its content was built
 * for the first one. This same-instant race is accepted:
 * throwing then would report a failure for a note that already exists.
 */
export async function createTypedNote(options: CreateTypedNoteOptions): Promise<string> {
	const { typeName, title, contextDate, buildContent } = options;
	const target = await resolveTypedNoteTarget(typeName, title);
	if (!target) throw new Error('no-vault');
	try {
		await call('create_folder', { path: target.dir });
	} catch (err) {
		error('TYPE-DEF', 'createTypedNote: create_folder failed:', err);
		throw new Error('create-failed');
	}
	const base = await loadNoteTemplate({
		templatePath: target.templatePath,
		inlineTemplate: target.inlineTemplate,
		title: target.title,
		contextDate,
	});
	// The planned path joins the way `createFile` does; a same-instant name
	// race can still make `createFile` pick a different unique name.
	const built = buildContent?.(base, { fileName: target.fileName, title: target.title, path: `${target.dir}/${target.fileName}` }) ?? base;
	const content = applyExplicitOrganization(built, settingsStore.explicitOrganization);
	try {
		return await createFile(target.dir, target.fileName, content);
	} catch {
		// `createFile` already logged the cause.
		throw new Error('create-failed');
	}
}

/**
 * Creates a type definition note with default frontmatter. By default the
 * new definition opens in the editor; with `select: true` it is instead
 * selected in the type sidebar (used by the "New type" dialog, where the
 * user wants the empty type, not the raw definition .md).
 *
 * A vault-root entry that already holds `<typeName>.md` (ignoring case) is
 * reported in a toast and nothing is created: `createFile` would dedupe to
 * `<typeName> 1.md`, which defines a different type, so the type would stay
 * without a definition and every repeat would write another copy.
 *
 * Returns the created path, or `null` without a vault, on that name
 * collision, when the vault root cannot be read, or when `createFile` fails
 * (it logs and returns `null` rather than throwing). Every `null` with a vault
 * has already been reported in a toast, so callers must not toast again.
 */
export async function createTypeDefinition(typeName: string, opts: { select?: boolean } = {}): Promise<string | null> {
	if (!vaultStore.path) return null;
	const fileName = `${typeName}.md`;
	let rootNames: string[];
	try {
		const entries = await readDir(vaultStore.path);
		rootNames = entries.map((e) => e.name);
	} catch (err) {
		error('TYPE-DEF', 'createTypeDefinition: failed to read vault root:', err);
		toast.error(`Could not create the "${typeName}" type`);
		return null;
	}
	const taken = rootNames.find((n) => n.toLowerCase() === fileName.toLowerCase());
	if (taken) {
		toast.error(typeNameTakenMessage(taken, typeName));
		return null;
	}
	const content = `---\n_type: Type\n_visible: true\n---\n\n# ${typeName}\n`;
	let filePath: string;
	try {
		filePath = await createFile(vaultStore.path, fileName, content);
	} catch {
		toast.error(`Could not create the "${typeName}" type`);
		return null;
	}
	if (opts.select) {
		typeDefinitionsStore.setSelection({ kind: 'type', name: typeName });
	} else {
		openFileInEditor(filePath);
	}
	return filePath;
}

/**
 * True rename of a type. Renames the definition note via renameItem - which
 * already rewrites inbound [[wikilinks]] and updates open tabs - then
 * propagates `_type: oldName` -> `_type: newName` across every member note
 * via the Rust propagate_type_rename command (one disk pass + reindex;
 * emits vault-index-updated so the sidebar refreshes). Keeps the sidebar
 * selection and the rail shell's Types pick on the renamed type. No-ops on an unchanged name; aborts before
 * propagation when the definition rename fails (e.g. target file exists).
 *
 * Open editor tabs are rewritten TS-side FIRST (link-updater idiom: write +
 * syncExternalContentToEditor + reindex): the Rust pass only sees disk, and
 * a dirty tab's pending auto-save would otherwise clobber the propagated
 * rewrite with its stale in-memory `_type`. The Rust pass then skips those
 * files naturally (their `_type` already matches the new name).
 */
export async function renameType(oldName: string, newName: string, definitionPath: string): Promise<void> {
	if (oldName === newName) return;
	try {
		await renameItem(definitionPath, `${newName}.md`);
	} catch {
		// `renameItem` already logged the cause.
		return;
	}
	try {
		for (const tab of editorStore.tabs) {
			const updated = rewriteTypeInFrontmatter(tab.content, oldName, newName);
			if (updated === null) continue;
			await writeTextFile(tab.path, updated);
			// `'none'`: the rewritten `_type` was just written to disk above.
			syncExternalContentToEditor(tab.path, updated, true, 'none');
			// Route the rewritten bytes through the note-change owner so the Rust
			// `VaultIndex` and every registered per-file index pick up the new
			// `_type` immediately. Fire-and-forget; the owner logs its own errors.
			void applyNoteChange({ kind: 'upsert', source: 'save', path: tab.path, content: updated });
		}
		await call('propagate_type_rename', { oldType: oldName, newType: newName });
	} catch (err) {
		error('TYPE-RENAME', 'propagating type rename failed:', err);
		toast.error(`Type renamed, but updating member notes failed. Some notes may still reference "${oldName}".`);
		return;
	}
	const selection = typeDefinitionsStore.selectedTypeOrNav;
	if (selection?.kind === 'type' && selection.name === oldName) {
		typeDefinitionsStore.setSelection({ kind: 'type', name: newName });
	}
	// The rail shell's Types pick; loaded unvalidated, so it may not even be an object.
	const railPick = settingsStore.layout.railTypesLens;
	if (railPick?.kind === 'type' && railPick.target === oldName) {
		settingsStore.updateLayout({ railTypesLens: { kind: 'type', target: newName } });
	}
	// A rail pin of the type is keyed by its name.
	if (settingsStore.layout.railItem === typePinKey(oldName)) {
		settingsStore.updateLayout({ railItem: typePinKey(newName) });
	}
}

/**
 * Creates a `.view` named `name` in `folder` (the vault root without it), with
 * `name` as its label and table view name and `filters` (when given) as that
 * view's own filters, then selects it in the type sidebar.
 * `createFile` dedupes the file name against the folder's siblings
 * (`Name 1.view`); the label keeps the typed name. Resolves to the created
 * path. Rejects without a vault, or with `createFile`'s error when the folder
 * cannot be read or the file cannot be created; nothing is selected then.
 */
export async function createView(name: string, filters?: CollectionFilter | string, folder?: string): Promise<string> {
	if (!vaultStore.path) throw new Error('No vault is open');
	// The new row reads its label from the index snapshot: skip the refresh
	// throttle. Asked before the write, since `create_note` emits the event.
	vaultStore.requestPromptIndexRefresh();
	const filePath = await createFile(folder ?? vaultStore.path, `${name}.view`, buildNewViewYaml(name, filters));
	typeDefinitionsStore.setSelection({ kind: 'view', path: filePath });
	return filePath;
}

/**
 * Why a `.view` rewrite refused or failed:
 * - `save-failed`: saving the open tab failed. The tab was restored to what it
 *   showed unless it changed during the save, and the editor already showed a toast,
 *   so the caller must not toast again.
 * - `vault-changed`: the vault switched while the write was queued or in
 *   flight. When it is thrown after the save or the file write, the new bytes
 *   may already be on disk.
 * - `missing`: the file vanished before the write, so it was not recreated.
 */
export type ViewWriteReason = 'save-failed' | 'vault-changed' | 'missing';

/** Human text per `ViewWriteReason`; callers that toast show it as the cause. */
const VIEW_WRITE_MESSAGES: Record<ViewWriteReason, string> = {
	'save-failed': 'saving the open tab failed',
	'vault-changed': 'the vault changed, so the view may not have been saved',
	missing: 'the view was moved or deleted',
};

/** Typed failure of `rewriteViewFile`. */
export class ViewWriteError extends Error {
	/** What went wrong; see `ViewWriteReason`. */
	readonly reason: ViewWriteReason;
	/** The `.view` the write targeted. */
	readonly path: string;

	constructor(reason: ViewWriteReason, path: string) {
		super(VIEW_WRITE_MESSAGES[reason]);
		this.name = 'ViewWriteError';
		this.reason = reason;
		this.path = path;
	}
}

/** Options for {@link rewriteViewFile}. */
interface RewriteViewOptions {
	/**
	 * Ask for a prompt index refresh before the write, for readers of the index
	 * snapshot (the rail's pins, a row's label). Asked only when the file
	 * changes, and before the write, since `update_note_in_index` emits the event.
	 */
	promptIndexRefresh?: boolean;
}

/** The last rewrite queued for each `.view` path, settled or not; it never rejects. */
const viewWriteTails = new Map<string, Promise<unknown>>();

/**
 * Rewrites the `.view` at `path` to `transform(base)`. Every writer that
 * rewrites an existing `.view` goes through here. Resolves `true` when it
 * wrote, `false` when `transform` gave back the base.
 *
 * Writes of one path run one at a time, in call order, and each first waits
 * for a tab save in flight on that path. The base is the buffer of a dirty
 * tab, otherwise the file on disk.
 *
 * - Open tab: the result goes into the tab and the tab is saved at once, so
 *   its autosave cannot write an older buffer over it. The tab save runs the
 *   full after-save path (`notifyAfterSave`). A tab closed before that save
 *   ran gets the rewrite redone on the file.
 * - No tab, or a clean tab whose saved bytes already equal the result: writes the file, never recreating one that vanished, then hands
 *   the bytes to the note-change owner with source `save` (Rust re-indexes it
 *   and the watcher's self-save check skips the full rebuild). No `vaultPath`,
 *   so a `.view` stays out of the FTS5 and semantic tables.
 *
 * Read and write errors propagate as-is; the other failures are a
 * `ViewWriteError`. `transform` must be pure: it runs a second time when a tab
 * opens during the existence check, and what it throws propagates.
 */
async function rewriteViewFile(
	path: string,
	transform: (base: string) => string,
	options: RewriteViewOptions = {},
): Promise<boolean> {
	const vault = vaultStore.path;
	const prev = viewWriteTails.get(path);
	const run = (prev ?? Promise.resolve()).then(() => rewriteViewFileNow(path, transform, options, vault));
	const tail = run.catch(() => {});
	viewWriteTails.set(path, tail);
	void tail.then(() => {
		if (viewWriteTails.get(path) === tail) viewWriteTails.delete(path);
	});
	return run;
}

/** Throws `vault-changed` when the vault is no longer the one captured at the call. */
function assertViewVault(vault: string | null, path: string): void {
	if (vaultStore.path !== vault) throw new ViewWriteError('vault-changed', path);
}

/** The open tab for `path`, if any. */
function findViewTab(path: string) {
	return editorStore.tabs.find((t) => t.path === path);
}

/** One turn of `rewriteViewFile`, once the writes queued before it settled. */
async function rewriteViewFileNow(
	path: string,
	transform: (base: string) => string,
	options: RewriteViewOptions,
	vault: string | null,
): Promise<boolean> {
	await waitForTabSave(path);
	const disk = await readTextFile(path);
	assertViewVault(vault, path);
	// No await between here and the decision: the tab state read is the one used.
	let tab = findViewTab(path);
	let base = tab && isTabDirty(tab) ? tab.content : disk;
	let updated = transform(base);
	if (updated === base) return false;

	if (!tab) {
		const stillThere = await exists(path);
		assertViewVault(vault, path);
		if (!stillThere) throw new ViewWriteError('missing', path);
		// A tab opened while the check was pending may hold a newer buffer: redo on it.
		tab = findViewTab(path);
		if (tab) {
			base = isTabDirty(tab) ? tab.content : disk;
			updated = transform(base);
			if (updated === base) return false;
		}
	}

	if (options.promptIndexRefresh) vaultStore.requestPromptIndexRefresh();

	// A clean tab whose saved bytes already equal the result (an outside edit
	// not yet reloaded) stays clean, so its save would write nothing: write the
	// file below instead.
	if (tab && updated !== tab.savedContent) {
		// What the tab showed: a clean tab's older buffer is not the base.
		const before = tab.content;
		syncExternalContentToEditor(path, updated, false, 'none');
		const saved = await saveFileByPath(path);
		assertViewVault(vault, path);
		if (!saved) {
			// Leave edits made while the save was pending alone.
			if (findViewTab(path)?.content === updated) syncExternalContentToEditor(path, before, false, 'none');
			throw new ViewWriteError('save-failed', path);
		}
		// A tab closed before its queued save ran wrote nothing: redo the rewrite
		// on the file. When the save did land, the redo finds nothing to change.
		if (!findViewTab(path)) await rewriteViewFileNow(path, transform, options, vault);
		return true;
	}

	try {
		// `create: false`: a file deleted after the check above is refused by
		// the open itself, not recreated with the rewritten bytes.
		await writeTextFile(path, updated, { create: false });
	} catch (err) {
		if (!(await exists(path).catch(() => true))) throw new ViewWriteError('missing', path);
		throw err;
	}
	assertViewVault(vault, path);
	// No-op without a tab; covers a tab opened during the write.
	syncExternalContentToEditor(path, updated, true, 'none');
	markRecentSave(path);
	await applyNoteChange({ kind: 'upsert', source: 'save', path, content: updated });
	return true;
}

/** Updates _icon, _color, and _title_color in a .view YAML file; a save that changes none of them does not touch the file. */
export async function updateViewIcon(
	path: string,
	icon?: string,
	color?: string,
	titleColor?: string,
): Promise<void> {
	await rewriteViewFile(path, (content) => updateViewIconYaml(content, icon, color, titleColor));
}

/** Updates the colors in a .view YAML file, leaving its icon; a save that changes no color does not touch the file. */
export async function updateViewIconColors(path: string, color?: string, titleColor?: string): Promise<void> {
	await rewriteViewFile(path, (content) => updateViewColorsYaml(content, color, titleColor));
}

/**
 * Pins the `.view` at `path` to the rail (`_rail: true`) or unpins it (the key
 * removed), through `rewriteViewFile`. The whole file is re-serialised,
 * so its comments and formatting are lost; the write is skipped only when
 * that gives back the same bytes. Rejects when the read fails, the YAML does
 * not parse, or the write fails.
 */
export async function setViewRailPin(path: string, pinned: boolean): Promise<void> {
	// The rail lists pins from the index snapshot: skip the refresh throttle.
	await rewriteViewFile(path, (content) => updateViewRailYaml(content, pinned), { promptIndexRefresh: true });
}

/**
 * Saves the property columns the rail note list shows for the `.view` at `path`
 * (`_list_properties_display`; an empty list removes the key). Same write path
 * and failure behaviour as `setViewRailPin`.
 */
export async function updateViewListProperties(path: string, properties: readonly string[]): Promise<void> {
	await rewriteViewFile(path, (content) => updateViewListPropertiesYaml(content, properties), { promptIndexRefresh: true });
}

/** Removes _icon, _color, and _title_color from a .view YAML file. */
export async function removeViewIcon(path: string): Promise<void> {
	await updateViewIcon(path, undefined, undefined, undefined);
}

/** A toolbar edit refused because its key in the `.view` changed since the toolbar read it. */
export class ViewWriteConflict extends Error {
	/** The `.view` the edit targeted. */
	readonly path: string;
	/** The key the edit wrote. */
	readonly key: ToolbarKey;

	constructor(path: string, key: ToolbarKey) {
		super(`"${key}" of ${path} changed since it was read`);
		this.name = 'ViewWriteConflict';
		this.path = path;
		this.key = key;
	}
}

/**
 * Writes one key of the rail toolbar (`applyToolbarEdit`) to the `.view` at
 * `path`, through `rewriteViewFile`, so the bytes it checks are a dirty tab's
 * buffer or the file. `base` is that key's value when the toolbar showed it
 * (`toolbarKeyBase`). Then refreshes the parse cache and resolves to the
 * definition it now holds. Rejects with `ViewWriteConflict`, nothing written,
 * when the key is no longer `base`; with an `Error` when the bytes do not parse
 * as a `.view`; and as `rewriteViewFile` does.
 */
export async function updateViewToolbarKey<K extends ToolbarKey>(
	path: string,
	key: K,
	next: ToolbarValues[K],
	base: string,
): Promise<CollectionDefinition> {
	await rewriteViewFile(path, (content) => {
		const result = applyToolbarEdit(content, key, next, base);
		if (result.ok) return result.yaml;
		if (result.reason === 'conflict') throw new ViewWriteConflict(path, key);
		throw new Error(result.error);
	});
	const parsed = await refreshViewDefinition(path);
	if (!parsed.success) throw new Error(parsed.error);
	return parsed.definition;
}

/**
 * Saves the Edit view dialog: rewrites the label and filters of the `.view`
 * at `path` (`updateViewEditYaml`), keeping its filename and every other key,
 * then refreshes the parse cache. Rejects, with nothing written, when the
 * file cannot be read or the updater refuses it; rejects when the write fails.
 */
export async function editView(path: string, edit: ViewEdit): Promise<void> {
	// The row reads its label from the index snapshot: skip the refresh throttle.
	await rewriteViewFile(path, (content) => {
		const result = updateViewEditYaml(content, edit);
		if (!result.ok) throw new Error(result.error);
		return result.yaml;
	}, { promptIndexRefresh: true });
	await refreshViewDefinition(path);
}
