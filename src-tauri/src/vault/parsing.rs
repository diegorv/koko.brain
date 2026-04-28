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
use serde_json::{Number, Value as JsonValue};
use std::collections::BTreeMap;

// --- Strip helpers (shared between extractors) -------------------------------

/// Returns the byte range `[start, end)` covered by the leading frontmatter
/// block, including the opening and closing `---` delimiters. `None` when
/// the content has no frontmatter. Mirrors the TS regex
/// `/^---\r?\n([\s\S]*?)\r?\n---/`, which:
///
/// - is anchored at start-of-input (no `m` flag), so the `---` opener must
///   be on the very first line;
/// - is non-greedy, so the first `\r?\n---` after the opener wins;
/// - does NOT require any specific char after the closing `---` (no
///   trailing-newline assertion).
fn frontmatter_range(content: &str) -> Option<(usize, usize)> {
	let after_open = if let Some(r) = content.strip_prefix("---\n") {
		content.len() - r.len()
	} else if let Some(r) = content.strip_prefix("---\r\n") {
		content.len() - r.len()
	} else {
		return None;
	};
	let body = &content[after_open..];
	// Search for the first `\n---` (which absorbs an optional preceding `\r`
	// since `\r\n---` ends with the same `\n---` substring).
	let rel = body.find("\n---")?;
	let end_of_close = rel + 4; // past `\n---`
	Some((0, after_open + end_of_close))
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
/// `tags.logic.ts::extractInlineTags`. Public because Phase 1.5's
/// `NoteEntry::from_content` uses it for word-count and snippet derivation
/// over the body only.
pub fn strip_frontmatter(content: &str) -> &str {
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

// --- Frontmatter parsing ----------------------------------------------------
//
// `parse_frontmatter` is intentionally a SUBSET of YAML, not a full parser.
// The TS side uses the `yaml` library (full spec) for the Properties panel;
// matching that surface in Rust without a crate dep is impractical, and the
// migration plan (ADR 0025) explicitly scopes this Rust parser to the common
// note-frontmatter shapes:
//
// - Top-level scalars: `key: value`, `key: "quoted"`, `key:`, `key: null`.
// - Inline arrays: `key: [a, b, c]`.
// - Block arrays:    `key:\n  - item1\n  - item2`.
// - Nested maps: kept as JSON null entries to "preserve sibling parsing"
//   (the parent key still appears in the map; nested values are not
//   recursively parsed). This signals presence to downstream consumers
//   without forcing them to handle arbitrary depth here.
//
// Anything more complex (block scalars `|` / `>`, anchors `&`, references
// `*`, complex flow mappings, comments after values) is intentionally out
// of scope. Phase 8 (Properties migration) is the natural place to revisit
// this — either by adding a YAML crate or by widening the hand-rolled
// parser, with explicit user buy-in. Until then: malformed input or
// out-of-scope shapes degrade to JSON null for the offending entry, never
// panic, and never poison adjacent keys.

/// Parses the leading YAML frontmatter into a key->JsonValue map. Returns
/// an empty map when the content has no frontmatter or the frontmatter is
/// empty. Never panics. Supported shapes: top-level scalars, inline arrays,
/// block arrays, and nested maps (recorded as JSON null — see the module
/// comment for rationale).
pub fn parse_frontmatter(content: &str) -> BTreeMap<String, JsonValue> {
	let Some(yaml) = frontmatter_inner(content) else {
		return BTreeMap::new();
	};

	let lines: Vec<&str> = yaml
		.split('\n')
		.map(|l| l.strip_suffix('\r').unwrap_or(l))
		.collect();

	parse_yaml_lines(&lines)
}

fn parse_yaml_lines(lines: &[&str]) -> BTreeMap<String, JsonValue> {
	let mut result: BTreeMap<String, JsonValue> = BTreeMap::new();
	let mut i = 0usize;

	while i < lines.len() {
		let line = lines[i];

		// Skip blank lines.
		if line.trim().is_empty() {
			i += 1;
			continue;
		}

		// Indented lines at top level mean we are scanning into a previous
		// key's continuation that was already consumed; skip without harm.
		if leading_spaces(line) > 0 || line.starts_with('\t') {
			i += 1;
			continue;
		}

		let Some((key, raw_value)) = split_key_value(line) else {
			// Malformed line at top level (no colon, or empty key). Skip.
			i += 1;
			continue;
		};

		let key = key.to_string();
		let value_trimmed = raw_value.trim();

		if value_trimmed.is_empty() {
			// Empty value: peek the next non-blank line to decide whether
			// this is a block array, a nested map, or a plain null.
			let mut j = i + 1;
			while j < lines.len() && lines[j].trim().is_empty() {
				j += 1;
			}
			if j >= lines.len() {
				result.insert(key, JsonValue::Null);
				i = j;
				continue;
			}
			let next = lines[j];
			let indent = leading_spaces(next);
			if indent == 0 {
				// Next is another top-level key: this key is null.
				result.insert(key, JsonValue::Null);
				i += 1;
				continue;
			}
			let next_trimmed = &next[indent..];
			if next_trimmed.starts_with("- ") || next_trimmed == "-" {
				let (items, consumed) = parse_block_array(&lines[j..], indent);
				result.insert(key, JsonValue::Array(items));
				i = j + consumed;
			} else {
				// Nested map (or any other indented continuation): record
				// the parent key as null and skip the indented block.
				let consumed = skip_indented_block(&lines[j..], indent);
				result.insert(key, JsonValue::Null);
				i = j + consumed;
			}
			continue;
		}

		// Value is on the same line.
		if value_trimmed.starts_with('[') {
			result.insert(key, parse_inline_array(value_trimmed));
		} else {
			result.insert(key, parse_scalar(value_trimmed));
		}
		i += 1;
	}

	result
}

/// Splits a `key: value` line on the FIRST colon. Returns `None` when no
/// colon is present or the trimmed key is empty.
fn split_key_value(line: &str) -> Option<(&str, &str)> {
	let colon = line.find(':')?;
	let key = line[..colon].trim();
	if key.is_empty() {
		return None;
	}
	Some((key, &line[colon + 1..]))
}

/// Parses an inline-array value like `[a, "b", 'c', 1, true]`. The leading
/// `[` is required; the closing `]` is optional (matches the lenient
/// behavior the TS frontmatter-tags path uses). Stray commas (`[a, , b]`)
/// drop the empty slot; quoted empties (`[a, "", b]`) survive as empty
/// strings because the filter runs on the raw token before parsing.
fn parse_inline_array(value: &str) -> JsonValue {
	let inner = value.strip_prefix('[').unwrap_or(value);
	let inner = match inner.rfind(']') {
		Some(idx) => &inner[..idx],
		None => inner,
	};
	let items: Vec<JsonValue> = inner
		.split(',')
		.map(str::trim)
		.filter(|raw| !raw.is_empty())
		.map(parse_scalar)
		.collect();
	JsonValue::Array(items)
}

/// Parses a single scalar value. Recognises booleans, null, integers, and
/// floats; everything else (including ISO dates) becomes a `JsonValue::String`.
fn parse_scalar(s: &str) -> JsonValue {
	let s = s.trim();
	if s.is_empty() {
		return JsonValue::String(String::new());
	}
	// Quoted string: strip ONE outer pair of matching quotes.
	if (s.starts_with('"') && s.ends_with('"') && s.len() >= 2)
		|| (s.starts_with('\'') && s.ends_with('\'') && s.len() >= 2)
	{
		let inner = &s[1..s.len() - 1];
		return JsonValue::String(inner.to_string());
	}
	// YAML null literals.
	match s {
		"null" | "Null" | "NULL" | "~" => return JsonValue::Null,
		"true" | "True" | "TRUE" => return JsonValue::Bool(true),
		"false" | "False" | "FALSE" => return JsonValue::Bool(false),
		_ => {}
	}
	// Numbers (try integer first to avoid 42 -> 42.0 reformatting).
	if let Ok(n) = s.parse::<i64>() {
		return JsonValue::Number(n.into());
	}
	if let Ok(f) = s.parse::<f64>() {
		if let Some(num) = Number::from_f64(f) {
			return JsonValue::Number(num);
		}
	}
	// Fallback: bare string.
	JsonValue::String(s.to_string())
}

/// Counts the number of leading SPACE bytes on a line. Tab indentation is
/// counted separately by the caller (we treat tabs as "indented but not in
/// a YAML block we recognise" and skip).
fn leading_spaces(s: &str) -> usize {
	s.bytes().take_while(|b| *b == b' ').count()
}

/// Parses a block array starting at the first item line. `min_indent` is
/// the indentation of the first item (subsequent items must use the same
/// or deeper indent to remain part of the block; less indent ends the
/// block). Returns `(items, consumed_lines)` where `consumed_lines` is the
/// number of input lines walked.
fn parse_block_array(lines: &[&str], min_indent: usize) -> (Vec<JsonValue>, usize) {
	let mut items: Vec<JsonValue> = Vec::new();
	let mut i = 0usize;
	while i < lines.len() {
		let line = lines[i];
		if line.trim().is_empty() {
			i += 1;
			continue;
		}
		let indent = leading_spaces(line);
		if indent < min_indent {
			break;
		}
		let trimmed = &line[indent..];
		if let Some(rest) = trimmed.strip_prefix("- ") {
			items.push(parse_scalar(rest.trim()));
			i += 1;
		} else if trimmed == "-" {
			items.push(JsonValue::Null);
			i += 1;
		} else {
			// Same indent but not a list marker: the block ended before
			// this line.
			break;
		}
	}
	(items, i)
}

/// Skips an indented continuation block (used when a key has a nested map
/// we deliberately drop). Returns the number of consumed lines.
fn skip_indented_block(lines: &[&str], min_indent: usize) -> usize {
	let mut i = 0usize;
	while i < lines.len() {
		let line = lines[i];
		if line.trim().is_empty() {
			i += 1;
			continue;
		}
		let indent = leading_spaces(line);
		if indent < min_indent {
			break;
		}
		i += 1;
	}
	i
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

// --- Phase 6 helpers: position-preserving stripping + word-boundary mention search ---

/// Returns true when `c` is whitespace OR punctuation — the union the TS
/// regex `/[\s\p{P}]/u` matches at note-name word boundaries. Whitespace
/// uses Rust's Unicode-aware `char::is_whitespace`. Punctuation covers
/// every ASCII punctuation char plus the common Unicode general-punctuation
/// ranges (dashes, primes, en/em quotes, CJK punct) most likely to appear
/// at word boundaries in real prose.
///
/// Mirrors the runtime semantics of TS `findPlainTextMentionPositions`'s
/// `isWordBoundary` test. Edge-case Unicode marks outside these ranges
/// will be treated as non-boundary (a known minor divergence from TS's
/// full `\p{P}` class — sufficient for the latin-1 / common-Unicode
/// content that note-taking apps hit in practice).
pub fn is_word_boundary_char(c: char) -> bool {
	if c.is_whitespace() {
		return true;
	}
	if c.is_ascii_punctuation() {
		return true;
	}
	matches!(c,
		// Latin-1 punctuation
		'\u{00A1}' | '\u{00A7}' | '\u{00AB}' | '\u{00B6}' | '\u{00B7}' | '\u{00BB}' | '\u{00BF}' |
		// General Punctuation block (subset that's actual punctuation)
		'\u{2010}'..='\u{2027}' |
		'\u{2030}'..='\u{205E}' |
		// CJK Symbols and Punctuation
		'\u{3000}'..='\u{303F}' |
		// Halfwidth/Fullwidth (covers fullwidth ASCII punctuation)
		'\u{FF01}'..='\u{FF0F}' |
		'\u{FF1A}'..='\u{FF20}' |
		'\u{FF3B}'..='\u{FF40}' |
		'\u{FF5B}'..='\u{FF65}'
	)
}

/// Replaces leading frontmatter and every fenced code block with ASCII
/// spaces of the same byte length. Byte positions of all OTHER content
/// are preserved, so callers can index into the result OR the original
/// interchangeably for matched positions.
///
/// Mirrors `backlinks.logic.ts::stripNonBodyContent`. The TS regex is
/// non-greedy and only matches FULL frontmatter / FULL fences — unclosed
/// fences and missing closing `---` produce no replacement, exactly like
/// the JS regex. Frontmatter regex consumes the optional trailing `\r?\n?`
/// after the closing `---`; we mirror that.
///
/// The result's bytes are guaranteed valid UTF-8: every modified byte is
/// `b' '` (ASCII), and frontmatter / fence boundaries are always at
/// codepoint-aligned positions because the markers (`---`, `` ``` ``) are
/// pure ASCII.
pub fn strip_non_body_content(content: &str) -> String {
	let bytes = content.as_bytes();
	let mut out: Vec<u8> = bytes.to_vec();

	// Frontmatter: 0..end-with-trailing-newline.
	if let Some((_, end)) = frontmatter_range(content) {
		// `frontmatter_range` returns the byte after the closing `---`.
		// TS regex also consumes an optional `\r?\n?` after that.
		let mut effective_end = end;
		if effective_end < bytes.len() && bytes[effective_end] == b'\r' {
			effective_end += 1;
		}
		if effective_end < bytes.len() && bytes[effective_end] == b'\n' {
			effective_end += 1;
		}
		for i in 0..effective_end.min(out.len()) {
			out[i] = b' ';
		}
	}

	// Fenced code blocks: pair up ``` ... ``` non-greedily.
	let mut search_from = 0;
	while search_from + 3 <= bytes.len() {
		// Find the next opening ```
		let open_idx = match find_triple_backtick(bytes, search_from) {
			Some(i) => i,
			None => break,
		};
		// Find the closing ``` after the opener
		let after_open = open_idx + 3;
		let close_idx = match find_triple_backtick(bytes, after_open) {
			Some(i) => i,
			None => break, // Unclosed fence — TS regex doesn't match, leave as-is
		};
		let close_end = close_idx + 3;
		for i in open_idx..close_end.min(out.len()) {
			out[i] = b' ';
		}
		search_from = close_end;
	}

	// SAFETY: every modified byte is ASCII space; unmodified bytes were
	// from a valid UTF-8 input. Result is therefore valid UTF-8.
	unsafe { String::from_utf8_unchecked(out) }
}

/// Finds the byte offset of the next `\`\`\`` (three consecutive backticks)
/// at or after `start`. Returns the offset of the FIRST backtick of the
/// triple, or `None` when no such sequence exists in `bytes[start..]`.
fn find_triple_backtick(bytes: &[u8], start: usize) -> Option<usize> {
	if bytes.len() < 3 {
		return None;
	}
	let mut i = start;
	while i + 2 < bytes.len() {
		if bytes[i] == b'`' && bytes[i + 1] == b'`' && bytes[i + 2] == b'`' {
			return Some(i);
		}
		i += 1;
	}
	None
}

/// Returns byte offsets where `search_term` appears as a plain-text
/// mention in `content`. A match must satisfy:
///
/// 1. **Word boundary** — the chars immediately before and after the match
///    are whitespace OR punctuation (TS `[\s\p{P}]/u`). Out-of-range is
///    treated as a space (start/end of input).
/// 2. **Outside wikilinks** — the match must NOT be inside a `[[...]]`
///    pair on the same line. The same-line check mirrors the TS code:
///    `lineContent.lastIndexOf('[[', posInLine)` plus the closing `]]`
///    range check.
///
/// `stripped_lower` should be `strip_non_body_content(content).to_lowercase()`
/// — frontmatter and fenced code are spaced out so their mentions are not
/// counted, while preserving byte positions so the wikilink-exclusion
/// check against the ORIGINAL `content` lines up.
///
/// Mirrors `backlinks.logic.ts::findPlainTextMentionPositions`. The TS
/// version returns UTF-16 code-unit offsets; this version returns UTF-8
/// byte offsets — different for content with multi-byte chars, but
/// positions are not currently routed across IPC, so the divergence is
/// internal.
pub fn find_plain_text_mention_positions(
	content: &str,
	stripped_lower: &str,
	search_term: &str,
) -> Vec<usize> {
	if search_term.is_empty() || stripped_lower.is_empty() {
		return Vec::new();
	}
	let term_lower = search_term.to_lowercase();
	if term_lower.is_empty() {
		return Vec::new();
	}
	let term_byte_len = term_lower.len();
	let mut positions: Vec<usize> = Vec::new();
	let mut search_from = 0usize;
	let stripped_bytes = stripped_lower.as_bytes();
	let stripped_len = stripped_bytes.len();

	while search_from < stripped_len {
		let idx = match stripped_lower[search_from..].find(&term_lower) {
			Some(rel) => search_from + rel,
			None => break,
		};

		// Word-boundary check on the ORIGINAL content (chars, not bytes,
		// to avoid splitting multi-byte codepoints).
		let before_char = char_before_byte(content, idx).unwrap_or(' ');
		let after_byte_pos = idx + term_byte_len;
		let after_char = char_at_byte(content, after_byte_pos).unwrap_or(' ');
		let is_word_boundary = is_word_boundary_char(before_char) && is_word_boundary_char(after_char);

		if is_word_boundary && !is_inside_wikilink(content, idx) {
			positions.push(idx);
		}

		search_from = idx + term_byte_len;
	}

	positions
}

/// Returns the char that ends at byte offset `byte_pos` in `s`, or `None`
/// when `byte_pos` is 0. `byte_pos` MUST be a codepoint boundary.
fn char_before_byte(s: &str, byte_pos: usize) -> Option<char> {
	if byte_pos == 0 || byte_pos > s.len() {
		return None;
	}
	s[..byte_pos].chars().last()
}

/// Returns the char that starts at byte offset `byte_pos` in `s`, or
/// `None` when `byte_pos >= s.len()`. `byte_pos` MUST be a codepoint
/// boundary.
fn char_at_byte(s: &str, byte_pos: usize) -> Option<char> {
	if byte_pos >= s.len() {
		return None;
	}
	s[byte_pos..].chars().next()
}

/// Returns true when `match_byte_pos` falls between `[[` and `]]` on the
/// same line of `content`. Mirrors the TS algorithm:
///
/// ```text
/// lineStart = content.lastIndexOf('\n', idx-1) + 1
/// lineContent = content[lineStart..]
/// posInLine = idx - lineStart
/// bracketBefore = lineContent.lastIndexOf('[[', posInLine)
/// bracketAfter = lineContent.indexOf(']]', posInLine)
/// isInside = bracketBefore >= 0 && bracketAfter >= 0
///            && lineContent.indexOf(']]', bracketBefore) >= posInLine
/// ```
fn is_inside_wikilink(content: &str, match_byte_pos: usize) -> bool {
	let bytes = content.as_bytes();
	if match_byte_pos > bytes.len() {
		return false;
	}
	// Find line start (first byte after the previous '\n', or 0).
	let line_start = bytes[..match_byte_pos]
		.iter()
		.rposition(|&b| b == b'\n')
		.map(|i| i + 1)
		.unwrap_or(0);
	let line_end = bytes[match_byte_pos..]
		.iter()
		.position(|&b| b == b'\n')
		.map(|rel| match_byte_pos + rel)
		.unwrap_or(bytes.len());
	let line = &content[line_start..line_end];
	let pos_in_line = match_byte_pos - line_start;

	// `lineContent.lastIndexOf('[[', posInLine)` — find the latest `[[`
	// at or before pos_in_line.
	let bracket_before = find_last_double_bracket_open(line, pos_in_line);
	if bracket_before.is_none() {
		return false;
	}
	let bracket_before = bracket_before.unwrap();
	// `lineContent.indexOf(']]', posInLine)` — find any `]]` at/after
	// pos_in_line.
	let bracket_after = find_double_bracket_close(line, pos_in_line);
	if bracket_after.is_none() {
		return false;
	}
	// `lineContent.indexOf(']]', bracket_before) >= pos_in_line` — verify
	// the `]]` after the opener is at or after pos_in_line (i.e. the
	// match position lies between the opener and its first closer).
	let close_after_open = find_double_bracket_close(line, bracket_before)
		.map(|p| p >= pos_in_line)
		.unwrap_or(false);
	close_after_open
}

/// `String.lastIndexOf('[[', from)` — search [0, from] for the latest
/// `[[` whose start is `<= from`.
fn find_last_double_bracket_open(line: &str, from: usize) -> Option<usize> {
	let bytes = line.as_bytes();
	let upper = from.min(bytes.len().saturating_sub(1));
	let mut i = upper;
	loop {
		if i + 1 < bytes.len() && bytes[i] == b'[' && bytes[i + 1] == b'[' {
			return Some(i);
		}
		if i == 0 {
			return None;
		}
		i -= 1;
	}
}

/// `String.indexOf(']]', from)` — search [from, end] for the next `]]`.
fn find_double_bracket_close(line: &str, from: usize) -> Option<usize> {
	let bytes = line.as_bytes();
	let mut i = from;
	while i + 1 < bytes.len() {
		if bytes[i] == b']' && bytes[i + 1] == b']' {
			return Some(i);
		}
		i += 1;
	}
	None
}
