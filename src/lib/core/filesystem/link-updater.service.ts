import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { call } from '#lib/contracts/ipc.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { syncExternalContentToEditor } from '#lib/core/editor/editor.service.js';
import { isTabDirty } from '#lib/core/editor/editor.logic.js';
import { renameTabViewState } from '#lib/core/markdown-editor/tab-view-state.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { flattenFileTree } from './file-entries.logic';
import { fsStore } from './fs.store.svelte';
import { isMarkdownFile } from './fs.logic';
import { buildRenameResolution, extractNoteName, replaceWikilinks } from './link-updater.logic';
import { applyNoteChange } from './note-change.service';
import { error } from '#lib/utils/debug.js';

/**
 * Updates all wikilinks across the vault after a file rename.
 *
 * Finds affected files via the Rust `VaultIndex.backlinks` reverse index
 * (`get_backlinks_v2`), replaces wikilink targets in each one, writes the
 * updated content to disk, and syncs open editor tabs. Each affected file
 * is also re-indexed via `applyNoteChange` so the Rust panels and every
 * registered per-file index see the new outgoing links immediately, ahead
 * of the watcher's 300 ms debounce. Skips when the note name didn't change
 * (pure folder move).
 *
 * Only links that resolve to `oldPath` are rewritten, judged against the
 * markdown paths of `fsStore.fileTree`. `applyPathChange` moves the renamed
 * node in the tree, and Rust `rename_note` re-keys the index, only after this
 * call returns, so the tree still lists the pre-rename vault. The tree order
 * follows the user's folder and content order, while Rust picks the winner of
 * a duplicated stem by scan order (HashMap order after a removal), so with two
 * notes sharing the OLD stem a bare link can be judged against a different
 * winner than Rust's and be left unrewritten.
 */
export async function updateLinksAfterRename(oldPath: string, newPath: string): Promise<void> {
	const oldName = extractNoteName(oldPath);
	const newName = extractNoteName(newPath);

	if (oldName.toLowerCase() === newName.toLowerCase()) return;

	const notePaths = flattenFileTree(fsStore.fileTree)
		.filter((f) => isMarkdownFile(f.name))
		.map((f) => f.path);
	const rename = buildRenameResolution(oldPath, newPath, notePaths, vaultStore.path);

	const sources = await call('get_backlinks_v2', { path: oldPath });
	const affectedPaths = sources.map((e) => e.path).filter((p) => p !== oldPath);

	const results = await Promise.allSettled(
		affectedPaths.map(async (filePath) => {
			// Use in-memory content if the tab has unsaved edits to avoid losing them
			const openTab = editorStore.tabs.find((t) => t.path === filePath);
			const isDirty = openTab != null && isTabDirty(openTab);
			const content = isDirty ? openTab.content : await readTextFile(filePath);
			const updatedContent = replaceWikilinks(content, rename);

			if (updatedContent !== content) {
				await writeTextFile(filePath, updatedContent);
				// Sync both content and savedContent — the full content (including
				// any prior unsaved edits) was just written to disk, so savedContent
				// must reflect the on-disk state to keep the dirty flag accurate.
				// `syncExternalContentToEditor` also bumps `externalContentSignal`
				// so an open editor for this path gets a fresh doc replace.
				// `'none'`: the rewritten content was just written to disk above,
				// so the tab is clean and needs no auto-save.
				syncExternalContentToEditor(filePath, updatedContent, true, 'none');
				// Index the rewritten bytes: the Rust `VaultIndex` (so the next
				// `get_backlinks_v2` reflects the new outgoing-link target) plus
				// every registered per-file index, without waiting on the 500 ms
				// watcher debounce. Fire-and-forget; the owner logs its own errors.
				void applyNoteChange({ kind: 'upsert', source: 'save', path: filePath, content: updatedContent });
			}
		}),
	);
	for (const result of results) {
		if (result.status === 'rejected') {
			error('LINK_UPDATER', `Failed to update links:`, result.reason);
		}
	}
}

/**
 * Updates the open editor tab's path/name after a file rename or move.
 * When a folder is moved, also updates all child file tabs whose paths
 * start with `oldPath/`.
 *
 * The Rust `VaultIndex` is re-keyed by `path-change.service.ts`, which awaits
 * the `rename_note` command; the per-path `remove_note_from_index` sweep that
 * follows is a deliberate no-op for the entries it already moved. Editor tabs
 * are TS-only UI state, so they need this explicit sync. Each re-pathed tab
 * also takes its saved scroll/cursor and editor state (undo history) along.
 */
export function updateTabAfterRenameOrMove(oldPath: string, newPath: string): void {
	const oldPrefix = oldPath + '/';

	for (const tab of editorStore.tabs) {
		if (tab.path === oldPath) {
			const newFileName = newPath.split('/').pop() ?? newPath;
			editorStore.updateTabPath(oldPath, newPath, newFileName);
			renameTabViewState(oldPath, newPath);
		} else if (tab.path.startsWith(oldPrefix)) {
			const childNewPath = newPath + tab.path.slice(oldPath.length);
			const childNewName = childNewPath.split('/').pop() ?? childNewPath;
			const childOldPath = tab.path;
			editorStore.updateTabPath(childOldPath, childNewPath, childNewName);
			renameTabViewState(childOldPath, childNewPath);
		}
	}
}
