import { invoke } from '@tauri-apps/api/core';
import { error as errorLog, perfStart, perfEnd } from '$lib/utils/debug';
import { dedupeInflight } from '$lib/utils/inflight';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { outgoingLinksStore } from './outgoing-links.store.svelte';
import type { OutgoingLink, OutgoingUnlinkedMention } from './outgoing-links.types';
import type { OutgoingLinkV2, OutgoingUnlinkedMentionV2 } from '$lib/types/vault-v2.types';

/** Same stale-tab guard as `backlinks.service.ts::isStillCurrentPath`. */
function isStillCurrentPath(fetchedPath: string): boolean {
	const current = editorStore.activeTabPath;
	return current == null || current === fetchedPath;
}

/**
 * Deduplicates outgoing links by lowercase target, preserving first-occurrence order.
 * Mirrors the prior TS `deduplicateOutgoingLinks` semantics — kept on the
 * TS side so the Rust `lookup_outgoing_links` returns the raw wikilink set
 * (one OutgoingLink per `[[...]]` occurrence) and the panel-shaping concern
 * (one row per unique target) lives next to the consumer.
 */
function deduplicateByTarget(links: OutgoingLinkV2[]): OutgoingLink[] {
	const seen = new Set<string>();
	const out: OutgoingLink[] = [];
	for (const link of links) {
		const key = link.target.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(link);
	}
	return out;
}

/**
 * Fetches outgoing links AND unlinked mentions for a file from the Rust
 * `VaultIndex` and writes them to `outgoingLinksStore`. Both invokes run
 * in parallel; errors are logged via `errorLog('OUTGOING', ...)` and
 * swallowed — the panel keeps its prior contents on IPC failure.
 *
 * `content` is the active tab's body (Rust does not store full per-note
 * content; only the active note's body is needed for the unlinked-mention
 * scan).
 *
 * Wrapped in `dedupeInflight` keyed by `path` only — concurrent calls
 * for the same path collapse into one IPC. The brief window where a
 * deduplicated call may serve a slightly stale `content` snapshot is
 * bounded by the IPC roundtrip; the next reactive trigger fires a fresh
 * invocation. (See `inflight.ts` for the full rationale.)
 *
 * Phase 6 of the perf refactor — replaces the prior
 * `updateOutgoingLinksForFile` which scanned the TS reverse index on the
 * main thread.
 */
async function fetchOutgoingLinksV2Inner(path: string, content: string): Promise<void> {
	const t0 = perfStart();
	try {
		const [linksRaw, unlinkedRaw] = await Promise.all([
			invoke<OutgoingLinkV2[]>('get_outgoing_links_v2', { path }),
			invoke<OutgoingUnlinkedMentionV2[]>('get_outgoing_unlinked_mentions_v2', { path, content }),
		]);
		// Active-path guard: discard the result if the user already
		// switched tabs while the IPCs were in flight.
		if (!isStillCurrentPath(path)) {
			perfEnd('OUTGOING', 'fetchOutgoingLinksV2(stale, dropped)', t0);
			return;
		}
		outgoingLinksStore.setOutgoingLinks(deduplicateByTarget(linksRaw));
		outgoingLinksStore.setUnlinkedMentions(unlinkedRaw as OutgoingUnlinkedMention[]);
		perfEnd('OUTGOING', 'fetchOutgoingLinksV2', t0);
	} catch (err) {
		errorLog('OUTGOING', 'fetchOutgoingLinksV2 failed:', err);
	}
}
export const fetchOutgoingLinksV2 = dedupeInflight(
	fetchOutgoingLinksV2Inner,
	(path: string, _content: string) => path,
);

export function resetOutgoingLinks() {
	outgoingLinksStore.reset();
}
