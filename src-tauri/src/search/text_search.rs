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
