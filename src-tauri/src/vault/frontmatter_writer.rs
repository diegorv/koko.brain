//! Surgical frontmatter mutations that preserve surrounding formatting.
//!
//! Phase 8.4 of the performance refactor (ADR 0025). The write commands
//! (`update_frontmatter`, `delete_frontmatter_key`, `rename_frontmatter_key`)
//! need to mutate a single YAML key without round-tripping the whole block
//! through a serialiser — full re-serialisation would lose comments,
//! preserve order only coincidentally, and reflow quoted strings.
//!
//! Strategy: operate on the raw frontmatter text with line-oriented find-
//! and-replace. The scope is intentionally narrow:
//!
//!   * Scalars only — `String`, `Number`, `Bool`, `Null`. Inline arrays
//!     and objects are rejected with an error so callers know the update
//!     hit a value shape the surgical writer doesn't support. The UI
//!     surfaces that don't need array/object edits (Properties Panel
//!     scalar inputs, meta-bind select widgets) are covered; tag-style
//!     arrays flow through a different Tags Panel path.
//!   * Single-line values — a `key:` line with an empty value and
//!     indented continuation is a block array or nested map; updates
//!     to these keys are rejected. Deletes DO remove the full block.
//!
//! Failure mode: every function returns `Result<String, String>`. A
//! caller that can't mutate should bubble the error up to the user
//! rather than writing partial content.

use serde_json::Value;

/// YAML-single-line serialisation of a scalar. Returns `None` when the value
/// cannot be represented as a single-line scalar (arrays, objects).
pub fn serialise_scalar(value: &Value) -> Option<String> {
	match value {
		Value::String(s) => Some(quote_if_needed(s)),
		Value::Number(n) => Some(n.to_string()),
		Value::Bool(b) => Some(b.to_string()),
		Value::Null => Some("null".to_string()),
		Value::Array(_) | Value::Object(_) => None,
	}
}

/// Quotes a string value with double quotes if it contains characters that
/// would confuse the YAML parser unquoted (colons, `#`, leading/trailing
/// whitespace, `true` / `false` / `null` / number-looking strings). Pure
/// ASCII alphabetic / alphanumeric strings pass through unquoted.
fn quote_if_needed(s: &str) -> String {
	if s.is_empty() {
		return "\"\"".to_string();
	}
	let needs_quote = s != s.trim()
		|| matches!(s, "true" | "false" | "null" | "True" | "False" | "Null" | "TRUE" | "FALSE" | "NULL" | "~")
		|| s.parse::<f64>().is_ok()
		|| s.contains(':')
		|| s.contains('#')
		|| s.contains('"')
		|| s.contains('\'')
		|| s.contains('\n')
		|| s.starts_with(|c: char| c == '-' || c == '[' || c == '{' || c == '|' || c == '>' || c == '&' || c == '*' || c == '!' || c == '%' || c == '@' || c == '`')
		|| s.chars().next().map(|c| c.is_ascii_whitespace()).unwrap_or(false);
	if needs_quote {
		format!("\"{}\"", escape_double_quoted(s))
	} else {
		s.to_string()
	}
}

fn escape_double_quoted(s: &str) -> String {
	let mut out = String::with_capacity(s.len());
	for c in s.chars() {
		match c {
			'\\' => out.push_str("\\\\"),
			'"' => out.push_str("\\\""),
			'\n' => out.push_str("\\n"),
			'\t' => out.push_str("\\t"),
			'\r' => out.push_str("\\r"),
			_ => out.push(c),
		}
	}
	out
}

/// Represents a located top-level key line inside a frontmatter block.
#[derive(Debug, Clone, Copy)]
struct KeyLocation {
	/// Byte offset where the key line starts in the original content.
	line_start: usize,
	/// Byte offset where the line ends (exclusive of newline).
	line_end: usize,
	/// Byte offset where the trailing newline (if any) ends.
	next_line_start: usize,
	/// True if the key's value extends onto indented lines below (block
	/// scalar, block array, or nested map). In that case `block_end` points
	/// past the last continuation line; otherwise it equals `next_line_start`.
	is_block: bool,
	/// Byte offset past the last line that belongs to this key's value.
	block_end: usize,
}

/// Finds the closed frontmatter block: `---\n ... \n---\n` at the top of
/// the content. Returns `(body_start, body_end, block_close_line_start,
/// block_end)` where:
///   * `body_start` — offset just after the opening `---\n` / `---\r\n`
///   * `body_end`   — offset at the start of the closing `---`
///   * `block_close_line_start` — same as body_end
///   * `block_end`  — offset past the closing `---\n` (used for insertions
///     of new keys)
///
/// Returns `None` when there's no frontmatter block (no leading `---\n` OR
/// no matching closing `---`).
fn find_frontmatter_range(content: &str) -> Option<(usize, usize, usize)> {
	// Must start with "---" followed by \n or \r\n
	let bytes = content.as_bytes();
	if bytes.len() < 4 {
		return None;
	}
	if &bytes[..3] != b"---" {
		return None;
	}
	let body_start = match bytes.get(3) {
		Some(b'\n') => 4,
		Some(b'\r') if bytes.get(4) == Some(&b'\n') => 5,
		_ => return None,
	};

	// Scan for a line that is exactly "---" (optionally terminated by \r\n or \n).
	let mut i = body_start;
	while i < bytes.len() {
		let line_start = i;
		while i < bytes.len() && bytes[i] != b'\n' {
			i += 1;
		}
		let line_end = i;
		let line = &content[line_start..line_end];
		let trimmed = line.strip_suffix('\r').unwrap_or(line);
		if trimmed == "---" {
			let block_end = if i < bytes.len() { i + 1 } else { i };
			return Some((body_start, line_start, block_end));
		}
		if i < bytes.len() {
			i += 1;
		}
	}
	None
}

/// Locates a top-level key `key` inside the frontmatter range `[fm_body_start,
/// fm_body_end)`. Returns `None` when the key is not present. Skips lines
/// inside multi-line quoted values (simple tracking of unclosed `"` / `'`
/// on top-level keys' value lines).
fn find_key_in_range(
	content: &str,
	key: &str,
	fm_body_start: usize,
	fm_body_end: usize,
) -> Option<KeyLocation> {
	let bytes = content.as_bytes();
	let mut i = fm_body_start;
	let mut in_multiline_quote = false;
	let mut quote_char = 0u8;

	while i < fm_body_end {
		let line_start = i;
		while i < fm_body_end && bytes[i] != b'\n' {
			i += 1;
		}
		let line_end = i;
		let next_line_start = if i < fm_body_end { i + 1 } else { i };
		let line = &content[line_start..line_end];
		let line_no_cr = line.strip_suffix('\r').unwrap_or(line);

		if in_multiline_quote {
			if line_no_cr.trim_end().ends_with(quote_char as char) {
				in_multiline_quote = false;
			}
			i = next_line_start;
			continue;
		}

		// Check top-level keys only (no leading whitespace).
		if !line.starts_with(|c: char| c.is_whitespace()) {
			if let Some(kv_split) = find_key_value_colon(line_no_cr) {
				let (line_key, value_after_colon) = line_no_cr.split_at(kv_split);
				let line_key = line_key.trim();
				if line_key == key {
					// Measure the block extent — any immediately following lines
					// that start with whitespace (indented continuation or blank)
					// belong to this key's value.
					let value_trimmed = value_after_colon[1..].trim(); // skip ":"
					let mut is_block = false;
					let mut block_end = next_line_start;
					if value_trimmed.is_empty() {
						// Empty value → possibly a block. Scan continuation lines.
						let mut j = next_line_start;
						while j < fm_body_end {
							let cont_start = j;
							while j < fm_body_end && bytes[j] != b'\n' {
								j += 1;
							}
							let cont_end = j;
							let cont_line = &content[cont_start..cont_end];
							let cont_no_cr = cont_line.strip_suffix('\r').unwrap_or(cont_line);
							if cont_no_cr.is_empty() {
								j = if j < fm_body_end { j + 1 } else { j };
								is_block = true;
								block_end = j;
								continue;
							}
							if cont_line.starts_with(|c: char| c.is_whitespace()) {
								j = if j < fm_body_end { j + 1 } else { j };
								is_block = true;
								block_end = j;
								continue;
							}
							break;
						}
					}
					return Some(KeyLocation {
						line_start,
						line_end,
						next_line_start,
						is_block,
						block_end,
					});
				}

				// Track unclosed quotes on non-target lines so `key:` inside a
				// multi-line quoted value isn't falsely matched next iteration.
				let value = value_after_colon[1..].trim();
				if let Some(first) = value.chars().next() {
					if first == '"' || first == '\'' {
						let closes_on_same_line = value.len() > 1 && value.ends_with(first);
						if !closes_on_same_line {
							in_multiline_quote = true;
							quote_char = first as u8;
						}
					}
				}
			}
		}

		i = next_line_start;
	}
	None
}

/// Finds the byte offset of the key/value colon on a line, skipping colons
/// inside quoted strings. Returns `None` when the line is not a key line.
fn find_key_value_colon(line: &str) -> Option<usize> {
	let mut in_quote: Option<char> = None;
	for (i, c) in line.char_indices() {
		match (in_quote, c) {
			(None, '"' | '\'') => in_quote = Some(c),
			(Some(q), c) if c == q => in_quote = None,
			(None, ':') => return Some(i),
			_ => {}
		}
	}
	None
}

/// Updates or inserts a top-level scalar `key` with `value` in the
/// frontmatter block of `content`. Returns the new content.
///
/// Errors:
///   * `"unsupported value type"` — value is an array or object.
///   * `"cannot update block-valued key"` — key exists but its current
///     value spans multiple lines (block array / nested map / folded
///     scalar). The caller should either delete + re-insert or use a
///     different editing UI.
pub fn update_frontmatter(content: &str, key: &str, value: &Value) -> Result<String, String> {
	if key.is_empty() {
		return Err("key must not be empty".to_string());
	}
	let scalar = serialise_scalar(value).ok_or("unsupported value type")?;
	let new_line = format!("{}: {}", key, scalar);

	match find_frontmatter_range(content) {
		Some((fm_body_start, fm_body_end, _block_end)) => {
			match find_key_in_range(content, key, fm_body_start, fm_body_end) {
				Some(loc) if loc.is_block => {
					Err("cannot update block-valued key".to_string())
				}
				Some(loc) => {
					let mut out = String::with_capacity(content.len());
					out.push_str(&content[..loc.line_start]);
					out.push_str(&new_line);
					out.push_str(&content[loc.line_end..]);
					Ok(out)
				}
				None => {
					// Insert before the closing `---`. Append a newline to the
					// new line so it sits on its own row.
					let mut out = String::with_capacity(content.len() + new_line.len() + 1);
					out.push_str(&content[..fm_body_end]);
					out.push_str(&new_line);
					out.push('\n');
					out.push_str(&content[fm_body_end..]);
					Ok(out)
				}
			}
		}
		None => {
			// No frontmatter — prepend a fresh block. Preserve leading newlines
			// in `content` by putting the new block at the very top.
			Ok(format!("---\n{}\n---\n{}", new_line, content))
		}
	}
}

/// Deletes a top-level `key` from the frontmatter block. Removes the key
/// line plus all indented continuation lines (so block-valued keys are
/// removed cleanly). A no-op if the key is absent.
///
/// Errors:
///   * no-op cases return the content unchanged, no error.
pub fn delete_frontmatter_key(content: &str, key: &str) -> Result<String, String> {
	if key.is_empty() {
		return Err("key must not be empty".to_string());
	}
	let (fm_body_start, fm_body_end, _) = match find_frontmatter_range(content) {
		Some(r) => r,
		None => return Ok(content.to_string()),
	};
	let loc = match find_key_in_range(content, key, fm_body_start, fm_body_end) {
		Some(l) => l,
		None => return Ok(content.to_string()),
	};

	let remove_end = if loc.is_block { loc.block_end } else { loc.next_line_start };
	let mut out = String::with_capacity(content.len());
	out.push_str(&content[..loc.line_start]);
	out.push_str(&content[remove_end..]);
	Ok(out)
}

/// Renames a top-level `old_key` to `new_key`, preserving the value. A
/// no-op if `old_key` is absent.
///
/// Errors:
///   * `"new key must not be empty"`
///   * `"keys must differ"` when old_key == new_key
///   * If `new_key` already exists, the rename is refused to avoid
///     collisions (`"new key already present"`).
pub fn rename_frontmatter_key(
	content: &str,
	old_key: &str,
	new_key: &str,
) -> Result<String, String> {
	if new_key.is_empty() {
		return Err("new key must not be empty".to_string());
	}
	if old_key == new_key {
		return Err("keys must differ".to_string());
	}
	let (fm_body_start, fm_body_end, _) = match find_frontmatter_range(content) {
		Some(r) => r,
		None => return Ok(content.to_string()),
	};
	if find_key_in_range(content, new_key, fm_body_start, fm_body_end).is_some() {
		return Err("new key already present".to_string());
	}
	let loc = match find_key_in_range(content, old_key, fm_body_start, fm_body_end) {
		Some(l) => l,
		None => return Ok(content.to_string()),
	};

	// Replace only the `old_key` substring at the start of the line; preserve
	// any surrounding whitespace or continuation.
	let line = &content[loc.line_start..loc.line_end];
	let rest_after_old = &line[old_key.len()..];
	let new_line = format!("{}{}", new_key, rest_after_old);
	let mut out = String::with_capacity(content.len());
	out.push_str(&content[..loc.line_start]);
	out.push_str(&new_line);
	out.push_str(&content[loc.line_end..]);
	Ok(out)
}

#[cfg(test)]
mod tests {
	use super::*;
	use serde_json::json;

	// --- serialise_scalar ---

	#[test]
	fn serialise_scalar_primitives() {
		assert_eq!(serialise_scalar(&json!("done")).as_deref(), Some("done"));
		assert_eq!(serialise_scalar(&json!(3)).as_deref(), Some("3"));
		assert_eq!(serialise_scalar(&json!(3.14)).as_deref(), Some("3.14"));
		assert_eq!(serialise_scalar(&json!(true)).as_deref(), Some("true"));
		assert_eq!(serialise_scalar(&json!(null)).as_deref(), Some("null"));
	}

	#[test]
	fn serialise_scalar_quotes_ambiguous_strings() {
		// Would-be boolean / null / numbers as strings need quoting.
		assert_eq!(serialise_scalar(&json!("true")).as_deref(), Some("\"true\""));
		assert_eq!(serialise_scalar(&json!("null")).as_deref(), Some("\"null\""));
		assert_eq!(serialise_scalar(&json!("3")).as_deref(), Some("\"3\""));
		// Strings with colons/hashes need quoting.
		assert_eq!(serialise_scalar(&json!("alpha: beta")).as_deref(), Some("\"alpha: beta\""));
		assert_eq!(serialise_scalar(&json!("# not a comment")).as_deref(), Some("\"# not a comment\""));
		// Leading/trailing space needs quoting.
		assert_eq!(serialise_scalar(&json!(" spaced")).as_deref(), Some("\" spaced\""));
		// Empty string quoted.
		assert_eq!(serialise_scalar(&json!("")).as_deref(), Some("\"\""));
	}

	#[test]
	fn serialise_scalar_escapes_special_chars() {
		assert_eq!(
			serialise_scalar(&json!("line1\nline2")).as_deref(),
			Some("\"line1\\nline2\""),
		);
		assert_eq!(
			serialise_scalar(&json!("has \"quotes\"")).as_deref(),
			Some("\"has \\\"quotes\\\"\""),
		);
	}

	#[test]
	fn serialise_scalar_rejects_composite() {
		assert_eq!(serialise_scalar(&json!([1, 2])), None);
		assert_eq!(serialise_scalar(&json!({"a": 1})), None);
	}

	// --- update_frontmatter ---

	#[test]
	fn update_frontmatter_replaces_existing_key() {
		let content = "---\ntitle: old\nstatus: active\n---\nbody";
		let result = update_frontmatter(content, "status", &json!("done")).unwrap();
		assert_eq!(result, "---\ntitle: old\nstatus: done\n---\nbody");
	}

	#[test]
	fn update_frontmatter_inserts_new_key_before_close() {
		let content = "---\ntitle: x\n---\nbody";
		let result = update_frontmatter(content, "status", &json!("done")).unwrap();
		assert_eq!(result, "---\ntitle: x\nstatus: done\n---\nbody");
	}

	#[test]
	fn update_frontmatter_creates_block_when_absent() {
		let content = "no frontmatter here";
		let result = update_frontmatter(content, "title", &json!("new")).unwrap();
		assert_eq!(result, "---\ntitle: new\n---\nno frontmatter here");
	}

	#[test]
	fn update_frontmatter_preserves_formatting_of_other_lines() {
		let content = "---\n# a comment\ntitle: x\nstatus: old\n# another\n---\nbody";
		let result = update_frontmatter(content, "status", &json!("new")).unwrap();
		assert_eq!(result, "---\n# a comment\ntitle: x\nstatus: new\n# another\n---\nbody");
	}

	#[test]
	fn update_frontmatter_handles_crlf_line_endings() {
		let content = "---\r\ntitle: x\r\n---\r\nbody";
		let result = update_frontmatter(content, "status", &json!("done")).unwrap();
		// New line uses \n (we don't preserve existing line-ending style on insert — document).
		assert_eq!(result, "---\r\ntitle: x\r\nstatus: done\n---\r\nbody");
	}

	#[test]
	fn update_frontmatter_rejects_block_valued_key() {
		let content = "---\ntags:\n  - alpha\n  - beta\n---\n";
		let err = update_frontmatter(content, "tags", &json!("replaced")).unwrap_err();
		assert_eq!(err, "cannot update block-valued key");
	}

	#[test]
	fn update_frontmatter_rejects_composite_value() {
		let content = "---\ntitle: x\n---\n";
		let err = update_frontmatter(content, "title", &json!(["a", "b"])).unwrap_err();
		assert_eq!(err, "unsupported value type");
	}

	#[test]
	fn update_frontmatter_quotes_ambiguous_string() {
		let content = "---\nkind: x\n---\n";
		let result = update_frontmatter(content, "kind", &json!("true")).unwrap();
		assert_eq!(result, "---\nkind: \"true\"\n---\n");
	}

	#[test]
	fn update_frontmatter_handles_number_and_bool() {
		let content = "---\nprio: 1\ndraft: false\n---\n";
		let r1 = update_frontmatter(content, "prio", &json!(5)).unwrap();
		assert!(r1.contains("prio: 5"));
		let r2 = update_frontmatter(content, "draft", &json!(true)).unwrap();
		assert!(r2.contains("draft: true"));
	}

	#[test]
	fn update_frontmatter_preserves_body() {
		let content = "---\ntitle: x\n---\nBody line 1\n\nBody line 2 with [[links]].";
		let result = update_frontmatter(content, "status", &json!("done")).unwrap();
		assert!(result.ends_with("Body line 1\n\nBody line 2 with [[links]]."));
	}

	#[test]
	fn update_frontmatter_skips_key_inside_multiline_quoted_value() {
		// `description:` opens an unclosed string; a false `status:` inside that
		// string must not be matched.
		let content = "---\ndescription: \"\nnested status: nope\n\"\nstatus: real\n---\nbody";
		let result = update_frontmatter(content, "status", &json!("updated")).unwrap();
		assert!(result.contains("status: updated"));
		assert!(result.contains("nested status: nope")); // the buried false match is untouched
	}

	// --- delete_frontmatter_key ---

	#[test]
	fn delete_frontmatter_removes_scalar_line() {
		let content = "---\ntitle: x\nstatus: done\n---\nbody";
		let result = delete_frontmatter_key(content, "status").unwrap();
		assert_eq!(result, "---\ntitle: x\n---\nbody");
	}

	#[test]
	fn delete_frontmatter_removes_block_array() {
		let content = "---\ntags:\n  - alpha\n  - beta\ntitle: x\n---\nbody";
		let result = delete_frontmatter_key(content, "tags").unwrap();
		assert_eq!(result, "---\ntitle: x\n---\nbody");
	}

	#[test]
	fn delete_frontmatter_missing_key_noop() {
		let content = "---\ntitle: x\n---\nbody";
		let result = delete_frontmatter_key(content, "status").unwrap();
		assert_eq!(result, content);
	}

	#[test]
	fn delete_frontmatter_no_block_noop() {
		let content = "no frontmatter";
		let result = delete_frontmatter_key(content, "anything").unwrap();
		assert_eq!(result, content);
	}

	// --- rename_frontmatter_key ---

	#[test]
	fn rename_frontmatter_renames_scalar() {
		let content = "---\nstatus: done\ntitle: x\n---\nbody";
		let result = rename_frontmatter_key(content, "status", "state").unwrap();
		assert_eq!(result, "---\nstate: done\ntitle: x\n---\nbody");
	}

	#[test]
	fn rename_frontmatter_renames_block() {
		// Block-valued rename just changes the key line; continuation lines
		// are untouched (they're still part of the value).
		let content = "---\ntags:\n  - alpha\ntitle: x\n---\nbody";
		let result = rename_frontmatter_key(content, "tags", "labels").unwrap();
		assert_eq!(result, "---\nlabels:\n  - alpha\ntitle: x\n---\nbody");
	}

	#[test]
	fn rename_frontmatter_rejects_same_key() {
		let content = "---\ntitle: x\n---\n";
		let err = rename_frontmatter_key(content, "title", "title").unwrap_err();
		assert_eq!(err, "keys must differ");
	}

	#[test]
	fn rename_frontmatter_rejects_collision() {
		let content = "---\ntitle: x\nname: y\n---\n";
		let err = rename_frontmatter_key(content, "title", "name").unwrap_err();
		assert_eq!(err, "new key already present");
	}

	#[test]
	fn rename_frontmatter_missing_key_noop() {
		let content = "---\ntitle: x\n---\n";
		let result = rename_frontmatter_key(content, "status", "state").unwrap();
		assert_eq!(result, content);
	}

	#[test]
	fn rename_frontmatter_empty_new_key_rejected() {
		let content = "---\ntitle: x\n---\n";
		let err = rename_frontmatter_key(content, "title", "").unwrap_err();
		assert_eq!(err, "new key must not be empty");
	}
}
