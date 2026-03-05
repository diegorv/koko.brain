import { invoke } from '@tauri-apps/api/core';
import { debug, timeAsync, perfStart, perfEnd } from '$lib/utils/debug';
import { backlinksStore } from './backlinks.store.svelte';
import { noteIndexStore } from './note-index.store.svelte';
import { parseWikilinks, getNoteName, findLinkedMentions, findUnlinkedMentions } from './backlinks.logic';
import type { WikilinkResolutionCache } from './backlinks.logic';
import type { WikiLink } from './backlinks.types';
import type { FileTreeNode, FileReadResult } from '$lib/core/filesystem/fs.types';

let vaultPath: string | null = null;
let isBuilding = false;
let pendingRebuild = false;

/** Recursively collects all markdown file paths from a pre-scanned file tree */
function collectMarkdownPaths(nodes: FileTreeNode[]): string[] {
	const paths: string[] = [];
	for (const node of nodes) {
		if (node.isDirectory && node.children) {
			paths.push(...collectMarkdownPaths(node.children));
		} else if (node.name.endsWith('.md') || node.name.endsWith('.markdown')) {
			paths.push(node.path);
		}
	}
	return paths;
}

export async function buildIndex(path: string) {
	if (isBuilding) {
		pendingRebuild = true;
		return;
	}
	isBuilding = true;
	vaultPath = path;
	noteIndexStore.setLoading(true);

	try {
		await timeAsync('BACKLINKS', 'buildIndex', async () => {
			const tree = await invoke<FileTreeNode[]>('scan_vault', {
				path,
				sortBy: 'name',
			});

			const filePaths = collectMarkdownPaths(tree);

			const readResults = await invoke<FileReadResult[]>('read_files_batch', {
				vaultPath: path,
				paths: filePaths,
			});

			const index = new Map<string, WikiLink[]>();
			const contents = new Map<string, string>();

			for (const result of readResults) {
				if (result.content !== null) {
					contents.set(result.path, result.content);
					index.set(result.path, parseWikilinks(result.content));
				}
			}

			noteIndexStore.setNoteIndex(index);
			noteIndexStore.setNoteContents(contents);
			debug('BACKLINKS', `Index: ${index.size} notes, ${contents.size} contents`);
		});
	} finally {
		noteIndexStore.setLoading(false);
		isBuilding = false;
		if (pendingRebuild && vaultPath) {
			pendingRebuild = false;
			// Use module-level vaultPath (not the argument 'path') to ensure
			// the rebuild uses the current vault, not a stale one
			await buildIndex(vaultPath);
		}
	}
}

export async function rebuildIndex() {
	debug('BACKLINKS', `rebuildIndex() called at ${Date.now()}`);
	if (vaultPath) {
		await buildIndex(vaultPath);
	}
}

export function updateIndexForFile(filePath: string, content: string) {
	noteIndexStore.updateNoteEntry(filePath, content, parseWikilinks(content));
}

/** Removes a file from both noteIndex and noteContents (e.g. when a file is deleted) */
export function removeFileFromIndex(filePath: string) {
	const nextContents = new Map(noteIndexStore.noteContents);
	const nextIndex = new Map(noteIndexStore.noteIndex);
	const deletedContents = nextContents.delete(filePath);
	const deletedIndex = nextIndex.delete(filePath);

	if (deletedContents || deletedIndex) {
		noteIndexStore.setNoteContents(nextContents);
		noteIndexStore.setNoteIndex(nextIndex);
	}
}

export function updateBacklinksForFile(
	filePath: string,
	sharedFilePaths?: string[],
	sharedCache?: WikilinkResolutionCache,
) {
	const t0 = perfStart();
	const noteIndex = noteIndexStore.noteIndex;
	const noteContents = noteIndexStore.noteContents;
	const allFilePaths = sharedFilePaths ?? Array.from(noteContents.keys());
	const noteName = getNoteName(filePath);

	const t1 = perfStart();
	const linked = findLinkedMentions(filePath, noteIndex, noteContents, allFilePaths, sharedCache);
	perfEnd('BACKLINKS', 'findLinkedMentions', t1);

	const t2 = perfStart();
	const unlinked = findUnlinkedMentions(filePath, noteName, noteContents, noteIndex);
	perfEnd('BACKLINKS', 'findUnlinkedMentions', t2);

	backlinksStore.setLinkedMentions(linked);
	backlinksStore.setUnlinkedMentions(unlinked);
	perfEnd('BACKLINKS', 'updateBacklinksForFile', t0);
}

export function resetBacklinks() {
	vaultPath = null;
	isBuilding = false;
	pendingRebuild = false;
	backlinksStore.reset();
}
