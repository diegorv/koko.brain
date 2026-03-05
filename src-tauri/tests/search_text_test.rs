use kokobrain_lib::search::text_search::{build_lower_to_orig_map, search_in_content};

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
