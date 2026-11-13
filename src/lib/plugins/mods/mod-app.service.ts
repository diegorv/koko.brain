import { openFileInEditor, saveFileByPath, syncExternalContentToEditor } from '#lib/core/editor/editor.service.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { openNoteAt } from '#lib/core/editor/open-note-at.service.js';
import { updateNoteFrontmatter } from '#lib/core/frontmatter/frontmatter-write.service.js';
import { openOrCreateNote } from '#lib/core/note-creator/note-creator.service.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { getVaultEntries } from '#lib/core/vault/vault-entries.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import { railRegistryStore } from '#lib/features/rail-shell/rail-registry.store.svelte.js';
import { createTypedNote } from '#lib/features/type-definitions/type-definitions.service.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
// Owner decision (Issue 05): mods may import QueryJS for `ctx.kb`; listed in PLUGIN_ALLOWLIST.
import { KBAPI } from '#lib/plugins/queryjs/kb-api.js';
import { loadExternalScript } from '#lib/plugins/queryjs/queryjs.service.js';
// Owner decision: mods may import the 1:1 plugin for its picker and note creation; listed in PLUGIN_ALLOWLIST.
import { createOneOnOneNote, openOneOnOnePicker } from '#lib/plugins/one-on-one/one-on-one.service.js';
// Owner decision: mods may import the periodic notes plugin for the daily note; listed in PLUGIN_ALLOWLIST.
import { dailyNotePath, openOrCreateDailyNote } from '#lib/plugins/periodic-notes/periodic-notes.service.js';
import { modCommandsStore } from './mod-commands.store.svelte';

/**
 * The app's own objects a mod reaches through `ctx.app`: the live objects, not
 * copies or wrappers. Adding a member is one line here.
 */
export const MOD_APP = {
	/** Tabs (`activeTab` has the open note's `path` and `content`) and the CodeMirror `editorView` */
	editorStore,
	/** Opens an absolute path in the editor, or switches to its tab */
	openFileInEditor,
	/** Opens a note and moves the caret to `{ kind: 'line', line }` (1-based) or `{ kind: 'offset', offset }` */
	openNoteAt,
	/** The open vault's path and index state */
	vaultStore,
	/** Creates a note of a type (its folder, template, unique name, `_organized`) and resolves to its absolute path */
	createTypedNote,
	/** Opens or creates today's 1:1 note with a person, by name, from the 1:1 settings and template */
	createOneOnOneNote,
	/**
	 * Opens the app's 1:1 person picker. With a callback, picking a person calls it with
	 * `{ name, path, context }` (`path` is absolute) instead of creating the note; a rejection shows as a toast
	 */
	openOneOnOnePicker,
	/** Absolute path of the daily note of a `Date`, today by default, from the settings; the note may not exist */
	dailyNotePath,
	/** Opens today's daily note, creating it from its template when missing */
	openOrCreateDailyNote,
	/**
	 * Rewrites a note's frontmatter by absolute path through a `Property[]` mutation. On an open tab
	 * it keeps the unsaved body edits and saves the whole tab at once; it refuses frontmatter it cannot
	 * round-trip (comments, nested maps, anchors, duplicate keys)
	 */
	updateNoteFrontmatter,
	/** The vault's type definitions: `getTypeMetadata(name)`, `typeMetadataMap` */
	typeDefinitionsStore,
	/** Every registered mod action, including unmarked actions; rows expose id, label, run and palette. */
	modCommandsStore,
	/** Live rail registrations; register each returned cleanup with ctx.register */
	railRegistryStore,
	/** Live application settings; any mutation is written to the settings file after the persistence debounce */
	settingsStore,
	/** Opens or creates a note using NoteCreationOptions, including per-call templates and variables */
	openOrCreateNote,
	/** Saves a dirty open tab by absolute path; resolves true on success or no-op, false on write failure */
	saveFileByPath,
	/** Syncs external bytes into an open tab and CodeMirror; schedule chooses frontmatter, body or no auto-save */
	syncExternalContentToEditor,
};

/** Type of `ctx.app` */
export type ModApp = typeof MOD_APP;

/**
 * Builds a new QueryJS `KBAPI` over a fresh vault entries snapshot, the way a
 * QueryJS block builds one (`queryjs-block-widget.ts`). Its `container` is a
 * detached `<div>`, for a mod that uses `kb.ui` to append where it wants.
 * Rejects when the snapshot read fails, or when the mod was unloaded or the
 * vault changed during the read.
 */
export async function createModKb(vaultPath: string, assertLive: () => void): Promise<KBAPI> {
	assertLive();
	const entries = await getVaultEntries();
	assertLive();
	return new KBAPI({
		container: document.createElement('div'),
		propertyIndex: collectionStore.propertyIndex,
		entries,
		propertyIndexVersion: collectionStore.version,
		currentFilePath: editorStore.activeTabPath ?? '',
		vaultPath,
		systemFolder: settingsStore.templates.systemFolder,
		loadScript: loadExternalScript,
	});
}
