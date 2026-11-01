import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { isMarkdownNoteTab } from '#lib/core/editor/editor.logic.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import {
	FrontmatterWriteError,
	toastFrontmatterWriteError,
	updateNoteFrontmatter,
} from '#lib/core/frontmatter/frontmatter-write.service.js';
import type { Property } from '#lib/core/frontmatter/properties.types.js';
import {
	getLifecycleState,
	isFavorite,
	isOrganized,
	toggleArchived,
	toggleFavorite,
	toggleOrganized,
} from './lifecycle.logic';

/**
 * Rewrites the active markdown note's frontmatter with `mutate` and saves it.
 *
 * `mutate` gets the properties parsed from the tab's content at call time,
 * never the Properties panel's store: that store is only filled while the
 * right sidebar is shown and lags a tab switch or an editor keystroke by its
 * re-parse debounce. A refused or failed write shows the frontmatter error
 * toast; other errors propagate.
 */
async function updateActiveNote(mutate: (props: Property[]) => Property[]): Promise<void> {
	const tab = editorStore.activeTab;
	if (!tab || !isMarkdownNoteTab(tab)) return;
	// The sidebar lists by these flags: skip the index refresh throttle for this click.
	vaultStore.requestPromptIndexRefresh();
	try {
		await updateNoteFrontmatter(tab.path, mutate);
	} catch (err) {
		if (!(err instanceof FrontmatterWriteError)) throw err;
		toastFrontmatterWriteError(err);
	}
}

/**
 * Toggles _favorite on a note by path through `updateNoteFrontmatter`, so an
 * open tab keeps its unsaved edits. A refused or failed write (lossy
 * frontmatter, vanished note) is reported in a toast; other errors propagate.
 */
export async function toggleFavoriteForPath(filePath: string, favorite: boolean): Promise<void> {
	// The sidebar lists by `_favorite`: skip the index refresh throttle for this click.
	vaultStore.requestPromptIndexRefresh();
	try {
		await updateNoteFrontmatter(filePath, (props) => toggleFavorite(props, favorite));
	} catch (err) {
		if (!(err instanceof FrontmatterWriteError)) throw err;
		toastFrontmatterWriteError(err);
	}
}

/** Flips `_favorite` on the active note. */
export function toggleActiveNoteFavorite(): Promise<void> {
	return updateActiveNote((props) => toggleFavorite(props, !isFavorite(props)));
}

/** Flips `_organized` on the active note; `_archived` is left as-is. */
export function toggleActiveNoteOrganized(): Promise<void> {
	return updateActiveNote((props) => toggleOrganized(props, !isOrganized(props)));
}

/**
 * Archives the active note, or restores it when archived. The save runs the
 * after-save hooks, so auto-move applies a type's `_archive_to` folder.
 */
export function toggleActiveNoteArchived(): Promise<void> {
	return updateActiveNote((props) => toggleArchived(props, getLifecycleState(props) !== 'archived'));
}
