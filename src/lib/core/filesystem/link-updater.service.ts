import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { syncExternalContentToEditor } from '$lib/core/editor/editor.service';
import { isTabDirty } from '$lib/core/editor/editor.logic';
import { extractNoteName, replaceWikilinks } from './link-updater.logic';
import { applyNoteChange } from './note-change.service';
import { error } from '$lib/utils/debug';
import type { NoteEntryV2 } from '$lib/types/vault-v2.types';

/**
 * Updates all wikilinks across the vault after a file rename.
 *
 * Finds affected files via the Rust `VaultIndex.backlinks` reverse index
 * (`get_backlinks_v2`), replaces wikilink targets in each one, writes the
 * updated content to disk, and syncs open editor tabs. Each affected file
 * is also re-indexed via `applyNoteChange` so the Rust panels and every
 * registered per-file index see the new outgoing links immediately, ahead
 * of the watcher's 500 ms debounce. Skips when the note name didn't change
 * (pure folder move).
 */
export async function updateLinksAfterRename(oldPath: string, newPath: string): Promise<void> {
	const oldName = extractNoteName(oldPath);
	const newName = extractNoteName(newPath);

	if (oldName.toLowerCase() === newName.toLowerCase()) return;

	const sources = await invoke<NoteEntryV2[]>('get_backlinks_v2', { path: oldPath });
	const affectedPaths = sources.map((e) => e.path).filter((p) => p !== oldPath);

	const results = await Promise.allSettled(
		affectedPaths.map(async (filePath) => {
			// Use in-memory content if the tab has unsaved edits to avoid losing them
			const openTab = editorStore.tabs.find((t) => t.path === filePath);
			const isDirty = openTab != null && isTabDirty(openTab);
			const content = isDirty ? openTab.content : await readTextFile(filePath);
			const updatedContent = replaceWikilinks(content, oldName, newName);

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
 * The Rust `VaultIndex` is re-keyed independently: `fs.service.ts` invokes
 * `remove_note_from_index` for the old path, and the watcher detects the
 * new path's modification and invokes `update_note_in_index` for it.
 * Editor tabs are TS-only UI state, so they need this explicit sync.
 */
export function updateTabAfterRenameOrMove(oldPath: string, newPath: string): void {
	const oldPrefix = oldPath + '/';

	for (const tab of editorStore.tabs) {
		if (tab.path === oldPath) {
			const newFileName = newPath.split('/').pop() ?? newPath;
			editorStore.updateTabPath(oldPath, newPath, newFileName);
		} else if (tab.path.startsWith(oldPrefix)) {
			const childNewPath = newPath + tab.path.slice(oldPath.length);
			const childNewName = childNewPath.split('/').pop() ?? childNewPath;
			editorStore.updateTabPath(tab.path, childNewPath, childNewName);
		}
	}
}
