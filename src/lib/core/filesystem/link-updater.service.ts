import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { isTabDirty } from '$lib/core/editor/editor.logic';
import { noteIndexStore } from '$lib/features/backlinks/note-index.store.svelte';
import { updateIndexForFile } from '$lib/features/backlinks/backlinks.service';
import { extractNoteName, replaceWikilinks, findFilesLinkingTo } from './link-updater.logic';
import { error } from '$lib/utils/debug';

/**
 * Updates all wikilinks across the vault after a file rename.
 *
 * Finds affected files via the backlinks index, replaces wikilink targets,
 * writes updated content to disk, and syncs open tabs + backlinks index.
 *
 * Skips if the note name didn't change (pure move).
 */
export async function updateLinksAfterRename(oldPath: string, newPath: string): Promise<void> {
	const oldName = extractNoteName(oldPath);
	const newName = extractNoteName(newPath);

	if (oldName.toLowerCase() === newName.toLowerCase()) return;

	const affectedPaths = findFilesLinkingTo(oldName, noteIndexStore.noteContents, oldPath);

	for (const filePath of affectedPaths) {
		try {
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
				editorStore.updateTabContentByPath(filePath, updatedContent);
				updateIndexForFile(filePath, updatedContent);
			}
		} catch (err) {
			error('LINK_UPDATER', `Failed to update links in ${filePath}:`, err);
		}
	}
}

/**
 * Updates the open editor tab's path/name after a file rename or move,
 * and re-keys the backlinks index entries from the old path to the new path.
 *
 * When a folder is moved, also updates all child file tabs and backlinks
 * entries whose paths start with `oldPath/`.
 */
export function updateTabAfterRenameOrMove(oldPath: string, newPath: string): void {
	const oldPrefix = oldPath + '/';

	// Update tabs: exact match (single file) + child matches (folder contents)
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

	// Re-key backlinks index: exact match + child matches
	const nextIndex = new Map(noteIndexStore.noteIndex);
	const nextContents = new Map(noteIndexStore.noteContents);
	let indexChanged = false;
	let contentsChanged = false;

	for (const [key, value] of noteIndexStore.noteIndex) {
		if (key === oldPath) {
			nextIndex.delete(oldPath);
			nextIndex.set(newPath, value);
			indexChanged = true;
		} else if (key.startsWith(oldPrefix)) {
			const childNewKey = newPath + key.slice(oldPath.length);
			nextIndex.delete(key);
			nextIndex.set(childNewKey, value);
			indexChanged = true;
		}
	}

	for (const [key, value] of noteIndexStore.noteContents) {
		if (key === oldPath) {
			nextContents.delete(oldPath);
			nextContents.set(newPath, value);
			contentsChanged = true;
		} else if (key.startsWith(oldPrefix)) {
			const childNewKey = newPath + key.slice(oldPath.length);
			nextContents.delete(key);
			nextContents.set(childNewKey, value);
			contentsChanged = true;
		}
	}

	if (indexChanged) noteIndexStore.setNoteIndex(nextIndex);
	if (contentsChanged) noteIndexStore.setNoteContents(nextContents);
}
