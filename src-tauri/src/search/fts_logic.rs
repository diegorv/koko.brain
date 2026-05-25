/// Extracts the title from a file path (filename without extension).
pub fn extract_title(file_path: &str) -> String {
	let name = file_path.rsplit('/').next().unwrap_or(file_path);
	name.strip_suffix(".md")
		.or_else(|| name.strip_suffix(".markdown"))
		.unwrap_or(name)
		.to_string()
}

/// Extracts heading lines from markdown content.
pub fn extract_headings(content: &str) -> String {
	content
		.lines()
		.filter(|line| {
			let trimmed = line.trim_start();
			trimmed.starts_with('#')
				&& trimmed
					.chars()
					.take_while(|c| *c == '#')
					.count()
					.le(&6)
				&& trimmed
					.chars()
					.nth(trimmed.chars().take_while(|c| *c == '#').count())
					== Some(' ')
		})
		.collect::<Vec<&str>>()
		.join("\n")
}

/// Extracts tags from markdown content (frontmatter `tags:` + inline `#tag`).
pub fn extract_tags(content: &str) -> String {
	let mut tags: Vec<String> = Vec::new();

	// Extract frontmatter tags
	if content.starts_with("---") {
		if let Some(end) = content[3..].find("\n---") {
			let frontmatter = &content[3..3 + end];
			let mut in_tags = false;
			for line in frontmatter.lines() {
				let trimmed = line.trim();
				if trimmed.starts_with("tags:") {
					in_tags = true;
					// Inline tags: tags: [a, b] or tags: a, b
					let value = trimmed[5..].trim();
					if !value.is_empty() {
						let cleaned = value.trim_start_matches('[').trim_end_matches(']');
						for tag in cleaned.split(',') {
							let t = tag.trim().trim_matches('"').trim_matches('\'').to_string();
							if !t.is_empty() && !tags.contains(&t) {
								tags.push(t);
							}
						}
					}
				} else if in_tags && trimmed.starts_with("- ") {
					// List-style tags
					let t = trimmed[2..].trim().trim_matches('"').trim_matches('\'').to_string();
					if !t.is_empty() && !tags.contains(&t) {
						tags.push(t);
					}
				} else if in_tags && !trimmed.starts_with('-') && !trimmed.is_empty() {
					in_tags = false;
				}
			}
		}
	}

	// Extract inline #tags (outside code blocks)
	let without_frontmatter = if content.starts_with("---") {
		if let Some(end) = content[3..].find("\n---") {
			&content[3 + end + 4..]
		} else {
			content
		}
	} else {
		content
	};

	// Remove fenced code blocks and inline code
	let mut text = without_frontmatter.to_string();
	// Remove fenced code blocks (```...```)
	while let Some(start) = text.find("```") {
		if let Some(end) = text[start + 3..].find("```") {
			text.replace_range(start..start + 3 + end + 3, "");
		} else {
			break;
		}
	}
	// Remove inline code (`...`)
	while let Some(start) = text.find('`') {
		if let Some(end) = text[start + 1..].find('`') {
			text.replace_range(start..start + 1 + end + 1, "");
		} else {
			break;
		}
	}

	// Find #tag patterns
	let chars: Vec<char> = text.chars().collect();
	let mut i = 0;
	while i < chars.len() {
		if chars[i] == '#' {
			// Check preceding character is whitespace or start of text
			let before_ok = i == 0 || chars[i - 1].is_whitespace();
			if before_ok {
				let tag_start = i + 1;
				let mut tag_end = tag_start;
				while tag_end < chars.len()
					&& (chars[tag_end].is_alphanumeric()
						|| chars[tag_end] == '-'
						|| chars[tag_end] == '_'
						|| chars[tag_end] == '/')
				{
					tag_end += 1;
				}
				if tag_end > tag_start {
					let tag: String = chars[tag_start..tag_end].iter().collect();
					if !tags.contains(&tag) {
						tags.push(tag);
					}
				}
				i = tag_end;
				continue;
			}
		}
		i += 1;
	}

	tags.join(" ")
}

/// Sanitizes a term for safe use in FTS5 queries.
/// Removes internal double quotes that would break the query syntax.
pub fn sanitize_fts_term(term: &str) -> String {
	term.replace('"', "")
}

#[cfg(test)]
mod tests {
	use super::*;

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
}
