//! Makes text the host did not write safe for one session log line: a
//! browser's log notification, a request path, a login or an error message.
//! One input always yields one line, so a browser cannot forge or split
//! lines of the Mac's log.

/// Longest tag a browser may send.
pub const MAX_TAG_CHARS: usize = 48;

/// What a refused tag is replaced with.
pub const INVALID_TAG: &str = "INVALID-TAG";

/// Appended to text cut at its cap.
pub const TRUNCATED_MARKER: &str = " [truncated]";

/// `tag` when it is 1 to `MAX_TAG_CHARS` ASCII letters, digits or `_.:-`,
/// otherwise `INVALID_TAG`.
pub fn sanitize_tag(tag: &str) -> &str {
	let ok = (1..=MAX_TAG_CHARS).contains(&tag.len())
		&& tag.bytes().all(|b| b.is_ascii_alphanumeric() || matches!(b, b'_' | b'.' | b':' | b'-'));
	if ok {
		tag
	} else {
		INVALID_TAG
	}
}

/// `text` on one line: control characters and Unicode line or paragraph
/// separators are written as escapes (`\n`, `\u{2028}`), then the result is
/// cut at `cap` characters with `TRUNCATED_MARKER`.
pub fn one_line(text: &str, cap: usize) -> String {
	escaped(text, cap, false)
}

/// `text` as a quoted field of a log line: `one_line`, with `"` and `\`
/// also escaped, inside double quotes. A path, login or error message so
/// cannot end its field early and fake the fields after it.
pub fn quoted(text: &str, cap: usize) -> String {
	format!("\"{}\"", escaped(text, cap, true))
}

fn escaped(text: &str, cap: usize, quote: bool) -> String {
	let mut out = String::with_capacity(text.len().min(cap + TRUNCATED_MARKER.len()));
	let mut chars = 0;
	for c in text.chars() {
		let piece: String = if c.is_control() || matches!(c, '\u{2028}' | '\u{2029}') || (quote && matches!(c, '"' | '\\')) {
			c.escape_default().collect()
		} else {
			c.to_string()
		};
		let len = piece.chars().count();
		if chars + len > cap {
			out.push_str(TRUNCATED_MARKER);
			return out;
		}
		chars += len;
		out.push_str(&piece);
	}
	out
}
