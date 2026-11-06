import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { openNoteAt } from '#lib/core/editor/open-note-at.service.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { getVaultEntries } from '#lib/core/vault/vault-entries.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
// Owner decision (Issue 05): mods may import QueryJS for `ctx.kb`; listed in PLUGIN_ALLOWLIST.
import { KBAPI } from '#lib/plugins/queryjs/kb-api.js';
import { loadExternalScript } from '#lib/plugins/queryjs/queryjs.service.js';

/**
 * The app's own objects a mod reaches through `ctx.app`: the live objects, not
 * copies or wrappers. Adding a member is one line here.
 */
export const MOD_APP = {
	/** Tabs (`activeTab` has the open note's `path` and `content`) and the CodeMirror `editorView` */
	editorStore,
	/** Opens an absolute path in the editor, or switches to its tab */
	openFileInEditor,
	/** Opens a note and moves the caret to a heading, block or offset */
	openNoteAt,
	/** The open vault's path and index state */
	vaultStore,
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
