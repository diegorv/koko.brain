use serde::Serialize;

/// A single search match with its location and context.
#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SearchMatch {
	pub file_path: String,
	pub file_name: String,
	pub line_number: usize,
	pub line_content: String,
	/// Character offset (not byte offset) of the match start within `line_content`.
	pub match_start: usize,
	/// Character offset (not byte offset) of the match end within `line_content`.
	pub match_end: usize,
}

/// Builds a per-byte mapping from `content_lower` byte offsets to `content` byte offsets.
/// This is needed because `to_lowercase()` can change byte lengths for certain characters
/// (e.g. Turkish İ → i̇), so byte offsets in the lowered string don't map 1:1 to the original.
pub fn build_lower_to_orig_map(content: &str) -> (String, Vec<usize>) {
	let mut content_lower = String::with_capacity(content.len());
	let mut lower_to_orig: Vec<usize> = Vec::with_capacity(content.len() + 1);

	for (orig_byte, ch) in content.char_indices() {
		for lc in ch.to_lowercase() {
			let start = content_lower.len();
			content_lower.push(lc);
			// Each new byte in content_lower maps back to this original char's byte offset
			for _ in start..content_lower.len() {
				lower_to_orig.push(orig_byte);
			}
		}
	}
	// Sentinel: maps end-of-lowered to end-of-original
	lower_to_orig.push(content.len());

	(content_lower, lower_to_orig)
}

/// Searches for case-insensitive matches of `query_lower` in `content` and appends
/// `SearchMatch` entries to `results`. Uses `build_lower_to_orig_map` to correctly
/// handle Unicode case folding.
pub fn search_in_content(
	file_path: &str,
	file_name: &str,
	content: &str,
	query_lower: &str,
	results: &mut Vec<SearchMatch>,
) {
	if query_lower.is_empty() {
		return;
	}

	let (content_lower, lower_to_orig) = build_lower_to_orig_map(content);
	let query_lower_len = query_lower.len();
	let mut search_from: usize = 0;

	while search_from < content_lower.len() {
		if let Some(idx) = content_lower[search_from..].find(query_lower) {
			let match_lower_start = search_from + idx;
			let match_lower_end = match_lower_start + query_lower_len;

			// Map back to original content byte offsets
			let orig_start = lower_to_orig[match_lower_start];
			let orig_end = if match_lower_end < lower_to_orig.len() {
				lower_to_orig[match_lower_end]
			} else {
				content.len()
			};

			// Line info from original content
			let line_number = content[..orig_start].matches('\n').count() + 1;
			let line_start = content[..orig_start].rfind('\n').map_or(0, |i| i + 1);
			let line_end = content[orig_start..]
				.find('\n')
				.map_or(content.len(), |i| orig_start + i);
			let line_content = content[line_start..line_end].to_string();

			// Character-based offsets for the JavaScript frontend (not byte offsets)
			let match_start_chars = content[line_start..orig_start].chars().count();
			let match_end_chars =
				match_start_chars + content[orig_start..orig_end].chars().count();

			results.push(SearchMatch {
				file_path: file_path.to_string(),
				file_name: file_name.to_string(),
				line_number,
				line_content,
				match_start: match_start_chars,
				match_end: match_end_chars,
			});

			search_from = match_lower_end;
		} else {
			break;
		}
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	// --- build_lower_to_orig_map ---

	#[test]
	fn lower_map_ascii_preserves_length() {
		let (lowered, map) = build_lower_to_orig_map("Hello World");
		assert_eq!(lowered, "hello world");
		// For ASCII, map should be identity (each byte maps to same offset)
		assert_eq!(map.len(), lowered.len() + 1); // +1 for sentinel
		for i in 0..lowered.len() {
			assert_eq!(map[i], i);
		}
	}

	#[test]
	fn lower_map_unicode_multibyte() {
		let content = "Ação";
		let (lowered, map) = build_lower_to_orig_map(content);
		assert_eq!(lowered, "ação");
		assert_eq!(*map.last().unwrap(), content.len()); // sentinel
	}

	#[test]
	fn lower_map_empty_string() {
		let (lowered, map) = build_lower_to_orig_map("");
		assert_eq!(lowered, "");
		assert_eq!(map.len(), 1); // just sentinel
		assert_eq!(map[0], 0);
	}

	#[test]
	fn lower_map_mixed_case() {
		let (lowered, _) = build_lower_to_orig_map("FooBAR");
		assert_eq!(lowered, "foobar");
	}

	// --- search_in_content ---

	#[test]
	fn search_basic_match() {
		let mut results = Vec::new();
		search_in_content("test.md", "test", "hello world", "world", &mut results);
		assert_eq!(results.len(), 1);
		assert_eq!(results[0].line_number, 1);
		assert_eq!(results[0].match_start, 6);
		assert_eq!(results[0].match_end, 11);
		assert_eq!(results[0].line_content, "hello world");
	}

	#[test]
	fn search_case_insensitive() {
		let mut results = Vec::new();
		search_in_content("test.md", "test", "Hello WORLD", "hello", &mut results);
		assert_eq!(results.len(), 1);
		assert_eq!(results[0].match_start, 0);
		assert_eq!(results[0].match_end, 5);
	}

	#[test]
	fn search_no_match() {
		let mut results = Vec::new();
		search_in_content("test.md", "test", "hello world", "xyz", &mut results);
		assert!(results.is_empty());
	}

	#[test]
	fn search_multiple_matches_same_line() {
		let mut results = Vec::new();
		search_in_content("test.md", "test", "abcabc", "abc", &mut results);
		assert_eq!(results.len(), 2);
		assert_eq!(results[0].match_start, 0);
		assert_eq!(results[0].match_end, 3);
		assert_eq!(results[1].match_start, 3);
		assert_eq!(results[1].match_end, 6);
	}

	#[test]
	fn search_multiple_lines() {
		let content = "line one\nline two\nline three";
		let mut results = Vec::new();
		search_in_content("test.md", "test", content, "line", &mut results);
		assert_eq!(results.len(), 3);
		assert_eq!(results[0].line_number, 1);
		assert_eq!(results[1].line_number, 2);
		assert_eq!(results[2].line_number, 3);
	}

	#[test]
	fn search_correct_line_content() {
		let content = "first line\nsecond match line\nthird line";
		let mut results = Vec::new();
		search_in_content("test.md", "test", content, "match", &mut results);
		assert_eq!(results.len(), 1);
		assert_eq!(results[0].line_content, "second match line");
		assert_eq!(results[0].line_number, 2);
	}

	#[test]
	fn search_unicode_content() {
		let content = "Ação rápida";
		let mut results = Vec::new();
		search_in_content("test.md", "test", content, "ação", &mut results);
		assert_eq!(results.len(), 1);
		assert_eq!(results[0].match_start, 0);
		assert_eq!(results[0].match_end, 4); // 4 chars: A, ç, ã, o
	}

	#[test]
	fn search_emoji_positions_are_char_based() {
		let content = "🎉 hello 🎉";
		let mut results = Vec::new();
		search_in_content("test.md", "test", content, "hello", &mut results);
		assert_eq!(results.len(), 1);
		// 🎉 = 1 char, space = 1 char → match_start = 2
		assert_eq!(results[0].match_start, 2);
		assert_eq!(results[0].match_end, 7);
	}

	#[test]
	fn search_empty_content() {
		let mut results = Vec::new();
		search_in_content("test.md", "test", "", "hello", &mut results);
		assert!(results.is_empty());
	}

	#[test]
	fn search_empty_query_returns_no_results() {
		let mut results = Vec::new();
		search_in_content("test.md", "test", "hello world", "", &mut results);
		assert!(results.is_empty(), "empty query should return no results");
	}

	#[test]
	fn search_preserves_file_path_and_name() {
		let mut results = Vec::new();
		search_in_content("/vault/notes/test.md", "test", "hello world", "hello", &mut results);
		assert_eq!(results[0].file_path, "/vault/notes/test.md");
		assert_eq!(results[0].file_name, "test");
	}

	#[test]
	fn search_match_at_line_end() {
		let content = "start end";
		let mut results = Vec::new();
		search_in_content("test.md", "test", content, "end", &mut results);
		assert_eq!(results.len(), 1);
		assert_eq!(results[0].match_start, 6);
		assert_eq!(results[0].match_end, 9);
	}

	#[test]
	fn search_match_at_line_start() {
		let content = "start of line";
		let mut results = Vec::new();
		search_in_content("test.md", "test", content, "start", &mut results);
		assert_eq!(results.len(), 1);
		assert_eq!(results[0].match_start, 0);
		assert_eq!(results[0].match_end, 5);
	}
}
