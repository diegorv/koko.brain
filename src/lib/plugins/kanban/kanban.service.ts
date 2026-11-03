import { readTextFile } from '@tauri-apps/plugin-fs';
import Kanban from '@lucide/svelte/icons/kanban';
import { createFile } from '#lib/core/filesystem/fs.service.js';
import { createEmptyKanbanBoard, serializeKanbanBoard, extractCardWikilinks } from './kanban.logic';
import { kanbanStore } from './kanban.store.svelte';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { flattenFileTree } from '#lib/core/filesystem/file-entries.logic.js';
import { buildResolutionCache, resolveWikilinkCached } from '#lib/core/filesystem/wikilink-resolution.logic.js';
import { stripFrontmatter } from '#lib/core/markdown-editor/extensions/live-preview/embed-resolver.logic.js';
import { railRegistryStore } from '#lib/features/rail-shell/rail-registry.store.svelte.js';
import { error } from '#lib/utils/debug.js';

/**
 * Creates a new `.kanban` file with an empty board (To Do, In Progress, Done).
 * Returns the file path; a failure propagates from `createFile`.
 */
export async function createKanbanFile(parentPath: string): Promise<string> {
	return createFile(parentPath, 'Untitled.kanban', serializeKanbanBoard(createEmptyKanbanBoard()));
}

/**
 * Adds "New Kanban Board" to the Files navigator's folder menu: the rail
 * shell may not import plugins (ADR 0003). Returns an unregister function;
 * `initializeVault` registers it and `teardownVault` unregisters it.
 */
export function registerKanbanFolderCreator(): () => void {
	return railRegistryStore.registerFolderCreator({
		id: 'kanban',
		label: 'New Kanban Board',
		icon: Kanban,
		fileName: 'Untitled.kanban',
		create: createKanbanFile,
	});
}

/** Resets all kanban state (called during vault teardown) */
export function resetKanban(): void {
	kanbanStore.reset();
	linkedContentCache.clear();
}

// ── Card linked file content preview ────────────────────────────

/** Cache for card content preview: card text -> markdown body (without frontmatter) */
const linkedContentCache = new Map<string, string>();

/** Clears the linked content cache so card previews re-read from disk. */
export function clearLinkedContentCache(): void {
	linkedContentCache.clear();
}

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
		const allFilePaths = flattenFileTree(fsStore.fileTree).map((f) => f.path);
		const cache = buildResolutionCache(allFilePaths);
		const resolved = resolveWikilinkCached(target, cache, vaultStore.path);

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
