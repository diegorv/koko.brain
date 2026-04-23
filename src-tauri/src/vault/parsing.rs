//! Pure parsing functions for markdown note metadata.
//!
//! Every extractor here is a pure `(input: &str) -> T` — no I/O, no state, no
//! allocations beyond the returned data. Designed to mirror the semantics of the
//! existing TS extractors (`backlinks.logic.ts::parseWikilinks`,
//! `tags.logic.ts::extractAllTags`, frontmatter handling in
//! `properties.logic.ts`) so the Rust-side index produced in Phases 1–2
//! matches what the TS indexes produce today. Cross-validation tests in
//! Phases 3/6/7 will assert this parity.

/// Replaces the leading YAML frontmatter block and every fenced code block
/// with spaces of equal length, preserving all byte offsets in the returned
/// string. Matches `stripNonBodyContent` in
/// `src/lib/features/backlinks/backlinks.logic.ts` — callers that compute
/// positions on the stripped string can map them back to the original.
///
/// Frontmatter match: `---` on its own line at position 0, followed by any
/// content, followed by another `---` line. If the closing marker is missing
/// the whole file is left untouched (the fallback behaviour in TS).
///
/// Fenced code match: paired ```` ``` ```` markers (3+ backticks).
/// Tilde fences (` ~~~ `) are not stripped — neither are they in the TS
/// implementation, and markdown parsers rarely emit them in practice.
///
/// Returned `String` has the same byte length as `content`; every non-stripped
/// byte is at its original offset. Stripped regions contain only ASCII spaces.
pub fn strip_non_body_content(content: &str) -> String {
	let bytes = content.as_bytes();
	let mut out = Vec::with_capacity(bytes.len());
	out.extend_from_slice(bytes);

	// --- Frontmatter ---
	if let Some(end) = find_frontmatter_end(content) {
		for byte in out.iter_mut().take(end) {
			*byte = b' ';
		}
	}

	// --- Fenced code blocks ---
	let mut i = 0;
	while i < out.len() {
		if out[i] == b'`' {
			// Fence = run of 3+ backticks starting on a line (preceded by \n or at offset 0)
			let is_line_start = i == 0 || out[i - 1] == b'\n';
			if is_line_start {
				let fence_start = i;
				let mut j = i;
				while j < out.len() && out[j] == b'`' {
					j += 1;
				}
				let fence_len = j - fence_start;
				if fence_len >= 3 {
					// Find a matching closing fence (>= fence_len backticks on a line start)
					if let Some(close_start) = find_matching_fence(&out, j, fence_len) {
						let close_end = close_start
							+ out[close_start..]
								.iter()
								.take_while(|&&b| b == b'`')
								.count();
						for byte in out.iter_mut().take(close_end).skip(fence_start) {
							*byte = b' ';
						}
						i = close_end;
						continue;
					}
				}
				i = j;
				continue;
			}
		}
		i += 1;
	}

	// Safe: we only replaced ASCII bytes with ASCII spaces; UTF-8 validity is preserved.
	String::from_utf8(out).expect("replaced ASCII bytes with ASCII spaces")
}

fn find_frontmatter_end(content: &str) -> Option<usize> {
	let bytes = content.as_bytes();
	// Must start with exactly "---\n" or "---\r\n" at offset 0
	if !(bytes.starts_with(b"---\n") || bytes.starts_with(b"---\r\n")) {
		return None;
	}
	let mut i = if bytes.starts_with(b"---\r\n") { 5 } else { 4 };
	while i < bytes.len() {
		// Closing marker: a line of exactly "---" optionally followed by \r\n | \n | EOF
		let line_start = i;
		// Find end of line
		let mut line_end = i;
		while line_end < bytes.len() && bytes[line_end] != b'\n' {
			line_end += 1;
		}
		let mut line = &bytes[line_start..line_end];
		// Strip trailing \r
		if line.last() == Some(&b'\r') {
			line = &line[..line.len() - 1];
		}
		if line == b"---" {
			// Include the trailing newline (or end-of-file) in the stripped region
			return Some((line_end + 1).min(bytes.len()));
		}
		i = line_end + 1;
	}
	None
}

fn find_matching_fence(bytes: &[u8], start: usize, min_len: usize) -> Option<usize> {
	let mut i = start;
	while i < bytes.len() {
		// Advance to next line start
		if i > start && bytes[i - 1] != b'\n' {
			// Skip to the next newline
			while i < bytes.len() && bytes[i] != b'\n' {
				i += 1;
			}
			if i >= bytes.len() {
				return None;
			}
			i += 1;
			continue;
		}
		// At a line start — check for a fence
		if i < bytes.len() && bytes[i] == b'`' {
			let run_start = i;
			let mut j = i;
			while j < bytes.len() && bytes[j] == b'`' {
				j += 1;
			}
			if j - run_start >= min_len {
				return Some(run_start);
			}
			i = j;
			continue;
		}
		// Not a fence — advance to next line
		while i < bytes.len() && bytes[i] != b'\n' {
			i += 1;
		}
		if i < bytes.len() {
			i += 1;
		}
	}
	None
}

/// Scans a note body for `[[wikilink]]` occurrences and returns the target
/// strings, deduplicated while preserving first-occurrence order.
///
/// Input is the raw note content; this function internally strips
/// frontmatter + fenced code blocks via `strip_non_body_content` so wikilinks
/// inside a code sample or inside a frontmatter array do not count.
///
/// Target processing mirrors `parseWikilinks` in backlinks.logic.ts:
///   - `[[target]]` → target
///   - `[[target|display]]` → target (display stripped)
///   - `[[target#heading]]` → target
///   - `[[target#^block]]` → target
///   - `[[target#heading|display]]` → target (both stripped)
///
/// Trimmed; empty targets (`[[]]`, `[[|alias]]`) are dropped.
pub fn extract_outgoing_links(content: &str) -> Vec<String> {
	let stripped = strip_non_body_content(content);
	let bytes = stripped.as_bytes();
	let mut seen = std::collections::HashSet::new();
	let mut out = Vec::new();

	let mut i = 0;
	while i + 1 < bytes.len() {
		if bytes[i] == b'[' && bytes[i + 1] == b'[' {
			let start = i + 2;
			// Find the matching `]]` without crossing a single `]` or a newline
			let mut j = start;
			let mut matched_end: Option<usize> = None;
			while j + 1 < bytes.len() {
				if bytes[j] == b'\n' {
					break;
				}
				if bytes[j] == b']' && bytes[j + 1] == b']' {
					matched_end = Some(j);
					break;
				}
				if bytes[j] == b']' {
					// single ] — abort this candidate
					break;
				}
				j += 1;
			}

			if let Some(end) = matched_end {
				// Safe: `[[` and `]]` are pure ASCII; `start..end` is a valid UTF-8 slice.
				let raw = &stripped[start..end];
				let target = extract_link_target(raw);
				if !target.is_empty() {
					let key = target.to_string();
					if seen.insert(key.clone()) {
						out.push(key);
					}
				}
				i = end + 2;
				continue;
			}
		}
		i += 1;
	}

	out
}

/// Strips display alias (`|…`) and heading / block anchor (`#…`) suffixes,
/// trims the result. Public so cross-validation tests can reuse it.
pub fn extract_link_target(raw: &str) -> String {
	let mut target = raw;
	if let Some(pipe) = target.find('|') {
		target = &target[..pipe];
	}
	if let Some(hash) = target.find('#') {
		target = &target[..hash];
	}
	target.trim().to_string()
}

#[cfg(test)]
mod tests {
	use super::*;

	// --- strip_non_body_content ---

	#[test]
	fn strip_preserves_body_lengths_and_offsets() {
		let input = "---\ntitle: x\n---\n[[alpha]] and [[beta]]";
		let out = strip_non_body_content(input);
		assert_eq!(out.len(), input.len());
		// Body wikilinks preserved.
		assert!(out.contains("[[alpha]]"));
		assert!(out.contains("[[beta]]"));
		// Frontmatter header / body replaced with spaces.
		let fm_bytes = &out.as_bytes()[..17];
		assert!(fm_bytes.iter().all(|&b| b == b' '));
	}

	#[test]
	fn strip_handles_crlf_frontmatter() {
		let input = "---\r\ntitle: x\r\n---\r\nbody [[link]]";
		let out = strip_non_body_content(input);
		assert_eq!(out.len(), input.len());
		assert!(out.contains("[[link]]"));
	}

	#[test]
	fn strip_leaves_body_when_frontmatter_unclosed() {
		// No closing ---: TS fallback is "don't strip frontmatter" (same here).
		let input = "---\ntitle: x\nno closing marker\n[[link]]";
		let out = strip_non_body_content(input);
		assert_eq!(out, input);
	}

	#[test]
	fn strip_removes_fenced_code_blocks() {
		let input = "before\n```\n[[ignored]]\n```\nafter [[kept]]";
		let out = strip_non_body_content(input);
		assert!(!out.contains("[[ignored]]"));
		assert!(out.contains("[[kept]]"));
		assert_eq!(out.len(), input.len());
	}

	#[test]
	fn strip_handles_long_fence_markers() {
		// 4+ backticks also a valid fence, and the closing marker must be >= opening.
		let input = "````\n[[inside4]]\n````\n[[outside]]";
		let out = strip_non_body_content(input);
		assert!(!out.contains("[[inside4]]"));
		assert!(out.contains("[[outside]]"));
	}

	#[test]
	fn strip_leaves_inline_code() {
		// Single backtick runs on the same line should not be stripped — only block fences.
		let input = "inline `code [[link]] here` and [[other]]";
		let out = strip_non_body_content(input);
		assert!(out.contains("[[link]]"));
		assert!(out.contains("[[other]]"));
	}

	#[test]
	fn strip_handles_unclosed_fence_gracefully() {
		// No closing fence → we don't strip (mirrors TS which would strip greedily; slight
		// divergence documented — in TS an unclosed fence swallows the rest of the file too,
		// but the Rust version being more conservative is preferable because it never hides
		// real wikilinks that the user may want indexed).
		let input = "```\n[[inside]]\nno closing";
		let out = strip_non_body_content(input);
		// Conservative behaviour: content preserved since we can't confirm the fence ends.
		assert_eq!(out, input);
	}

	// --- extract_outgoing_links ---

	#[test]
	fn extracts_simple_wikilinks() {
		let out = extract_outgoing_links("See [[alpha]] and [[beta]].");
		assert_eq!(out, vec!["alpha", "beta"]);
	}

	#[test]
	fn strips_display_alias_pipe() {
		let out = extract_outgoing_links("Go to [[alpha|Alpha Note]].");
		assert_eq!(out, vec!["alpha"]);
	}

	#[test]
	fn strips_heading_anchor() {
		let out = extract_outgoing_links("[[alpha#heading]]");
		assert_eq!(out, vec!["alpha"]);
	}

	#[test]
	fn strips_block_anchor() {
		let out = extract_outgoing_links("[[alpha#^block-id]]");
		assert_eq!(out, vec!["alpha"]);
	}

	#[test]
	fn strips_heading_and_alias_together() {
		let out = extract_outgoing_links("[[alpha#intro|Intro]]");
		assert_eq!(out, vec!["alpha"]);
	}

	#[test]
	fn dedupes_repeated_targets() {
		let out = extract_outgoing_links("[[x]] [[x|alias]] [[x#h]]");
		assert_eq!(out, vec!["x"]);
	}

	#[test]
	fn preserves_first_occurrence_order() {
		let out = extract_outgoing_links("[[c]] [[a]] [[b]] [[a]]");
		assert_eq!(out, vec!["c", "a", "b"]);
	}

	#[test]
	fn excludes_wikilinks_inside_frontmatter() {
		let input = "---\naliases: [[fake]]\n---\n[[real]]";
		let out = extract_outgoing_links(input);
		assert_eq!(out, vec!["real"]);
	}

	#[test]
	fn excludes_wikilinks_inside_fenced_code() {
		let input = "```\n[[fake]]\n```\n[[real]]";
		let out = extract_outgoing_links(input);
		assert_eq!(out, vec!["real"]);
	}

	#[test]
	fn handles_path_targets() {
		let out = extract_outgoing_links("[[folder/sub/note]]");
		assert_eq!(out, vec!["folder/sub/note"]);
	}

	#[test]
	fn empty_brackets_are_ignored() {
		let out = extract_outgoing_links("[[]] [[|only alias]] [[real]]");
		assert_eq!(out, vec!["real"]);
	}

	#[test]
	fn single_brackets_do_not_count() {
		let out = extract_outgoing_links("[not a link] [[real]]");
		assert_eq!(out, vec!["real"]);
	}

	#[test]
	fn aborts_on_newline_inside_brackets() {
		// [[ followed by a newline before ]] — not a valid wikilink
		let input = "[[broken\nspans line]] [[real]]";
		let out = extract_outgoing_links(input);
		assert_eq!(out, vec!["real"]);
	}

	#[test]
	fn aborts_on_single_closing_bracket() {
		// [[target] (single closing bracket) — not a valid wikilink
		let out = extract_outgoing_links("[[broken] [[real]]");
		assert_eq!(out, vec!["real"]);
	}

	#[test]
	fn empty_input_returns_empty() {
		assert!(extract_outgoing_links("").is_empty());
	}

	#[test]
	fn trims_whitespace_from_targets() {
		let out = extract_outgoing_links("[[  spaced  ]] [[  spaced  |alias]]");
		assert_eq!(out, vec!["spaced"]);
	}

	// --- extract_link_target unit ---

	#[test]
	fn link_target_strips_alias_and_heading() {
		assert_eq!(extract_link_target("x|y"), "x");
		assert_eq!(extract_link_target("x#h"), "x");
		assert_eq!(extract_link_target("x#h|y"), "x");
		assert_eq!(extract_link_target("x#^b"), "x");
		assert_eq!(extract_link_target("  spaced  "), "spaced");
		assert_eq!(extract_link_target(""), "");
	}
}
