import type { Dayjs } from 'dayjs';
import { invoke } from '@tauri-apps/api/core';
import { readDir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { openFileInEditor, syncExternalContentToEditor } from '#lib/core/editor/editor.service.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { loadNoteTemplate, openOrCreateNote } from '#lib/core/note-creator/note-creator.service.js';
import { createFile, renameItem } from '#lib/core/filesystem/fs.service.js';
import { applyNoteChange } from '#lib/core/filesystem/note-change.service.js';
import { generateUniqueName } from '#lib/core/filesystem/fs.logic.js';
import {
	FrontmatterWriteError,
	toastFrontmatterWriteError,
	updateNoteFrontmatter,
} from '#lib/features/properties/frontmatter-write.service.js';
import { toggleFavorite } from '#lib/features/properties/lifecycle.logic.js';
import { toast } from 'svelte-sonner';
import { error } from '#lib/utils/debug.js';
import { buildTypeMetadataMap, buildTypeNoteDir, rewriteTypeInFrontmatter, typeNameTakenMessage } from './type-definitions.logic';
import { updateViewIconYaml } from './type-sidebar.logic';
import { typeDefinitionsStore } from './type-definitions.store.svelte';
import { updateCollectionYaml, type CollectionYamlUpdates } from '#lib/features/collection/yaml-parser.js';
import { refreshViewDefinition } from './view-parse-cache';

/** Rebuilds the type metadata map. Fetches entries if not provided. */
export async function refreshTypeDefinitions(entries?: NoteEntryV2[]): Promise<void> {
	const data = entries ?? await invoke<NoteEntryV2[]>('get_all_vault_entries_v2');
	const map = buildTypeMetadataMap(data);
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
	await openOrCreateNote({ filePath: `${dir}/${fileName}`, templatePath, inlineTemplate, title });
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
	 * deduped target so the caller can see the final name before the write.
	 * Whatever it throws propagates and no file is created.
	 */
	buildContent?: (base: string, target: { fileName: string; title: string }) => string;
}

/**
 * Creates a note of a type without opening it, through the same folder,
 * dedupe and template owner as {@link createNoteOfType}. Returns the created
 * path. Throws `Error('no-vault')` without a vault, `Error('create-failed')`
 * when the target folder cannot be created or `createFile` refuses, or
 * whatever `buildContent` throws.
 *
 * `buildContent` sees the name deduped here, and `createFile` dedupes again
 * against a fresh `readDir`. If a same-named file appears between the two
 * reads, the note lands under the next free name while its content was built
 * for the first one. This same-instant race is accepted (as in `createView`):
 * throwing then would report a failure for a note that already exists.
 */
export async function createTypedNote(options: CreateTypedNoteOptions): Promise<string> {
	const { typeName, title, contextDate, buildContent } = options;
	const target = await resolveTypedNoteTarget(typeName, title);
	if (!target) throw new Error('no-vault');
	try {
		await invoke('create_folder', { path: target.dir });
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
	const content = buildContent?.(base, { fileName: target.fileName, title: target.title }) ?? base;
	const path = await createFile(target.dir, target.fileName, content);
	if (!path) throw new Error('create-failed');
	return path;
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
	const filePath = await createFile(vaultStore.path, fileName, content);
	if (!filePath) {
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
 * selection on the renamed type. No-ops on an unchanged name; aborts before
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
	const newPath = await renameItem(definitionPath, `${newName}.md`);
	if (!newPath) return;
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
		await invoke('propagate_type_rename', { oldType: oldName, newType: newName });
	} catch (err) {
		error('TYPE-RENAME', 'propagating type rename failed:', err);
		toast.error(`Type renamed, but updating member notes failed. Some notes may still reference "${oldName}".`);
		return;
	}
	const selection = typeDefinitionsStore.selectedTypeOrNav;
	if (selection?.kind === 'type' && selection.name === oldName) {
		typeDefinitionsStore.setSelection({ kind: 'type', name: newName });
	}
}

/**
 * Creates a new empty .view file at the vault root with a minimal table view
 * and no filters, then selects it in the type sidebar so the user can configure
 * filters and sort via the inline toolbar without first having to open the raw
 * YAML.
 */
export async function createView(): Promise<void> {
	if (!vaultStore.path) return;
	// The body embeds the deduplicated title, so dedup must run BEFORE
	// createFile (which would otherwise dedup after the content is fixed).
	// createFile re-runs the same dedup on the pre-deduplicated name, which
	// leaves it unchanged unless a same-named file appears between the two
	// readDirs (accepted: same-instant race, cosmetic label mismatch only).
	// Abort on readDir failure — a silent fallback to
	// no siblings would let createFile dedup to a filename the embedded
	// title no longer matches (and createFile's own readDir would fail the
	// same way anyway).
	let siblingNames: string[];
	try {
		const entries = await readDir(vaultStore.path);
		siblingNames = entries.map((e) => e.name);
	} catch (err) {
		error('TYPE-DEF', 'createView: failed to read vault root:', err);
		return;
	}
	const uniqueName = generateUniqueName('Untitled.view', false, siblingNames);
	const title = uniqueName.replace(/\.view$/i, '');
	const content = `_sidebar_label: ${title}\n_sort: title\nviews:\n  - type: table\n    name: ${title}\n`;
	const filePath = await createFile(vaultStore.path, uniqueName, content);
	if (!filePath) return;
	typeDefinitionsStore.setSelection({ kind: 'view', path: filePath });
}

/**
 * Toggles _favorite on a note by path through `updateNoteFrontmatter`, so an
 * open tab keeps its unsaved edits. A refused or failed write (lossy
 * frontmatter, vanished note) is reported in a toast; other errors propagate.
 */
export async function toggleFavoriteForPath(filePath: string, favorite: boolean): Promise<void> {
	try {
		await updateNoteFrontmatter(filePath, (props) => toggleFavorite(props, favorite));
	} catch (err) {
		if (!(err instanceof FrontmatterWriteError)) throw err;
		toastFrontmatterWriteError(err);
	}
}

/** Updates _icon, _color, and _title_color in a .view YAML file. */
export async function updateViewIcon(
	path: string,
	icon?: string,
	color?: string,
	titleColor?: string,
): Promise<void> {
	const content = await readTextFile(path);
	await writeTextFile(path, updateViewIconYaml(content, icon, color, titleColor));
}

/** Removes _icon, _color, and _title_color from a .view YAML file. */
export async function removeViewIcon(path: string): Promise<void> {
	await updateViewIcon(path, undefined, undefined, undefined);
}

/**
 * Applies a CollectionYamlUpdates patch to a .view file, preserving all unrelated
 * YAML content. Used to persist filter, sort, and column changes made from the
 * TypeNoteList toolbar. After writing, refreshes the parse cache so the next
 * read returns the updated definition.
 */
export async function updateViewQuery(path: string, updates: CollectionYamlUpdates): Promise<void> {
	const content = await readTextFile(path);
	const updated = updateCollectionYaml(content, updates);
	if (updated === content) return;
	await writeTextFile(path, updated);
	await refreshViewDefinition(path);
}
