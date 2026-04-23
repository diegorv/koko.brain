import { invoke } from '@tauri-apps/api/core';
import {
	updateBacklinksForFile,
} from '$lib/features/backlinks/backlinks.service';
import { backlinksStore } from '$lib/features/backlinks/backlinks.store.svelte';

import { noteIndexStore } from '$lib/features/backlinks/note-index.store.svelte';
import { buildResolutionCache } from '$lib/features/backlinks/backlinks.logic';
import {
	updateOutgoingLinksForFile,
} from '$lib/features/outgoing-links/outgoing-links.service';
import { outgoingLinksStore } from '$lib/features/outgoing-links/outgoing-links.store.svelte';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import type { BacklinkEntry } from '$lib/features/backlinks/backlinks.types';
import type { NoteEntry } from '$lib/types/vault-v2.types';
import { debug, error, perfStart, perfEnd } from '$lib/utils/debug';

/**
 * Updates backlinks and outgoing links panels when the active tab changes.
 * Builds allFilePaths and resolution cache once, sharing them between
 * backlinks and outgoing-links to avoid redundant O(n) computations.
 * Clears both panels when no tab is active.
 * Each updater is wrapped in try/catch so one failure doesn't block the other.
 *
 * When `settings.experimental.rustBacklinks` is on, backlinks are sourced
 * from the Rust-side VaultIndex via `get_backlinks_v2` (O(K) reverse-index
 * lookup) instead of the TS reverse index. Outgoing links still use the TS
 * path until Phase 6 migrates them. Unlinked mentions continue to use the
 * TS deferred-compute path on the panel side.
 */
export function updateActiveTabLinks(path: string | null): void {
	if (path && !settingsStore.experimental.rustBacklinks && noteIndexStore.isLoading) return;

	if (path) {
		const t0 = perfStart();

		if (settingsStore.experimental.rustBacklinks) {
			fetchBacklinksFromRust(path);
		} else {
			const allFilePaths = Array.from(noteIndexStore.noteContents.keys());
			const cache = buildResolutionCache(allFilePaths);
			try { updateBacklinksForFile(path, allFilePaths, cache); } catch (err) { error('ACTIVE-TAB', 'updateBacklinksForFile failed:', err); }
			try { updateOutgoingLinksForFile(path, allFilePaths, cache); } catch (err) { error('ACTIVE-TAB', 'updateOutgoingLinksForFile failed:', err); }
		}

		backlinksStore.markUnlinkedDirty();
		perfEnd('ACTIVE-TAB', 'updateActiveTabLinks', t0);
	} else {
		backlinksStore.setLinkedMentions([]);
		backlinksStore.setUnlinkedMentions([]);
		outgoingLinksStore.reset();
	}
}

/**
 * Rust-backed linked-mention fetch. Calls `get_backlinks_v2` and converts
 * the NoteEntry[] response into BacklinkEntry[] for the existing store shape.
 *
 * Snippets are intentionally empty in this Phase 3 migration — the Rust
 * NoteEntry does not yet carry per-link context snippets, and the UI
 * will display the source file name / title without the preview text.
 * A later pass can either enrich the Rust response or compute snippets
 * lazily from noteContents when the user expands a backlink row.
 *
 * Outgoing links still flow through the TS path here until Phase 6. When
 * both flags land, this function absorbs that migration as well.
 */
function fetchBacklinksFromRust(path: string): void {
	const t0 = perfStart();
	invoke<NoteEntry[]>('get_backlinks_v2', { path })
		.then((entries) => {
			const linked: BacklinkEntry[] = entries.map((e) => ({
				sourcePath: e.path,
				sourceName: e.title,
				snippets: [],
			}));
			backlinksStore.setLinkedMentions(linked);
			perfEnd('ACTIVE-TAB', 'get_backlinks_v2', t0, `n=${linked.length}`);
			debug('ACTIVE-TAB', 'backlinks from Rust:', linked.length, 'entries for', path);
		})
		.catch((err) => {
			error('ACTIVE-TAB', 'get_backlinks_v2 failed:', err);
		});

	// Outgoing-links path still goes through TS until Phase 6.
	try {
		const allFilePaths = Array.from(noteIndexStore.noteContents.keys());
		const cache = buildResolutionCache(allFilePaths);
		updateOutgoingLinksForFile(path, allFilePaths, cache);
	} catch (err) {
		error('ACTIVE-TAB', 'updateOutgoingLinksForFile failed (Rust backlinks path):', err);
	}
}
