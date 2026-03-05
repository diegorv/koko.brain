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
