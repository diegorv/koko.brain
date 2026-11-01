import type { BacklinkEntry } from './backlinks.types';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';

/**
 * Converts a Rust-side `NoteEntryV2` (returned by `get_backlinks_v2`) into
 * the legacy `BacklinkEntry` shape consumed by `BacklinksPanel.svelte` and
 * `LinkItem.svelte`.
 *
 * Phase 3 of the perf refactor uses a single body-leading 280-byte snippet
 * instead of per-occurrence positioned snippets — positioned snippets stay
 * a TS-only feature until a later phase ports `getContextSnippet` to Rust.
 * `linkStart=0`/`linkEnd=0` causes `LinkItem.svelte:23` to render the
 * snippet without the bold link highlight, which is the expected degraded
 * UX while the flag is on. An empty `snippet` produces an empty
 * `snippets[]` array so the panel suppresses the preview row entirely.
 */
export function noteEntryV2ToBacklinkEntry(entry: NoteEntryV2): BacklinkEntry {
	return {
		sourcePath: entry.path,
		sourceName: entry.title,
		snippets: entry.snippet ? [{ text: entry.snippet, linkStart: 0, linkEnd: 0 }] : [],
	};
}
