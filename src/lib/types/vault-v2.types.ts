/**
 * Vault v2 IPC types (Phase 1 of the Rust VaultIndex migration).
 *
 * These types mirror the camelCase serde JSON encoding produced by the
 * Rust `kokobrain_lib::vault::entry` module. They are the wire shape of
 * `invoke('scan_vault_v2', { path })`, `invoke('get_backlinks_v2', ...)`,
 * `invoke('update_note_in_index', ...)` and the upcoming Phase 2+ commands.
 *
 * @experimental
 * The whole `vault-v2` surface is gated behind experimental flags
 * (`experimental.rustBacklinks`, `experimental.rustOutgoing`,
 * `experimental.rustTagsAndTasks`, `experimental.rustProperties`,
 * `experimental.rustWatcher`) until the relevant migration phases land
 * default-on. Until then, do NOT consume these types from feature panels
 * directly — go through the per-phase consumer migration documented in
 * `tasks/todo/performance-architecture-refactor.md` and ADR 0025
 * (`docs/adr/0025-rust-vault-index.md`).
 *
 * Rust source of truth: `src-tauri/src/vault/entry.rs`.
 */

/**
 * Recursive frontmatter value type. Mirrors the `serde_json::Value` shape
 * the Rust `parse_frontmatter` produces for any `JsonValue` slot in
 * `NoteEntry.frontmatter`. Subset coverage at this stage matches the
 * Rust parser (see `parse_frontmatter` doc): top-level scalars, inline
 * arrays, block arrays, and nested maps recorded as `null`.
 *
 * @experimental
 */
export type FrontmatterValue =
	| null
	| boolean
	| number
	| string
	| FrontmatterValue[]
	| { [key: string]: FrontmatterValue };

/**
 * One outgoing wikilink in a note's body.
 *
 * Mirrors `kokobrain_lib::vault::entry::WikiLink`. `position` is a Rust
 * byte offset (UTF-8) into the original content; the TS-side
 * `parseWikilinks` emits a UTF-16 code-unit offset for the same input,
 * so positions across the two paths are NOT directly comparable for
 * notes containing multi-byte characters. Positions are not currently
 * routed across IPC — they are an internal Rust value used by the future
 * `getContextSnippet` port.
 *
 * @experimental
 */
export interface WikiLinkV2 {
	/** Wikilink target as written, after trimming and stripping alias / heading. */
	target: string;
	/** Optional alias following `|`, e.g. `[[target|alias]]`. */
	alias: string | null;
	/** Optional heading or block reference following `#`. */
	heading: string | null;
	/** Byte offset of the opening `[[` in the original (Rust UTF-8 byte position). */
	position: number;
}

/**
 * Canonical per-note metadata view returned by `scan_vault_v2` and the
 * upcoming `update_note_in_index` / `get_backlinks_v2` commands.
 *
 * Mirrors `kokobrain_lib::vault::entry::NoteEntry`. Field semantics:
 *
 * - `path`: absolute filesystem path. Frontend keeps absolute paths in
 *   every index per CLAUDE.md Indexing & Watcher item 5; this matches.
 * - `title`: filename without `.md`/`.markdown` suffix. Equivalent to
 *   `backlinks.logic.ts::getNoteName(path)`.
 * - `frontmatter`: parsed YAML frontmatter as a key/value map. The Rust
 *   parser is a subset (scalars, inline/block arrays, nested-as-null) —
 *   see `src-tauri/src/vault/parsing.rs` for documented divergences from
 *   the TS `yaml` library.
 * - `outgoingLinks`: wikilinks in document order, byte-for-byte parity
 *   with `parseWikilinks` from `backlinks.logic.ts` (no frontmatter or
 *   code-fence stripping).
 * - `tags`: deduplicated case-insensitively keeping first-occurrence
 *   casing, frontmatter tags first then inline tags. Strict semantics
 *   (digit-first rejected, HTML comments stripped, trailing slashes
 *   normalised) mirror `tags.logic.ts::extractAllTags`.
 * - `modifiedAt`: seconds since UNIX epoch (note: the existing
 *   `scan_vault` `FileNode.modifiedAt` uses MILLISECONDS — these are
 *   different units; do not mix them).
 * - `wordCount`: body-scoped (post-frontmatter) whitespace-split tokens.
 * - `snippet`: leading body content joined by spaces, capped at 280
 *   bytes at a codepoint boundary.
 *
 * @experimental
 */
export interface NoteEntryV2 {
	/** Absolute filesystem path. */
	path: string;
	/** Filename without `.md`/`.markdown` suffix. */
	title: string;
	/** Parsed YAML frontmatter (subset coverage — see module doc). */
	frontmatter: Record<string, FrontmatterValue>;
	/** Outgoing wikilinks in document order. */
	outgoingLinks: WikiLinkV2[];
	/** Deduplicated tags (frontmatter first, then inline). */
	tags: string[];
	/** Last-modified time in **seconds** since the UNIX epoch. */
	modifiedAt: number;
	/** Whitespace-split word count of the body (post-frontmatter). */
	wordCount: number;
	/** Leading body content, capped at 280 bytes at a codepoint boundary. */
	snippet: string;
}

/**
 * One outgoing wikilink already resolved by the Rust `VaultIndex` —
 * returned by `invoke('get_outgoing_links_v2', { path })`. Mirrors
 * `kokobrain_lib::vault::entry::OutgoingLink` and the legacy TS
 * `outgoing-links.types.ts::OutgoingLink` shape one-for-one.
 *
 * Phase 6.1 of the perf refactor.
 */
export interface OutgoingLinkV2 {
	/** Wikilink target as written. */
	target: string;
	/** Optional alias following `|`, e.g. `[[target|alias]]`. */
	alias: string | null;
	/** Optional heading or block reference following `#`. */
	heading: string | null;
	/** Absolute path the wikilink resolved to, or `null` for broken links. */
	resolvedPath: string | null;
	/** Byte offset of the opening `[[` in the source content. */
	position: number;
}

/**
 * One unlinked mention of a vault note in the active note's body —
 * returned by `invoke('get_outgoing_unlinked_mentions_v2', { path, content })`.
 * Mirrors `kokobrain_lib::vault::entry::OutgoingUnlinkedMention`.
 *
 * Phase 6.2 of the perf refactor. The `count` field is the number of
 * plain-text occurrences after Unicode word-boundary checks and
 * frontmatter / fenced-code stripping.
 */
export interface OutgoingUnlinkedMentionV2 {
	/** Note basename without `.md` / `.markdown` suffix. */
	noteName: string;
	/** Absolute path of the mentioned note. */
	notePath: string;
	/** Number of plain-text occurrences in the active body. */
	count: number;
}

/**
 * Result of a single `update_note_in_index` mutation. Returned over IPC
 * so consumers know whether the mutation produced any change and which
 * other notes' backlinks were affected (the `affected` paths set is what
 * lets the panel know which views to invalidate without doing a full
 * re-fetch).
 *
 * Mirrors `kokobrain_lib::vault::index::UpdateResult` — added in Phase
 * 2.5; this declaration anchors the TS type alongside the rest of the
 * vault-v2 surface so the type definitions stay co-located.
 *
 * @experimental
 */
export interface UpdateResultV2 {
	/** Whether the entry's outgoing links / tags / frontmatter changed. */
	changed: boolean;
	/** Absolute paths of notes whose backlinks set may have changed. */
	affected: string[];
	/** Monotonic version counter from the `VaultIndex`. */
	version: number;
}
