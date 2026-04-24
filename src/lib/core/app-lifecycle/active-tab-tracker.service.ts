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
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import type { BacklinkEntry } from '$lib/features/backlinks/backlinks.types';
import type { OutgoingLink, OutgoingUnlinkedMention } from '$lib/features/outgoing-links/outgoing-links.types';
import type { NoteEntry } from '$lib/types/vault-v2.types';
import { debug, error, perfStart, perfEnd } from '$lib/utils/debug';

/**
 * Updates backlinks and outgoing links panels when the active tab changes.
 * Builds allFilePaths and resolution cache once, sharing them between
 * backlinks and outgoing-links to avoid redundant O(n) computations.
 * Clears both panels when no tab is active.
 * Each updater is wrapped in try/catch so one failure doesn't block the other.
 *
 * Flag matrix:
 *   - `experimental.rustBacklinks` — source linked mentions from
 *     `get_backlinks_v2`. When off, the TS reverse index is used.
 *   - `experimental.rustOutgoing` — source outgoing links + unlinked mentions
 *     from `get_outgoing_links_v2` + `get_outgoing_unlinked_mentions_v2`.
 *     When off, the TS reverse-scan is used. Independent of rustBacklinks
 *     so either can be rolled out without the other.
 *   - Both off: original TS behaviour, loading-guard applied.
 *   - Either on: loading-guard bypassed (Rust index has its own state).
 */
export function updateActiveTabLinks(path: string | null): void {
	const rustBacklinks = settingsStore.experimental.rustBacklinks;
	const rustOutgoing = settingsStore.experimental.rustOutgoing;

	// Loading guard applies only when BOTH consumers are on the TS path.
	if (path && !rustBacklinks && !rustOutgoing && noteIndexStore.isLoading) return;

	if (path) {
		const t0 = perfStart();

		// Build the TS resolver lazily — only one of the consumers might need it.
		let tsAllFilePaths: string[] | null = null;
		let tsCache: ReturnType<typeof buildResolutionCache> | null = null;
		const ensureTsResolver = () => {
			if (tsAllFilePaths !== null && tsCache !== null) {
				return { allFilePaths: tsAllFilePaths, cache: tsCache };
			}
			tsAllFilePaths = Array.from(noteIndexStore.noteContents.keys());
			tsCache = buildResolutionCache(tsAllFilePaths);
			return { allFilePaths: tsAllFilePaths, cache: tsCache };
		};

		// Linked mentions
		if (rustBacklinks) {
			fetchBacklinksFromRust(path);
		} else {
			try {
				const { allFilePaths, cache } = ensureTsResolver();
				updateBacklinksForFile(path, allFilePaths, cache);
			} catch (err) {
				error('ACTIVE-TAB', 'updateBacklinksForFile failed:', err);
			}
		}

		// Outgoing links + unlinked mentions
		if (rustOutgoing) {
			fetchOutgoingFromRust(path);
		} else {
			try {
				const { allFilePaths, cache } = ensureTsResolver();
				updateOutgoingLinksForFile(path, allFilePaths, cache);
			} catch (err) {
				error('ACTIVE-TAB', 'updateOutgoingLinksForFile failed:', err);
			}
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
}

/**
 * Rust-backed outgoing-links fetch. Issues two invokes in parallel:
 *   1. `get_outgoing_links_v2` → Vec<NoteEntry> → converted to OutgoingLink[]
 *      with `target = entry.title`, `resolvedPath = entry.path`. Alias,
 *      heading, and original position are intentionally dropped in this
 *      Phase 6 migration — a follow-up can enrich the Rust payload if the
 *      panel grows a demand for them (currently the Outgoing Links Panel
 *      only shows `alias ?? target` + optional heading, both of which
 *      degrade gracefully: title is the filename stem; heading is null).
 *   2. `get_outgoing_unlinked_mentions_v2(path, content)` — reads the
 *      current editor buffer content (not disk) so unsaved edits are
 *      honoured, same as the TS path.
 *
 * Both invokes are independent — a failure on one doesn't clear the other.
 */
function fetchOutgoingFromRust(path: string): void {
	const tLinks = perfStart();
	invoke<NoteEntry[]>('get_outgoing_links_v2', { path })
		.then((entries) => {
			const links: OutgoingLink[] = entries.map((e) => ({
				target: e.title,
				alias: null,
				heading: null,
				resolvedPath: e.path,
				position: 0,
			}));
			outgoingLinksStore.setOutgoingLinks(links);
			perfEnd('ACTIVE-TAB', 'get_outgoing_links_v2', tLinks, `n=${links.length}`);
		})
		.catch((err) => {
			error('ACTIVE-TAB', 'get_outgoing_links_v2 failed:', err);
		});

	// Unlinked mentions — needs the editor's current buffer, which may differ
	// from disk. Skip if the current tab isn't the one we're fetching for
	// (race during a fast tab switch — a stale response would populate the
	// wrong tab's panel).
	const activeTab = editorStore.activeTab;
	if (!activeTab || activeTab.path !== path) return;
	const content = activeTab.content;

	const tUnlinked = perfStart();
	invoke<OutgoingUnlinkedMention[]>('get_outgoing_unlinked_mentions_v2', { path, content })
		.then((mentions) => {
			outgoingLinksStore.setUnlinkedMentions(mentions);
			perfEnd('ACTIVE-TAB', 'get_outgoing_unlinked_mentions_v2', tUnlinked, `n=${mentions.length}`);
		})
		.catch((err) => {
			error('ACTIVE-TAB', 'get_outgoing_unlinked_mentions_v2 failed:', err);
		});
}
