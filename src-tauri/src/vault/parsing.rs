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

use crate::vault::aliases::canonicalize_key;
use crate::vault::entry::WikiLink;
use crate::vault::task::{RecurrenceRule, Task, TaskMetadata, TaskPriority, TaskStatus};
use regex::Regex;
use serde_json::{Number, Value as JsonValue};
use std::collections::BTreeMap;
use std::sync::LazyLock;

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
			// Unterminated array: match TS `slice(1, lastIndexOf(']'))`, which
			// with no `]` becomes `slice(1, -1)` and drops the last char.
			None => match rest.char_indices().next_back() {
				Some((i, _)) => &rest[..i],
				None => "",
			},
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
			if rest.len() == after_dash.len() || after_dash.is_empty() {
				// `-` not followed by whitespace, OR nothing after the
				// whitespace (`- `) -> the `(.+)` capture fails -> TS breaks.
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

/// Parses entire content as YAML (no `---` delimiters). Used for `.view` files
/// where the whole file is YAML metadata + collection definition.
pub fn parse_frontmatter_raw_yaml(content: &str) -> BTreeMap<String, JsonValue> {
	let lines: Vec<&str> = content
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

		let key = canonicalize_key(key).to_string();
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

		// Validate that idx is a char boundary in content before using it.
		// This prevents panics when stripped_lower and content have different byte lengths due to emojis.
		if idx > content.len() || !is_char_boundary(content, idx) {
			search_from = idx + term_byte_len;
			continue;
		}

		// Word-boundary check on the ORIGINAL content (chars, not bytes,
		// to avoid splitting multi-byte codepoints).
		let before_char = char_before_byte(content, idx).unwrap_or(' ');
		let after_byte_pos = idx + term_byte_len;
		// after_byte_pos may also not be a valid boundary; clamp to content length
		let after_byte_pos_clamped = after_byte_pos.min(content.len());
		let after_char = if after_byte_pos_clamped < content.len() && is_char_boundary(content, after_byte_pos_clamped) {
			char_at_byte(content, after_byte_pos_clamped).unwrap_or(' ')
		} else {
			' '
		};
		let is_word_boundary = is_word_boundary_char(before_char) && is_word_boundary_char(after_char);

		if is_word_boundary && !is_inside_wikilink(content, idx) {
			positions.push(idx);
		}

		search_from = idx + term_byte_len;
	}

	positions
}

/// Check if `byte_pos` is a valid char boundary in `s`.
fn is_char_boundary(s: &str, byte_pos: usize) -> bool {
	byte_pos == 0 || byte_pos == s.len() || s.is_char_boundary(byte_pos)
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

// ============================================================================
// Phase 7 — Task / Tag parsing
//
// Mirrors:
//   - `src/lib/features/tasks/tasks.logic.ts::extractTasks`
//   - `src/lib/features/tasks/tasks.logic.ts::extractTasksFromSection`
//   - `src/lib/features/tasks/tasks.logic.ts::toggleTaskInContent`
//   - `src/lib/features/tasks/task-metadata.logic.ts::parseTaskMetadata`
//   - `src/lib/features/tasks/task-metadata.logic.ts::mapCheckboxChar`
//
// Regex parity with TS: the same patterns are used here. The recurrence
// regex's lookahead-stop list (next signifier OR `#\w`) is mirrored exactly.
// Tag extraction inside task metadata uses `#([A-Za-z0-9_][A-Za-z0-9_-]*)` —
// distinct from `extract_tags_strict`'s Unicode rules — so a hyphen-bearing
// tag inside a task description (e.g. `#in-progress`) is captured.
// ============================================================================

/// Regex for an unordered task line. Mirrors
/// `tasks.logic.ts::TASK_RE = /^(\s*[-*+]\s)\[([xX \-/?!>])\]\s(.*)$/`.
static TASK_RE: LazyLock<Regex> = LazyLock::new(|| {
	Regex::new(r"^(\s*[-*+]\s)\[([xX \-/?!>])\]\s(.*)$").expect("TASK_RE")
});

/// Regex for an ordered (numbered) task line. Mirrors
/// `tasks.logic.ts::ORDERED_TASK_RE = /^(\s*)\d+\.\s\[([xX \-/?!>])\]\s(.*)$/`.
static ORDERED_TASK_RE: LazyLock<Regex> = LazyLock::new(|| {
	Regex::new(r"^(\s*)\d+\.\s\[([xX \-/?!>])\]\s(.*)$").expect("ORDERED_TASK_RE")
});

/// Regex for a markdown heading line. Mirrors
/// `tasks.logic.ts::HEADING_RE = /^(#{1,6})\s+(.*)$/`.
static HEADING_RE: LazyLock<Regex> =
	LazyLock::new(|| Regex::new(r"^(#{1,6})\s+(.*)$").expect("HEADING_RE"));

/// Regex matching the existing checkbox char on a line, used by
/// `toggle_task_in_content` to flip checked → unchecked. Mirrors the TS
/// branch `/\[[xX\-/?!>]\]/`.
static CHECKED_BOX_RE: LazyLock<Regex> =
	LazyLock::new(|| Regex::new(r"\[[xX\-/?!>]\]").expect("CHECKED_BOX_RE"));

// --- Date signifiers -----------------------------------------------------

/// Date signifier emojis mapped to their `TaskMetadata` field. Mirrors
/// `task-metadata.logic.ts::DATE_PATTERNS`.
const DATE_EMOJIS: &[(&str, DateField)] = &[
	("\u{1F4C5}", DateField::DueDate),       // 📅
	("\u{23F3}", DateField::ScheduledDate),  // ⏳
	("\u{1F6EB}", DateField::StartDate),     // 🛫
	("\u{2795}", DateField::CreatedDate),    // ➕
	("\u{2705}", DateField::DoneDate),       // ✅
	("\u{274C}", DateField::CancelledDate),  // ❌
];

#[derive(Debug, Clone, Copy)]
enum DateField {
	DueDate,
	ScheduledDate,
	StartDate,
	CreatedDate,
	DoneDate,
	CancelledDate,
}

/// Priority signifier emojis mapped to their `TaskPriority`. Mirrors
/// `task-metadata.logic.ts::PRIORITY_PATTERNS`.
const PRIORITY_EMOJIS: &[(&str, TaskPriority)] = &[
	("\u{1F53A}", TaskPriority::Highest), // 🔺
	("\u{23EB}", TaskPriority::High),     // ⏫
	("\u{1F53C}", TaskPriority::Medium),  // 🔼
	("\u{1F53D}", TaskPriority::Low),     // 🔽
	("\u{23EC}", TaskPriority::Lowest),   // ⏬
];

const RECURRENCE_EMOJI: &str = "\u{1F501}"; // 🔁
const ID_EMOJI: &str = "\u{1F194}";         // 🆔
const DEPENDS_ON_EMOJI: &str = "\u{26D4}";  // ⛔
const ON_COMPLETION_EMOJI: &str = "\u{1F3C1}"; // 🏁

/// Pattern fragment matching a single emoji followed by optional U+FE0F
/// (variation selector). Equivalent to TS `emojiRe(emoji)`.
fn emoji_pattern(emoji: &str) -> String {
	format!("{}\u{FE0F}?", regex::escape(emoji))
}

/// Builds a date-signifier regex: emoji + optional space + YYYY-MM-DD.
fn build_date_regex(emoji: &str) -> Regex {
	Regex::new(&format!(
		r"{}\s*(\d{{4}}-\d{{2}}-\d{{2}})",
		emoji_pattern(emoji)
	))
	.expect("date regex")
}

/// Builds a priority-signifier regex (just the emoji).
fn build_priority_regex(emoji: &str) -> Regex {
	Regex::new(&emoji_pattern(emoji)).expect("priority regex")
}

/// Cached date regexes (one per date emoji).
static DATE_REGEXES: LazyLock<Vec<(Regex, DateField)>> = LazyLock::new(|| {
	DATE_EMOJIS
		.iter()
		.map(|(emoji, field)| (build_date_regex(emoji), *field))
		.collect()
});

/// Cached priority regexes (one per priority emoji).
static PRIORITY_REGEXES: LazyLock<Vec<(Regex, TaskPriority)>> = LazyLock::new(|| {
	PRIORITY_EMOJIS
		.iter()
		.map(|(emoji, p)| (build_priority_regex(emoji), *p))
		.collect()
});

/// Recurrence regex. The TS source uses a lookahead `(?=...)` to peek at
/// the stop point without consuming it; the Rust `regex` crate does not
/// support lookahead. We instead match the stop point as part of the full
/// regex (so the stop signifier is captured in group 0's span) and ONLY
/// remove `[match0_start, capture1_end)` from the source text — which is
/// equivalent to the lookahead's behaviour: the stop signifier remains in
/// place for downstream extractors (tags etc.) to find. Mirrors
/// `task-metadata.logic.ts::buildRecurrenceRegex` exactly otherwise.
static RECURRENCE_RE: LazyLock<Regex> = LazyLock::new(|| {
	let mut alts: Vec<String> = DATE_EMOJIS
		.iter()
		.map(|(e, _)| emoji_pattern(e))
		.collect();
	alts.extend(PRIORITY_EMOJIS.iter().map(|(e, _)| emoji_pattern(e)));
	alts.push(emoji_pattern(ID_EMOJI));
	alts.push(emoji_pattern(DEPENDS_ON_EMOJI));
	alts.push(emoji_pattern(ON_COMPLETION_EMOJI));
	alts.push(r"#[A-Za-z0-9_]".to_string());
	let pattern = format!(
		r"{}\s*(.+?)(?:\s*(?:{})|$)",
		emoji_pattern(RECURRENCE_EMOJI),
		alts.join("|")
	);
	Regex::new(&pattern).expect("recurrence regex")
});

/// ID regex: 🆔 + optional space + non-whitespace identifier.
static ID_RE: LazyLock<Regex> = LazyLock::new(|| {
	Regex::new(&format!(r"{}\s*(\S+)", emoji_pattern(ID_EMOJI))).expect("id regex")
});

/// DependsOn regex: ⛔ + optional space + comma-separated non-whitespace IDs.
static DEPENDS_ON_RE: LazyLock<Regex> = LazyLock::new(|| {
	Regex::new(&format!(
		r"{}\s*(\S+(?:\s*,\s*\S+)*)",
		emoji_pattern(DEPENDS_ON_EMOJI)
	))
	.expect("depends_on regex")
});

/// OnCompletion regex: 🏁 + optional space + non-whitespace token.
static ON_COMPLETION_RE: LazyLock<Regex> = LazyLock::new(|| {
	Regex::new(&format!(r"{}\s*(\S+)", emoji_pattern(ON_COMPLETION_EMOJI)))
		.expect("on_completion regex")
});

/// Tag regex inside task metadata: `#word` with optional internal hyphens.
/// Mirrors `task-metadata.logic.ts::TAG_RE = /#([\w][\w-]*)/g`. Note that
/// TS `\w` is ASCII `[A-Za-z0-9_]` — encoded explicitly here to avoid
/// the Rust regex crate's Unicode `\w` semantics and keep parity.
static TASK_TAG_RE: LazyLock<Regex> =
	LazyLock::new(|| Regex::new(r"#([A-Za-z0-9_][A-Za-z0-9_-]*)").expect("task tag regex"));

/// Multi-space collapse regex.
static MULTI_SPACE_RE: LazyLock<Regex> =
	LazyLock::new(|| Regex::new(r"\s{2,}").expect("multi space regex"));

// --- Public API ----------------------------------------------------------

/// Maps a checkbox character to a `TaskStatus`. Mirrors
/// `task-metadata.logic.ts::mapCheckboxChar`.
pub fn map_checkbox_char(c: char) -> TaskStatus {
	match c {
		' ' => TaskStatus::Todo,
		'x' | 'X' => TaskStatus::Done,
		'-' => TaskStatus::Cancelled,
		'/' => TaskStatus::InProgress,
		'?' => TaskStatus::Question,
		'>' => TaskStatus::Forwarded,
		'!' => TaskStatus::Important,
		_ => TaskStatus::Todo,
	}
}

/// Calculates the indent level from a leading-whitespace string. Tabs count
/// as 1 indent level; every 2 spaces count as 1 indent level. Mirrors
/// `tasks.logic.ts::calculateIndent`.
fn calculate_indent(ws: &str) -> usize {
	let mut tabs = 0usize;
	let mut spaces = 0usize;
	for c in ws.chars() {
		match c {
			'\t' => tabs += 1,
			' ' => spaces += 1,
			_ => {}
		}
	}
	tabs + spaces / 2
}

/// Parses a single line as a task item. Returns `None` for non-task lines
/// or tasks whose text is empty / whitespace-only. Mirrors
/// `tasks.logic.ts::parseTaskLine`.
fn parse_task_line(line: &str, line_number: usize) -> Option<Task> {
	if let Some(caps) = TASK_RE.captures(line) {
		let check_str = caps.get(2)?.as_str();
		let check_char = check_str.chars().next()?;
		let raw_text = caps.get(3)?.as_str();
		if raw_text.trim().is_empty() {
			return None;
		}
		// Leading-whitespace prefix: everything before the marker character.
		// TS uses `line.match(/^(\s*)/)?.[1]`; we mirror by counting the
		// leading whitespace bytes.
		let leading: String = line.chars().take_while(|c| c.is_whitespace()).collect();
		return Some(Task {
			text: raw_text.to_string(),
			checked: check_char != ' ',
			indent: calculate_indent(&leading),
			line_number,
			status: map_checkbox_char(check_char),
			metadata: parse_task_metadata(raw_text),
		});
	}
	if let Some(caps) = ORDERED_TASK_RE.captures(line) {
		let leading = caps.get(1)?.as_str();
		let check_str = caps.get(2)?.as_str();
		let check_char = check_str.chars().next()?;
		let raw_text = caps.get(3)?.as_str();
		if raw_text.trim().is_empty() {
			return None;
		}
		return Some(Task {
			text: raw_text.to_string(),
			checked: check_char != ' ',
			indent: calculate_indent(leading),
			line_number,
			status: map_checkbox_char(check_char),
			metadata: parse_task_metadata(raw_text),
		});
	}
	None
}

/// Detects a fenced-code-block opener / closer at the start of `line`.
/// Returns the fence string (`"```"` or `"~~~"`) when matched, else `None`.
/// Mirrors `tasks.logic.ts::CODE_FENCE_RE = /^(\s*)(```|~~~)/`.
fn detect_code_fence(line: &str) -> Option<&str> {
	let trimmed = line.trim_start_matches([' ', '\t']);
	if trimmed.starts_with("```") {
		Some("```")
	} else if trimmed.starts_with("~~~") {
		Some("~~~")
	} else {
		None
	}
}

/// Extracts every task list item from `content` in document order. Skips
/// lines inside fenced code blocks. Line numbers are 1-based. Mirrors
/// `tasks.logic.ts::extractTasks`.
pub fn extract_tasks(content: &str) -> Vec<Task> {
	let mut out: Vec<Task> = Vec::new();
	let mut in_code_block = false;
	let mut fence_char: Option<&str> = None;
	for (i, line) in content.split('\n').enumerate() {
		if let Some(fence) = detect_code_fence(line) {
			if !in_code_block {
				in_code_block = true;
				fence_char = Some(fence);
			} else if Some(fence) == fence_char {
				in_code_block = false;
				fence_char = None;
			}
			continue;
		}
		if in_code_block {
			continue;
		}
		if let Some(task) = parse_task_line(line, i + 1) {
			out.push(task);
		}
	}
	out
}

/// Extracts tasks only from sections whose heading text contains
/// `section_tag`. A "section" spans from a heading line until the next
/// heading of equal-or-higher level. Empty `section_tag` falls through to
/// `extract_tasks`. Mirrors `tasks.logic.ts::extractTasksFromSection`.
pub fn extract_tasks_from_section(content: &str, section_tag: &str) -> Vec<Task> {
	if section_tag.trim().is_empty() {
		return extract_tasks(content);
	}
	let tag = if section_tag.starts_with('#') {
		section_tag.to_string()
	} else {
		format!("#{}", section_tag)
	};
	let mut out: Vec<Task> = Vec::new();
	let mut in_code_block = false;
	let mut fence_char: Option<&str> = None;
	let mut in_matching_section = false;
	let mut section_level: usize = 0;
	for (i, line) in content.split('\n').enumerate() {
		if let Some(fence) = detect_code_fence(line) {
			if !in_code_block {
				in_code_block = true;
				fence_char = Some(fence);
			} else if Some(fence) == fence_char {
				in_code_block = false;
				fence_char = None;
			}
			continue;
		}
		if in_code_block {
			continue;
		}
		if let Some(caps) = HEADING_RE.captures(line) {
			let level = caps.get(1).map(|m| m.as_str().len()).unwrap_or(0);
			let heading_text = caps.get(2).map(|m| m.as_str()).unwrap_or("");
			if in_matching_section && level <= section_level {
				in_matching_section = false;
			}
			if heading_text.contains(&tag) {
				in_matching_section = true;
				section_level = level;
			}
			continue;
		}
		if in_matching_section {
			if let Some(task) = parse_task_line(line, i + 1) {
				out.push(task);
			}
		}
	}
	out
}

/// Parses a task's raw text for emoji-signifier metadata. Mirrors
/// `task-metadata.logic.ts::parseTaskMetadata` exactly. Order of extraction:
/// dates, priorities (first wins), recurrence, ID, dependsOn, onCompletion,
/// tags. The cleaned description is the leftover text with multi-spaces
/// collapsed and trimmed.
pub fn parse_task_metadata(raw_text: &str) -> TaskMetadata {
	let mut text = raw_text.to_string();
	let mut metadata = TaskMetadata::default();

	// Dates
	for (re, field) in DATE_REGEXES.iter() {
		if let Some(caps) = re.captures(&text) {
			let value = caps.get(1).map(|m| m.as_str().to_string());
			let whole = caps.get(0).map(|m| m.as_str().to_string());
			if let (Some(v), Some(w)) = (value, whole) {
				match field {
					DateField::DueDate => metadata.due_date = Some(v),
					DateField::ScheduledDate => metadata.scheduled_date = Some(v),
					DateField::StartDate => metadata.start_date = Some(v),
					DateField::CreatedDate => metadata.created_date = Some(v),
					DateField::DoneDate => metadata.done_date = Some(v),
					DateField::CancelledDate => metadata.cancelled_date = Some(v),
				}
				text = text.replacen(&w, "", 1);
			}
		}
	}

	// Priority — first match wins.
	for (re, p) in PRIORITY_REGEXES.iter() {
		if let Some(m) = re.find(&text) {
			let whole = m.as_str().to_string();
			metadata.priority = Some(*p);
			text = text.replacen(&whole, "", 1);
			break;
		}
	}

	// Recurrence — the regex's whole-match span includes the trailing stop
	// signifier (substituting for the TS lookahead). We remove only
	// `[whole_start, capture1_end)` so the stop signifier stays in `text`
	// for downstream extractors. Mirrors TS lookahead semantics exactly.
	if let Some(caps) = RECURRENCE_RE.captures(&text) {
		if let (Some(whole), Some(cap1)) = (caps.get(0), caps.get(1)) {
			let consume_span = text[whole.start()..cap1.end()].to_string();
			let value = cap1.as_str().trim().to_string();
			if !value.is_empty() {
				metadata.recurrence = Some(RecurrenceRule { text: value });
			}
			text = text.replacen(&consume_span, "", 1);
		}
	}

	// ID
	if let Some(caps) = ID_RE.captures(&text) {
		let whole = caps.get(0).map(|m| m.as_str().to_string());
		let value = caps.get(1).map(|m| m.as_str().to_string());
		if let (Some(v), Some(w)) = (value, whole) {
			metadata.id = Some(v);
			text = text.replacen(&w, "", 1);
		}
	}

	// DependsOn
	if let Some(caps) = DEPENDS_ON_RE.captures(&text) {
		let whole = caps.get(0).map(|m| m.as_str().to_string());
		let value = caps.get(1).map(|m| m.as_str().to_string());
		if let (Some(v), Some(w)) = (value, whole) {
			let ids: Vec<String> = v
				.split(',')
				.map(|s| s.trim().to_string())
				.filter(|s| !s.is_empty())
				.collect();
			if !ids.is_empty() {
				metadata.depends_on = Some(ids);
			}
			text = text.replacen(&w, "", 1);
		}
	}

	// OnCompletion
	if let Some(caps) = ON_COMPLETION_RE.captures(&text) {
		let whole = caps.get(0).map(|m| m.as_str().to_string());
		let value = caps.get(1).map(|m| m.as_str().to_string());
		if let (Some(v), Some(w)) = (value, whole) {
			metadata.on_completion = Some(v);
			text = text.replacen(&w, "", 1);
		}
	}

	// Tags — extract from the cleaned text (post-signifier removal). The TS
	// version does this on `text.trim()` then removes via `text.replace(TAG_RE, '')`.
	let cleaned_for_tags = text.trim().to_string();
	let mut tags: Vec<String> = Vec::new();
	for caps in TASK_TAG_RE.captures_iter(&cleaned_for_tags) {
		if let Some(m) = caps.get(1) {
			tags.push(m.as_str().to_string());
		}
	}
	metadata.tags = tags;

	// Strip tags from `text`, then collapse multi-spaces and trim.
	text = TASK_TAG_RE.replace_all(&text, "").to_string();
	text = MULTI_SPACE_RE.replace_all(&text, " ").to_string();
	metadata.description = text.trim().to_string();

	metadata
}

/// Toggles a task's checkbox at `line_number` (1-based) inside `content`.
/// Mirrors `tasks.logic.ts::toggleTaskInContent`:
///   - `[ ]` -> `[x]` (first occurrence)
///   - else if `[xX-/?!>]` style box present -> first occurrence -> `[ ]`
///   - else: unchanged.
/// Out-of-bounds line numbers return the original content untouched.
pub fn toggle_task_in_content(content: &str, line_number: usize) -> String {
	if line_number == 0 {
		return content.to_string();
	}
	let mut lines: Vec<String> = content.split('\n').map(|s| s.to_string()).collect();
	let idx = line_number - 1;
	if idx >= lines.len() {
		return content.to_string();
	}
	let line = &lines[idx];
	let new_line = if line.contains("[ ]") {
		line.replacen("[ ]", "[x]", 1)
	} else if let Some(m) = CHECKED_BOX_RE.find(line) {
		let whole = m.as_str().to_string();
		line.replacen(&whole, "[ ]", 1)
	} else {
		return content.to_string();
	};
	lines[idx] = new_line;
	lines.join("\n")
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::vault::entry::WikiLink;
	use serde_json::{json, Value};

	fn link(target: &str, alias: Option<&str>, heading: Option<&str>, position: usize) -> WikiLink {
		WikiLink {
			target: target.to_string(),
			alias: alias.map(str::to_string),
			heading: heading.map(str::to_string),
			position,
		}
	}

	#[test]
	fn empty_content_returns_empty() {
		assert_eq!(extract_outgoing_links(""), vec![]);
	}

	#[test]
	fn content_without_wikilinks_returns_empty() {
		assert_eq!(extract_outgoing_links("Just plain text with no links."), vec![]);
	}

	#[test]
	fn single_plain_wikilink() {
		let result = extract_outgoing_links("[[note]]");
		assert_eq!(result, vec![link("note", None, None, 0)]);
	}

	#[test]
	fn wikilink_with_alias() {
		let result = extract_outgoing_links("[[target|alias]]");
		assert_eq!(result, vec![link("target", Some("alias"), None, 0)]);
	}

	#[test]
	fn wikilink_with_heading() {
		let result = extract_outgoing_links("[[target#heading]]");
		assert_eq!(result, vec![link("target", None, Some("heading"), 0)]);
	}

	#[test]
	fn wikilink_with_block_reference() {
		// `^block-id` is a block reference; the `^` is part of the heading capture.
		let result = extract_outgoing_links("[[target#^block-id]]");
		assert_eq!(result, vec![link("target", None, Some("^block-id"), 0)]);
	}

	#[test]
	fn wikilink_with_heading_then_alias() {
		// Pipe split runs first. Left side `target#heading` is then split on `#`.
		let result = extract_outgoing_links("[[target#heading|alias]]");
		assert_eq!(result, vec![link("target", Some("alias"), Some("heading"), 0)]);
	}

	#[test]
	fn hash_after_pipe_stays_in_alias() {
		// Pipe split runs first; `#` after the pipe is part of the alias verbatim.
		let result = extract_outgoing_links("[[target|alias#heading]]");
		assert_eq!(result, vec![link("target", Some("alias#heading"), None, 0)]);
	}

	#[test]
	fn second_pipe_stays_in_alias() {
		// Only the first pipe splits; subsequent pipes belong to the alias.
		let result = extract_outgoing_links("[[target|alias|extra]]");
		assert_eq!(result, vec![link("target", Some("alias|extra"), None, 0)]);
	}

	#[test]
	fn empty_inner_does_not_match() {
		// TS regex `[^\]]+?` requires at least one inner char. `[[]]` is not a wikilink.
		assert_eq!(extract_outgoing_links("[[]]"), vec![]);
	}

	#[test]
	fn whitespace_only_inner_matches_with_empty_target() {
		// `[[ ]]` matches; raw=' ', target after trim is empty. Mirrors TS exactly.
		let result = extract_outgoing_links("[[ ]]");
		assert_eq!(result, vec![link("", None, None, 0)]);
	}

	#[test]
	fn target_is_trimmed_alias_and_heading_are_not() {
		// Only `target` is trimmed in the TS code; alias/heading are preserved as-is.
		let result = extract_outgoing_links("[[  target  | alias |spaced |]]");
		assert_eq!(
			result,
			vec![link("target", Some(" alias |spaced |"), None, 0)],
		);
	}

	#[test]
	fn single_bracket_does_not_match() {
		assert_eq!(extract_outgoing_links("[note]"), vec![]);
	}

	#[test]
	fn single_internal_bracket_breaks_match() {
		// `[[a]b]]` cannot satisfy the regex: after consuming `a`, the engine
		// needs `]]` next but sees `]b`. The next-char `b` breaks it. After
		// backtracking attempts fail, no match is produced.
		assert_eq!(extract_outgoing_links("[[a]b]]"), vec![]);
	}

	#[test]
	fn nested_open_bracket_in_inner_is_consumed() {
		// `[[a[b]]` -- inner is `a[b`, no `|` or `#`. Target='a[b' (trimmed).
		let result = extract_outgoing_links("[[a[b]]");
		assert_eq!(result, vec![link("a[b", None, None, 0)]);
	}

	#[test]
	fn extra_closing_bracket_after_match_is_skipped() {
		// `[[a]]b]]` -- first match is `a` at position 0; trailing `b]]` has no `[[`.
		let result = extract_outgoing_links("[[a]]b]]");
		assert_eq!(result, vec![link("a", None, None, 0)]);
	}

	#[test]
	fn three_open_brackets_starts_match_at_first_pair() {
		// `[[[note]]` -- `[[` at position 0; inner is `[note`. Target='[note'.
		let result = extract_outgoing_links("[[[note]]");
		assert_eq!(result, vec![link("[note", None, None, 0)]);
	}

	#[test]
	fn adjacent_wikilinks_emit_two_entries_with_correct_positions() {
		let result = extract_outgoing_links("[[a]][[b]]");
		assert_eq!(
			result,
			vec![
				link("a", None, None, 0),
				link("b", None, None, 5),
			],
		);
	}

	#[test]
	fn wikilink_at_end_of_content() {
		let result = extract_outgoing_links("text before [[note]]");
		assert_eq!(result, vec![link("note", None, None, 12)]);
	}

	#[test]
	fn wikilink_at_start_followed_by_text() {
		let result = extract_outgoing_links("[[note]] more text");
		assert_eq!(result, vec![link("note", None, None, 0)]);
	}

	#[test]
	fn position_is_byte_offset_after_multibyte_chars() {
		// `e\u{0301}` is 'e' + combining acute (3 bytes total). Following `[[`
		// starts at byte offset 3. TS produces UTF-16 code-unit offset 2 for the
		// same input; the divergence is intentional and documented in
		// `parsing.rs` (positions stay internal to Rust until Phase 2's
		// getContextSnippet port).
		let content = "e\u{0301}[[note]]";
		let result = extract_outgoing_links(content);
		assert_eq!(result, vec![link("note", None, None, 3)]);
	}

	#[test]
	fn unmatched_open_brackets_do_not_produce_entries() {
		// `[[unclosed` runs out of content before finding `]]`.
		assert_eq!(extract_outgoing_links("[[unclosed"), vec![]);
		// `[[a` followed by EOF.
		assert_eq!(extract_outgoing_links("[[a"), vec![]);
		// `[[a]` followed by EOF (single closing bracket).
		assert_eq!(extract_outgoing_links("[[a]"), vec![]);
	}

	#[test]
	fn wikilink_inside_frontmatter_is_included() {
		// `parseWikilinks` does NOT strip frontmatter -- wikilinks declared in
		// YAML produce backlink entries in the current TS implementation.
		// Mirror enforces parity; opportunistic exclusion is deferred to a
		// future BEHAVIORAL phase.
		let content = "---\nrelated: [[other]]\n---\n# Body\n";
		let result = extract_outgoing_links(content);
		assert_eq!(result.len(), 1);
		assert_eq!(result[0].target, "other");
	}

	#[test]
	fn wikilink_inside_fenced_code_block_is_included() {
		// Same parity rationale as the frontmatter case above.
		let content = "Some prose.\n\n```\nA wikilink in code: [[ignored-by-future-phase]]\n```\n";
		let result = extract_outgoing_links(content);
		assert_eq!(result.len(), 1);
		assert_eq!(result[0].target, "ignored-by-future-phase");
	}

	#[test]
	fn many_wikilinks_in_document_order() {
		let content = "[[a]] body [[b#h]] more [[c|d]] end [[e#h|f]]";
		let result = extract_outgoing_links(content);
		let targets: Vec<&str> = result.iter().map(|l| l.target.as_str()).collect();
		assert_eq!(targets, vec!["a", "b", "c", "e"]);
		assert_eq!(result[1].heading.as_deref(), Some("h"));
		assert_eq!(result[2].alias.as_deref(), Some("d"));
		assert_eq!(result[3].alias.as_deref(), Some("f"));
		assert_eq!(result[3].heading.as_deref(), Some("h"));
	}

	#[test]
	fn empty_alias_after_pipe_is_some_empty_string() {
		// TS does `alias = raw.substring(pipeIndex + 1)` which returns `""`,
		// not `null`. Mirror returns Some(String::new()) for the same input.
		let result = extract_outgoing_links("[[t|]]");
		assert_eq!(result, vec![link("t", Some(""), None, 0)]);
	}

	#[test]
	fn empty_heading_after_hash_is_some_empty_string() {
		let result = extract_outgoing_links("[[t#]]");
		assert_eq!(result, vec![link("t", None, Some(""), 0)]);
	}

	// --- extract_tags_strict (Phase 1.3) ----------------------------------------

	#[test]
	fn frontmatter_inline_array_is_extracted() {
		let content = "---\ntags: [foo, bar, baz]\n---\nbody";
		assert_eq!(extract_tags_strict(content), vec!["foo", "bar", "baz"]);
	}

	#[test]
	fn frontmatter_inline_array_strips_quotes() {
		let content = "---\ntags: [\"foo\", 'bar']\n---\n";
		assert_eq!(extract_tags_strict(content), vec!["foo", "bar"]);
	}

	#[test]
	fn frontmatter_inline_array_strips_leading_hash() {
		let content = "---\ntags: [#foo, #bar]\n---\n";
		assert_eq!(extract_tags_strict(content), vec!["foo", "bar"]);
	}

	#[test]
	fn frontmatter_inline_array_drops_empty_entries() {
		let content = "---\ntags: [foo, ,bar]\n---\n";
		assert_eq!(extract_tags_strict(content), vec!["foo", "bar"]);
	}

	#[test]
	fn frontmatter_inline_array_with_extra_whitespace() {
		let content = "---\ntags: [  foo ,   bar  ]\n---\n";
		assert_eq!(extract_tags_strict(content), vec!["foo", "bar"]);
	}

	#[test]
	fn frontmatter_inline_array_unterminated_matches_ts_slice() {
		// Parity (#7): TS `extractFrontmatterTags` does
		// `valueAfterColon.slice(1, lastIndexOf(']'))`. With no closing `]`,
		// lastIndexOf returns -1 and `slice(1, -1)` drops the LAST char, so
		// "[foo, bar" -> inner "foo, ba" -> tags [foo, ba]. The Rust path must
		// match (it previously kept the whole "foo, bar" -> [foo, bar]).
		let content = "---\ntags: [foo, bar\n---\nbody";
		assert_eq!(extract_tags_strict(content), vec!["foo", "ba"]);
	}

	#[test]
	fn frontmatter_single_value_on_same_line() {
		let content = "---\ntags: solo\n---\n";
		assert_eq!(extract_tags_strict(content), vec!["solo"]);
	}

	#[test]
	fn frontmatter_single_value_strips_quotes() {
		let content = "---\ntags: \"quoted\"\n---\n";
		assert_eq!(extract_tags_strict(content), vec!["quoted"]);
	}

	#[test]
	fn frontmatter_single_value_strips_leading_hash() {
		let content = "---\ntags: \"#hash\"\n---\n";
		assert_eq!(extract_tags_strict(content), vec!["hash"]);
	}

	#[test]
	fn frontmatter_block_array_is_extracted() {
		let content = "---\ntags:\n  - foo\n  - bar\n  - baz\n---\n";
		assert_eq!(extract_tags_strict(content), vec!["foo", "bar", "baz"]);
	}

	#[test]
	fn frontmatter_block_array_strips_leading_hash_and_quotes() {
		let content = "---\ntags:\n  - \"#foo\"\n  - 'bar'\n  - #baz\n---\n";
		assert_eq!(extract_tags_strict(content), vec!["foo", "bar", "baz"]);
	}

	#[test]
	fn frontmatter_block_array_skips_blank_lines_then_stops_on_other_content() {
		let content = "---\ntags:\n  - foo\n\n  - bar\nother: nope\n  - never\n---\n";
		assert_eq!(extract_tags_strict(content), vec!["foo", "bar"]);
	}

	#[test]
	fn frontmatter_block_array_stops_at_empty_dash_item() {
		// Parity (#8): TS item regex `/^\s*-\s+(.+)$/` requires a NON-EMPTY
		// value, so a bare `- ` (dash + only whitespace) does not match and
		// the TS loop breaks. Rust must break too. Previously Rust skipped the
		// empty item and kept collecting -> [alpha, beta].
		let content = "---\ntags:\n  - alpha\n  - \n  - beta\n---\n";
		assert_eq!(extract_tags_strict(content), vec!["alpha"]);
	}

	#[test]
	fn frontmatter_empty_tags_value_returns_empty() {
		let content = "---\ntags:\n---\n";
		assert_eq!(extract_tags_strict(content), Vec::<String>::new());
	}

	#[test]
	fn frontmatter_no_tags_key_returns_empty() {
		let content = "---\nstatus: draft\nauthor: me\n---\n";
		assert_eq!(extract_tags_strict(content), Vec::<String>::new());
	}

	#[test]
	fn no_frontmatter_at_all_returns_empty_from_frontmatter_path() {
		let content = "no frontmatter here\nbody only\n";
		assert_eq!(extract_tags_strict(content), Vec::<String>::new());
	}

	#[test]
	fn frontmatter_skips_tags_inside_multiline_quoted_scalar() {
		let content = "---\ndesc: \"this is\nmulti-line\nwith tags: [fake1, fake2]\nstill quoted\"\ntags: [real]\n---\n";
		assert_eq!(extract_tags_strict(content), vec!["real"]);
	}

	// Inline cases ---------------------------------------------------------------

	#[test]
	fn inline_tag_after_space() {
		assert_eq!(extract_tags_strict("text #foo more"), vec!["foo"]);
	}

	#[test]
	fn inline_tag_after_newline() {
		assert_eq!(extract_tags_strict("text\n#foo"), vec!["foo"]);
	}

	#[test]
	fn inline_tag_at_start_of_content() {
		assert_eq!(extract_tags_strict("#foo"), vec!["foo"]);
	}

	#[test]
	fn inline_tag_with_path_segments() {
		assert_eq!(extract_tags_strict("#area/sub/leaf"), vec!["area/sub/leaf"]);
	}

	#[test]
	fn inline_tag_with_dashes_and_underscores() {
		assert_eq!(
			extract_tags_strict("#a-b #c_d #e-f_g/h"),
			vec!["a-b", "c_d", "e-f_g/h"],
		);
	}

	#[test]
	fn inline_tag_strips_single_trailing_slash() {
		assert_eq!(extract_tags_strict("#topic/"), vec!["topic"]);
	}

	#[test]
	fn inline_tag_strips_multiple_trailing_slashes() {
		assert_eq!(extract_tags_strict("#topic///"), vec!["topic"]);
	}

	#[test]
	fn inline_tag_digit_first_is_rejected() {
		assert_eq!(extract_tags_strict("text #1foo"), Vec::<String>::new());
	}

	#[test]
	fn inline_tag_in_word_is_rejected() {
		assert_eq!(extract_tags_strict("foo#bar"), Vec::<String>::new());
	}

	#[test]
	fn inline_tag_terminates_at_punctuation() {
		assert_eq!(extract_tags_strict("hi #foo!"), vec!["foo"]);
		assert_eq!(extract_tags_strict("hi #foo, bar"), vec!["foo"]);
		assert_eq!(extract_tags_strict("(#foo)"), Vec::<String>::new());
		// '(' is not whitespace, so the preceding-char gate rejects this.
	}

	#[test]
	fn inline_tag_inside_fenced_code_is_excluded() {
		let content = "before\n```\n#code-tag\n```\nafter #real";
		assert_eq!(extract_tags_strict(content), vec!["real"]);
	}

	#[test]
	fn inline_tag_inside_inline_code_is_excluded() {
		assert_eq!(extract_tags_strict("text `#fake` then #real"), vec!["real"]);
	}

	#[test]
	fn inline_tag_inside_html_comment_is_excluded() {
		assert_eq!(
			extract_tags_strict("body <!-- #commented --> then #real"),
			vec!["real"],
		);
	}

	#[test]
	fn inline_tag_dedup_is_case_sensitive_within_inline() {
		assert_eq!(extract_tags_strict("#Foo #foo"), vec!["Foo"]);
	}

	#[test]
	fn inline_tag_unicode_letters_are_supported() {
		assert_eq!(
			extract_tags_strict("note #caf\u{00e9} about #\u{65e5}\u{672c}\u{8a9e}/learning"),
			vec!["caf\u{00e9}", "\u{65e5}\u{672c}\u{8a9e}/learning"],
		);
	}

	// Combined frontmatter + inline ---------------------------------------------

	#[test]
	fn frontmatter_and_inline_tags_are_merged_in_order() {
		let content = "---\ntags: [a, b]\n---\nbody #c #d";
		assert_eq!(extract_tags_strict(content), vec!["a", "b", "c", "d"]);
	}

	#[test]
	fn case_insensitive_dedup_keeps_first_occurrence_casing() {
		let content = "---\ntags: [Project]\n---\nbody #project #PROJECT";
		assert_eq!(extract_tags_strict(content), vec!["Project"]);
	}

	#[test]
	fn realistic_document_extraction() {
		let content = "---\ntitle: Example\ntags:\n  - work\n  - alpha\n  - \"#beta\"\n---\n# Heading\n\nThis note covers #work topics and #area/sub/leaf navigation.\n\n```\n#code-snippet ignored\n```\n\nInline `#also-ignored` and a real #note tag.\n\n<!-- #commented-out -->\n";
		let tags = extract_tags_strict(content);
		assert_eq!(tags, vec!["work", "alpha", "beta", "area/sub/leaf", "note"]);
	}

	// --- parse_frontmatter (Phase 1.4) ------------------------------------------

	fn fm_int(n: i64) -> Value {
		json!(n)
	}

	#[test]
	fn parse_no_frontmatter_returns_empty_map() {
		assert!(parse_frontmatter("just body, no fm\n").is_empty());
		assert!(parse_frontmatter("").is_empty());
	}

	#[test]
	fn parse_empty_frontmatter_returns_empty_map() {
		assert!(parse_frontmatter("---\n---\n").is_empty());
		assert!(parse_frontmatter("---\n\n---\n").is_empty());
	}

	#[test]
	fn parse_bare_string_scalar() {
		let m = parse_frontmatter("---\nkey: hello\n---\n");
		assert_eq!(m.get("key"), Some(&Value::String("hello".to_string())));
	}

	#[test]
	fn parse_double_and_single_quoted_strings() {
		let m = parse_frontmatter("---\na: \"double\"\nb: 'single'\n---\n");
		assert_eq!(m.get("a"), Some(&Value::String("double".to_string())));
		assert_eq!(m.get("b"), Some(&Value::String("single".to_string())));
	}

	#[test]
	fn parse_quoted_empty_string() {
		let m = parse_frontmatter("---\nkey: \"\"\n---\n");
		assert_eq!(m.get("key"), Some(&Value::String(String::new())));
	}

	#[test]
	fn parse_integer_and_negative_integer() {
		let m = parse_frontmatter("---\npos: 42\nneg: -5\n---\n");
		assert_eq!(m.get("pos"), Some(&fm_int(42)));
		assert_eq!(m.get("neg"), Some(&fm_int(-5)));
	}

	#[test]
	fn parse_float() {
		let m = parse_frontmatter("---\npi: 3.14\n---\n");
		assert_eq!(m.get("pi"), Some(&json!(3.14)));
	}

	#[test]
	fn parse_boolean_variants() {
		let m = parse_frontmatter("---\na: true\nb: True\nc: TRUE\nd: false\ne: False\nf: FALSE\n---\n");
		assert_eq!(m.get("a"), Some(&Value::Bool(true)));
		assert_eq!(m.get("b"), Some(&Value::Bool(true)));
		assert_eq!(m.get("c"), Some(&Value::Bool(true)));
		assert_eq!(m.get("d"), Some(&Value::Bool(false)));
		assert_eq!(m.get("e"), Some(&Value::Bool(false)));
		assert_eq!(m.get("f"), Some(&Value::Bool(false)));
	}

	#[test]
	fn parse_null_variants() {
		let m = parse_frontmatter("---\na: null\nb: Null\nc: NULL\nd: ~\ne:\n---\n");
		assert_eq!(m.get("a"), Some(&Value::Null));
		assert_eq!(m.get("b"), Some(&Value::Null));
		assert_eq!(m.get("c"), Some(&Value::Null));
		assert_eq!(m.get("d"), Some(&Value::Null));
		assert_eq!(m.get("e"), Some(&Value::Null));
	}

	#[test]
	fn parse_quoted_string_that_looks_like_number_stays_string() {
		let m = parse_frontmatter("---\nkey: \"42\"\n---\n");
		assert_eq!(m.get("key"), Some(&Value::String("42".to_string())));
	}

	#[test]
	fn parse_iso_date_remains_a_string_at_parser_layer() {
		let m = parse_frontmatter("---\nstart: 2026-04-28\n---\n");
		assert_eq!(m.get("start"), Some(&Value::String("2026-04-28".to_string())));
	}

	#[test]
	fn parse_inline_array_of_strings() {
		let m = parse_frontmatter("---\ntags: [foo, bar, baz]\n---\n");
		assert_eq!(m.get("tags"), Some(&json!(["foo", "bar", "baz"])));
	}

	#[test]
	fn parse_inline_array_mixed_types() {
		let m = parse_frontmatter("---\nmixed: [1, \"two\", true, null, 3.5]\n---\n");
		assert_eq!(m.get("mixed"), Some(&json!([1, "two", true, null, 3.5])));
	}

	#[test]
	fn parse_inline_array_drops_stray_commas() {
		let m = parse_frontmatter("---\ntags: [a, , b]\n---\n");
		assert_eq!(m.get("tags"), Some(&json!(["a", "b"])));
	}

	#[test]
	fn parse_inline_array_preserves_quoted_empty_string() {
		let m = parse_frontmatter("---\nslots: [a, \"\", b]\n---\n");
		assert_eq!(m.get("slots"), Some(&json!(["a", "", "b"])));
	}

	#[test]
	fn parse_inline_array_unclosed_bracket_lenient() {
		let m = parse_frontmatter("---\ntags: [a, b\n---\n");
		assert_eq!(m.get("tags"), Some(&json!(["a", "b"])));
	}

	#[test]
	fn parse_empty_inline_array() {
		let m = parse_frontmatter("---\nempty: []\n---\n");
		assert_eq!(m.get("empty"), Some(&json!([])));
	}

	#[test]
	fn parse_block_array_of_strings() {
		let content = "---\ntags:\n  - foo\n  - bar\n  - baz\n---\n";
		let m = parse_frontmatter(content);
		assert_eq!(m.get("tags"), Some(&json!(["foo", "bar", "baz"])));
	}

	#[test]
	fn parse_block_array_with_quoted_items() {
		let content = "---\ntags:\n  - \"foo\"\n  - 'bar'\n---\n";
		let m = parse_frontmatter(content);
		assert_eq!(m.get("tags"), Some(&json!(["foo", "bar"])));
	}

	#[test]
	fn parse_block_array_lone_dash_is_null_item() {
		let content = "---\nitems:\n  - first\n  -\n  - third\n---\n";
		let m = parse_frontmatter(content);
		assert_eq!(m.get("items"), Some(&json!(["first", null, "third"])));
	}

	#[test]
	fn parse_block_array_with_4_space_indent() {
		let content = "---\ntags:\n    - foo\n    - bar\n---\n";
		let m = parse_frontmatter(content);
		assert_eq!(m.get("tags"), Some(&json!(["foo", "bar"])));
	}

	#[test]
	fn parse_block_array_terminates_when_indent_decreases() {
		let content = "---\ntags:\n  - foo\nnext: hello\n  - skipped\n---\n";
		let m = parse_frontmatter(content);
		assert_eq!(m.get("tags"), Some(&json!(["foo"])));
		assert_eq!(m.get("next"), Some(&Value::String("hello".to_string())));
	}

	#[test]
	fn parse_nested_map_records_parent_as_null_and_preserves_sibling() {
		let content = "---\nparent:\n  child1: value1\n  child2: value2\nsibling: hello\n---\n";
		let m = parse_frontmatter(content);
		assert_eq!(m.get("parent"), Some(&Value::Null));
		assert_eq!(m.get("sibling"), Some(&Value::String("hello".to_string())));
	}

	#[test]
	fn parse_deeply_nested_map_preserves_top_level_siblings() {
		let content = "---\nroot:\n  level1:\n    level2: deep\n    other: thing\nafter: yes\n---\n";
		let m = parse_frontmatter(content);
		assert_eq!(m.get("root"), Some(&Value::Null));
		assert_eq!(m.get("after"), Some(&Value::String("yes".to_string())));
	}

	#[test]
	fn parse_multiple_top_level_keys() {
		let content = "---\ntitle: Example\nauthor: me\ncount: 7\ndraft: true\n---\n";
		let m = parse_frontmatter(content);
		assert_eq!(m.get("title"), Some(&Value::String("Example".to_string())));
		assert_eq!(m.get("author"), Some(&Value::String("me".to_string())));
		assert_eq!(m.get("count"), Some(&fm_int(7)));
		assert_eq!(m.get("draft"), Some(&Value::Bool(true)));
	}

	#[test]
	fn parse_blank_lines_between_keys_are_skipped() {
		let content = "---\na: 1\n\n\nb: 2\n---\n";
		let m = parse_frontmatter(content);
		assert_eq!(m.get("a"), Some(&fm_int(1)));
		assert_eq!(m.get("b"), Some(&fm_int(2)));
	}

	#[test]
	fn parse_malformed_line_without_colon_is_skipped() {
		let content = "---\nvalid: yes\nthis is not valid yaml\nanother: ok\n---\n";
		let m = parse_frontmatter(content);
		assert_eq!(m.get("valid"), Some(&Value::String("yes".to_string())));
		assert_eq!(m.get("another"), Some(&Value::String("ok".to_string())));
		assert_eq!(m.len(), 2);
	}

	#[test]
	fn parse_line_with_empty_key_is_skipped() {
		let content = "---\n: orphan value\nreal: ok\n---\n";
		let m = parse_frontmatter(content);
		assert_eq!(m.get("real"), Some(&Value::String("ok".to_string())));
		assert_eq!(m.len(), 1);
	}

	#[test]
	fn parse_value_is_trimmed_of_outer_whitespace() {
		let content = "---\nkey:    value with internal spaces   \n---\n";
		let m = parse_frontmatter(content);
		assert_eq!(
			m.get("key"),
			Some(&Value::String("value with internal spaces".to_string())),
		);
	}

	#[test]
	fn parse_duplicate_keys_last_value_wins() {
		let content = "---\nkey: first\nkey: second\nkey: third\n---\n";
		let m = parse_frontmatter(content);
		assert_eq!(m.get("key"), Some(&Value::String("third".to_string())));
		assert_eq!(m.len(), 1);
	}

	#[test]
	fn parse_handles_crlf_line_endings() {
		let content = "---\r\ntitle: Example\r\ncount: 3\r\n---\r\n";
		let m = parse_frontmatter(content);
		assert_eq!(m.get("title"), Some(&Value::String("Example".to_string())));
		assert_eq!(m.get("count"), Some(&fm_int(3)));
	}

	#[test]
	fn parse_frontmatter_without_trailing_newline_is_recognised() {
		let content = "---\nkey: v\n---trailing";
		let m = parse_frontmatter(content);
		assert_eq!(m.get("key"), Some(&Value::String("v".to_string())));
	}

	#[test]
	fn parse_comments_after_value_are_kept_as_part_of_string() {
		let content = "---\nkey: value # not a comment in this parser\n---\n";
		let m = parse_frontmatter(content);
		assert_eq!(
			m.get("key"),
			Some(&Value::String(
				"value # not a comment in this parser".to_string()
			)),
		);
	}

	#[test]
	fn parse_realistic_note_frontmatter() {
		let content = "---\ntitle: \"Q2 Review\"\ndate: 2026-04-28\nauthor: me\ntags: [work, draft, q2]\nchecklist:\n  - kickoff\n  - midway\n  - retro\nfeatured: true\nrating: 4.5\nrelated:\n  parent: somewhere\n  child: deep\n---\n# Body\n";
		let m = parse_frontmatter(content);
		assert_eq!(m.get("title"), Some(&Value::String("Q2 Review".to_string())));
		assert_eq!(m.get("date"), Some(&Value::String("2026-04-28".to_string())));
		assert_eq!(m.get("author"), Some(&Value::String("me".to_string())));
		assert_eq!(m.get("tags"), Some(&json!(["work", "draft", "q2"])));
		assert_eq!(
			m.get("checklist"),
			Some(&json!(["kickoff", "midway", "retro"])),
		);
		assert_eq!(m.get("featured"), Some(&Value::Bool(true)));
		assert_eq!(m.get("rating"), Some(&json!(4.5)));
		assert_eq!(m.get("related"), Some(&Value::Null)); // nested -> null
	}

	// --- Phase 6.2 helpers: strip_non_body_content + find_plain_text_mention_positions ---

	#[test]
	fn strip_non_body_replaces_frontmatter_with_spaces_preserving_length() {
		let input = "---\ntitle: x\n---\nbody";
		let stripped = strip_non_body_content(input);
		assert_eq!(stripped.len(), input.len());
		assert!(stripped.starts_with("                "));
		assert!(stripped.ends_with("body"));
	}

	#[test]
	fn strip_non_body_replaces_fenced_code_blocks_with_spaces() {
		let input = "before\n```\ncode\n```\nafter";
		let stripped = strip_non_body_content(input);
		assert_eq!(stripped.len(), input.len());
		assert!(stripped.starts_with("before\n"));
		assert!(stripped.ends_with("\nafter"));
		assert!(stripped.contains("            ")); // many spaces in the fence range
	}

	#[test]
	fn strip_non_body_handles_multiple_fences() {
		let input = "a\n```\nA\n```\nb\n```\nB\n```\nc";
		let stripped = strip_non_body_content(input);
		assert_eq!(stripped.len(), input.len());
		let mid = stripped.find('b').unwrap();
		assert_eq!(input.as_bytes()[mid], b'b');
	}

	#[test]
	fn strip_non_body_unclosed_fence_is_left_intact() {
		let input = "before\n```\nunclosed code";
		let stripped = strip_non_body_content(input);
		assert_eq!(stripped, input);
	}

	#[test]
	fn strip_non_body_no_frontmatter_no_fences_is_identity() {
		let input = "Plain prose with [[wikilink]] and *italic* text.";
		let stripped = strip_non_body_content(input);
		assert_eq!(stripped, input);
	}

	#[test]
	fn strip_non_body_preserves_byte_positions_of_body() {
		let input = "---\nfm: 1\n---\nLine A with X\n```\nIGNORED\n```\nLine B with X";
		let stripped = strip_non_body_content(input);
		let original_xs: Vec<usize> = input
			.bytes()
			.enumerate()
			.filter(|(_, b)| *b == b'X')
			.map(|(i, _)| i)
			.collect();
		let stripped_xs: Vec<usize> = stripped
			.bytes()
			.enumerate()
			.filter(|(_, b)| *b == b'X')
			.map(|(i, _)| i)
			.collect();
		assert_eq!(original_xs.len(), 2);
		assert_eq!(original_xs, stripped_xs);
	}

	#[test]
	fn is_word_boundary_char_covers_ascii_whitespace_and_punctuation() {
		for c in [' ', '\t', '\n', '.', ',', '!', '?', '(', ')', '"', '\''] {
			assert!(is_word_boundary_char(c), "expected boundary: {:?}", c);
		}
		for c in ['a', 'Z', '0', '\u{00e9}', '_'] {
			if c == '_' {
				assert!(is_word_boundary_char(c));
			} else {
				assert!(!is_word_boundary_char(c), "expected non-boundary: {:?}", c);
			}
		}
	}

	#[test]
	fn is_word_boundary_char_covers_common_unicode_punct() {
		for c in [
			'\u{00AB}', // <<
			'\u{00BB}', // >>
			'\u{201C}', // left double quote
			'\u{201D}', // right double quote
			'\u{2018}', // left single quote
			'\u{2019}', // right single quote
			'\u{2014}', // em dash
			'\u{2013}', // en dash
			'\u{2026}', // ellipsis
			'\u{00B7}', // middle dot
		] {
			assert!(is_word_boundary_char(c), "expected boundary: U+{:04X}", c as u32);
		}
	}

	#[test]
	fn find_plain_text_mention_returns_empty_when_no_match() {
		let content = "no relevant words here";
		let stripped_lower = strip_non_body_content(content).to_lowercase();
		assert!(find_plain_text_mention_positions(content, &stripped_lower, "Note A").is_empty());
	}

	#[test]
	fn find_plain_text_mention_returns_word_boundary_position() {
		let content = "See Note A in the docs.";
		let stripped_lower = strip_non_body_content(content).to_lowercase();
		let positions = find_plain_text_mention_positions(content, &stripped_lower, "Note A");
		assert_eq!(positions, vec![4]);
	}

	#[test]
	fn find_plain_text_mention_excludes_in_word_match() {
		let content = "Annotation X has noteAfoo inside.";
		let stripped_lower = strip_non_body_content(content).to_lowercase();
		let positions = find_plain_text_mention_positions(content, &stripped_lower, "noteA");
		assert!(positions.is_empty());
	}

	#[test]
	fn find_plain_text_mention_excludes_match_inside_wikilink() {
		let content = "Click [[Note A]] here";
		let stripped_lower = strip_non_body_content(content).to_lowercase();
		let positions = find_plain_text_mention_positions(content, &stripped_lower, "Note A");
		assert!(positions.is_empty());
	}

	#[test]
	fn find_plain_text_mention_finds_outside_wikilink_on_same_line() {
		let content = "[[Note B]] mentions Note A explicitly";
		let stripped_lower = strip_non_body_content(content).to_lowercase();
		let positions = find_plain_text_mention_positions(content, &stripped_lower, "Note A");
		assert_eq!(positions.len(), 1);
	}

	#[test]
	fn find_plain_text_mention_handles_multiple_matches_same_line() {
		let content = "Note A and Note A again, plus Note A at the end";
		let stripped_lower = strip_non_body_content(content).to_lowercase();
		let positions = find_plain_text_mention_positions(content, &stripped_lower, "Note A");
		assert_eq!(positions.len(), 3);
	}

	#[test]
	fn find_plain_text_mention_skips_matches_in_fenced_code_blocks() {
		let content = "Note A here\n```\nNote A in code\n```\nNote A again";
		let stripped_lower = strip_non_body_content(content).to_lowercase();
		let positions = find_plain_text_mention_positions(content, &stripped_lower, "Note A");
		assert_eq!(positions.len(), 2);
	}

	#[test]
	fn find_plain_text_mention_skips_matches_in_frontmatter() {
		let content = "---\nrelated: Note A\n---\nNote A in body";
		let stripped_lower = strip_non_body_content(content).to_lowercase();
		let positions = find_plain_text_mention_positions(content, &stripped_lower, "Note A");
		assert_eq!(positions.len(), 1);
	}

	#[test]
	fn find_plain_text_mention_at_start_of_content() {
		let content = "Note A starts the file";
		let stripped_lower = strip_non_body_content(content).to_lowercase();
		let positions = find_plain_text_mention_positions(content, &stripped_lower, "Note A");
		assert_eq!(positions, vec![0]);
	}

	#[test]
	fn find_plain_text_mention_at_end_of_content() {
		let content = "Ends with Note A";
		let stripped_lower = strip_non_body_content(content).to_lowercase();
		let positions = find_plain_text_mention_positions(content, &stripped_lower, "Note A");
		assert_eq!(positions, vec!["Ends with ".len()]);
	}

	#[test]
	fn find_plain_text_mention_case_insensitive() {
		let content = "Click NOTE A or note a in upper or lower";
		let stripped_lower = strip_non_body_content(content).to_lowercase();
		let positions = find_plain_text_mention_positions(content, &stripped_lower, "Note A");
		assert_eq!(positions.len(), 2);
	}

	#[test]
	fn find_plain_text_mention_does_not_panic_when_lowercase_shifts_bytes_into_multibyte_char() {
		let content = "\u{0130}\u{1f534}abc";
		let stripped_lower = strip_non_body_content(content).to_lowercase();
		let positions = find_plain_text_mention_positions(content, &stripped_lower, "\u{1f534}abc");
		assert!(positions.is_empty());
	}

	#[test]
	fn find_plain_text_mention_still_finds_match_before_lowercase_byte_shift() {
		let content = "Note A starts here. \u{0130} later in the file.";
		let stripped_lower = strip_non_body_content(content).to_lowercase();
		let positions = find_plain_text_mention_positions(content, &stripped_lower, "Note A");
		assert_eq!(positions, vec![0]);
	}

	// --- Frontmatter alias normalization -----------------------------------------

	#[test]
	fn parse_frontmatter_normalizes_type_to_underscore_type() {
		let content = "---\ntype: person\ntitle: Bob\n---\n";
		let fm = parse_frontmatter(content);
		assert_eq!(fm.get("_type"), Some(&json!("person")));
		assert!(fm.get("type").is_none());
	}

	#[test]
	fn parse_frontmatter_does_not_alias_dropped_is_a() {
		// `is_a` / `is a` are no longer recognised aliases; they pass through
		// verbatim and do not become the canonical `_type` key.
		let content = "---\nis_a: person\nis a: place\n---\n";
		let fm = parse_frontmatter(content);
		assert!(fm.get("_type").is_none());
		assert_eq!(fm.get("is_a"), Some(&json!("person")));
		assert_eq!(fm.get("is a"), Some(&json!("place")));
	}

	#[test]
	fn parse_frontmatter_normalizes_space_aliases() {
		let content = "---\nsidebar label: Places\n---\n";
		let fm = parse_frontmatter(content);
		assert_eq!(fm.get("_sidebar_label"), Some(&json!("Places")));
	}

	#[test]
	fn parse_frontmatter_does_not_alias_relationship_keys() {
		// Relationship fields are underscore-canonical and take no alias:
		// the bare/space spellings stay verbatim (not normalized).
		let content = "---\nbelongs to: geography\nrelated_to: maps\n---\n";
		let fm = parse_frontmatter(content);
		assert!(fm.get("belongs_to").is_none());
		assert!(fm.get("_belongs_to").is_none());
		assert_eq!(fm.get("belongs to"), Some(&json!("geography")));
		assert_eq!(fm.get("related_to"), Some(&json!("maps")));
	}

	#[test]
	fn parse_frontmatter_normalizes_system_underscore_keys() {
		let content = "---\nicon: rocket\nfavorite: true\norder: 5\ncolor: red\n---\n";
		let fm = parse_frontmatter(content);
		assert_eq!(fm.get("_icon"), Some(&json!("rocket")));
		assert_eq!(fm.get("_favorite"), Some(&json!(true)));
		assert_eq!(fm.get("_order"), Some(&json!(5)));
		assert_eq!(fm.get("_color"), Some(&json!("red")));
		assert!(fm.get("icon").is_none());
	}

	#[test]
	fn parse_frontmatter_normalizes_sidebar_label_variants() {
		let content = "---\nsidebar_label: Notes\n---\n";
		let fm = parse_frontmatter(content);
		assert_eq!(fm.get("_sidebar_label"), Some(&json!("Notes")));
		assert!(fm.get("sidebar_label").is_none());

		let content2 = "---\nsidebar label: Docs\n---\n";
		let fm2 = parse_frontmatter(content2);
		assert_eq!(fm2.get("_sidebar_label"), Some(&json!("Docs")));
	}

	#[test]
	fn parse_frontmatter_leaves_unknown_keys_unchanged() {
		let content = "---\ntitle: Hello\ntags: [a, b]\n---\n";
		let fm = parse_frontmatter(content);
		assert_eq!(fm.get("title"), Some(&json!("Hello")));
		assert_eq!(fm.get("tags"), Some(&json!(["a", "b"])));
	}

	#[test]
	fn parse_frontmatter_leaves_canonical_keys_unchanged() {
		let content = "---\n_icon: star\n_type: note\n_organized: true\n---\n";
		let fm = parse_frontmatter(content);
		assert_eq!(fm.get("_icon"), Some(&json!("star")));
		assert_eq!(fm.get("_type"), Some(&json!("note")));
		assert_eq!(fm.get("_organized"), Some(&json!(true)));
	}

	// --- map_checkbox_char (from vault_task_test.rs) --------------------------------

	#[test]
	fn map_checkbox_char_recognises_all_known_chars() {
		assert_eq!(map_checkbox_char(' '), TaskStatus::Todo);
		assert_eq!(map_checkbox_char('x'), TaskStatus::Done);
		assert_eq!(map_checkbox_char('X'), TaskStatus::Done);
		assert_eq!(map_checkbox_char('-'), TaskStatus::Cancelled);
		assert_eq!(map_checkbox_char('/'), TaskStatus::InProgress);
		assert_eq!(map_checkbox_char('?'), TaskStatus::Question);
		assert_eq!(map_checkbox_char('>'), TaskStatus::Forwarded);
		assert_eq!(map_checkbox_char('!'), TaskStatus::Important);
	}

	#[test]
	fn map_checkbox_char_unknown_falls_back_to_todo() {
		assert_eq!(map_checkbox_char('z'), TaskStatus::Todo);
		assert_eq!(map_checkbox_char('@'), TaskStatus::Todo);
	}

	// --- extract_tasks: empty / no tasks -------------------------------------------

	#[test]
	fn extract_tasks_empty_string_returns_empty() {
		assert!(extract_tasks("").is_empty());
	}

	#[test]
	fn extract_tasks_no_tasks_in_plain_prose() {
		let content = "Just a paragraph.\nAnother paragraph.\n";
		assert!(extract_tasks(content).is_empty());
	}

	// --- extract_tasks: shapes -----------------------------------------------------

	#[test]
	fn extract_tasks_unordered_basic_shape() {
		let content = "- [ ] Buy milk\n- [x] Write tests\n";
		let tasks = extract_tasks(content);
		assert_eq!(tasks.len(), 2);
		assert_eq!(tasks[0].text, "Buy milk");
		assert!(!tasks[0].checked);
		assert_eq!(tasks[0].indent, 0);
		assert_eq!(tasks[0].line_number, 1);
		assert_eq!(tasks[0].status, TaskStatus::Todo);

		assert_eq!(tasks[1].text, "Write tests");
		assert!(tasks[1].checked);
		assert_eq!(tasks[1].line_number, 2);
		assert_eq!(tasks[1].status, TaskStatus::Done);
	}

	#[test]
	fn extract_tasks_supports_all_unordered_markers() {
		let content = "- [ ] dash task\n* [ ] star task\n+ [ ] plus task\n";
		let tasks = extract_tasks(content);
		assert_eq!(tasks.len(), 3);
		assert_eq!(tasks[0].text, "dash task");
		assert_eq!(tasks[1].text, "star task");
		assert_eq!(tasks[2].text, "plus task");
	}

	#[test]
	fn extract_tasks_supports_ordered_marker() {
		let content = "1. [ ] first\n2. [x] second\n10. [-] tenth\n";
		let tasks = extract_tasks(content);
		assert_eq!(tasks.len(), 3);
		assert_eq!(tasks[0].text, "first");
		assert_eq!(tasks[1].text, "second");
		assert!(tasks[1].checked);
		assert_eq!(tasks[2].status, TaskStatus::Cancelled);
	}

	#[test]
	fn extract_tasks_recognises_all_status_chars() {
		let content = "- [ ] todo\n- [x] done\n- [-] cancelled\n- [/] in-prog\n- [?] question\n- [>] forwarded\n- [!] important\n";
		let tasks = extract_tasks(content);
		assert_eq!(tasks.len(), 7);
		assert_eq!(tasks[0].status, TaskStatus::Todo);
		assert_eq!(tasks[1].status, TaskStatus::Done);
		assert_eq!(tasks[2].status, TaskStatus::Cancelled);
		assert_eq!(tasks[3].status, TaskStatus::InProgress);
		assert_eq!(tasks[4].status, TaskStatus::Question);
		assert_eq!(tasks[5].status, TaskStatus::Forwarded);
		assert_eq!(tasks[6].status, TaskStatus::Important);
	}

	#[test]
	fn extract_tasks_indent_levels_tabs_and_spaces() {
		let content = "- [ ] zero\n  - [ ] one space*2=1\n    - [ ] two spaces*4=2\n\t- [ ] one tab=1\n\t\t- [ ] two tabs=2\n";
		let tasks = extract_tasks(content);
		assert_eq!(tasks.len(), 5);
		assert_eq!(tasks[0].indent, 0);
		assert_eq!(tasks[1].indent, 1);
		assert_eq!(tasks[2].indent, 2);
		assert_eq!(tasks[3].indent, 1);
		assert_eq!(tasks[4].indent, 2);
	}

	#[test]
	fn extract_tasks_rejects_empty_text() {
		let content = "- [ ] \n- [x]    \n- [ ] real task\n";
		let tasks = extract_tasks(content);
		assert_eq!(tasks.len(), 1);
		assert_eq!(tasks[0].text, "real task");
		assert_eq!(tasks[0].line_number, 3);
	}

	// --- extract_tasks: code blocks ------------------------------------------------

	#[test]
	fn extract_tasks_skips_inside_backtick_fenced_block() {
		let content = "- [ ] outside\n```\n- [ ] inside fence\n```\n- [ ] after\n";
		let tasks = extract_tasks(content);
		assert_eq!(tasks.len(), 2);
		assert_eq!(tasks[0].text, "outside");
		assert_eq!(tasks[1].text, "after");
	}

	#[test]
	fn extract_tasks_skips_inside_tilde_fenced_block() {
		let content = "- [ ] outside\n~~~\n- [ ] inside\n~~~\n- [ ] after\n";
		let tasks = extract_tasks(content);
		assert_eq!(tasks.len(), 2);
	}

	#[test]
	fn extract_tasks_mismatched_fence_markers_do_not_close() {
		let content = "```\n- [ ] still inside\n~~~\n- [ ] still inside too\n```\n- [ ] after\n";
		let tasks = extract_tasks(content);
		assert_eq!(tasks.len(), 1);
		assert_eq!(tasks[0].text, "after");
	}

	#[test]
	fn extract_tasks_line_numbers_are_one_based() {
		let content = "header\n\n- [ ] task at line 3\n";
		let tasks = extract_tasks(content);
		assert_eq!(tasks.len(), 1);
		assert_eq!(tasks[0].line_number, 3);
	}

	// --- extract_tasks_from_section ------------------------------------------------

	#[test]
	fn extract_tasks_from_section_falls_through_when_tag_empty() {
		let content = "- [ ] one\n- [ ] two\n";
		let tasks = extract_tasks_from_section(content, "");
		assert_eq!(tasks.len(), 2);
	}

	#[test]
	fn extract_tasks_from_section_filters_to_matching_heading_only() {
		let content = "## Random\n- [ ] outside\n## To-list #to-list\n- [ ] inside\n- [ ] inside2\n## Other\n- [ ] outside2\n";
		let tasks = extract_tasks_from_section(content, "#to-list");
		assert_eq!(tasks.len(), 2);
		assert_eq!(tasks[0].text, "inside");
		assert_eq!(tasks[1].text, "inside2");
	}

	#[test]
	fn extract_tasks_from_section_handles_nested_headings() {
		let content = "## Section #to-list\n- [ ] level2\n### Sub\n- [ ] level3\n## Other\n- [ ] outside\n";
		let tasks = extract_tasks_from_section(content, "#to-list");
		assert_eq!(tasks.len(), 2);
		assert_eq!(tasks[0].text, "level2");
		assert_eq!(tasks[1].text, "level3");
	}

	#[test]
	fn extract_tasks_from_section_adds_hash_when_missing() {
		let content = "## Inbox #to-list\n- [ ] x\n";
		let with_hash = extract_tasks_from_section(content, "#to-list");
		let without_hash = extract_tasks_from_section(content, "to-list");
		assert_eq!(with_hash.len(), 1);
		assert_eq!(without_hash.len(), 1);
	}

	#[test]
	fn extract_tasks_from_section_ignores_heading_lines_inside_code_block() {
		let content = "```\n## Fake heading #to-list\n- [ ] inside fence\n```\n## Real #to-list\n- [ ] real task\n";
		let tasks = extract_tasks_from_section(content, "#to-list");
		assert_eq!(tasks.len(), 1);
		assert_eq!(tasks[0].text, "real task");
	}

	// --- parse_task_metadata: dates ------------------------------------------------

	#[test]
	fn parse_task_metadata_each_date_emoji() {
		let m = parse_task_metadata("buy milk \u{1F4C5} 2026-02-20");
		assert_eq!(m.due_date.as_deref(), Some("2026-02-20"));

		let m = parse_task_metadata("read book \u{23F3} 2026-02-21");
		assert_eq!(m.scheduled_date.as_deref(), Some("2026-02-21"));

		let m = parse_task_metadata("trip \u{1F6EB} 2026-03-01");
		assert_eq!(m.start_date.as_deref(), Some("2026-03-01"));

		let m = parse_task_metadata("seed \u{2795} 2026-01-01");
		assert_eq!(m.created_date.as_deref(), Some("2026-01-01"));

		let m = parse_task_metadata("finished \u{2705} 2026-04-01");
		assert_eq!(m.done_date.as_deref(), Some("2026-04-01"));

		let m = parse_task_metadata("scrapped \u{274C} 2026-04-02");
		assert_eq!(m.cancelled_date.as_deref(), Some("2026-04-02"));
	}

	#[test]
	fn parse_task_metadata_strips_signifiers_from_description() {
		let m = parse_task_metadata("Buy milk \u{1F4C5} 2026-02-20");
		assert_eq!(m.description, "Buy milk");
	}

	#[test]
	fn parse_task_metadata_handles_optional_variation_selector() {
		let m = parse_task_metadata("Buy milk \u{1F4C5}\u{FE0F} 2026-02-20");
		assert_eq!(m.due_date.as_deref(), Some("2026-02-20"));
	}

	// --- parse_task_metadata: priorities -------------------------------------------

	#[test]
	fn parse_task_metadata_priority_first_match_wins() {
		let m = parse_task_metadata("important \u{1F53A} \u{23EB}");
		assert_eq!(m.priority, Some(TaskPriority::Highest));
	}

	#[test]
	fn parse_task_metadata_each_priority_emoji() {
		for (raw, expected) in [
			("\u{1F53A}", TaskPriority::Highest),
			("\u{23EB}", TaskPriority::High),
			("\u{1F53C}", TaskPriority::Medium),
			("\u{1F53D}", TaskPriority::Low),
			("\u{23EC}", TaskPriority::Lowest),
		] {
			let m = parse_task_metadata(&format!("task {}", raw));
			assert_eq!(m.priority, Some(expected), "input: {}", raw);
		}
	}

	// --- parse_task_metadata: recurrence -------------------------------------------

	#[test]
	fn parse_task_metadata_recurrence_simple() {
		let m = parse_task_metadata("water plants \u{1F501} every week");
		let rec = m.recurrence.expect("recurrence missing");
		assert_eq!(rec.text, "every week");
	}

	#[test]
	fn parse_task_metadata_recurrence_stops_at_next_signifier() {
		let m = parse_task_metadata("task \u{1F501} every week \u{1F4C5} 2026-02-20");
		let rec = m.recurrence.expect("recurrence missing");
		assert_eq!(rec.text, "every week");
		assert_eq!(m.due_date.as_deref(), Some("2026-02-20"));
	}

	#[test]
	fn parse_task_metadata_recurrence_stops_at_hash_tag() {
		let m = parse_task_metadata("task \u{1F501} every week #project");
		let rec = m.recurrence.expect("recurrence missing");
		assert_eq!(rec.text, "every week");
		assert_eq!(m.tags, vec!["project".to_string()]);
	}

	// --- parse_task_metadata: id / dependsOn / onCompletion ------------------------

	#[test]
	fn parse_task_metadata_id_signifier() {
		let m = parse_task_metadata("task \u{1F194} abc123");
		assert_eq!(m.id.as_deref(), Some("abc123"));
	}

	#[test]
	fn parse_task_metadata_depends_on_csv_no_spaces() {
		let m = parse_task_metadata("task \u{26D4} id1,id2,id3");
		assert_eq!(
			m.depends_on,
			Some(vec![
				"id1".to_string(),
				"id2".to_string(),
				"id3".to_string()
			])
		);
	}

	#[test]
	fn parse_task_metadata_depends_on_single_id() {
		let m = parse_task_metadata("blocked \u{26D4} abc123");
		assert_eq!(m.depends_on, Some(vec!["abc123".to_string()]));
	}

	#[test]
	fn parse_task_metadata_on_completion_signifier() {
		let m = parse_task_metadata("task \u{1F3C1} delete");
		assert_eq!(m.on_completion.as_deref(), Some("delete"));
	}

	// --- parse_task_metadata: tags -------------------------------------------------

	#[test]
	fn parse_task_metadata_extracts_tags_with_hyphens() {
		let m = parse_task_metadata("task #work #my-project");
		assert_eq!(m.tags, vec!["work".to_string(), "my-project".to_string()]);
	}

	#[test]
	fn parse_task_metadata_tags_excluded_from_description() {
		let m = parse_task_metadata("Buy milk #grocery #urgent");
		assert_eq!(m.description, "Buy milk");
		assert_eq!(m.tags, vec!["grocery".to_string(), "urgent".to_string()]);
	}

	// --- parse_task_metadata: description cleanup ----------------------------------

	#[test]
	fn parse_task_metadata_collapses_multi_spaces() {
		let m = parse_task_metadata("Buy   milk    today");
		assert_eq!(m.description, "Buy milk today");
	}

	#[test]
	fn parse_task_metadata_strips_all_signifiers_combined() {
		let m = parse_task_metadata(
			"Buy milk \u{1F4C5} 2026-02-20 \u{1F53A} \u{1F501} every week #grocery",
		);
		assert_eq!(m.description, "Buy milk");
		assert_eq!(m.due_date.as_deref(), Some("2026-02-20"));
		assert_eq!(m.priority, Some(TaskPriority::Highest));
		assert_eq!(m.recurrence.unwrap().text, "every week");
		assert_eq!(m.tags, vec!["grocery".to_string()]);
	}

	// --- toggle_task_in_content ----------------------------------------------------

	#[test]
	fn toggle_task_in_content_unchecked_to_checked() {
		let content = "- [ ] task";
		let result = toggle_task_in_content(content, 1);
		assert_eq!(result, "- [x] task");
	}

	#[test]
	fn toggle_task_in_content_checked_lowercase_to_unchecked() {
		let content = "- [x] task";
		let result = toggle_task_in_content(content, 1);
		assert_eq!(result, "- [ ] task");
	}

	#[test]
	fn toggle_task_in_content_checked_uppercase_to_unchecked() {
		let content = "- [X] task";
		let result = toggle_task_in_content(content, 1);
		assert_eq!(result, "- [ ] task");
	}

	#[test]
	fn toggle_task_in_content_in_progress_to_unchecked() {
		let content = "- [/] task";
		let result = toggle_task_in_content(content, 1);
		assert_eq!(result, "- [ ] task");
	}

	#[test]
	fn toggle_task_in_content_cancelled_to_unchecked() {
		let content = "- [-] task";
		let result = toggle_task_in_content(content, 1);
		assert_eq!(result, "- [ ] task");
	}

	#[test]
	fn toggle_task_in_content_line_zero_returns_unchanged() {
		let content = "- [ ] task";
		assert_eq!(toggle_task_in_content(content, 0), content);
	}

	#[test]
	fn toggle_task_in_content_line_out_of_bounds_returns_unchanged() {
		let content = "- [ ] task\n";
		assert_eq!(toggle_task_in_content(content, 100), content);
	}

	#[test]
	fn toggle_task_in_content_no_checkbox_returns_unchanged() {
		let content = "just a paragraph";
		assert_eq!(toggle_task_in_content(content, 1), content);
	}

	#[test]
	fn toggle_task_in_content_only_first_match_on_line() {
		let content = "- [ ] foo [ ] bar";
		assert_eq!(toggle_task_in_content(content, 1), "- [x] foo [ ] bar");
	}

	#[test]
	fn toggle_task_in_content_preserves_other_lines() {
		let content = "line one\n- [ ] task on line two\nline three";
		let result = toggle_task_in_content(content, 2);
		assert_eq!(result, "line one\n- [x] task on line two\nline three");
	}

	#[test]
	fn parse_frontmatter_raw_yaml_extracts_top_level_keys() {
		let content = "_icon: rocket\n_color: red\n_order: 5\n";
		let fm = parse_frontmatter_raw_yaml(content);
		assert_eq!(fm.get("_icon").and_then(|v| v.as_str()), Some("rocket"));
		assert_eq!(fm.get("_color").and_then(|v| v.as_str()), Some("red"));
		assert_eq!(fm.get("_order").and_then(|v| v.as_i64()), Some(5));
	}

	#[test]
	fn parse_frontmatter_raw_yaml_empty_content() {
		let fm = parse_frontmatter_raw_yaml("");
		assert!(fm.is_empty());
	}

	#[test]
	fn parse_frontmatter_raw_yaml_ignores_nested_keys() {
		let content = "views:\n  - type: table\n    name: All\n_icon: star\n";
		let fm = parse_frontmatter_raw_yaml(content);
		assert_eq!(fm.get("_icon").and_then(|v| v.as_str()), Some("star"));
	}
}
