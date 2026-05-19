import { createFile } from '$lib/core/filesystem/fs.service';
import { readText, writeText } from '$lib/core/filesystem/fs-rust.service';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { createEmptyKanbanBoard, serializeKanbanBoard, extractCardWikilinks } from './kanban.logic';
import { kanbanStore } from './kanban.store.svelte';
import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
import { flattenFileTree } from '$lib/features/quick-switcher/quick-switcher.logic';
import { buildResolutionCache, resolveWikilinkCached } from '$lib/features/backlinks/backlinks.logic';
import { stripFrontmatter } from '$lib/core/markdown-editor/extensions/live-preview/embed-resolver.logic';
import { error } from '$lib/utils/debug';

/**
 * Creates a new `.kanban` file with an empty board (To Do, In Progress, Done).
 * Returns the file path on success, or null on failure.
 */
export async function createKanbanFile(parentPath: string): Promise<string | null> {
	try {
		const vaultPath = vaultStore.path;
		if (!vaultPath) return null;
		const filePath = await createFile(parentPath, 'Untitled.kanban');
		if (!filePath) return null;
		const board = createEmptyKanbanBoard();
		await writeText(vaultPath, filePath, serializeKanbanBoard(board));
		return filePath;
	} catch (err) {
		error('KANBAN', 'Failed to create kanban file:', err);
		return null;
	}
}

/** Resets all kanban state (called during vault teardown) */
export function resetKanban(): void {
	kanbanStore.reset();
	linkedContentCache.clear();
}

// -- Card linked file content preview --

/** Cache for card content preview: card text -> markdown body (without frontmatter) */
const linkedContentCache = new Map<string, string>();

/**
 * Loads the markdown content (without frontmatter) from the first wikilinked
 * file in a card. Results are cached by card text.
 * Returns empty string if no wikilink, file not found, or read error.
 */
export async function loadLinkedFileContent(cardText: string): Promise<string> {
	if (linkedContentCache.has(cardText)) {
		return linkedContentCache.get(cardText)!;
	}

	const wikilinks = extractCardWikilinks(cardText);
	if (wikilinks.length === 0) {
		linkedContentCache.set(cardText, '');
		return '';
	}

	const target = wikilinks[0].target;

	try {
		const vaultPath = vaultStore.path;
		if (!vaultPath) {
			linkedContentCache.set(cardText, '');
			return '';
		}

		const allFilePaths = flattenFileTree(fsStore.fileTree).map((f) => f.path);
		const cache = buildResolutionCache(allFilePaths);
		const resolved = resolveWikilinkCached(target, cache);

		if (!resolved) {
			linkedContentCache.set(cardText, '');
			return '';
		}

		const content = await readText(vaultPath, resolved);
		const body = stripFrontmatter(content).trim();
		linkedContentCache.set(cardText, body);
		return body;
	} catch (err) {
		error('KANBAN', 'Failed to load linked file content:', err);
		linkedContentCache.set(cardText, '');
		return '';
	}
}
