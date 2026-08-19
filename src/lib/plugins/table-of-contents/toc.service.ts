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
