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

// --- Tag extraction ---
//
// Mirrors `tags.logic.ts::extractAllTags` + `extractFrontmatterTags` +
// `extractInlineTags`. The fts_logic module has its own `extract_tags`
// already, but it uses `is_alphanumeric` for the first character and
// does not strip HTML comments or trailing `/` — sufficient for FTS5
// search but too permissive for the canonical note-index view. This
// version is the one VaultIndex will consume.

/// Extracts frontmatter `tags:` entries from note content.
///
/// Handles the three YAML forms that TS handles:
///   - Inline array: `tags: [alpha, beta]`
///   - Single value: `tags: alpha`
///   - Block array:  `tags:\n  - alpha\n  - beta`
///
/// Respects multi-line quoted string values on preceding keys — if a
/// top-level key's value opens an unclosed `"` or `'`, subsequent lines
/// up to the matching closing quote are treated as continuation of that
/// value and are not scanned for a `tags:` key.
///
/// Each returned tag has surrounding quotes and a leading `#` stripped.
/// Empty entries are filtered out. Order preserved.
pub fn extract_frontmatter_tags(content: &str) -> Vec<String> {
	let fm = match extract_frontmatter_block(content) {
		Some(s) => s,
		None => return Vec::new(),
	};
	// Split on \n then strip trailing \r — preserves blank lines (needed so the
	// block-list parser can cleanly terminate on a non-list line).
	let lines: Vec<&str> = fm.split('\n').map(|l| l.strip_suffix('\r').unwrap_or(l)).collect();

	let tags_idx = match find_top_level_yaml_key(&lines, "tags") {
		Some(i) => i,
		None => return Vec::new(),
	};

	let tags_line = lines[tags_idx];
	// Strip leading "tags:" (allowing any whitespace) and trim.
	let value = tags_line
		.trim_start()
		.strip_prefix("tags")
		.and_then(|rest| rest.trim_start().strip_prefix(':'))
		.unwrap_or("")
		.trim();

	// Inline array: [foo, bar]
	if let Some(rest) = value.strip_prefix('[') {
		let inner = rest.rsplit_once(']').map(|(i, _)| i).unwrap_or(rest);
		return inner
			.split(',')
			.filter_map(normalise_tag)
			.collect();
	}

	// Single value on same line.
	if !value.is_empty() {
		return normalise_tag(value).into_iter().collect();
	}

	// Block array: subsequent lines starting with `- `.
	let mut out = Vec::new();
	for raw in &lines[tags_idx + 1..] {
		let trimmed = raw.trim_start();
		if trimmed.is_empty() {
			continue;
		}
		if let Some(rest) = trimmed.strip_prefix("- ") {
			if let Some(tag) = normalise_tag(rest) {
				out.push(tag);
			}
		} else {
			break;
		}
	}
	out
}

/// Scans the note body (frontmatter + fenced / inline code + HTML comments
/// removed) for `#tag` occurrences and returns them deduplicated in
/// first-occurrence order.
///
/// Tag syntax (matches the Unicode-aware TS regex):
///   - First char: Unicode letter OR `_`.
///   - Subsequent chars: Unicode letter, decimal digit, `_`, `/`, `-`.
///   - Must be preceded by whitespace or start-of-string.
///   - Trailing `/` is stripped (e.g. `#parent/` → `parent`).
pub fn extract_inline_tags(content: &str) -> Vec<String> {
	let mut text = String::with_capacity(content.len());
	// Strip frontmatter
	if let Some(end) = find_frontmatter_end(content) {
		// We don't need position preservation here — just copy post-FM bytes.
		text.push_str(&content[end..]);
	} else {
		text.push_str(content);
	}

	let text = strip_fenced_code(&text);
	let text = strip_inline_code(&text);
	let text = strip_html_comments(&text);

	let mut out = Vec::new();
	let mut seen = std::collections::HashSet::new();

	let chars: Vec<char> = text.chars().collect();
	let mut i = 0;
	while i < chars.len() {
		if chars[i] == '#' {
			let preceded_ok = i == 0 || chars[i - 1].is_whitespace();
			if preceded_ok {
				let start = i + 1;
				if start < chars.len() && (chars[start].is_alphabetic() || chars[start] == '_') {
					let mut end = start + 1;
					while end < chars.len()
						&& (chars[end].is_alphanumeric()
							|| chars[end] == '_'
							|| chars[end] == '-'
							|| chars[end] == '/')
					{
						end += 1;
					}
					// Strip trailing `/`
					let mut tag_end = end;
					while tag_end > start + 1 && chars[tag_end - 1] == '/' {
						tag_end -= 1;
					}
					let tag: String = chars[start..tag_end].iter().collect();
					if !tag.is_empty() && seen.insert(tag.clone()) {
						out.push(tag);
					}
					i = end;
					continue;
				}
			}
		}
		i += 1;
	}

	out
}

/// Union of frontmatter and inline tags, deduplicated case-insensitively
/// with first-occurrence casing preserved. Order: frontmatter first, then
/// inline; within each group, first-occurrence order.
pub fn extract_tags(content: &str) -> Vec<String> {
	let fm = extract_frontmatter_tags(content);
	let inline = extract_inline_tags(content);
	let mut out = Vec::with_capacity(fm.len() + inline.len());
	let mut seen: std::collections::HashSet<String> =
		std::collections::HashSet::with_capacity(out.capacity());
	for tag in fm.into_iter().chain(inline.into_iter()) {
		let lower = tag.to_lowercase();
		if seen.insert(lower) {
			out.push(tag);
		}
	}
	out
}

// --- Internal tag helpers ---

/// Returns the frontmatter body (between the leading `---` markers) without
/// the delimiters, or `None` if no closed frontmatter is present.
fn extract_frontmatter_block(content: &str) -> Option<&str> {
	let end = find_frontmatter_end(content)?;
	let bytes = content.as_bytes();
	let first_nl = bytes.iter().position(|&b| b == b'\n')?;
	let body_start = first_nl + 1;
	// `end` is just past the closing `---\n` — find the line before it.
	// We stored `end = line_end + 1` where line_end is the offset of the
	// closing `---`'s newline. We want `end - 4` for `---\n` or `end - 5` for
	// `---\r\n`, whichever applies.
	let mut body_end = end.saturating_sub(1); // drop the trailing \n
	if body_end > 0 && bytes[body_end - 1] == b'\r' {
		body_end -= 1;
	}
	// Drop the `---` closing line itself.
	// Walk back to the start of that line.
	let close_line_start = content[..body_end].rfind('\n').map(|n| n + 1).unwrap_or(0);
	body_end = close_line_start.saturating_sub(1);
	if body_end > 0 && bytes.get(body_end - 1) == Some(&b'\r') {
		body_end -= 1;
	}
	if body_end < body_start {
		return Some("");
	}
	Some(&content[body_start..body_end])
}

/// Finds the line index of a top-level YAML key (no leading whitespace).
/// Skips lines that are continuations of a multi-line quoted string value.
fn find_top_level_yaml_key(lines: &[&str], key: &str) -> Option<usize> {
	let mut in_multiline_quote = false;
	let mut quote_char = ' ';

	for (i, raw) in lines.iter().enumerate() {
		let line = *raw;

		if in_multiline_quote {
			if line.trim_end().ends_with(quote_char) {
				in_multiline_quote = false;
			}
			continue;
		}

		// Strict: key must be at column 0 (no leading whitespace) to be "top-level".
		let trimmed = line.trim_start();
		if line.starts_with(key) {
			// Accept only if key is followed by optional whitespace + ":"
			let after = &line[key.len()..];
			let mut rest = after.trim_start();
			if rest.starts_with(':') {
				rest = &rest[1..];
				let _ = rest; // colon found — match
				return Some(i);
			}
		}

		// Track unclosed quotes so we don't match `tags:` inside a multi-line value.
		if let Some(colon) = trimmed.find(':') {
			let (k, v) = trimmed.split_at(colon);
			let k = k.trim_end();
			if !k.is_empty() && k.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-' || c.is_whitespace()) {
				let value = v[1..].trim();
				if let Some(first) = value.chars().next() {
					if first == '"' || first == '\'' {
						// Unclosed if quote is the only char or doesn't close.
						let closes_on_same_line =
							value.len() > 1 && value.ends_with(first);
						if !closes_on_same_line {
							in_multiline_quote = true;
							quote_char = first;
						}
					}
				}
			}
		}
	}
	None
}

/// Strips matching fenced code blocks (```).  Unlike
/// `strip_non_body_content`, which keeps offsets stable, this version
/// just drops the stripped region — suitable for tag scanning where
/// positions aren't needed.
fn strip_fenced_code(input: &str) -> String {
	let mut out = String::with_capacity(input.len());
	let mut remaining = input;
	loop {
		if let Some(start) = remaining.find("```") {
			out.push_str(&remaining[..start]);
			let after = &remaining[start + 3..];
			if let Some(close) = after.find("```") {
				remaining = &after[close + 3..];
			} else {
				// Unclosed fence: drop the rest (matches TS behaviour exactly).
				return out;
			}
		} else {
			out.push_str(remaining);
			return out;
		}
	}
}

/// Strips matching inline backtick spans on the same line. Multi-backtick
/// fenced blocks should have been removed first via `strip_fenced_code`.
fn strip_inline_code(input: &str) -> String {
	let mut out = String::with_capacity(input.len());
	let mut remaining = input;
	loop {
		if let Some(start) = remaining.find('`') {
			out.push_str(&remaining[..start]);
			let after = &remaining[start + 1..];
			if let Some(close) = after.find('`') {
				remaining = &after[close + 1..];
			} else {
				return out;
			}
		} else {
			out.push_str(remaining);
			return out;
		}
	}
}

/// Strips HTML comments `<!-- ... -->`.
fn strip_html_comments(input: &str) -> String {
	let mut out = String::with_capacity(input.len());
	let mut remaining = input;
	loop {
		if let Some(start) = remaining.find("<!--") {
			out.push_str(&remaining[..start]);
			let after = &remaining[start + 4..];
			if let Some(close) = after.find("-->") {
				remaining = &after[close + 3..];
			} else {
				return out;
			}
		} else {
			out.push_str(remaining);
			return out;
		}
	}
}

/// Cleans a tag string: trims whitespace, strips outer single/double quotes,
/// strips leading `#`. Returns None when the result is empty.
fn normalise_tag(raw: &str) -> Option<String> {
	let mut s = raw.trim();
	// Strip outer matching quote pair
	if s.len() >= 2 {
		let first = s.chars().next().unwrap();
		let last = s.chars().last().unwrap();
		if (first == '"' || first == '\'') && first == last {
			s = &s[1..s.len() - 1];
		}
	}
	s = s.trim_start_matches('#').trim();
	if s.is_empty() {
		None
	} else {
		Some(s.to_string())
	}
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

	// --- Tag extraction ---

	#[test]
	fn frontmatter_tags_inline_array() {
		let input = "---\ntags: [alpha, beta, gamma]\n---\n";
		assert_eq!(extract_frontmatter_tags(input), vec!["alpha", "beta", "gamma"]);
	}

	#[test]
	fn frontmatter_tags_inline_array_with_quotes() {
		let input = "---\ntags: [\"alpha\", 'beta']\n---\n";
		assert_eq!(extract_frontmatter_tags(input), vec!["alpha", "beta"]);
	}

	#[test]
	fn frontmatter_tags_inline_array_with_hash_prefix() {
		let input = "---\ntags: [#alpha, #beta]\n---\n";
		assert_eq!(extract_frontmatter_tags(input), vec!["alpha", "beta"]);
	}

	#[test]
	fn frontmatter_tags_single_value() {
		let input = "---\ntags: alpha\n---\n";
		assert_eq!(extract_frontmatter_tags(input), vec!["alpha"]);
	}

	#[test]
	fn frontmatter_tags_single_value_quoted() {
		let input = "---\ntags: \"alpha-beta\"\n---\n";
		assert_eq!(extract_frontmatter_tags(input), vec!["alpha-beta"]);
	}

	#[test]
	fn frontmatter_tags_block_list() {
		let input = "---\ntags:\n  - alpha\n  - beta\n  - gamma\n---\n";
		assert_eq!(extract_frontmatter_tags(input), vec!["alpha", "beta", "gamma"]);
	}

	#[test]
	fn frontmatter_tags_block_list_with_quotes() {
		let input = "---\ntags:\n  - \"alpha\"\n  - 'beta'\n---\n";
		assert_eq!(extract_frontmatter_tags(input), vec!["alpha", "beta"]);
	}

	#[test]
	fn frontmatter_tags_block_terminated_by_non_list_line() {
		let input = "---\ntags:\n  - alpha\n  - beta\nother: value\n  - fake\n---\n";
		assert_eq!(extract_frontmatter_tags(input), vec!["alpha", "beta"]);
	}

	#[test]
	fn frontmatter_tags_not_present_returns_empty() {
		let input = "---\ntitle: x\nauthor: y\n---\n";
		assert!(extract_frontmatter_tags(input).is_empty());
	}

	#[test]
	fn frontmatter_no_frontmatter_returns_empty() {
		let input = "no frontmatter here";
		assert!(extract_frontmatter_tags(input).is_empty());
	}

	#[test]
	fn frontmatter_tags_ignores_unclosed_multiline_quote_before() {
		// The `description:` value opens an unclosed " — its subsequent lines
		// are NOT scanned for tags:. A `tags:` line that appears inside that
		// quoted value must be ignored.
		let input = "---\ndescription: \"\nThis has a fake tags: [nope]\non multiple lines\"\ntags: [real]\n---\n";
		let tags = extract_frontmatter_tags(input);
		assert_eq!(tags, vec!["real"]);
	}

	#[test]
	fn frontmatter_tags_subkey_not_matched() {
		// `nested.tags:` would be at column >0 — must NOT be matched as top-level.
		let input = "---\nauthor:\n  tags: [nope]\ntags: [real]\n---\n";
		assert_eq!(extract_frontmatter_tags(input), vec!["real"]);
	}

	#[test]
	fn inline_tags_simple() {
		let input = "Some #alpha and #beta here.";
		assert_eq!(extract_inline_tags(input), vec!["alpha", "beta"]);
	}

	#[test]
	fn inline_tags_rejects_first_digit() {
		// TS regex: first char must be Unicode letter or `_`. `#123` is not a tag.
		let input = "#123 is not a tag, but #v2 is";
		assert_eq!(extract_inline_tags(input), vec!["v2"]);
	}

	#[test]
	fn inline_tags_supports_unicode() {
		let input = "#café and #日本語 are valid";
		let tags = extract_inline_tags(input);
		assert!(tags.contains(&"café".to_string()));
		assert!(tags.contains(&"日本語".to_string()));
	}

	#[test]
	fn inline_tags_supports_nested_with_slash() {
		let input = "#parent/child and #a/b/c";
		assert_eq!(extract_inline_tags(input), vec!["parent/child", "a/b/c"]);
	}

	#[test]
	fn inline_tags_strips_trailing_slash() {
		let input = "#parent/ is the parent";
		assert_eq!(extract_inline_tags(input), vec!["parent"]);
	}

	#[test]
	fn inline_tags_rejects_mid_word() {
		let input = "email#address should not match, but space #real works";
		assert_eq!(extract_inline_tags(input), vec!["real"]);
	}

	#[test]
	fn inline_tags_strips_fenced_code() {
		let input = "body #kept\n```\n#dropped\n```\nmore #also-kept";
		let tags = extract_inline_tags(input);
		assert!(tags.contains(&"kept".to_string()));
		assert!(tags.contains(&"also-kept".to_string()));
		assert!(!tags.contains(&"dropped".to_string()));
	}

	#[test]
	fn inline_tags_strips_inline_code() {
		let input = "body #real and `#fake` here";
		let tags = extract_inline_tags(input);
		assert_eq!(tags, vec!["real"]);
	}

	#[test]
	fn inline_tags_strips_html_comments() {
		let input = "body #real <!-- #fake --> end";
		let tags = extract_inline_tags(input);
		assert_eq!(tags, vec!["real"]);
	}

	#[test]
	fn inline_tags_strips_frontmatter() {
		let input = "---\ntags: [fm]\n---\n#body";
		// Only inline tags from the body — no frontmatter value leaks through.
		assert_eq!(extract_inline_tags(input), vec!["body"]);
	}

	#[test]
	fn inline_tags_dedupes_within_body() {
		let input = "#alpha #beta #alpha #gamma #beta";
		assert_eq!(extract_inline_tags(input), vec!["alpha", "beta", "gamma"]);
	}

	#[test]
	fn combined_tags_merge_frontmatter_and_inline() {
		let input = "---\ntags: [alpha, beta]\n---\n#gamma and #alpha again";
		// frontmatter first, then inline; `alpha` dedup-ed case-insensitively.
		assert_eq!(extract_tags(input), vec!["alpha", "beta", "gamma"]);
	}

	#[test]
	fn combined_tags_dedupe_case_insensitive_keeps_first_casing() {
		let input = "---\ntags: [Alpha]\n---\n#alpha and #ALPHA";
		assert_eq!(extract_tags(input), vec!["Alpha"]);
	}

	#[test]
	fn combined_tags_empty_input_returns_empty() {
		assert!(extract_tags("").is_empty());
	}
}
