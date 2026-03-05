import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { createFile } from '$lib/core/filesystem/fs.service';
import { createEmptyKanbanBoard, serializeKanbanBoard, extractCardWikilinks } from './kanban.logic';
import { kanbanStore } from './kanban.store.svelte';
import { error } from '$lib/utils/debug';

/**
 * Creates a new `.kanban` file with an empty board (To Do, In Progress, Done).
 * Returns the file path on success, or null on failure.
 */
export async function createKanbanFile(parentPath: string): Promise<string | null> {
	try {
		const filePath = await createFile(parentPath, 'Untitled.kanban');
		if (!filePath) return null;
		const board = createEmptyKanbanBoard();
		await writeTextFile(filePath, serializeKanbanBoard(board));
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

// ── Card linked file content preview ────────────────────────────

/** Cache for card content preview: card text → markdown body (without frontmatter) */
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
		const { fsStore } = await import('$lib/core/filesystem/fs.store.svelte');
		const { flattenFileTree } = await import('$lib/features/quick-switcher/quick-switcher.logic');
		const { resolveWikilink } = await import('$lib/features/backlinks/backlinks.logic');
		const { stripFrontmatter } = await import('$lib/core/markdown-editor/extensions/live-preview/embed-resolver.logic');

		const files = flattenFileTree(fsStore.fileTree);
		const allPaths = files.map((f) => f.path);
		const resolved = resolveWikilink(target, allPaths);

		if (!resolved) {
			linkedContentCache.set(cardText, '');
			return '';
		}

		const content = await readTextFile(resolved);
		const body = stripFrontmatter(content).trim();
		linkedContentCache.set(cardText, body);
		return body;
	} catch (err) {
		error('KANBAN', 'Failed to load linked file content:', err);
		linkedContentCache.set(cardText, '');
		return '';
	}
}
