use kokobrain_lib::search::fts_logic::{extract_headings, extract_tags, extract_title, sanitize_fts_term};

// --- extract_title ---

#[test]
fn extract_title_strips_md_extension() {
	assert_eq!(extract_title("notes/hello.md"), "hello");
}

#[test]
fn extract_title_strips_markdown_extension() {
	assert_eq!(extract_title("notes/hello.markdown"), "hello");
}

#[test]
fn extract_title_handles_nested_path() {
	assert_eq!(extract_title("a/b/c/deep-note.md"), "deep-note");
}

#[test]
fn extract_title_no_extension() {
	assert_eq!(extract_title("README"), "README");
}

#[test]
fn extract_title_no_directory() {
	assert_eq!(extract_title("standalone.md"), "standalone");
}

// --- extract_headings ---

#[test]
fn extract_headings_finds_all_levels() {
	let content = "# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6\n";
	let result = extract_headings(content);
	assert!(result.contains("# H1"));
	assert!(result.contains("## H2"));
	assert!(result.contains("###### H6"));
}

#[test]
fn extract_headings_ignores_non_heading_hash() {
	let content = "#not-a-heading\n##also-not\nsome #inline text\n";
	let result = extract_headings(content);
	assert!(result.is_empty());
}

#[test]
fn extract_headings_requires_space_after_hashes() {
	let content = "# Valid Heading\n#Invalid\n## Also Valid\n";
	let result = extract_headings(content);
	assert!(result.contains("# Valid Heading"));
	assert!(result.contains("## Also Valid"));
	assert!(!result.contains("#Invalid"));
}

#[test]
fn extract_headings_empty_content() {
	assert!(extract_headings("").is_empty());
}

// --- extract_tags ---

#[test]
fn extract_tags_frontmatter_inline_style() {
	let content = "---\ntags: [rust, tauri]\n---\n# Content\n";
	let result = extract_tags(content);
	assert!(result.contains("rust"));
	assert!(result.contains("tauri"));
}

#[test]
fn extract_tags_frontmatter_list_style() {
	let content = "---\ntags:\n  - alpha\n  - beta\n---\n# Content\n";
	let result = extract_tags(content);
	assert!(result.contains("alpha"));
	assert!(result.contains("beta"));
}

#[test]
fn extract_tags_inline_hashtags() {
	let content = "Some text with #hello and #world tags.\n";
	let result = extract_tags(content);
	assert!(result.contains("hello"));
	assert!(result.contains("world"));
}

#[test]
fn extract_tags_skips_code_blocks() {
	let content = "```\n#not-a-tag\n```\n\nReal #actual-tag here.\n";
	let result = extract_tags(content);
	assert!(!result.contains("not-a-tag"));
	assert!(result.contains("actual-tag"));
}

#[test]
fn extract_tags_skips_inline_code() {
	let content = "Use `#config` for settings. Real #tag here.\n";
	let result = extract_tags(content);
	assert!(!result.contains("config"));
	assert!(result.contains("tag"));
}

#[test]
fn extract_tags_no_duplicates() {
	let content = "#hello #hello #hello\n";
	let result = extract_tags(content);
	// Should only appear once in the space-separated output
	assert_eq!(result.matches("hello").count(), 1);
}

#[test]
fn extract_tags_empty_content() {
	assert!(extract_tags("").is_empty());
}

#[test]
fn extract_tags_mixed_frontmatter_and_inline() {
	let content = "---\ntags: [fm-tag]\n---\nText with #inline-tag here.\n";
	let result = extract_tags(content);
	assert!(result.contains("fm-tag"));
	assert!(result.contains("inline-tag"));
}

// --- sanitize_fts_term ---

#[test]
fn sanitize_removes_quotes() {
	assert_eq!(sanitize_fts_term("\"hello\""), "hello");
}

#[test]
fn sanitize_preserves_normal_text() {
	assert_eq!(sanitize_fts_term("hello"), "hello");
}

#[test]
fn sanitize_empty_string() {
	assert_eq!(sanitize_fts_term(""), "");
}

#[test]
fn sanitize_only_quotes() {
	assert_eq!(sanitize_fts_term("\"\"\""), "");
}
