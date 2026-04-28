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

// --- Strip helpers (shared between extractors) -------------------------------

/// Returns the byte range `[start, end)` covered by the leading frontmatter
/// block, including the opening and closing `---` delimiters and the line
/// terminator after the opening `---`. `None` when the content has no
/// frontmatter (matches the TS regex `/^---\r?\n([\s\S]*?)\r?\n---/`,
/// which is anchored at start-of-input — no `m` flag).
fn frontmatter_range(content: &str) -> Option<(usize, usize)> {
	let after_open = if let Some(r) = content.strip_prefix("---\n") {
		content.len() - r.len()
	} else if let Some(r) = content.strip_prefix("---\r\n") {
		content.len() - r.len()
	} else {
		return None;
	};
	let body = &content[after_open..];
	// Look for `\n---` first, then for `\r\n---`. The TS regex `\r?\n---`
	// non-greedy captures the SHORTEST run that satisfies the trailing
	// terminator, so we want the earliest `\n---` (with optional preceding
	// `\r`) at line start.
	let mut search_from = 0usize;
	while search_from < body.len() {
		let Some(rel) = body[search_from..].find("\n---") else { break };
		let nl_pos = search_from + rel; // index of the `\n` in body
		// Closing `---` must end at the run boundary: end of file, `\n`, or `\r\n`.
		let end_of_close = nl_pos + 4; // past `\n---`
		let next = body.as_bytes().get(end_of_close);
		let close_ok = matches!(next, None | Some(b'\n') | Some(b'\r'));
		if close_ok {
			return Some((0, after_open + end_of_close));
		}
		search_from = nl_pos + 1;
	}
	None
}

/// Returns the frontmatter inner text (between the two `---` markers), or
/// `None` when absent. The TS `FRONTMATTER_REGEX` capture group `([\s\S]*?)`.
fn frontmatter_inner(content: &str) -> Option<&str> {
	let (_, end) = frontmatter_range(content)?;
	// Recompute the slice between the opening line break and the `\r?\n---`.
	let after_open = if content.starts_with("---\n") { 4 } else { 5 };
	// The closing `---` is the last 3 bytes of the matched range. Walk back
	// from `end` to find the `\n` before the `---` (drop the optional `\r`).
	let close_marker_start = end - 3;
	let inner_end = content[..close_marker_start]
		.strip_suffix('\n')
		.map(|s| s.strip_suffix('\r').unwrap_or(s))
		.map(|s| s.len())
		.unwrap_or(close_marker_start);
	Some(&content[after_open..inner_end])
}

/// Removes the leading frontmatter block (if any), returning the remaining
/// body. Mirrors `text.replace(FRONTMATTER_REGEX, '')` from
/// `tags.logic.ts::extractInlineTags`.
fn strip_frontmatter(content: &str) -> &str {
	match frontmatter_range(content) {
		Some((_, end)) => &content[end..],
		None => content,
	}
}

/// Strips fenced code blocks (` ``` ... ``` `) by removing each non-greedy
/// pair. Unclosed fences keep their content (matches the JS regex
/// `/```[\s\S]*?```/g`, which simply produces no match for an unterminated
/// fence). Allocates a new string only when at least one fence is present.
fn strip_fenced_code_blocks(content: &str) -> String {
	let mut result = String::with_capacity(content.len());
	let mut remaining = content;
	while let Some(start) = remaining.find("```") {
		result.push_str(&remaining[..start]);
		let after_open = &remaining[start + 3..];
		match after_open.find("```") {
			Some(close) => remaining = &after_open[close + 3..],
			None => {
				// Unclosed fence: TS regex doesn't match; preserve the rest.
				result.push_str(&remaining[start..]);
				return result;
			}
		}
	}
	result.push_str(remaining);
	result
}

/// Strips inline code spans (`` `…` ``) when at least one non-backtick char
/// is present between the two backticks. Mirrors `/`[^`]+`/g`. Unmatched
/// solitary backticks and empty backtick pairs (` `` `) are preserved.
fn strip_inline_code(content: &str) -> String {
	let mut result = String::with_capacity(content.len());
	let mut chars = content.char_indices().peekable();
	while let Some((_, c)) = chars.next() {
		if c != '`' {
			result.push(c);
			continue;
		}
		// Look for a closing backtick with at least one char in between.
		let mut found_close = false;
		let mut consumed_one = false;
		while let Some(&(_, next)) = chars.peek() {
			if next == '`' {
				if consumed_one {
					chars.next(); // consume the closing backtick
					found_close = true;
				}
				break;
			}
			chars.next();
			consumed_one = true;
		}
		if !found_close {
			// Either no closing backtick or empty pair — preserve the open.
			result.push('`');
			// If we stopped at an empty pair, leave the closing backtick for
			// the next outer iteration to process the same way.
		}
	}
	result
}

/// Strips HTML comments (`<!-- ... -->`). Mirrors `/<!--[\s\S]*?-->/g`.
fn strip_html_comments(content: &str) -> String {
	let mut result = String::with_capacity(content.len());
	let mut remaining = content;
	while let Some(start) = remaining.find("<!--") {
		result.push_str(&remaining[..start]);
		let after_open = &remaining[start + 4..];
		match after_open.find("-->") {
			Some(close) => remaining = &after_open[close + 3..],
			None => {
				// Unclosed comment: preserve the rest.
				result.push_str(&remaining[start..]);
				return result;
			}
		}
	}
	result.push_str(remaining);
	result
}

// --- Frontmatter tag scalar utilities ---------------------------------------

/// Strips one outer matching pair of single OR double quotes (the TS regex
/// `/^["']|["']$/g` runs only at line ends, so the strip is single-layer).
fn strip_outer_quotes(s: &str) -> &str {
	let s = match s.chars().next() {
		Some('"') | Some('\'') => &s[1..],
		_ => s,
	};
	match s.chars().next_back() {
		Some('"') | Some('\'') => &s[..s.len() - s.chars().last().unwrap().len_utf8()],
		_ => s,
	}
}

/// Cleans a single frontmatter tag value: trim, strip outer quotes, then
/// strip a single leading `#`. Order matches the TS chained `.replace`s.
fn clean_tag_value(s: &str) -> String {
	let trimmed = s.trim();
	let unquoted = strip_outer_quotes(trimmed);
	let no_hash = unquoted.strip_prefix('#').unwrap_or(unquoted);
	no_hash.to_string()
}

/// Returns true when `line` begins with `key`, optionally followed by
/// whitespace, then `:`. Mirrors `^${key}\s*:`.
fn line_starts_with_key(line: &str, key: &str) -> bool {
	if !line.starts_with(key) {
		return false;
	}
	let rest = &line[key.len()..];
	let trimmed = rest.trim_start();
	trimmed.starts_with(':')
}

/// Recognises a `key: value` line where `key` is `\w[\w\s-]*`. Returns the
/// post-colon value (with leading whitespace trimmed). Mirrors the TS regex
/// `/^\w[\w\s-]*:\s*(.*)/`.
fn parse_yaml_key_value(line: &str) -> Option<&str> {
	let bytes = line.as_bytes();
	let first = *bytes.first()?;
	if !(first.is_ascii_alphanumeric() || first == b'_') {
		return None;
	}
	let mut i = 1;
	while i < bytes.len() {
		let b = bytes[i];
		if b.is_ascii_alphanumeric() || b == b'_' || b == b' ' || b == b'\t' || b == b'-' {
			i += 1;
		} else if b == b':' {
			break;
		} else {
			return None;
		}
	}
	if i >= bytes.len() || bytes[i] != b':' {
		return None;
	}
	let mut j = i + 1;
	while j < bytes.len() && (bytes[j] == b' ' || bytes[j] == b'\t') {
		j += 1;
	}
	Some(&line[j..])
}

/// Locates the first top-level YAML key matching `key`, skipping lines
/// inside multi-line single/double-quoted scalars. Mirrors
/// `tags.logic.ts::findTopLevelKey`.
fn find_top_level_key(lines: &[&str], key: &str) -> Option<usize> {
	let mut in_multiline_quote = false;
	let mut quote_char: Option<char> = None;

	for (i, line) in lines.iter().enumerate() {
		if in_multiline_quote {
			let q = quote_char.unwrap();
			if line.trim_end().ends_with(q) {
				in_multiline_quote = false;
				quote_char = None;
			}
			continue;
		}

		if line_starts_with_key(line, key) {
			return Some(i);
		}

		if let Some(value_part) = parse_yaml_key_value(line) {
			let value = value_part.trim();
			if let Some(first) = value.chars().next() {
				if first == '"' || first == '\'' {
					let q = first;
					let last = value.chars().last();
					let ends_with_q = last == Some(q) && value.chars().count() > 1;
					if !ends_with_q {
						in_multiline_quote = true;
						quote_char = Some(q);
					}
				}
			}
		}
	}

	None
}

// --- Tag extraction ---------------------------------------------------------

/// Extracts tags from a note's YAML frontmatter `tags` key, supporting
/// inline arrays (`[a, b]`), single-value scalars, and block-style lists
/// (`- a\n- b`). Mirrors `tags.logic.ts::extractFrontmatterTags`.
fn extract_frontmatter_tags(content: &str) -> Vec<String> {
	let Some(yaml) = frontmatter_inner(content) else {
		return Vec::new();
	};

	// Split on `\r?\n` like the TS implementation.
	let lines: Vec<&str> = yaml
		.split('\n')
		.map(|l| l.strip_suffix('\r').unwrap_or(l))
		.collect();

	let Some(tags_idx) = find_top_level_key(&lines, "tags") else {
		return Vec::new();
	};

	let tags_line = lines[tags_idx];
	// `tags_line.replace(/^tags\s*:\s*/, '').trim()`
	let after_key = &tags_line[4..]; // 'tags' is 4 bytes
	let after_ws = after_key.trim_start();
	let after_colon = after_ws
		.strip_prefix(':')
		.map(str::trim)
		.unwrap_or("");

	// Inline array: [foo, bar]
	if let Some(rest) = after_colon.strip_prefix('[') {
		let inner = match rest.rfind(']') {
			Some(i) => &rest[..i],
			None => rest,
		};
		return inner
			.split(',')
			.map(clean_tag_value)
			.filter(|t| !t.is_empty())
			.collect();
	}

	// Single value on the same line.
	if !after_colon.is_empty() {
		let cleaned = clean_tag_value(after_colon);
		return if cleaned.is_empty() {
			Vec::new()
		} else {
			vec![cleaned]
		};
	}

	// Block array (lines starting with `- `).
	let mut tags: Vec<String> = Vec::new();
	for line in lines.iter().skip(tags_idx + 1) {
		let trimmed_left = line.trim_start();
		if let Some(rest) = trimmed_left.strip_prefix('-') {
			// TS regex `/^\s*-\s+(.+)$/` requires at least one whitespace
			// after the dash AND a non-empty captured value.
			let after_dash = rest.trim_start();
			if rest.len() == after_dash.len() {
				// `-` not followed by whitespace -> regex fails -> stop.
				break;
			}
			let cleaned = clean_tag_value(after_dash);
			if !cleaned.is_empty() {
				tags.push(cleaned);
			}
		} else if line.trim().is_empty() {
			continue;
		} else {
			break;
		}
	}
	tags
}

/// Extracts inline `#tag` occurrences from the note body. Mirrors
/// `tags.logic.ts::extractInlineTags`:
///
/// 1. Strip frontmatter, fenced code blocks, inline code, HTML comments
///    (in that order — fenced code MUST come before inline code so
///    backticks inside fences do not pair with body backticks).
/// 2. For each `#` preceded by start-of-text or whitespace, consume a tag
///    matching `[\p{L}_][\p{L}\d_/-]*`. Reject digit-first or empty
///    captures.
/// 3. Strip trailing slashes from the captured tag.
/// 4. Deduplicate case-sensitively (the TS implementation uses `Set`,
///    matching exact bytes; case-insensitive dedup happens later in
///    `extract_tags_strict` after merging frontmatter tags).
fn extract_inline_tags(content: &str) -> Vec<String> {
	let body = strip_frontmatter(content);
	let body = strip_fenced_code_blocks(body);
	let body = strip_inline_code(&body);
	let body = strip_html_comments(&body);

	let mut tags: Vec<String> = Vec::new();
	let mut seen: Vec<String> = Vec::new();
	let mut prev_was_ws_or_start = true;
	let mut iter = body.char_indices().peekable();

	while let Some((_, c)) = iter.next() {
		let preceding_ok = prev_was_ws_or_start;
		prev_was_ws_or_start = c.is_whitespace();

		if c != '#' || !preceding_ok {
			continue;
		}

		// First tag char must be `\p{L}` or `_` (digit-first rejected).
		let Some(&(first_byte, first_char)) = iter.peek() else {
			continue;
		};
		if !(first_char.is_alphabetic() || first_char == '_') {
			continue;
		}

		// Consume the tag chars.
		let tag_start = first_byte;
		let mut tag_end = tag_start + first_char.len_utf8();
		iter.next();
		while let Some(&(p, ch)) = iter.peek() {
			if ch.is_alphabetic() || ch.is_ascii_digit() || ch == '_' || ch == '/' || ch == '-' {
				tag_end = p + ch.len_utf8();
				iter.next();
			} else {
				break;
			}
		}

		// After consuming tag chars, the "previous char" for the next outer
		// iteration is the last tag char (never whitespace).
		prev_was_ws_or_start = false;

		// Strip trailing slashes (TS `.replace(/\/+$/, '')`).
		let raw = &body[tag_start..tag_end];
		let trimmed = raw.trim_end_matches('/');
		if trimmed.is_empty() {
			continue;
		}
		if !seen.iter().any(|t| t == trimmed) {
			seen.push(trimmed.to_string());
			tags.push(trimmed.to_string());
		}
	}

	tags
}

/// Extracts the canonical tag list for a note: frontmatter tags first, then
/// inline tags, deduplicated case-insensitively (first occurrence keeps its
/// casing). Mirrors `tags.logic.ts::extractAllTags` exactly.
///
/// Coexists with the permissive `search::fts_logic::extract_tags`. The FTS
/// extractor allows digit-first identifiers and skips HTML-comment / trailing-
/// slash normalisation because broader recall is correct for full-text
/// search; this strict extractor enforces the same rules the frontend has
/// applied for years and is the canonical view used by `VaultIndex`.
pub fn extract_tags_strict(content: &str) -> Vec<String> {
	let frontmatter = extract_frontmatter_tags(content);
	let inline = extract_inline_tags(content);

	let mut seen_lower: Vec<String> = Vec::with_capacity(frontmatter.len() + inline.len());
	let mut result: Vec<String> = Vec::with_capacity(frontmatter.len() + inline.len());
	for tag in frontmatter.into_iter().chain(inline.into_iter()) {
		let lower = tag.to_lowercase();
		if !seen_lower.iter().any(|s| s == &lower) {
			seen_lower.push(lower);
			result.push(tag);
		}
	}
	result
}

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
