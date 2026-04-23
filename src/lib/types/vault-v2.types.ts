/**
 * Cross-cutting types exposed by the Rust-side VaultIndex (Phase 1+ of the
 * performance refactor — see [ADR 0025](../../../docs/adr/0025-performance-refactor-rust-vault-index.md)).
 *
 * These mirror the Serde camelCase JSON payload produced by the Rust
 * `scan_vault_v2` command (and, from Phase 2 onwards, `get_backlinks_v2`,
 * `get_outgoing_links_v2`, etc.). The Rust source of truth lives at
 * `src-tauri/src/vault/entry.rs`.
 *
 * @experimental
 * Until the migration reaches Phase 11, these types live alongside the
 * existing TS-side `noteIndexStore` / `backlinks.store` / `tags.store`
 * shapes and are consumed only by panels behind `settings.experimental.*`
 * flags. Once the legacy TS indexers are removed (Phase 11.5), these
 * become the canonical vault-metadata types.
 */

/**
 * A JSON-safe primitive as carried through the Rust `HashMap<String, Value>`
 * frontmatter field. Matches the shape `serde_json::Value` serialises to.
 *
 * @experimental
 */
export type FrontmatterValue =
	| string
	| number
	| boolean
	| null
	| FrontmatterValue[]
	| { [key: string]: FrontmatterValue };

/**
 * A single note's metadata, as produced by `invoke('scan_vault_v2', ...)`
 * and maintained by the Rust `VaultIndex`.
 *
 * Every field is always present in the payload — the Rust side never
 * `skip_serializing_if`s, so consumers can read properties without
 * optional-chaining on existence (except the genuinely-optional
 * `modifiedAt`, which is `Option<u64>` on the Rust side).
 *
 * @experimental
 */
export interface NoteEntry {
	/**
	 * Absolute filesystem path (canonicalised). Matches the path keys used
	 * throughout the TS indexes per ADR 0020.
	 */
	path: string;
	/**
	 * Display title — frontmatter `title` if present as a string/number/bool,
	 * otherwise the filename stem (`.md` / `.markdown` extension stripped).
	 */
	title: string;
	/**
	 * Parsed YAML frontmatter as a generic value map. Malformed YAML
	 * degrades to an empty object (never throws / rejects). Non-scalar
	 * nested values may be represented as `null` in Phase 1 — see
	 * `parse_frontmatter` in `src-tauri/src/vault/parsing.rs`.
	 */
	frontmatter: Record<string, FrontmatterValue>;
	/**
	 * Wikilink targets in body order (frontmatter + fenced code excluded).
	 * Each entry has the pipe display alias, heading `#`, and block `#^`
	 * suffixes stripped. Deduplicated; first-occurrence order preserved.
	 */
	outgoingLinks: string[];
	/**
	 * Tags merged from frontmatter `tags:` and inline `#tag` in the body
	 * (code fences, inline code, and HTML comments excluded). Dedup is
	 * case-insensitive with first-occurrence casing preserved. Supports
	 * nested tags (`parent/child`) and Unicode letters.
	 */
	tags: string[];
	/**
	 * File mtime in **milliseconds** since the UNIX epoch, or `null` when
	 * the OS does not expose mtime or the stat call failed.
	 */
	modifiedAt: number | null;
	/**
	 * Body word count — frontmatter and fenced code blocks excluded.
	 */
	wordCount: number;
	/**
	 * Up-to-200-character preview of the note body, whitespace collapsed,
	 * suitable for quick-switcher and search-result previews. Truncation is
	 * character-based, so CJK and emoji content is safe.
	 */
	snippet: string;
}
