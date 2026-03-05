import { noteIndexStore } from '$lib/features/backlinks/note-index.store.svelte';
import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
import type { FileTreeNode } from '$lib/core/filesystem/fs.types';
import { debug, timeSync } from '$lib/utils/debug';
import { collectionStore } from './collection.store.svelte';
import { buildNoteRecord } from './collection.logic';
import type { NoteRecord } from './collection.types';

/** Flattens a FileTreeNode tree into a Map of path → { mtime, ctime } */
function buildMetadataMap(nodes: FileTreeNode[]): Map<string, { mtime: number; ctime: number }> {
	const map = new Map<string, { mtime: number; ctime: number }>();
	function walk(items: FileTreeNode[]) {
		for (const node of items) {
			if (!node.isDirectory) {
				map.set(node.path, {
					mtime: node.modifiedAt ?? 0,
					ctime: node.createdAt ?? 0,
				});
			}
			if (node.children) walk(node.children);
		}
	}
	walk(nodes);
	return map;
}

/**
 * Builds the full property index from all indexed note contents.
 * Uses noteIndexStore.noteContents as the source of truth and
 * fsStore.fileTree for file metadata (timestamps).
 */
export function buildPropertyIndex() {
	timeSync('COLLECTION', 'buildPropertyIndex', () => {
		const noteContents = noteIndexStore.noteContents;
		const metadata = buildMetadataMap(fsStore.fileTree);
		const index = new Map<string, NoteRecord>();

		for (const [path, content] of noteContents) {
			const meta = metadata.get(path);
			const record = buildNoteRecord(path, content, meta?.mtime ?? 0, meta?.ctime ?? 0);
			index.set(path, record);
		}

		collectionStore.setPropertyIndex(index);
		debug('COLLECTION', `Properties: ${index.size} notes`);
	});
}

/**
 * Updates a single note's record in the property index.
 * Called when a note's content changes (typing).
 * Preserves existing file metadata from the current index entry since
 * timestamps don't change during editing — the watcher triggers a full
 * rebuild with fresh metadata when the file is saved to disk.
 */
export function updateNoteInIndex(path: string, content: string) {
	const existing = collectionStore.propertyIndex.get(path);
	const record = buildNoteRecord(
		path, content,
		existing?.mtime ?? 0, existing?.ctime ?? 0, existing?.size ?? 0,
	);
	collectionStore.updateRecord(path, record);
}

/**
 * Removes a note from the property index.
 * Called when a note is deleted.
 */
export function removeNoteFromIndex(path: string) {
	collectionStore.removeRecord(path);
}

/** Resets the collection store to its initial state. Used during vault teardown. */
export function resetCollection(): void {
	collectionStore.reset();
}
