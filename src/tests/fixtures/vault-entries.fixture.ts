import type { NoteEntryV2, FrontmatterValue, WikiLinkV2 } from '$lib/types/vault-v2.types';
import { parseWikilinks } from '$lib/features/backlinks/backlinks.logic';

/**
 * Builds a minimal `NoteEntryV2` with sensible defaults — title derived
 * from path, empty outgoing links / tags / frontmatter, zero timestamps.
 *
 * Tests that exercise consumers of `get_all_vault_entries_v2`,
 * `get_unlinked_mentions_v2`, `get_backlinks_v2`, etc. use this builder
 * to produce IPC-shaped fixtures without hand-crafting every field.
 *
 * @param path absolute filesystem path the entry represents
 * @param overrides partial fields to override the defaults
 */
export function entryV2(
	path: string,
	overrides: Partial<NoteEntryV2> = {},
): NoteEntryV2 {
	const title = path.split('/').pop()?.replace(/\.(md|markdown)$/, '') ?? path;
	return {
		path,
		title,
		frontmatter: {},
		outgoingLinks: [],
		tags: [],
		modifiedAt: 0,
		createdAt: 0,
		size: 0,
		wordCount: 0,
		snippet: '',
		tasks: [],
		...overrides,
	};
}

/**
 * Convenience helper that parses wikilinks from raw content via the
 * shared `parseWikilinks` logic and shapes them into the IPC
 * `WikiLinkV2[]` format. Saves callers from hand-typing the
 * `{ target, alias, heading, position }` quadruples for fixture data.
 *
 * Note: positions emitted by `parseWikilinks` are TS UTF-16 code-unit
 * offsets — the Rust `WikiLink.position` is a UTF-8 byte offset. The
 * two are not directly comparable for content with multi-byte
 * characters, but no current consumer cares about position values.
 */
export function outgoingLinksFromContent(content: string): WikiLinkV2[] {
	return parseWikilinks(content).map((l) => ({
		target: l.target,
		alias: l.alias,
		heading: l.heading,
		position: l.position,
	}));
}

/**
 * Same as {@link entryV2} but parses outgoing links from the given
 * content string. Useful for tests that mirror the Rust scan flow
 * (`scan_vault_v2` reads each file and parses wikilinks into the entry).
 */
export function entryV2WithContent(
	path: string,
	content: string,
	overrides: Partial<NoteEntryV2> = {},
): NoteEntryV2 {
	return entryV2(path, {
		outgoingLinks: outgoingLinksFromContent(content),
		...overrides,
	});
}

/**
 * Re-exports `FrontmatterValue` so test files can import the type from
 * the same location as the fixture helpers.
 */
export type { FrontmatterValue };
