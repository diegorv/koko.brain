//! Markdown parsing primitives for the canonical `NoteEntry`.
//!
//! Each function mirrors a TS extractor in `src/lib/features/*.logic.ts`
//! exactly: same input, same output, byte-for-byte equivalent semantics.
//! The migration plan (ADR 0025) requires this so Phase 3+ can run the
//! TS and Rust paths in parallel and compare outputs without false
//! divergence. Improvements to extraction logic (e.g. excluding wikilinks
//! inside fenced code) are deferred to the explicitly BEHAVIORAL phases
//! (4, 5, 9, 11) where soak windows and parity gates apply.
//!
//! No third-party regex dependency: byte-level scanners are used because
//! the markers (`[`, `]`, `|`, `#`, backtick, `<`, `>`) are all ASCII and
//! UTF-8 multi-byte sequences never collide with them.

use crate::vault::entry::WikiLink;

/// Extracts outgoing wikilinks from raw markdown content.
///
/// Mirrors `parseWikilinks` in
/// `src/lib/features/backlinks/backlinks.logic.ts:5-35` exactly:
///
/// - Scans the entire content (frontmatter and fenced code blocks are NOT
///   stripped — this matches current TS behavior; wikilinks inside code
///   blocks DO produce backlink entries today, and Phase 3 parity check
///   requires the Rust output to match).
/// - Recognises `[[target]]`, `[[target|alias]]`, `[[target#heading]]`,
///   `[[target#^block-id]]`, and combinations like `[[target#heading|alias]]`.
/// - Splits on the first `|` first (alias), then splits the left side on
///   the first `#` (heading). A `#` after the first `|` stays inside the
///   alias verbatim.
/// - Trims only `target`. `alias` and `heading` are returned as-is.
/// - Inner content must be non-empty (regex `[^\]]+?` requires >= 1 char),
///   so `[[]]` does not match. `[[ ]]` does (target becomes empty after
///   trim).
/// - `position` is the **byte** offset of the opening `[[` in `content`.
///   The TS equivalent emits a UTF-16 code-unit offset; this difference is
///   internal — positions are not currently emitted across IPC, and Phase
///   2's `getContextSnippet` will be ported to Rust where byte offsets are
///   the natural choice.
pub fn extract_outgoing_links(content: &str) -> Vec<WikiLink> {
	let bytes = content.as_bytes();
	let len = bytes.len();
	let mut links: Vec<WikiLink> = Vec::new();
	let mut i = 0usize;

	while i + 1 < len {
		// Look for the opening `[[`.
		if bytes[i] != b'[' || bytes[i + 1] != b'[' {
			i += 1;
			continue;
		}

		let inner_start = i + 2;
		// Scan forward to the first `]`. Per the TS regex `[^\]]+?\]\]`, a
		// single `]` terminates the inner capture; if it is not followed by
		// another `]`, the candidate is rejected and we resume scanning one
		// byte past the original `[[`.
		let mut j = inner_start;
		while j < len && bytes[j] != b']' {
			j += 1;
		}

		// Need: at least one inner byte, a closing `]]` (two consecutive `]`).
		if j > inner_start && j + 1 < len && bytes[j + 1] == b']' {
			// Slicing is UTF-8-safe: inner_start is right after `[[` (ASCII),
			// j is at `]` (ASCII). Both indices are codepoint boundaries.
			let raw = &content[inner_start..j];
			let position = i;

			// First split on `|` for the alias.
			let (target_part, alias) = match raw.find('|') {
				Some(p) => (&raw[..p], Some(raw[p + 1..].to_string())),
				None => (raw, None),
			};
			// Then split the LEFT side on `#` for the heading. A `#` after
			// the pipe stays in the alias unchanged.
			let (target, heading) = match target_part.find('#') {
				Some(p) => (&target_part[..p], Some(target_part[p + 1..].to_string())),
				None => (target_part, None),
			};

			links.push(WikiLink {
				target: target.trim().to_string(),
				alias,
				heading,
				position,
			});

			// Resume after the closing `]]`.
			i = j + 2;
			continue;
		}

		// Either no `]` found, or trailing single `]`. Move past the original
		// `[` (not `[[`) — the JS regex engine resumes at `lastIndex` which
		// is the position after the failed attempt's leftmost char.
		i += 1;
	}

	links
}
