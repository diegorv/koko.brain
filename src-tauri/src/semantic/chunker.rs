use sha2::{Digest, Sha256};

use super::types::Chunk;

/// Options for controlling chunk size and overlap.
pub struct ChunkOptions {
	/// Minimum character count for a chunk to be included (default: 50)
	pub min_chunk_chars: usize,
	/// Maximum character count for a chunk (default: 10_000)
	pub max_chunk_chars: usize,
	/// Number of lines from the previous section to prepend as context (default: 2)
	pub overlap_lines: usize,
}

impl Default for ChunkOptions {
	fn default() -> Self {
		Self {
			min_chunk_chars: 50,
			max_chunk_chars: 10_000,
			overlap_lines: 2,
		}
	}
}

/// A raw section before post-processing (merge short, add overlap).
struct RawSection {
	heading: Option<String>,
	/// Ancestor headings (H1 → ... → H(n-1)) above this section's local heading.
	parent_headings: Vec<String>,
	lines: Vec<String>,
	line_start: usize,
	line_end: usize,
}

/// Chunks a markdown file by heading boundaries.
///
/// Splits content at heading lines (`# Heading`), creating one chunk per section.
/// Strips YAML frontmatter and code blocks. Merges short sections into the previous one.
/// Adds configurable line overlap between chunks for context continuity.
pub fn chunk_markdown(path: &str, content: &str, options: &ChunkOptions) -> Vec<Chunk> {
	let lines: Vec<&str> = content.lines().collect();

	// Skip YAML frontmatter
	let start_line = skip_frontmatter(&lines);

	// Phase 1: Split into raw sections by heading boundaries
	let raw_sections = split_into_sections(&lines, start_line);

	// Phase 2: Merge short sections into the previous one
	let merged = merge_short_sections(raw_sections, options.min_chunk_chars);

	// Phase 3: Emit chunks with overlap and code stripping
	let mut chunks = Vec::new();
	let mut prev_lines: Vec<String> = Vec::new();

	for section in &merged {
		let stripped = strip_code_blocks(&section.lines);
		let mut final_lines = Vec::new();

		// Add overlap from previous section
		if !prev_lines.is_empty() && options.overlap_lines > 0 {
			let overlap_start = prev_lines.len().saturating_sub(options.overlap_lines);
			for line in &prev_lines[overlap_start..] {
				final_lines.push(line.clone());
			}
		}

		final_lines.extend(stripped.clone());
		let text = final_lines.join("\n");

		emit_chunk(
			path,
			&text,
			&section.heading,
			&section.parent_headings,
			section.line_start,
			section.line_end,
			options,
			&mut chunks,
		);

		prev_lines = stripped;
	}

	chunks
}

/// Splits lines into sections at heading boundaries.
///
/// Tracks a heading-level stack so each section captures its ancestor headings.
/// Stack invariant: `heading_stack[i]` holds the most recent heading at level `i+1`.
/// When we encounter a heading of level L, we truncate to length L-1 (drop deeper or
/// sibling headings) and the parents become `heading_stack[0..L-1]`.
fn split_into_sections(lines: &[&str], start_line: usize) -> Vec<RawSection> {
	let mut sections = Vec::new();
	let mut current_heading: Option<String> = None;
	let mut current_parents: Vec<String> = Vec::new();
	let mut heading_stack: Vec<String> = Vec::new();
	let mut current_lines: Vec<String> = Vec::new();
	let mut chunk_start_line = start_line + 1; // 1-indexed

	for i in start_line..lines.len() {
		let line = lines[i];
		if let Some(level) = heading_level(line) {
			if !current_lines.is_empty() {
				sections.push(RawSection {
					heading: current_heading.clone(),
					parent_headings: current_parents.clone(),
					lines: current_lines,
					line_start: chunk_start_line,
					line_end: i,
				});
			}
			// Drop any heading at or below the new heading's level; ancestors stay.
			let text = extract_heading_text(line);
			heading_stack.truncate(level.saturating_sub(1));
			current_parents = heading_stack.clone();
			heading_stack.push(text.clone());
			current_heading = Some(text);
			current_lines = vec![line.to_string()];
			chunk_start_line = i + 1; // 1-indexed
		} else {
			current_lines.push(line.to_string());
		}
	}

	if !current_lines.is_empty() {
		sections.push(RawSection {
			heading: current_heading,
			parent_headings: current_parents,
			lines: current_lines,
			line_start: chunk_start_line,
			line_end: lines.len(),
		});
	}

	sections
}

/// Merges sections that are too short into the previous section.
fn merge_short_sections(sections: Vec<RawSection>, min_chars: usize) -> Vec<RawSection> {
	let mut merged: Vec<RawSection> = Vec::new();

	for section in sections {
		let text_len: usize = section.lines.iter().map(|l| l.chars().count()).sum::<usize>()
			+ section.lines.len().saturating_sub(1); // newlines

		if text_len < min_chars && !merged.is_empty() {
			// Append to previous section
			let prev = merged.last_mut().unwrap();
			prev.lines.extend(section.lines);
			prev.line_end = section.line_end;
		} else {
			merged.push(section);
		}
	}

	merged
}

/// Removes fenced code block content, keeping surrounding prose.
/// Strips lines between ``` markers (inclusive).
fn strip_code_blocks(lines: &[String]) -> Vec<String> {
	let mut result = Vec::new();
	let mut in_code_block = false;

	for line in lines {
		let trimmed = line.trim();
		if trimmed.starts_with("```") {
			in_code_block = !in_code_block;
			continue;
		}
		if !in_code_block {
			result.push(line.clone());
		}
	}

	result
}

/// Emits a chunk if it meets the size requirements.
fn emit_chunk(
	path: &str,
	text: &str,
	heading: &Option<String>,
	parent_headings: &[String],
	line_start: usize,
	line_end: usize,
	options: &ChunkOptions,
	chunks: &mut Vec<Chunk>,
) {
	let trimmed = text.trim();
	let char_count = trimmed.chars().count();

	if char_count < options.min_chunk_chars {
		return;
	}

	let content = if char_count > options.max_chunk_chars {
		let byte_idx = trimmed
			.char_indices()
			.nth(options.max_chunk_chars)
			.map(|(i, _)| i)
			.unwrap_or(trimmed.len());
		&trimmed[..byte_idx]
	} else {
		trimmed
	};

	// Hash the embed-text projection (parent_headings + heading + content), not the
	// raw content alone. Any rename in the heading tree above this chunk changes
	// what the embedder sees and must invalidate the stored embedding.
	let hash_input = if parent_headings.is_empty() && heading.is_none() {
		content.to_string()
	} else {
		let mut prefix: Vec<String> = parent_headings.to_vec();
		if let Some(h) = heading {
			prefix.push(h.clone());
		}
		format!("{}\n\n{}", prefix.join(" > "), content)
	};
	let content_hash = hash_content(&hash_input);

	let heading_slug = heading
		.as_ref()
		.map(|h| h.to_lowercase().replace(' ', "-"))
		.unwrap_or_default();
	let key = format!("{}#{}-{}", path, heading_slug, line_start);

	chunks.push(Chunk {
		key,
		source_path: path.to_string(),
		content: content.to_string(),
		heading: heading.clone(),
		parent_headings: parent_headings.to_vec(),
		line_start,
		line_end,
		content_hash,
	});
}

/// Skips YAML frontmatter (content between leading `---` markers).
/// Returns the line index where content starts.
fn skip_frontmatter(lines: &[&str]) -> usize {
	if lines.is_empty() || lines[0].trim() != "---" {
		return 0;
	}

	for i in 1..lines.len() {
		if lines[i].trim() == "---" {
			return i + 1;
		}
	}

	// No closing --- found, treat entire content as frontmatter-less
	0
}

/// Returns the heading level (1-6) for a markdown heading line, or `None` if
/// the line is not a heading. Used by `split_into_sections` to maintain the
/// parent-heading stack.
fn heading_level(line: &str) -> Option<usize> {
	let trimmed = line.trim_start();
	if !trimmed.starts_with('#') {
		return None;
	}
	let hash_count = trimmed.chars().take_while(|c| *c == '#').count();
	if (1..=6).contains(&hash_count) && trimmed.chars().nth(hash_count) == Some(' ') {
		Some(hash_count)
	} else {
		None
	}
}

/// Extracts the heading text without the `#` prefix.
fn extract_heading_text(line: &str) -> String {
	line.trim_start()
		.trim_start_matches('#')
		.trim()
		.to_string()
}

/// Computes SHA-256 hash of content, returns first 16 hex chars.
fn hash_content(content: &str) -> String {
	let mut hasher = Sha256::new();
	hasher.update(content.as_bytes());
	let result = hasher.finalize();
	hex_encode(&result[..8]) // 8 bytes = 16 hex chars
}

/// Encodes bytes as lowercase hex string.
fn hex_encode(bytes: &[u8]) -> String {
	bytes.iter().map(|b| format!("{:02x}", b)).collect()
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn multibyte_utf8_does_not_panic() {
		// Each emoji is 4 bytes. With max_chunk_chars=5, byte slicing at index 5
		// would land inside a multi-byte char and panic without the fix.
		let content = "# Title\n\n🔐🔑🗝️🔒🔓🛡️🏰🗡️🛠️🔧";
		let options = ChunkOptions {
			min_chunk_chars: 1,
			max_chunk_chars: 5,
			overlap_lines: 0,
		};
		let chunks = chunk_markdown("test.md", content, &options);
		assert!(!chunks.is_empty());
		// Content should be at most 5 characters
		assert!(chunks[0].content.chars().count() <= 5);
	}

	#[test]
	fn ascii_content_chunked_correctly() {
		let content = "# Heading\n\nThis is a test paragraph with enough content to pass the minimum.";
		let options = ChunkOptions {
			min_chunk_chars: 10,
			max_chunk_chars: 20,
			overlap_lines: 0,
		};
		let chunks = chunk_markdown("test.md", content, &options);
		assert!(!chunks.is_empty());
		assert!(chunks[0].content.chars().count() <= 20);
	}

	#[test]
	fn chunk_below_minimum_is_skipped() {
		let content = "# H\n\nHi";
		let options = ChunkOptions {
			min_chunk_chars: 100,
			max_chunk_chars: 10_000,
			overlap_lines: 0,
		};
		let chunks = chunk_markdown("test.md", content, &options);
		assert!(chunks.is_empty());
	}

	#[test]
	fn parent_headings_track_h1_h2_h3() {
		// Section under "Practical applications" should carry parents [Stoicism, Practical applications].
		let content = "# Stoicism\n\n## Practical applications\n\nIntro paragraph here.\n\n### Daily journaling\n\nWrite about the day, name a fear, identify a virtue.\n";
		let options = ChunkOptions {
			min_chunk_chars: 1,
			max_chunk_chars: 10_000,
			overlap_lines: 0,
		};
		let chunks = chunk_markdown("test.md", content, &options);
		assert!(!chunks.is_empty(), "expected non-empty chunks");

		// Find the H3 chunk
		let h3 = chunks
			.iter()
			.find(|c| c.heading.as_deref() == Some("Daily journaling"))
			.expect("missing Daily journaling chunk");
		assert_eq!(
			h3.parent_headings,
			vec!["Stoicism".to_string(), "Practical applications".to_string()]
		);

		// And the H1 chunk has no parents
		let h1 = chunks
			.iter()
			.find(|c| c.heading.as_deref() == Some("Stoicism"))
			.expect("missing Stoicism chunk");
		assert!(h1.parent_headings.is_empty());
	}

	#[test]
	fn parent_headings_drop_siblings_at_same_level() {
		// Going from "## A" to "## B" should drop A; B's parents = [H1].
		// Bodies large enough to clear `min_chunk_chars` so neither section is merged.
		let body = "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt.";
		let content = format!(
			"# Root\n\n## Section A\n\n{}\n\n## Section B\n\n{}\n",
			body, body
		);
		let options = ChunkOptions::default();
		let chunks = chunk_markdown("test.md", &content, &options);

		let b = chunks
			.iter()
			.find(|c| c.heading.as_deref() == Some("Section B"))
			.expect("missing Section B");
		assert_eq!(b.parent_headings, vec!["Root".to_string()]);
	}

	#[test]
	fn embed_text_prepends_heading_chain() {
		use crate::semantic::types::Chunk;
		let chunk = Chunk {
			key: "k".into(),
			source_path: "p.md".into(),
			content: "body text".into(),
			heading: Some("Daily journaling".into()),
			parent_headings: vec!["Stoicism".into(), "Practical applications".into()],
			line_start: 1,
			line_end: 5,
			content_hash: "h".into(),
		};
		assert_eq!(
			chunk.embed_text(),
			"Stoicism > Practical applications > Daily journaling\n\nbody text"
		);
	}

	#[test]
	fn embed_text_returns_content_when_no_headings() {
		use crate::semantic::types::Chunk;
		let chunk = Chunk {
			key: "k".into(),
			source_path: "p.md".into(),
			content: "just a note".into(),
			heading: None,
			parent_headings: vec![],
			line_start: 1,
			line_end: 1,
			content_hash: "h".into(),
		};
		assert_eq!(chunk.embed_text(), "just a note");
	}

	#[test]
	fn cjk_content_counts_chars_not_bytes() {
		// Each CJK character is 3 bytes. 20 chars = 60 bytes.
		let cjk = "日".repeat(20);
		let content = format!("# 見出し\n\n{}", cjk);
		let options = ChunkOptions {
			min_chunk_chars: 1,
			max_chunk_chars: 10,
			overlap_lines: 0,
		};
		let chunks = chunk_markdown("test.md", &content, &options);
		assert!(!chunks.is_empty());
		// Should truncate to 10 characters, not 10 bytes
		assert!(chunks[0].content.chars().count() <= 10);
	}

}
