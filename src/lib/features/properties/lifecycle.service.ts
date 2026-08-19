import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { syncExternalContentToEditor } from '$lib/core/editor/editor.service';
import { propertiesStore } from './properties.store.svelte';
import { extractBody, rebuildContent } from './properties.logic';
import {
	toggleOrganized,
	toggleArchived,
	toggleFavorite,
} from './lifecycle.logic';
import type { Property } from './properties.types';

function commitLifecycleChange(updated: Property[]): void {
	propertiesStore.setProperties(updated);
	const body = extractBody(editorStore.activeTab?.content ?? '');
	const newContent = rebuildContent(updated, body);
	const activePath = editorStore.activeTabPath;
	if (activePath) {
		// Dirty-aware write of the frontmatter block only: `'frontmatter'`
		// takes the 500 ms timer so the lifecycle flag lands on disk fast.
		syncExternalContentToEditor(activePath, newContent, false, 'frontmatter');
	}
}

/** Mark the active note as organized (or not). */
export function setOrganized(organized: boolean): void {
	const updated = toggleOrganized(propertiesStore.properties, organized);
	commitLifecycleChange(updated);
}

/** Archive or unarchive the active note. */
export function setArchived(archived: boolean): void {
	const updated = toggleArchived(propertiesStore.properties, archived);
	commitLifecycleChange(updated);
}

/** Toggle favorite on the active note. */
export function setFavorite(favorite: boolean): void {
	const updated = toggleFavorite(propertiesStore.properties, favorite);
	commitLifecycleChange(updated);
}
