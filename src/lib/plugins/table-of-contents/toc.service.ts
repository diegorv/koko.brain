import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { extractTocHeadings } from './toc.logic';
import { tocStore } from './toc.store.svelte';

/**
 * Parses `content` into headings and updates `tocStore`. A null/empty buffer
 * clears the store (used when no markdown tab is active).
 */
export function rebuildToc(content: string | null): void {
	if (!content) {
		tocStore.reset();
		return;
	}
	tocStore.setHeadings(extractTocHeadings(content));
}

/**
 * Shows the right sidebar with the Table of contents section turned on and
 * expanded on `path` (the action bar's TOC button).
 * @param path - the active note's absolute path
 */
export function showTableOfContents(path: string): void {
	settingsStore.updateLayout({ rightSidebarVisible: true, tableOfContentsVisible: true });
	tocStore.setExpandedPath(path);
}
