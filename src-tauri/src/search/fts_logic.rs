use std::collections::HashMap;

/// What a full-vault FTS reconcile has to do, derived from the disk state and
/// the stored state alone. Every list holds vault-relative paths, sorted so
/// the plan is deterministic.
#[derive(Debug, Default, PartialEq, Eq)]
pub struct ReconcilePlan {
	/// On disk, no row in `notes_content` - read the file and insert it.
	pub added: Vec<String>,
	/// Row exists but the file's mtime differs - read the file and re-index it.
	pub updated: Vec<String>,
	/// Row exists, file is gone - drop the row.
	pub removed: Vec<String>,
	/// Row exists and its mtime matches the file's - left untouched, never read.
	pub unchanged: u64,
}

/// Diffs the disk's `path -> mtime` map against the one stored in
/// `notes_content` and returns what has to change.
///
/// Both maps are keyed vault-relative and both mtimes are seconds since the
/// UNIX epoch. Only an mtime that is *equal* leaves the row alone: any
/// difference re-reads the file, matching the semantic index
/// (`commands::semantic`, `*mtime != stored`). A strictly-newer test would
/// miss every file that arrives with an older timestamp than the row - a
/// restore from backup, `cp -p` / `rsync -t` / an unzip, a sync client's
/// conflict copy - and leave it stale forever. Equality still keeps an
/// untouched vault from costing a single file read, which is the point. This
/// is the whole decision the old count-within-5% heuristic could not make - a
/// cardinality comparison sees neither identity nor freshness, so an external
/// add and an external delete cancelled out and an external edit never moved
/// the count at all.
///
/// Second resolution leaves one residual hole, shared with the walk that
/// produces `disk`: an external edit landing in the same wall-clock second as
/// the save that stamped the row is indistinguishable from that save.
pub fn plan_reconcile(disk: &HashMap<String, i64>, stored: &HashMap<String, i64>) -> ReconcilePlan {
	let mut plan = ReconcilePlan::default();

	for (path, disk_mtime) in disk {
		match stored.get(path) {
			None => plan.added.push(path.clone()),
			Some(stored_mtime) if disk_mtime != stored_mtime => plan.updated.push(path.clone()),
			Some(_) => plan.unchanged += 1,
		}
	}

	for path in stored.keys() {
		if !disk.contains_key(path) {
			plan.removed.push(path.clone());
		}
	}

	plan.added.sort();
	plan.updated.sort();
	plan.removed.sort();
	plan
}

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

	// --- plan_reconcile ---

	fn mtimes(pairs: &[(&str, i64)]) -> HashMap<String, i64> {
		pairs.iter().map(|(p, m)| ((*p).to_string(), *m)).collect()
	}

	#[test]
	fn reconcile_empty_stored_adds_everything() {
		let plan = plan_reconcile(&mtimes(&[("a.md", 10), ("b.md", 20)]), &mtimes(&[]));
		assert_eq!(plan.added, vec!["a.md", "b.md"]);
		assert!(plan.updated.is_empty());
		assert!(plan.removed.is_empty());
		assert_eq!(plan.unchanged, 0);
	}

	#[test]
	fn reconcile_empty_disk_removes_everything() {
		let plan = plan_reconcile(&mtimes(&[]), &mtimes(&[("a.md", 10), ("b.md", 20)]));
		assert_eq!(plan.removed, vec!["a.md", "b.md"]);
		assert!(plan.added.is_empty());
		assert!(plan.updated.is_empty());
		assert_eq!(plan.unchanged, 0);
	}

	#[test]
	fn reconcile_both_empty_is_a_no_op() {
		assert_eq!(plan_reconcile(&mtimes(&[]), &mtimes(&[])), ReconcilePlan::default());
	}

	#[test]
	fn reconcile_equal_mtimes_touch_nothing() {
		let plan = plan_reconcile(&mtimes(&[("a.md", 10)]), &mtimes(&[("a.md", 10)]));
		assert_eq!(plan.unchanged, 1);
		assert!(plan.added.is_empty() && plan.updated.is_empty() && plan.removed.is_empty());
	}

	#[test]
	fn reconcile_newer_on_disk_is_an_update() {
		let plan = plan_reconcile(&mtimes(&[("a.md", 11)]), &mtimes(&[("a.md", 10)]));
		assert_eq!(plan.updated, vec!["a.md"]);
		assert_eq!(plan.unchanged, 0);
	}

	#[test]
	fn reconcile_older_on_disk_is_an_update_too() {
		// A restore from backup, `cp -p`, `rsync -t`, an unzip or a sync
		// client's conflict copy all land content with a timestamp OLDER than
		// the row. Only equality means "in sync"; a strictly-newer test would
		// leave these stale forever.
		let plan = plan_reconcile(&mtimes(&[("a.md", 9)]), &mtimes(&[("a.md", 10)]));
		assert_eq!(plan.updated, vec!["a.md"]);
		assert_eq!(plan.unchanged, 0);
	}

	#[test]
	fn reconcile_mtime_zero_rows_are_re_indexed_once() {
		// Rows migrated in before the column existed default to 0.
		let plan = plan_reconcile(&mtimes(&[("a.md", 10)]), &mtimes(&[("a.md", 0)]));
		assert_eq!(plan.updated, vec!["a.md"]);
	}

	#[test]
	fn reconcile_sees_the_add_delete_pair_that_cancelled_out_in_the_count() {
		// One file added and one removed outside the app: same cardinality on
		// both sides, which is exactly what the old heuristic read as "in sync".
		let plan = plan_reconcile(
			&mtimes(&[("kept.md", 10), ("new.md", 20)]),
			&mtimes(&[("kept.md", 10), ("gone.md", 5)]),
		);
		assert_eq!(plan.added, vec!["new.md"]);
		assert_eq!(plan.removed, vec!["gone.md"]);
		assert_eq!(plan.unchanged, 1);
	}
}
